-- Poopipoo — Phase 10: gamification (points, levels, badges, helpful votes)
-- + restrooms.is_verified + avatars storage bucket.
-- Requires 0001–0003. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.

-- ============================================================
-- Columns
-- ============================================================

-- profiles.points already exists since 0001; `if not exists` keeps this safe.
alter table public.profiles add column if not exists points integer not null default 0;
alter table public.profiles add column if not exists level integer not null default 1;
alter table public.profiles add column if not exists badges text[] not null default '{}';

-- Set by admins later (e.g. after an OSM import or a moderator check)
alter table public.restrooms add column if not exists is_verified boolean not null default false;

-- How many people marked a review as helpful (maintained by a trigger below)
alter table public.reviews add column if not exists helpful_count integer not null default 0;

create index if not exists profiles_points_idx on public.profiles (points desc);

-- ============================================================
-- Helpful votes: one per user per review, never on your own review
-- ============================================================

create table if not exists public.review_votes (
  review_id   uuid not null references public.reviews (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (review_id, user_id)
);

create index if not exists review_votes_user_id_idx on public.review_votes (user_id);

-- ============================================================
-- Levels
-- 0–49 Newbie, 50–199 Explorer, 200–499 Scout, 500–999 Expert, 1000+ Legend.
-- Mirrored in lib/levels.ts — keep the two in sync.
-- ============================================================

create or replace function public.calculate_level(points integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when points >= 1000 then 5
    when points >= 500 then 4
    when points >= 200 then 3
    when points >= 50 then 2
    else 1
  end;
$$;

-- ============================================================
-- Points
-- +10 add a restroom, +5 add a review, +1 for each helpful vote received.
-- Deleting takes the points back (so add → delete → add can't farm points),
-- but never below 0.
-- ============================================================

-- Adds `delta` points to a user and recomputes their level.
create or replace function public.add_points(target_user uuid, delta integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user is null or delta = 0 then
    return;
  end if;
  update public.profiles
  set
    points = greatest(points + delta, 0),
    level = public.calculate_level(greatest(points + delta, 0))
  where id = target_user;
end;
$$;

-- One trigger function for restrooms, reviews and review_votes.
-- SECURITY DEFINER: writes points/level/helpful_count, which users can't.
create or replace function public.award_points()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  if tg_table_name = 'restrooms' then
    if tg_op = 'INSERT' then
      perform public.add_points(new.created_by, 10);
    else
      perform public.add_points(old.created_by, -10);
    end if;

  elsif tg_table_name = 'reviews' then
    if tg_op = 'INSERT' then
      perform public.add_points(new.user_id, 5);
    -- When a whole restroom is deleted its reviews go with it (cascade); the
    -- reviewers keep their points. By now the restroom row is already gone.
    elsif exists (select 1 from public.restrooms where id = old.restroom_id) then
      perform public.add_points(old.user_id, -5);
    end if;

  elsif tg_table_name = 'review_votes' then
    if tg_op = 'INSERT' then
      update public.reviews
      set helpful_count = helpful_count + 1
      where id = new.review_id
      returning user_id into author;
      perform public.add_points(author, 1);
    else
      -- Un-vote. If the review itself was deleted (cascade), nothing to undo.
      update public.reviews
      set helpful_count = greatest(helpful_count - 1, 0)
      where id = old.review_id
      returning user_id into author;
      perform public.add_points(author, -1);
    end if;
  end if;

  return null; -- AFTER trigger
end;
$$;

-- Only the triggers should call these
revoke execute on function public.add_points(uuid, integer) from public, anon, authenticated;
revoke execute on function public.award_points() from public, anon, authenticated;

drop trigger if exists restrooms_award_points on public.restrooms;
create trigger restrooms_award_points
  after insert or delete on public.restrooms
  for each row execute function public.award_points();

drop trigger if exists reviews_award_points on public.reviews;
create trigger reviews_award_points
  after insert or delete on public.reviews
  for each row execute function public.award_points();

drop trigger if exists review_votes_award_points on public.review_votes;
create trigger review_votes_award_points
  after insert or delete on public.review_votes
  for each row execute function public.award_points();

-- ============================================================
-- Backfill: recompute from existing data so earlier contributions count.
-- Same rules as the triggers, so re-running this gives the same numbers.
-- ============================================================

update public.reviews as rv
set helpful_count = (select count(*)::integer from public.review_votes as v where v.review_id = rv.id);

update public.profiles as p
set
  points = stats.total,
  level = public.calculate_level(stats.total)
from (
  select
    p2.id,
    (select count(*)::integer from public.restrooms as r where r.created_by = p2.id) * 10
    + (select count(*)::integer from public.reviews as rv where rv.user_id = p2.id) * 5
    + (select coalesce(sum(rv.helpful_count), 0)::integer from public.reviews as rv where rv.user_id = p2.id)
      as total
  from public.profiles as p2
) as stats
where p.id = stats.id;

-- ============================================================
-- Privileges + RLS
-- points, level and badges stay read-only for users: the column grants in 0001
-- only let them update username and avatar_url. Re-applied here so it's explicit.
-- Badges are written by the server with the secret key (lib/gamification/server.ts).
-- ============================================================

revoke update on public.profiles from authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

revoke all on public.review_votes from anon, authenticated;
grant select on public.review_votes to anon, authenticated;
grant insert (review_id, user_id) on public.review_votes to authenticated;
grant delete on public.review_votes to authenticated;

alter table public.review_votes enable row level security;

drop policy if exists "Review votes are viewable by everyone" on public.review_votes;
create policy "Review votes are viewable by everyone"
  on public.review_votes for select
  using (true);

drop policy if exists "Users can vote on other people's reviews" on public.review_votes;
create policy "Users can vote on other people's reviews"
  on public.review_votes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and not exists (
      select 1 from public.reviews as rv
      where rv.id = review_id and rv.user_id = (select auth.uid())
    )
  );

drop policy if exists "Users can remove their own votes" on public.review_votes;
create policy "Users can remove their own votes"
  on public.review_votes for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ============================================================
-- Avatars (Settings → photo upload)
-- Public bucket; each user can only write inside their own folder:
-- avatars/<user id>/<file>. Max 2 MB, images only.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
