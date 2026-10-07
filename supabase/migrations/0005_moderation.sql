-- Poopipoo — Phase 11: anti-spam + moderation
--   rate limits, reports, community verification, AI flags, roles, bans.
-- Requires 0001–0004. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.
--
-- Make someone a moderator/admin (SQL Editor only; users can't change roles):
--   update public.profiles set role = 'admin' where username = '...';
--
-- Error messages raised here are matched by the app (lib/moderation/errors.ts):
--   'Rate limit exceeded'   detail = ISO time when adding is allowed again
--   'Report limit exceeded' detail = ISO time when reporting is allowed again
--   'Account banned'        detail = ban reason

-- ============================================================
-- Columns
-- ============================================================

alter table public.profiles add column if not exists trust_score integer not null default 0;
alter table public.profiles add column if not exists is_banned boolean not null default false;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists role text not null default 'user';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'moderator', 'admin'));

-- Existing restrooms (seed data, everything added before Phase 11) count as
-- approved and already checked: the columns are added with those values, then
-- the defaults switch to what new rows get. `if not exists` means a re-run
-- never touches statuses again.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restrooms' and column_name = 'status'
  ) then
    alter table public.restrooms add column status text not null default 'approved';
    alter table public.restrooms alter column status set default 'pending';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restrooms' and column_name = 'ai_checked_at'
  ) then
    alter table public.restrooms add column ai_checked_at timestamptz default now();
    alter table public.restrooms alter column ai_checked_at drop default;
  end if;
end;
$$;

alter table public.restrooms drop constraint if exists restrooms_status_check;
alter table public.restrooms add constraint restrooms_status_check
  check (status in ('pending', 'approved', 'rejected', 'flagged'));

alter table public.restrooms add column if not exists flag_count integer not null default 0;
alter table public.restrooms add column if not exists verified_count integer not null default 0;
alter table public.restrooms add column if not exists ai_flagged boolean not null default false;
alter table public.restrooms add column if not exists ai_flag_reason text;

-- Reviews are visible right away (no verification step), but can be flagged
-- by reports or hidden by a moderator/ban.
alter table public.reviews add column if not exists helpful_count integer not null default 0;
alter table public.reviews add column if not exists status text not null default 'approved';
alter table public.reviews add column if not exists flag_count integer not null default 0;

alter table public.reviews drop constraint if exists reviews_status_check;
alter table public.reviews add constraint reviews_status_check
  check (status in ('approved', 'rejected', 'flagged'));

create index if not exists restrooms_status_idx on public.restrooms (status);
create index if not exists profiles_is_banned_idx on public.profiles (is_banned) where is_banned;

-- ============================================================
-- Tables
-- ============================================================

-- One row per restroom a user added. Kept when the restroom is deleted, so
-- add → delete → add can't get around the rate limit.
create table if not exists public.restroom_submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  submitted_at  timestamptz not null default now()
);

create index if not exists restroom_submissions_user_id_submitted_at_idx
  on public.restroom_submissions (user_id, submitted_at desc);

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  target_type  text not null check (target_type in ('restroom', 'review', 'user')),
  target_id    uuid not null,
  reason       text not null check (reason in ('fake', 'inappropriate', 'spam', 'duplicate', 'other')),
  details      text check (char_length(details) <= 500),
  status       text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at   timestamptz not null default now(),
  -- One report per person per item: one user alone can't push an item over the thresholds
  unique (reporter_id, target_type, target_id)
);

create index if not exists reports_status_created_at_idx on public.reports (status, created_at desc);
create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists reports_reporter_id_created_at_idx on public.reports (reporter_id, created_at desc);

