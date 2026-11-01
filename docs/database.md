# Database

Supabase Postgres. The schema lives in `supabase/migrations/` (run in order; each file is safe to re-run). TypeScript types are written by hand in `types/database.ts` and must match.

| Migration | Adds |
| --- | --- |
| `0001_init.sql` | `profiles`, `restrooms`, `reviews`, column grants, RLS |
| `0002_reviews.sql` | Review constraints, one review per user per restroom, rating trigger |
| `0003_embeddings.sql` | pgvector `embedding` column, `match_restrooms()`, `agent_queries` |
| `0004_gamification.sql` | Points, levels, badges, `review_votes`, avatars bucket |
| `0005_moderation.sql` | Roles, bans, trust score, statuses, reports, verifications, rate limits, moderation log |
| `0006_osm.sql` | `source`, `osm_type`, `osm_id` for OpenStreetMap imports |
| `0007_account_deletion.sql` | `delete_account` as a `moderation_log` action |
| `0009_demo_mode.sql` | Demo account: `profiles.is_demo`, `reviews.is_demo`, `agent_queries.session_id`, read-only triggers (there is no `0008`) |

## Tables

### profiles
One row per auth user (created by a trigger on sign-up).

| Column | Notes |
| --- | --- |
| `id` | = `auth.users.id` |
| `username`, `avatar_url` | The only columns users can update |
| `points`, `level` | Trigger-maintained: +10 per restroom, +5 per review, +1 per helpful vote received |
| `badges` | Badge ids; written by the server with the secret key |
| `trust_score` | +2 per confirmation of your restrooms, +10 while one is approved, −20 while one is rejected |
| `role` | `user` \| `moderator` \| `admin` (set in SQL only) |
| `is_banned`, `ban_reason`, `banned_at` | Set by `ban_user()` |

### restrooms

| Column | Notes |
| --- | --- |
| `name`, `description`, `address`, `latitude`, `longitude`, `amenities`, `is_free`, `images` | User-editable. `amenities` ⊆ bidet, tissue, soap, wheelchair, baby-changing, shower, air-conditioned, free |
| `rating`, `review_count` | From non-rejected reviews (trigger) |
| `created_by` | Author; `NULL` for seeded and imported rows |
| `status` | `pending` (new) → `approved` (5 confirmations or a moderator) / `flagged` (3+ reports or AI) / `rejected` (5+ reports, moderator or ban; hidden) |
| `verified_count`, `flag_count` | Trigger-maintained |
| `ai_flagged`, `ai_flag_reason`, `ai_checked_at` | AI moderation result |
| `source`, `osm_type`, `osm_id` | `user` \| `seed` \| `osm`; unique `(osm_type, osm_id)` |
| `embedding` | `vector(384)`, cleared when the text changes |

### reviews
`rating` 1–5, `comment` ≤ 500 characters, `helpful_count`, `status` (`approved` \| `flagged` \| `rejected`), `flag_count`. One review per user per restroom.

### Other tables

| Table | Purpose |
| --- | --- |
| `review_votes` | "Helpful" votes; one per user per review; not on your own |
| `restroom_verifications` | "I've seen this" votes; one per user per restroom; not on your own |
| `reports` | Reports on restrooms/reviews; one per reporter per item |
| `restroom_submissions` | One row per restroom a user added (kept after deletes); used by the rate limit |
| `moderation_log` | Every moderator action, AI flag and account deletion (`moderator_id` `NULL` = AI, or a deleted user) |
| `agent_queries` | When each user asked the assistant (rate limit and stats) |

## Rules enforced in the database

- **Row Level Security** on every table. Rejected restrooms/reviews are visible only to their author and moderators. Reports are visible to the reporter and moderators. The moderation log is visible to moderators only.
- **Column grants**: users can only write the columns listed as user-editable above. Status, counts, points, roles and AI fields are read-only for them.
- **Rate limits** (trigger `before_restroom_insert`): 1 restroom per 5 minutes, 5 per 24 hours, 20 per 7 days. Reports: 10 per 24 hours. The error detail says when it's allowed again.
- **Bans** (`assert_not_banned()`): banned users can't add, edit, review, vote, verify, report or change their profile.
- **Demo account** (`is_demo_user()`, 0009): can only write reviews. Its reviews are visible only to itself and don't count toward ratings; it earns no points (so it's never on the leaderboard); restroom, report, verification, vote, profile and avatar writes raise `Demo mode`.
- Inserts with the secret key (seed and import scripts) skip the rate limit; they have no signed-in user.

Error messages the app recognizes (`lib/moderation/errors.ts`): `Rate limit exceeded`, `Report limit exceeded`, `Account banned`, `Forbidden`, `Demo mode`.

## Storage

Bucket `avatars` (public): `avatars/<user id>/...`, JPG/PNG/WebP, max 2 MB, each user writes only their own folder.
