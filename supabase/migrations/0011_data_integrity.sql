-- Poopipoo — Phase 19: honest data + demo reviews
-- Requires 0001–0010. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.

-- ============================================================
-- is_free: null = nobody recorded the fee
-- ============================================================

-- OSM rows with no fee tag were imported as free. They become null through
-- scripts/backfill-osm-accuracy.ts (run it after the app that understands null
-- is deployed: older code would show null as "May bayad").
alter table public.restrooms alter column is_free drop not null;

-- ============================================================
-- Demo reviews: the rating trigger must get through the demo block
-- ============================================================

-- A review fires update_restroom_rating(), which updates restrooms. auth.uid()
-- is still the demo user there, so the block below rejected every demo review
-- with 'Demo mode'. Only a direct write has trigger depth 1; a write made by
-- another trigger is deeper and goes through. The rating trigger already leaves
-- demo reviews out of the rating and review count (0009).
create or replace function public.block_demo_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() = 1 and public.is_demo_user() then
    raise exception 'Demo mode' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