-- "Nakita ko na ito": one vote per user per restroom (the primary key)
create table if not exists public.restroom_verifications (
  restroom_id  uuid not null references public.restrooms (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (restroom_id, user_id)
);

create index if not exists restroom_verifications_user_id_idx on public.restroom_verifications (user_id);

-- moderator_id is NULL for automatic actions (AI moderation)
create table if not exists public.moderation_log (
  id            uuid primary key default gen_random_uuid(),
  moderator_id  uuid references public.profiles (id) on delete set null,
  action        text not null check (action in ('approve', 'reject', 'flag', 'ban', 'unban')),
  target_type   text not null check (target_type in ('restroom', 'review', 'user')),
  target_id     uuid not null,
  reason        text,
  created_at    timestamptz not null default now()
);

create index if not exists moderation_log_created_at_idx on public.moderation_log (created_at desc);

-- ============================================================
-- Helpers
-- ============================================================

-- True when the signed-in user is a moderator or admin.
-- SECURITY DEFINER so it can be used inside RLS policies without recursion.
create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator', 'admin')
  );
$$;

-- Raises 'Account banned' (detail = reason) when the signed-in user is banned.
-- No-op for the server's secret key / SQL Editor (auth.uid() is null there).
create or replace function public.assert_not_banned()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  reason text;
begin
  if (select auth.uid()) is null then
    return;
  end if;
  select p.ban_reason into reason
  from public.profiles as p
  where p.id = (select auth.uid()) and p.is_banned;
  if found then
    raise exception 'Account banned' using detail = coalesce(reason, ''), errcode = 'P0001';
  end if;
end;
$$;

-- ============================================================
-- Rate limit: max 1 restroom per 5 minutes, 5 per 24 hours, 20 per 7 days.
-- Rolling windows (not calendar days), counted from restroom_submissions.
-- ============================================================

