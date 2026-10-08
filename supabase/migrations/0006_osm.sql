-- Poopipoo — Phase 12: OpenStreetMap import.
-- Requires 0001–0005. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor, then: npx tsx scripts/import-osm.ts
--
-- source:   where a restroom came from — 'user' (added in the app),
--           'seed' (our seed scripts), 'osm' (imported from OpenStreetMap)
-- osm_type: 'node' | 'way' | 'relation'
-- osm_id:   the OSM element id (as text). OSM ids are only unique per type
--           (node 123 and way 123 are different things), so the unique key is
--           the pair (osm_type, osm_id). Re-running the import skips rows that
--           already exist.
-- OSM data is © OpenStreetMap contributors, ODbL. The app credits it on the
-- About page and on every imported restroom's page.

alter table public.restrooms add column if not exists source text not null default 'user';
alter table public.restrooms add column if not exists osm_type text;
alter table public.restrooms add column if not exists osm_id text;

alter table public.restrooms drop constraint if exists restrooms_source_check;
alter table public.restrooms add constraint restrooms_source_check
  check (source in ('user', 'osm', 'seed'));

alter table public.restrooms drop constraint if exists restrooms_osm_type_check;
alter table public.restrooms add constraint restrooms_osm_type_check
  check (osm_type is null or osm_type in ('node', 'way', 'relation'));

-- Both OSM columns are set together (OSM rows) or not at all
alter table public.restrooms drop constraint if exists restrooms_osm_ref_check;
alter table public.restrooms add constraint restrooms_osm_ref_check
  check ((osm_type is null) = (osm_id is null) and (source = 'osm') = (osm_id is not null));

-- Restrooms without an owner that existed before this migration came from
-- the seed scripts (mock data + seed-manila-cr.sql)
update public.restrooms set source = 'seed' where created_by is null and source = 'user' and osm_id is null;

create index if not exists restrooms_source_idx on public.restrooms (source);

-- Unique per OSM element (NULLs don't conflict, so user/seed rows are unaffected)
alter table public.restrooms drop constraint if exists restrooms_osm_type_osm_id_key;
alter table public.restrooms add constraint restrooms_osm_type_osm_id_key unique (osm_type, osm_id);

-- The new columns are read-only for users: the column grants from 0005 only
-- allow name/description/address/... on insert and update, so users can't
-- mark their own restroom as 'osm'. Nothing to grant here.
