-- Poopipoo — Phase 6: ratings + reviews.
-- Requires 0001_init.sql. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.

-- ============================================================
-- reviews: constraints + indexes
-- (the table itself, with id/restroom_id/user_id/rating/comment/images/
-- created_at, foreign keys and RLS, was created in 0001_init.sql)
-- ============================================================

-- Rating must be 1–5. 0001 already created this check inline (auto-named
-- reviews_rating_check); only add it if it's somehow missing.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass and conname = 'reviews_rating_check'
  ) then
    alter table public.reviews
      add constraint reviews_rating_check check (rating >= 1 and rating <= 5);
  end if;
end;
$$;

-- Comments: max 500 characters (matches the review form; 0001 allowed 1000)
alter table public.reviews drop constraint if exists reviews_comment_check;
alter table public.reviews
  add constraint reviews_comment_check check (char_length(comment) <= 500);

-- One review per user per restroom. (Also serves (restroom_id, user_id) lookups.)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.reviews'::regclass and conname = 'reviews_restroom_id_user_id_key'
  ) then
    alter table public.reviews
      add constraint reviews_restroom_id_user_id_key unique (restroom_id, user_id);
  end if;
end;
$$;

-- Listing a restroom's reviews, newest first
create index if not exists reviews_restroom_id_idx on public.reviews (restroom_id);
create index if not exists reviews_restroom_id_created_at_idx
  on public.reviews (restroom_id, created_at desc);

-- ============================================================
-- Keep restrooms.rating / review_count in sync with reviews
-- ============================================================

-- SECURITY DEFINER: runs as the function owner, so it can write the aggregate
-- columns that signed-in users are not granted (see 0001 column grants).
-- search_path is empty so every name below must be schema-qualified.
create or replace function public.update_restroom_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected uuid[];
begin
  -- Which restroom(s) changed. On UPDATE both old and new are included in case
  -- restroom_id ever changes (users can't update it today, but be safe).
  if tg_op = 'INSERT' then
    affected := array[new.restroom_id];
  elsif tg_op = 'DELETE' then
    affected := array[old.restroom_id];
  else
    affected := array[old.restroom_id, new.restroom_id];
  end if;

  -- Recompute from scratch for each affected restroom. `= any(affected)` matches
  -- each restroom row once even when the same id appears twice (UPDATE case),
  -- and the scalar subqueries can't multiply rows the way a join would.
  update public.restrooms as r
  set
    rating = coalesce(
      (select round(avg(rv.rating)::numeric, 2)::double precision
       from public.reviews as rv
       where rv.restroom_id = r.id),
      0
    ),
    review_count = (
      select count(*)::integer
      from public.reviews as rv
      where rv.restroom_id = r.id
    )
  where r.id = any(affected);

  return null; -- AFTER trigger: return value is ignored
end;
$$;

-- Only the trigger should call this
revoke execute on function public.update_restroom_rating() from public, anon, authenticated;

drop trigger if exists reviews_update_restroom_rating on public.reviews;
create trigger reviews_update_restroom_rating
  after insert or update or delete on public.reviews
  for each row execute function public.update_restroom_rating();

-- New reviews shouldn't change "last edited" on the restroom: only bump
-- updated_at when user-editable details change, not rating/review_count.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.name, new.description, new.address, new.latitude, new.longitude,
      new.amenities, new.is_free, new.images)
     is distinct from
     (old.name, old.description, old.address, old.latitude, old.longitude,
      old.amenities, old.is_free, old.images)
  then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- ============================================================
-- Recompute every restroom from real reviews.
-- Replaces the placeholder rating/review_count copied from the mock data by
-- the seed script, so all numbers match the reviews table.
-- ============================================================

update public.restrooms as r
set
  rating = coalesce(stats.avg_rating, 0),
  review_count = coalesce(stats.total, 0)
from (
  select
    r2.id,
    round(avg(rv.rating)::numeric, 2)::double precision as avg_rating,
    count(rv.id)::integer as total
  from public.restrooms as r2
  left join public.reviews as rv on rv.restroom_id = r2.id
  group by r2.id
) as stats
where r.id = stats.id;

-- ============================================================
-- Privileges + RLS for reviews (same as 0001; re-applied so this file is
-- self-describing). Read: everyone. Insert: signed in, as yourself.
-- Update/delete: own reviews only. restroom_id/user_id can't be changed.
-- ============================================================

revoke all on public.reviews from anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant insert (restroom_id, user_id, rating, comment, images) on public.reviews to authenticated;
grant update (rating, comment, images) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

alter table public.reviews enable row level security;

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

drop policy if exists "Signed-in users can add reviews" on public.reviews;
create policy "Signed-in users can add reviews"
  on public.reviews for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own reviews" on public.reviews;
create policy "Users can update their own reviews"
  on public.reviews for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own reviews" on public.reviews;
create policy "Users can delete their own reviews"
  on public.reviews for delete to authenticated
  using ((select auth.uid()) = user_id);