-- When the user may add a restroom again; NULL = allowed now.
-- For each window that is full, the oldest submission inside it has to
-- "fall out" first: the N-th newest submission + window length.
create or replace function public.rate_limit_retry_at(target_user uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(
    greatest(
      -- 1 per 5 minutes
      (select max(s.submitted_at) + interval '5 minutes'
       from public.restroom_submissions as s
       where s.user_id = target_user and s.submitted_at > now() - interval '5 minutes'),
      -- 5 per day: the 5th newest in the last 24 hours
      (select s.submitted_at + interval '24 hours'
       from public.restroom_submissions as s
       where s.user_id = target_user and s.submitted_at > now() - interval '24 hours'
       order by s.submitted_at desc offset 4 limit 1),
      -- 20 per week: the 20th newest in the last 7 days
      (select s.submitted_at + interval '7 days'
       from public.restroom_submissions as s
       where s.user_id = target_user and s.submitted_at > now() - interval '7 days'
       order by s.submitted_at desc offset 19 limit 1),
      '-infinity'::timestamptz
    ),
    '-infinity'::timestamptz
  );
$$;

-- true = may add a restroom now, false = rate limited
create or replace function public.check_rate_limit(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.rate_limit_retry_at(user_id) is null;
$$;

-- For the /add page: the signed-in user's own limit (NULL = may add now)
create or replace function public.my_rate_limit_retry_at()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select public.rate_limit_retry_at((select auth.uid()));
$$;

-- BEFORE INSERT on restrooms: ban check, rate limit, then log the submission.
-- Inserts made with the secret key (seed/OSM import scripts) skip all of this.
create or replace function public.before_restroom_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  retry_at timestamptz;
begin
  if uid is null then
    return new;
  end if;

  perform public.assert_not_banned();

  -- Serialize this user's inserts so two at the same moment can't both pass
  perform pg_advisory_xact_lock(hashtext('restroom_submissions:' || uid::text));

  retry_at := public.rate_limit_retry_at(uid);
  if retry_at is not null then
    raise exception 'Rate limit exceeded'
      using detail = to_char(retry_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), errcode = 'P0001';
  end if;

  insert into public.restroom_submissions (user_id) values (uid);

  -- Always starts unreviewed, whatever the client sent
  new.status := 'pending';
  new.flag_count := 0;
  new.verified_count := 0;
  new.ai_flagged := false;
  new.ai_flag_reason := null;
  new.ai_checked_at := null;
  return new;
end;
$$;

drop trigger if exists restrooms_before_insert on public.restrooms;
create trigger restrooms_before_insert
  before insert on public.restrooms
  for each row execute function public.before_restroom_insert();

-- ============================================================
-- Ban check on every other user write.
-- (Restroom inserts are covered by before_restroom_insert above.)
-- ============================================================

create or replace function public.block_banned_writes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.assert_not_banned();
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists restrooms_block_banned on public.restrooms;
create trigger restrooms_block_banned
  before update or delete on public.restrooms
  for each row execute function public.block_banned_writes();

drop trigger if exists reviews_block_banned on public.reviews;
create trigger reviews_block_banned
  before insert or update or delete on public.reviews
  for each row execute function public.block_banned_writes();

drop trigger if exists review_votes_block_banned on public.review_votes;
create trigger review_votes_block_banned
  before insert or delete on public.review_votes
  for each row execute function public.block_banned_writes();

drop trigger if exists restroom_verifications_block_banned on public.restroom_verifications;
create trigger restroom_verifications_block_banned
  before insert or delete on public.restroom_verifications
  for each row execute function public.block_banned_writes();

-- Profiles: only when the banned user edits their own profile (username,
-- avatar). Point/level updates caused by other people's actions still work.
create or replace function public.block_banned_profile_edits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.id = (select auth.uid())
     and (new.username, new.avatar_url) is distinct from (old.username, old.avatar_url) then
    perform public.assert_not_banned();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_banned on public.profiles;
create trigger profiles_block_banned
  before update on public.profiles
  for each row execute function public.block_banned_profile_edits();

-- ============================================================
-- Reports: max 10 per 24 hours per user. Each report adds 1 to the target's
-- flag_count: 3+ → 'flagged' (still visible, marked "under review"),
-- 5+ → 'rejected' (hidden). A moderator decision resets the count.
-- ============================================================

create or replace function public.before_report_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  retry_at timestamptz;
  owner uuid;
begin
  perform public.assert_not_banned();

  -- Can't be set by the reporter
  new.status := 'pending';
  new.created_at := now();

  if uid is not null then
    perform pg_advisory_xact_lock(hashtext('reports:' || uid::text));
    select r.created_at + interval '24 hours' into retry_at
    from public.reports as r
    where r.reporter_id = uid and r.created_at > now() - interval '24 hours'
    order by r.created_at desc offset 9 limit 1;
    if retry_at is not null then
      raise exception 'Report limit exceeded'
        using detail = to_char(retry_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), errcode = 'P0001';
    end if;
  end if;

  -- The target must exist, and you can't report your own things
  if new.target_type = 'restroom' then
    select created_by into owner from public.restrooms where id = new.target_id;
  elsif new.target_type = 'review' then
    select user_id into owner from public.reviews where id = new.target_id;
  else
    select id into owner from public.profiles where id = new.target_id;
  end if;
  if not found then
    raise exception 'Report target not found' using errcode = 'P0002';
  end if;
  if owner = uid then
    raise exception 'Cannot report own content' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.before_report_insert();

-- Status after a report: never un-rejects, never downgrades
create or replace function public.status_after_reports(current_status text, flags integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when current_status = 'rejected' or flags >= 5 then 'rejected'
    when flags >= 3 then 'flagged'
    else current_status
  end;
$$;

create or replace function public.after_report_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'restroom' then
    update public.restrooms
    set flag_count = flag_count + 1,
        status = public.status_after_reports(status, flag_count + 1)
    where id = new.target_id;
  elsif new.target_type = 'review' then
    update public.reviews
    set flag_count = flag_count + 1,
        status = public.status_after_reports(status, flag_count + 1)
    where id = new.target_id;
  end if;
  return null;
end;
$$;

drop trigger if exists reports_after_insert on public.reports;
create trigger reports_after_insert
  after insert on public.reports
  for each row execute function public.after_report_insert();

-- ============================================================
-- Community verification: each vote updates verified_count. At 5 votes a
-- 'pending' restroom becomes 'approved'. Flagged/rejected ones need a
-- moderator (votes can't override reports). Un-voting never un-approves.
-- ============================================================

create or replace function public.after_verification_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.restrooms
    set verified_count = verified_count + 1,
        status = case when status = 'pending' and verified_count + 1 >= 5 then 'approved' else status end
    where id = new.restroom_id;
  else
    -- Restroom deleted (cascade): nothing to update
    update public.restrooms
    set verified_count = greatest(verified_count - 1, 0)
    where id = old.restroom_id;
  end if;
  return null;
end;
$$;

drop trigger if exists restroom_verifications_after_change on public.restroom_verifications;
create trigger restroom_verifications_after_change
  after insert or delete on public.restroom_verifications
  for each row execute function public.after_verification_change();

-- ============================================================
-- Trust score of the person who added a restroom:
--   +2 per confirmation, +10 while approved, -20 while rejected.
-- Applied as the difference between the old and new row, so it follows
-- every change (votes, reports, moderator decisions) and can't be farmed by
-- flipping back and forth. Deleting a restroom doesn't change it (deleting a
-- rejected restroom doesn't erase the penalty).
-- ============================================================

create or replace function public.restroom_trust_points(status text, verified_count integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 2 * verified_count
    + case status when 'approved' then 10 when 'rejected' then -20 else 0 end;
$$;

create or replace function public.update_trust_score()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer;
begin
  if new.created_by is null then
    return null;
  end if;
  delta := public.restroom_trust_points(new.status, new.verified_count)
         - public.restroom_trust_points(old.status, old.verified_count);
  if delta <> 0 then
    update public.profiles set trust_score = trust_score + delta where id = new.created_by;
  end if;
  return null;
end;
$$;

drop trigger if exists restrooms_update_trust_score on public.restrooms;
create trigger restrooms_update_trust_score
  after update of status, verified_count on public.restrooms
  for each row execute function public.update_trust_score();

-- ============================================================
-- Ratings ignore hidden (rejected) reviews.
-- Same as 0002's function plus the status filter; also re-runs when a
-- review's status changes.
-- ============================================================

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
       where rv.restroom_id = r.id and rv.status <> 'rejected'),
      0
    ),
    review_count = (
      select count(*)::integer
      from public.reviews as rv
      where rv.restroom_id = r.id and rv.status <> 'rejected'
    )
  where r.id = any(affected);

  return null;
end;
$$;

-- ============================================================
-- Moderator actions (called from the /moderation dashboard with the
-- moderator's own session; each checks the role itself).
-- ============================================================

-- approve: keep it (status approved, flags cleared, pending reports dismissed)
-- reject:  hide it (status rejected, pending reports resolved)
create or replace function public.moderate_content(
  target_type text,
  target_id uuid,
  decision text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_status text;
begin
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if decision not in ('approve', 'reject') then
    raise exception 'Invalid decision' using errcode = '22023';
  end if;
  new_status := case decision when 'approve' then 'approved' else 'rejected' end;

  if target_type = 'restroom' then
    update public.restrooms as r
    set status = new_status,
        flag_count = case when decision = 'approve' then 0 else r.flag_count end,
        ai_flagged = case when decision = 'approve' then false else r.ai_flagged end
    where r.id = target_id;
  elsif target_type = 'review' then
    update public.reviews as rv
    set status = new_status,
        flag_count = case when decision = 'approve' then 0 else rv.flag_count end
    where rv.id = target_id;
  else
    raise exception 'Invalid target type' using errcode = '22023';
  end if;
  if not found then
    raise exception 'Target not found' using errcode = 'P0002';
  end if;

  update public.reports as rp
  set status = case when decision = 'approve' then 'dismissed' else 'resolved' end
  where rp.target_type = moderate_content.target_type
    and rp.target_id = moderate_content.target_id
    and rp.status in ('pending', 'reviewed');

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason)
  values ((select auth.uid()), decision, target_type, target_id, nullif(btrim(reason), ''));
end;
$$;

-- Bans a user: hides all their restrooms and reviews, logs it.
-- Moderators can ban users; only admins can ban moderators; admins can't be banned.
create or replace function public.ban_user(user_id uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_role text;
  clean_reason text := nullif(btrim(reason), '');
begin
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  if user_id = (select auth.uid()) then
    raise exception 'Cannot ban yourself' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required' using errcode = '22023';
  end if;

  select p.role into target_role from public.profiles as p where p.id = ban_user.user_id;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  if target_role = 'admin'
     or (target_role = 'moderator'
         and not exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.profiles as p
  set is_banned = true, ban_reason = left(clean_reason, 300), banned_at = now()
  where p.id = ban_user.user_id;

  update public.restrooms as r set status = 'rejected' where r.created_by = ban_user.user_id;
  update public.reviews as rv set status = 'rejected' where rv.user_id = ban_user.user_id;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason)
  values ((select auth.uid()), 'ban', 'user', ban_user.user_id, clean_reason);
end;
$$;

-- Lifts a ban. Their hidden content stays hidden (a moderator can approve
-- items one by one).
create or replace function public.unban_user(user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_moderator() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  update public.profiles as p
  set is_banned = false, ban_reason = null, banned_at = null
  where p.id = unban_user.user_id and p.is_banned;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  insert into public.moderation_log (moderator_id, action, target_type, target_id, reason)
  values ((select auth.uid()), 'unban', 'user', unban_user.user_id, null);
end;
$$;

-- Saves the AI moderation result for a new restroom (called by the server
-- with the secret key from /api/moderate). Flags it when the AI is confident.
create or replace function public.record_ai_moderation(
  restroom_id uuid,
  is_suspicious boolean,
  reason text,
  confidence double precision
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  flag boolean := is_suspicious and confidence > 0.8;
begin
  update public.restrooms as r
  set ai_checked_at = now(),
      ai_flagged = flag,
      ai_flag_reason = case when flag then left(reason, 300) else null end,
      -- Only a pending restroom gets flagged (don't override a moderator)
      status = case when flag and r.status = 'pending' then 'flagged' else r.status end
  where r.id = record_ai_moderation.restroom_id;

  if flag then
    insert into public.moderation_log (moderator_id, action, target_type, target_id, reason)
    values (null, 'flag', 'restroom', record_ai_moderation.restroom_id,
            left(reason, 300) || ' (AI, ' || round(confidence::numeric, 2) || ')');
  end if;
  return flag;
end;
$$;

-- ============================================================
-- Function privileges (functions are executable by PUBLIC by default)
-- ============================================================

revoke execute on function public.assert_not_banned() from public, anon, authenticated;
revoke execute on function public.rate_limit_retry_at(uuid) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(uuid) from public, anon, authenticated;
revoke execute on function public.before_restroom_insert() from public, anon, authenticated;
revoke execute on function public.block_banned_writes() from public, anon, authenticated;
revoke execute on function public.block_banned_profile_edits() from public, anon, authenticated;
revoke execute on function public.before_report_insert() from public, anon, authenticated;
revoke execute on function public.after_report_insert() from public, anon, authenticated;
revoke execute on function public.after_verification_change() from public, anon, authenticated;
revoke execute on function public.update_trust_score() from public, anon, authenticated;
revoke execute on function public.record_ai_moderation(uuid, boolean, text, double precision) from public, anon, authenticated;

grant execute on function public.check_rate_limit(uuid) to service_role;
grant execute on function public.record_ai_moderation(uuid, boolean, text, double precision) to service_role;

revoke execute on function public.my_rate_limit_retry_at() from public, anon;
grant execute on function public.my_rate_limit_retry_at() to authenticated;

revoke execute on function public.moderate_content(text, uuid, text, text) from public, anon;
revoke execute on function public.ban_user(uuid, text) from public, anon;
revoke execute on function public.unban_user(uuid) from public, anon;
grant execute on function public.moderate_content(text, uuid, text, text) to authenticated;
grant execute on function public.ban_user(uuid, text) to authenticated;
grant execute on function public.unban_user(uuid) to authenticated;

-- is_moderator() is used in RLS policies, so every role needs it
grant execute on function public.is_moderator() to anon, authenticated;

-- ============================================================
-- Column privileges
-- The new moderation columns are read-only for users: the existing column
-- grants (0001, 0004) only allow name/address/... on restrooms, rating/
-- comment/images on reviews and username/avatar_url on profiles. Re-applied
-- here so it's explicit.
-- ============================================================

revoke update on public.profiles from authenticated;
grant update (username, avatar_url) on public.profiles to authenticated;

revoke insert, update on public.restrooms from authenticated;
grant insert (name, description, address, latitude, longitude, amenities, is_free, images, created_by)
  on public.restrooms to authenticated;
grant update (name, description, address, latitude, longitude, amenities, is_free, images)
  on public.restrooms to authenticated;

revoke insert, update on public.reviews from authenticated;
grant insert (restroom_id, user_id, rating, comment, images) on public.reviews to authenticated;
grant update (rating, comment, images) on public.reviews to authenticated;

revoke all on public.restroom_submissions, public.reports, public.restroom_verifications, public.moderation_log
  from anon, authenticated;

grant select on public.restroom_submissions to authenticated;

grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, reason, details) on public.reports to authenticated;

grant select on public.restroom_verifications to anon, authenticated;
grant insert (restroom_id, user_id) on public.restroom_verifications to authenticated;
grant delete on public.restroom_verifications to authenticated;

grant select on public.moderation_log to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

-- Rejected restrooms/reviews are hidden from everyone except their author
-- (so they can see what happened) and moderators.
drop policy if exists "Restrooms are viewable by everyone" on public.restrooms;
create policy "Restrooms are viewable by everyone"
  on public.restrooms for select
  using (status <> 'rejected' or created_by = (select auth.uid()) or (select public.is_moderator()));

drop policy if exists "Reviews are viewable by everyone" on public.reviews;
create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (status <> 'rejected' or user_id = (select auth.uid()) or (select public.is_moderator()));

alter table public.restroom_submissions enable row level security;
alter table public.reports enable row level security;
alter table public.restroom_verifications enable row level security;
alter table public.moderation_log enable row level security;

-- restroom_submissions: read own. Rows are added by the restrooms trigger
-- (SECURITY DEFINER), so there's no insert grant: a user inserting rows
-- directly could only make their own limit stricter anyway.
drop policy if exists "Users can read their own submissions" on public.restroom_submissions;
create policy "Users can read their own submissions"
  on public.restroom_submissions for select to authenticated
  using ((select auth.uid()) = user_id);

-- reports: read own (moderators read all), insert as yourself
drop policy if exists "Users can read their own reports" on public.reports;
create policy "Users can read their own reports"
  on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id or (select public.is_moderator()));

drop policy if exists "Signed-in users can report" on public.reports;
create policy "Signed-in users can report"
  on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- verifications: counts are public; vote as yourself, not on your own restroom
drop policy if exists "Verifications are viewable by everyone" on public.restroom_verifications;
create policy "Verifications are viewable by everyone"
  on public.restroom_verifications for select
  using (true);

drop policy if exists "Users can verify other people's restrooms" on public.restroom_verifications;
create policy "Users can verify other people's restrooms"
  on public.restroom_verifications for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.restrooms as r
      where r.id = restroom_id
        and r.status <> 'rejected'
        and r.created_by is distinct from (select auth.uid())
    )
  );

drop policy if exists "Users can remove their own verification" on public.restroom_verifications;
create policy "Users can remove their own verification"
  on public.restroom_verifications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- moderation_log: moderators/admins only (written by the functions above)
drop policy if exists "Moderators can read the moderation log" on public.moderation_log;
create policy "Moderators can read the moderation log"
  on public.moderation_log for select to authenticated
  using ((select public.is_moderator()));

-- ============================================================
-- Vector search returns the moderation status too (return type changed,
-- so drop and recreate). Still SECURITY INVOKER: RLS hides rejected rows.
-- ============================================================

drop function if exists public.match_restrooms(vector, double precision, integer);
create function public.match_restrooms(
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
  status text,
  verified_count integer,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    r.id, r.name, r.description, r.address, r.latitude, r.longitude,
    r.amenities, r.is_free, r.images, r.rating, r.review_count,
    r.created_by, r.created_at, r.updated_at, r.status, r.verified_count,
    1 - (r.embedding <=> query_embedding) as similarity
  from public.restrooms r
  where r.embedding is not null
    and r.status <> 'rejected'
    and 1 - (r.embedding <=> query_embedding) > match_threshold
  order by r.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;

revoke execute on function public.match_restrooms(vector, double precision, integer) from public, anon;
grant execute on function public.match_restrooms(vector, double precision, integer) to authenticated, service_role;
