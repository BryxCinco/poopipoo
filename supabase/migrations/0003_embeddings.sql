-- Poopipoo — Phase 8: AI agent (RAG).
-- Requires 0001_init.sql and 0002_reviews.sql. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.

-- ============================================================
-- pgvector
-- ============================================================

-- Supabase keeps extensions in the `extensions` schema (its default
-- search_path includes it, so `vector` below resolves without a prefix).
create extension if not exists vector with schema extensions;

-- One embedding per restroom (sentence-transformers/all-MiniLM-L6-v2 = 384 dims).
-- Written only by the server with the secret key: signed-in users have
-- column-level insert/update grants (0001) that don't include this column.
alter table public.restrooms add column if not exists embedding vector(384);

-- Approximate nearest-neighbour index for cosine distance (<=>)
create index if not exists restrooms_embedding_idx
  on public.restrooms using hnsw (embedding vector_cosine_ops);

-- When the text that was embedded changes, the old embedding no longer
-- describes the restroom. Clear it so it gets re-generated (by the script or
-- the agent's background backfill).
create or replace function public.reset_restroom_embedding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.name is distinct from old.name
     or new.description is distinct from old.description
     or new.address is distinct from old.address
     or new.amenities is distinct from old.amenities
     or new.is_free is distinct from old.is_free then
    new.embedding := null;
  end if;
  return new;
end;
$$;

drop trigger if exists restrooms_reset_embedding on public.restrooms;
create trigger restrooms_reset_embedding
  before update on public.restrooms
  for each row execute function public.reset_restroom_embedding();

-- ============================================================
-- match_restrooms: vector search
-- ============================================================

-- Returns restrooms whose cosine similarity to the query is above the
-- threshold, most similar first. SECURITY INVOKER (the default), so RLS on
-- restrooms still applies. The embedding itself is not returned (it's big).
-- search_path includes `extensions` for the vector type and <=> operator.
create or replace function public.match_restrooms(
  query_embedding vector(384),
  match_threshold double precision,
  match_count integer
)
returns table (
  id uuid,
  name text,
  description text,
  address text,
  latitude double precision,
  longitude double precision,
  amenities text[],
  is_free boolean,
  images text[],
  rating double precision,
  review_count integer,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    r.id, r.name, r.description, r.address, r.latitude, r.longitude,
    r.amenities, r.is_free, r.images, r.rating, r.review_count,
    r.created_by, r.created_at, r.updated_at,
    1 - (r.embedding <=> query_embedding) as similarity
  from public.restrooms r
  where r.embedding is not null
    and 1 - (r.embedding <=> query_embedding) > match_threshold
  order by r.embedding <=> query_embedding
  -- Cap the result size whatever the caller asks for
  limit least(greatest(match_count, 1), 50);
$$;

-- The agent API requires a signed-in user, so only `authenticated` (and the
-- server's secret key) may call it. Functions are executable by PUBLIC by default.
revoke execute on function public.match_restrooms(vector, double precision, integer) from public, anon;
grant execute on function public.match_restrooms(vector, double precision, integer) to authenticated, service_role;

-- ============================================================
-- agent_queries: usage stats + rate limiting
-- ============================================================

-- One row per question sent to the AI agent. Used for the profile's usage
-- stats and for the API's per-user rate limit (requests in the last minute).
create table if not exists public.agent_queries (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists agent_queries_user_id_created_at_idx
  on public.agent_queries (user_id, created_at desc);

alter table public.agent_queries enable row level security;

-- Users only see and log their own queries. No update/delete grants, so the
-- rate-limit history can't be erased.
revoke all on public.agent_queries from anon, authenticated;
grant select on public.agent_queries to authenticated;
grant insert (user_id) on public.agent_queries to authenticated;

drop policy if exists "agent_queries: read own" on public.agent_queries;
create policy "agent_queries: read own"
  on public.agent_queries for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "agent_queries: insert own" on public.agent_queries;
create policy "agent_queries: insert own"
  on public.agent_queries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
