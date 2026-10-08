-- Poopipoo — Phase 13: real account deletion.
-- Requires 0005_moderation.sql. Safe to re-run.
-- Run in Supabase Dashboard → SQL Editor.
--
-- Deleting the auth user (POST /api/account/delete, with the secret key)
-- cascades through the existing foreign keys:
--   profiles                 → deleted (on delete cascade from auth.users)
--   reviews, review_votes,
--   reports, verifications,
--   agent_queries,
--   restroom_submissions     → deleted (cascade from profiles)
--   restrooms.created_by     → set to NULL (the restroom stays for everyone)
--   moderation_log.moderator → set to NULL
-- The existing review triggers recalculate restroom ratings and points.
--
-- This migration only lets the deletion be recorded in moderation_log.

alter table public.moderation_log drop constraint if exists moderation_log_action_check;
alter table public.moderation_log
  add constraint moderation_log_action_check
  check (action in ('approve', 'reject', 'flag', 'ban', 'unban', 'delete_account'));
