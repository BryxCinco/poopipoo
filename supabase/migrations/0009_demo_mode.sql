-- Poopipoo — Phase 15: demo mode (guest access for recruiters/clients)
-- Requires 0001–0007. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor, then create the demo account:
--   npx tsx scripts/create-demo-user.ts
--
-- One shared demo account (profiles.is_demo) that anyone can sign in to with
-- the "Try demo" button (/api/auth/demo). It can use the AI assistant and
-- write reviews, but must never affect real users:
--   - its reviews are only visible to the demo account, and don't count
--     toward ratings
--   - it earns no points (so it never shows up on the leaderboard)
--   - it can't add/edit/delete restrooms, report, verify, vote, or edit its
--     profile/avatar
--   - account deletion is refused by the API route
--   - AI questions: 3 per demo session (agent_queries.session_id, checked by
--     /api/agent)
--
-- Error message raised here is matched by the app (lib/moderation/errors.ts):
--   'Demo mode'   the demo account tried something that's read-only

-- ============================================================
-- Columns
-- ============================================================

-- Set by scripts/create-demo-user.ts with the secret key; users have no
-- update grant on it (column grants in 0005 only allow username/avatar_url).
alter table public.profiles add column if not exists is_demo boolean not null default false;

-- Copied from the author on insert (trigger below); not in the insert grant.
alter table public.reviews add column if not exists is_demo boolean not null default false;

-- The Supabase session that asked (each "Try demo" sign-in is a new session).
-- Filled from the caller's JWT, so it can't be faked.
alter table public.agent_queries add column if not exists session_id uuid
  default (nullif(auth.jwt() ->> 'session_id', ''))::uuid;

create index if not exists agent_queries_session_id_idx
  on public.agent_queries (session_id) where session_id is not null;
create index if not exists profiles_is_demo_idx on public.profiles (is_demo) where is_demo;

-- ============================================================
-- Helpers
-- ============================================================

-- True when the signed-in user is the demo account.
-- SECURITY DEFINER so it can be used inside RLS policies without recursion.
create or replace function public.is_demo_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_demo
  );
$$;

grant execute on function public.is_demo_user() to anon, authenticated;

-- ============================================================
-- Read-only writes for the demo account
-- (the server's secret key / SQL Editor has no auth.uid(), so cleanup works)
-- ============================================================

create or replace function public.block_demo_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_demo_user() then
    raise exception 'Demo mode' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists restrooms_block_demo on public.restrooms;
create trigger restrooms_block_demo
  before insert or update or delete on public.restrooms
  for each row execute function public.block_demo_writes();

drop trigger if exists review_votes_block_demo on public.review_votes;
create trigger review_votes_block_demo
  before insert or delete on public.review_votes
  for each row execute function public.block_demo_writes();

drop trigger if exists restroom_verifications_block_demo on public.restroom_verifications;
create trigger restroom_verifications_block_demo
  before insert or delete on public.restroom_verifications
  for each row execute function public.block_demo_writes();

drop trigger if exists reports_block_demo on public.reports;
create trigger reports_block_demo
  before insert on public.reports
  for each row execute function public.block_demo_writes();

-- Profiles: only the demo account editing its own username/avatar. Point
-- updates from triggers still go through.
create or replace function public.block_demo_profile_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id = (select auth.uid())
     and (new.username, new.avatar_url) is distinct from (old.username, old.avatar_url)
     and public.is_demo_user() then
    raise exception 'Demo mode' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_demo on public.profiles;
create trigger profiles_block_demo
  before update on public.profiles
  for each row execute function public.block_demo_profile_edits();

-- ============================================================
-- Demo reviews: private to the demo account, never in ratings
-- ============================================================

create or replace function public.set_review_demo_flag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.is_demo := public.is_demo_user();
  return new;
end;
$$;

drop trigger if exists reviews_set_demo_flag on public.reviews;
create trigger reviews_set_demo_flag
  before insert on public.reviews
  for each row execute function public.set_review_demo_flag();

-- Same as 0005's version plus `not rv.is_demo`
create or replace function public.update_restroom_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid[];
begin
  if tg_op = 'INSERT' then
    affected := array[new.restroom_id];
  elsif tg_op = 'DELETE' then
    affected := array[old.restroom_id];
  else
    affected := array[old.restroom_id, new.restroom_id];
  end if;

  update public.restrooms as r
  set
    rating = coalesce(
      (select round(avg(rv.rating)::numeric, 2)::double precision
       from public.reviews as rv
       where rv.restroom_id = r.id and rv.status <> 'rejected' and not rv.is_demo),
      0
    ),
    review_count = (
      select count(*)::integer
      from public.reviews as rv
      where rv.restroom_id = r.id and rv.status <> 'rejected' and not rv.is_demo
    )
  where r.id = any(affected);

  return null;
end;
$$;

-- Same as 0005's policy, plus: demo reviews are hidden from everyone else
drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (
    (status <> 'rejected' and not is_demo)
    or user_id = (select auth.uid())
    or (select public.is_moderator())
  );

-- ============================================================
-- No points for the demo account (same as 0004's add_points plus the check)
-- ============================================================

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
  if exists (select 1 from public.profiles where id = target_user and is_demo) then
    return;
  end if;
  update public.profiles
  set
    points = greatest(points + delta, 0),
    level = public.calculate_level(greatest(points + delta, 0))
  where id = target_user;
end;
$$;

revoke execute on function public.add_points(uuid, integer) from public, anon, authenticated;

-- ============================================================
-- Avatars: same as 0004's policies, minus the demo account
-- ============================================================

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_demo_user())
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_demo_user())
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_demo_user())
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select public.is_demo_user())
  );
