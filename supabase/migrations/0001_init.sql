-- Poopipoo — initial schema: profiles, restrooms, reviews + RLS.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
-- Run in Supabase Dashboard → SQL Editor.

-- ============================================================
-- Tables
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text check (char_length(username) <= 40),
  avatar_url  text,
  points      integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.restrooms (
  id            uuid primary key default gen_random_uuid(),
  -- Length limits match the /add form validation
  name          text not null check (char_length(btrim(name)) between 3 and 80),
  description   text not null default '' check (char_length(description) <= 500),
  address       text not null check (char_length(btrim(address)) between 5 and 200),
  latitude      double precision not null check (latitude between -90 and 90),
  longitude     double precision not null check (longitude between -180 and 180),
  -- Must be a subset of the app's Amenity type
  amenities     text[] not null default '{}' check (
                  amenities <@ array['bidet', 'tissue', 'soap', 'wheelchair', 'baby-changing',
                                     'shower', 'air-conditioned', 'free']::text[]
                ),
  is_free       boolean not null default true,
  images        text[] not null default '{}',
  -- Aggregates; will be maintained from reviews in Phase 6
  rating        double precision not null default 0 check (rating between 0 and 5),
  review_count  integer not null default 0 check (review_count >= 0),
  -- NULL for seeded/system restrooms, or if the author's account is deleted
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  restroom_id  uuid not null references public.restrooms (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  rating       integer not null check (rating between 1 and 5),
  comment      text not null default '' check (char_length(comment) <= 1000),
  images       text[] not null default '{}',
  created_at   timestamptz not null default now()
);

-- ============================================================
-- Indexes
-- ============================================================

create index if not exists restrooms_lat_lng_idx on public.restrooms (latitude, longitude);
create index if not exists restrooms_created_by_idx on public.restrooms (created_by);
create index if not exists reviews_restroom_id_idx on public.reviews (restroom_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);

-- ============================================================
-- Triggers
-- ============================================================

-- Keep restrooms.updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists restrooms_set_updated_at on public.restrooms;
create trigger restrooms_set_updated_at
  before update on public.restrooms
  for each row execute function public.set_updated_at();

-- Create a profile row for every new auth user.
-- Username comes from sign-up metadata, falling back to the email's local part.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'username'), ''),
        split_part(new.email, '@', 1)
      ),
      40
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Privileges
-- Supabase grants ALL on new public tables to anon/authenticated by default.
-- Start from nothing and grant only what the app needs. Column-level grants
-- stop users from writing server-managed columns (rating, review_count,
-- points, created_at, ...) even on rows they own.
-- ============================================================

revoke all on public.profiles, public.restrooms, public.reviews from anon, authenticated;

grant select on public.profiles, public.restrooms, public.reviews to anon, authenticated;

grant update (username, avatar_url) on public.profiles to authenticated;

grant insert (name, description, address, latitude, longitude, amenities, is_free, images, created_by)
  on public.restrooms to authenticated;
grant update (name, description, address, latitude, longitude, amenities, is_free, images)
  on public.restrooms to authenticated;
grant delete on public.restrooms to authenticated;

grant insert (restroom_id, user_id, rating, comment, images) on public.reviews to authenticated;
grant update (rating, comment, images) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

-- ============================================================
-- Row Level Security
-- (select auth.uid()) is evaluated once per query instead of per row.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.restrooms enable row level security;
alter table public.reviews enable row level security;

-- profiles: read all, update own (rows are created by the trigger above)
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- restrooms: read all, insert when signed in (as yourself), update/delete own
drop policy if exists "Restrooms are viewable by everyone" on public.restrooms;
create policy "Restrooms are viewable by everyone"
  on public.restrooms for select
  using (true);

drop policy if exists "Signed-in users can add restrooms" on public.restrooms;
create policy "Signed-in users can add restrooms"
  on public.restrooms for insert to authenticated
  with check ((select auth.uid()) = created_by);

drop policy if exists "Users can update their own restrooms" on public.restrooms;
create policy "Users can update their own restrooms"
  on public.restrooms for update to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

drop policy if exists "Users can delete their own restrooms" on public.restrooms;
create policy "Users can delete their own restrooms"
  on public.restrooms for delete to authenticated
  using ((select auth.uid()) = created_by);

-- reviews: read all, insert when signed in (as yourself), update/delete own
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
