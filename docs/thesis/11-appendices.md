# Chapter 11. Appendices

| Appendix | Content |
| --- | --- |
| A | Database schema |
| B | API endpoints |
| C | Component list |
| D | Environment variables |
| E | Deployment guide |
| F | Code snippets |
| G | Test results |
| H | Screenshots |

---

## Appendix A. Database Schema

### A.1 Migrations

All migrations are in `supabase/migrations/`. Each is safe to re-run and is applied in order in the Supabase SQL Editor.

| File | Phase | Adds |
| --- | --- | --- |
| `0001_init.sql` | 5 | `profiles`, `restrooms`, `reviews`; column grants; RLS; profile-creation trigger |
| `0002_reviews.sql` | 6 | Review constraints, one review per user per restroom, rating trigger |
| `0003_embeddings.sql` | 8 | pgvector, `restrooms.embedding vector(384)` with an HNSW index, `match_restrooms()`, `agent_queries` |
| `0004_gamification.sql` | 10 | Points, levels, badges, `review_votes`, `avatars` storage bucket |
| `0005_moderation.sql` | 11 | Roles, bans, trust score, statuses, `reports`, `restroom_verifications`, `restroom_submissions`, `moderation_log`, rate limits, moderation functions |
| `0006_osm.sql` | 12 | `source`, `osm_type`, `osm_id` (unique pair) |
| `0007_account_deletion.sql` | 13 | `delete_account` as a moderation-log action |

### A.2 Tables

**profiles** (one row per authentication user, created by a trigger on sign-up)

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, PK | = `auth.users.id`, `on delete cascade` |
| `username` | text | 3–40 characters; user-editable |
| `avatar_url` | text | User-editable |
| `points`, `level` | integer | Maintained by triggers |
| `badges` | text[] | Written by the server |
| `trust_score` | integer | Maintained by triggers |
| `role` | text | `user`, `moderator` or `admin`; set in SQL only |
| `is_banned`, `ban_reason`, `banned_at` | boolean, text, timestamptz | Set by `ban_user()` / `unban_user()` |

**restrooms**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid, PK | |
| `name`, `description`, `address` | text | User-editable, length-checked |
| `latitude`, `longitude` | double precision | User-editable, range-checked |
| `amenities` | text[] | Subset of bidet, tissue, soap, wheelchair, baby-changing, shower, air-conditioned, free |
| `is_free` | boolean | |
| `images` | text[] | Reserved; no upload yet |
| `rating`, `review_count` | double precision, integer | From non-rejected reviews (trigger) |
| `created_by` | uuid, FK → profiles | `on delete set null`; NULL for seeded and imported rows |
| `status` | text | `pending`, `approved`, `flagged` or `rejected` |
| `verified_count`, `flag_count` | integer | Trigger-maintained |
| `ai_flagged`, `ai_flag_reason`, `ai_checked_at` | boolean, text, timestamptz | AI moderation result |
| `source`, `osm_type`, `osm_id` | text | `user`, `seed` or `osm`; unique (`osm_type`, `osm_id`) |
| `embedding` | vector(384) | Cleared by a trigger when the text changes |
| `created_at`, `updated_at` | timestamptz | |

**reviews:** `id`, `restroom_id` (FK, cascade), `user_id` (FK, cascade), `rating` (1–5), `comment` (≤ 500 characters), `helpful_count`, `status` (`approved`, `flagged` or `rejected`), `flag_count`, timestamps. One review per user per restroom.

**Other tables**

| Table | Key columns | Purpose |
| --- | --- | --- |
| `review_votes` | `review_id`, `user_id` | "Helpful" votes; one per user per review; not on one's own |
| `restroom_verifications` | `restroom_id`, `user_id` | "I've seen this"; one per user per restroom; not on one's own |
| `reports` | `reporter_id`, `target_type`, `target_id`, `reason`, `details`, `status` | One per reporter per item |
| `restroom_submissions` | `user_id`, `submitted_at` | Rate-limit history (kept after deletes) |
| `moderation_log` | `moderator_id`, `action`, `target_type`, `target_id`, `reason` | Moderator actions, AI flags, account deletions |
| `agent_queries` | `user_id`, `created_at` | Assistant usage (rate limit and statistics) |

### A.3 Database functions callable by clients

| Function | Caller | Purpose |
| --- | --- | --- |
| `match_restrooms(query_embedding, match_threshold, match_count)` | Signed-in users, server | Vector search (cosine similarity) |
| `my_rate_limit_retry_at()` | Signed-in users | When the user may add a restroom again (NULL = now) |
| `moderate_content(target_type, target_id, decision, reason)` | Moderators | Approve or reject a restroom or review; logged |
| `ban_user(user_id, reason)`, `unban_user(user_id)` | Moderators | Ban or unban; logged |
| `record_ai_moderation(...)`, `check_rate_limit(user_id)` | Server only | AI moderation result; rate-limit check |

---

## Appendix B. API Endpoints

Common rules: `POST` with a JSON body; authentication through the Supabase session cookie; requests from another site's `Origin` are refused (`403`); bodies validated with zod (`400 invalid`); error bodies are `{ "error": "<message in the visitor's language>", "code": "<code>" }`.

| Endpoint | Request body | Success | Errors |
| --- | --- | --- | --- |
| `POST /api/agent` | `message` (1–500), optional `user_lat`/`user_lng`, `history` (≤ 20) | `200 { message, restrooms?, action? }` | `401`, `429 rate_limited` (10/min), `429 ai_busy`, `502/504 upstream`, `503 config` |
| `POST /api/moderate` | `restroom_id` | `200 { checked, flagged }` or `{ checked: false, reason: "already_checked" }` | `403 forbidden`, `404 not_found`, `429 ai_busy`, `502/503/504 ai_failed` |
| `POST /api/report` | `target_type`, `target_id`, `reason` (`fake`, `inappropriate`, `spam`, `duplicate`, `other`), optional `details` (≤ 500) | `201 { ok: true }` | `400 own`, `403 banned`, `404 not_found`, `409 already_reported`, `429 rate_limited` |
| `POST /api/verify` | `restroom_id`, `action` (`verify` or `unverify`) | `200 { verified, verified_count, status }` | `403 not_allowed`, `403 banned` |
| `POST /api/account/delete` | `username` (must match) | `200 { ok: true }`, session cookies cleared | `400 mismatch`, `401 unauthorized`, `500 server` |

Other routes: `GET /sitemap.xml`, `GET /robots.txt`, `GET /opengraph-image`, `GET /auth/callback`, `POST /auth/logout`.

---

## Appendix C. Component List

91 React components in `components/`, grouped by feature.

| Folder | Components |
| --- | --- |
| `add` | AddRestroomForm |
| `agent` | AgentChat |
| `auth` | AuthCard, LoginForm, LogoutButton, SignupForm |
| `brand` | MapDecorations (CompassRose, CurlyArrow, CrPin) |
| `i18n` | I18nProvider, LanguageSwitch, T |
| `layout` | BottomNav, Header, LegalPage, Providers, StatusScreen, UnsavedChangesGuard |
| `leaderboard` | Leaderboard |
| `map` | BaseTileLayer, ClusteredMarkers, LocationPicker, MapController, MiniMap, MiniMapLoader, NearMeButton, RestroomMap, RouteLayer, SearchBar, UserLocationLayer |
| `moderation` | ModerationDashboard, Notices, ReportButton, RestroomStatusBadge, VerifyButton |
| `navigation` | ManeuverIcon, NavigateButton, NavigationPanel |
| `onboarding` | Onboarding |
| `profile` | AgentSettings, BadgesGrid, LevelCard, ProfileView, ThemeSetting |
| `restroom` | BackButton, DeleteRestroomButton, DeleteReviewButton, DistanceFromUser, LocalRestroomsUpload, RestroomBadges, RestroomDetail, RestroomFilters, RestroomList, RestroomListItem, RestroomNotFound, RestroomRating, RestroomSheet, ReviewForm, ReviewList, ReviewsSection, ShareButton, StarRating |
| `settings` | AccountSettings, DataSettings, DeleteAccountButton, SettingsView |
| `ui` | AnimatedButton, AnimatedCard, AnimatedCheck, ConfirmModal, CountUp, EmptyState, Modal, SearchInput, and shadcn/ui primitives (alert-dialog, avatar, badge, button, card, dialog, dropdown-menu, form, input, label, popover, separator, sheet, skeleton, tabs, textarea, toast, toaster, tooltip) |

Custom hooks (`hooks/`): use-agent-chat, use-agent-enabled, use-auth-user, use-error-toast, use-geolocation, use-i18n, use-main-scroll, use-navigation, use-restrooms, use-theme, use-toast, use-unsaved-changes, use-watch-position.

---

## Appendix D. Environment Variables

| Name | Where it is used | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser and server | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser and server | Yes | Publishable key (`sb_publishable_...`); RLS limits what it can do |
| `SUPABASE_SECRET_KEY` | **Server only** | Yes | Secret key (`sb_secret_...`); bypasses RLS; never exposed to the browser or committed |
| `GROQ_API_KEY` | Server only | For AI features | AI assistant and AI moderation |
| `HUGGINGFACE_API_KEY` | Server only | No | Embeddings through the API; without it or without credits, the model runs locally |
| `NEXT_PUBLIC_CARTO_API_KEY` | Browser | No | CARTO basemap key; without it, OpenStreetMap tiles are used |
| `NEXT_PUBLIC_SITE_URL` | Server | No | Canonical site URL; defaults to Vercel's production URL |

Local values go in `.env.local`, which is excluded from Git. `.env.example` lists the names without values.

---

## Appendix E. Deployment Guide

### E.1 Supabase

1. Create a Supabase project.
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql` to `0007_account_deletion.sql` in order.
3. In **Authentication → URL Configuration**, set the Site URL to the production URL and add `https://<domain>/auth/callback` as a redirect URL.
4. Copy the project URL, the publishable key and the secret key.
5. To make an administrator: `update public.profiles set role = 'admin' where username = '<username>';`

### E.2 Data

```bash
npx tsx scripts/import-osm.ts --dry-run          # preview the OpenStreetMap import
npx tsx scripts/import-osm.ts                    # import all cities in lib/cities.ts
npx tsx scripts/rename-osm-restrooms.ts          # descriptive names for unnamed toilets
npx tsx scripts/generate-embeddings.ts           # embeddings for the AI search (local model)
```

`scripts/seed-manila-cr.sql` adds 20 hand-picked Manila restrooms (run in the SQL Editor).

### E.3 Vercel

1. Import the GitHub repository in Vercel (framework preset: Next.js).
2. Add the environment variables from Appendix D under **Project → Settings → Environment Variables**.
3. Enable **Web Analytics** and **Speed Insights** in the project.
4. Every push to `main` builds and deploys to production automatically.

### E.4 Checks after deploying

- The site loads, and `/sitemap.xml` lists the city and restroom pages.
- Login works (the redirect URL is correct).
- The AI assistant answers a sample question.
- Installed PWAs may show the previous version until reopened or hard-reloaded.

---

## Appendix F. Code Snippets

### F.1 Rate limit enforced in the database (`0005_moderation.sql`, excerpt)

```sql
-- BEFORE INSERT on restrooms: ban check, rate limit, then log the submission.
-- Inserts made with the secret key (seed/OSM import scripts) skip all of this.
create or replace function public.before_restroom_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
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
  return new;
end;
$$;
```

### F.2 Vector search (`0005_moderation.sql`, excerpt)

```sql
create function public.match_restrooms(
  query_embedding vector(384), match_threshold double precision, match_count integer
)
returns table (id uuid, name text, /* ... */ similarity double precision)
language sql stable set search_path = public, extensions as $$
  select r.id, r.name, /* ... */ 1 - (r.embedding <=> query_embedding) as similarity
  from public.restrooms r
  where r.embedding is not null
    and r.status <> 'rejected'
    and 1 - (r.embedding <=> query_embedding) > match_threshold
  order by r.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 50);
$$;
```

`<=>` is pgvector's cosine-distance operator; the HNSW index on `embedding` keeps this fast.

### F.3 Embedding with fallback (`lib/ai/embeddings.ts`, excerpt)

```ts
let vector: number[] | null = null;
if (process.env.HUGGINGFACE_API_KEY && Date.now() >= apiSkippedUntil) {
  try {
    vector = await embedViaApi(input);
  } catch (error) {
    if (!(error instanceof EmbeddingError)) throw error;
    // "No credits": skip the API for 30 minutes instead of failing every question
    if (error.message.includes("HTTP 402")) apiSkippedUntil = Date.now() + API_COOLDOWN_MS;
  }
}
if (!vector) vector = await embedLocally(input); // same model via transformers.js
```

### F.4 Choosing a landmark to name a toilet (`lib/osm-naming.ts`)

```ts
export function pickLandmark(latitude: number, longitude: number, landmarks: OsmLandmark[]): OsmLandmark | null {
  const scored = landmarks
    .map((landmark) => ({
      landmark,
      meters: distanceMeters(latitude, longitude, landmark.latitude, landmark.longitude),
    }))
    .filter(({ meters }) => meters <= 800);

  // Within 25 m (not a food stall): almost surely where the toilet is
  const nextTo = scored
    .filter(({ landmark, meters }) => meters <= NEXT_TO_M && !FOOD.has(landmark.kind))
    .sort((a, b) => a.meters - b.meters)[0];
  if (nextTo) return nextTo.landmark;

  // Closest relative to how big that kind of place is
  const best = (radii: Record<string, number>) =>
    scored
      .filter(({ landmark, meters }) => radii[landmark.kind] !== undefined && meters <= radii[landmark.kind])
      .sort((a, b) => a.meters / radii[a.landmark.kind] - b.meters / radii[b.landmark.kind])[0]?.landmark ?? null;

  return best(BIG_RADIUS) ?? best(SMALL_RADIUS);
}
```

### F.5 Cross-site request check (`lib/security/same-origin.ts`)

```ts
export function isCrossSiteRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host !== host;
  } catch {
    return true; // malformed Origin
  }
}
```

### F.6 Both languages checked at compile time (`lib/i18n/dictionaries/`)

```ts
// index.ts
export type Dictionary = typeof tl; // the Tagalog dictionary defines the shape

// en.ts
export const en: Dictionary = {
  // a missing or extra key here is a TypeScript error, so the build fails
};
```

---

## Appendix G. Test Results

Final run, October 2026 (see Chapter 7 for the method).

| Suite | Checks | Passed |
| --- | --- | --- |
| Database rules | 63 | 63 |
| Phase 11 UI | 29 | 29 |
| Phase 12 | 42 | 42 |
| Brand and theme | 41 | 41 |
| Phase 13 pages | 34 | 34 |
| Account deletion | 18 | 18 |
| Login at desktop zoom (reachability) | 20 | 20 |
| Login fits without scrolling (stricter) | 4 | 0 |
| **Total** | **251** | **247** |

### G.1 Database rules (63 checks, all passed)

| Area | Checks |
| --- | --- |
| Rate limits | new restroom becomes pending; submission logged; 2nd insert within 5 minutes blocked; retry time returned; fresh user unaffected; `check_rate_limit` not callable by users; 6th in 24 hours blocked; 21st in 7 days blocked |
| Column grants | user cannot set restroom status, own role or own trust score |
| Verification | cannot verify own restroom; 4 votes keep it pending; duplicate vote refused; 5th vote approves; trust score +10 and +2 per vote; un-verifying lowers the count but keeps it approved |
| Reports | 2 reports keep it pending; 3 flag it; same user cannot report twice; cannot report own content; missing target refused; cannot report as someone else (RLS); cannot set report status; 5 reports reject it; trust score −20 |
| Visibility (RLS) | rejected restroom hidden from guests and other users, visible to the author and moderators; users read only their own reports; moderators read all |
| Report limit | 10 reports in 24 hours allowed, 11th refused |
| Moderation | non-moderators cannot moderate; approve resets flags and dismisses reports; trust score restored; rejected review excluded from the rating; users cannot read the log; moderators can |
| AI moderation | users cannot call `record_ai_moderation`; confidence 0.75 not flagged; 0.95 flagged and logged |
| Bans | non-moderators cannot ban; reason required; cannot ban oneself; ban hides all of the user's restrooms; banned user cannot add, review, rename, report or vote; unban restores; both logged; moderators cannot ban moderators; seeded restrooms unaffected |

### G.2 Phase 11 UI (29 checks, all passed)

AI moderation flags a gibberish restroom; a second check returns `already_checked`; unknown id refused. The add page shows the rate-limit countdown with no horizontal scrolling. Restroom pages show the flagged and pending badges, owner notes and the verify section; verify and undo update the count. The report modal opens with labelled fields, submits once, and shows "already reported" the second time. The profile shows the trust score and the user's reports, and moderators see a Moderation link. The dashboard lists AI-flagged and reported items with reasons, has no horizontal scrolling at 375 px, approves from the dashboard, requires a ban reason, lists banned users, and works in English. Banned users see a notice with the reason on the add and profile pages. A rejected restroom is "not found" for guests.

### G.3 Phase 12 (42 checks, all passed)

robots.txt; sitemap lists restrooms; security headers; ODbL attribution on About; cross-site POST refused and same-site POST reaches the authentication check; JSON-LD, canonical URL and OSM attribution on restroom pages; home canonical URL; clusters instead of individual pins at zoom 12 and tapping a cluster zooms in; list shows 40 and "show more" adds 40; list search with spaces; no horizontal scrolling at 375 and 1440 px; axe on 9 pages at 375 and 1440 px; keyboard Tab reaches links and buttons with a visible focus; pages load and the list shows data on a throttled connection; a visited page opens offline from the service worker.

### G.4 Phase 13 and other suites

- **Brand and theme (41):** 10 icon and image files served with the right type; manifest with maskable icons and theme colour; favicon, Apple touch icon and theme-color tags; for 7 pages in light and dark mode: logo loads at 36 px, background pattern present, axe clean, no horizontal scrolling; About logo at 120 px with alternative text.
- **Phase 13 pages (34):** city page titles in English and Tagalog; canonical and Open Graph tags; unknown city shows the not-found page with `noindex`; sitemap has the five city pages; site description lists the cities; axe and horizontal scrolling for 3 pages × 2 widths × 2 themes; the Cebu page lists restrooms with no "Public CR" names and links the other four cities; a restroom link opens its page with OSM credit.
- **Account deletion (18):** listed in Section 7.2.
- **Login at desktop zoom (20 + 4):** login and signup at 1263, 1010, 842, 722 and 631 px wide (100–200% zoom), at 1440 × 900 and at 375 px: submit button and links reachable above the bottom navigation, logo visible, no horizontal scrolling.

---

## Appendix H. Screenshots

Screenshots of the production site (https://poopipoo.vercel.app), English interface, October 2026. Phone screenshots are at 375 × 812 CSS pixels; desktop screenshots at 1440 × 900.

| | |
| --- | --- |
| ![Map with clustered pins](images/01-map.jpg) **H.1** Map with clustered restroom pins | ![Restroom list](images/02-list.jpg) **H.2** List sorted by distance, with filters |
| ![Restroom page](images/03-restroom.jpg) **H.3** Restroom page | ![Navigation preview](images/04-navigation-preview.jpg) **H.4** Walking route preview with turn-by-turn directions |
| ![City page](images/05-city-page.jpg) **H.5** City page (Cebu) | ![Leaderboard](images/06-leaderboard.jpg) **H.6** Leaderboard |
| ![Map in dark mode](images/07-map-dark.jpg) **H.7** Map in dark mode | ![AI assistant](images/09-ai-assistant.jpg) **H.8** AI assistant answering with restroom cards |
| ![Add a restroom](images/10-add-restroom.jpg) **H.9** Adding a restroom, step 1 of 4 | ![Profile](images/11-profile.jpg) **H.10** Profile with level, points and badges |
| ![Settings](images/12-settings.jpg) **H.11** Settings | |

![Login on desktop](images/08-login-desktop.jpg)

**H.12** Login page on a desktop (1440 × 900)

![Moderation dashboard](images/13-moderation-desktop.jpg)

**H.13** Moderation dashboard on a desktop (no open items at the time of capture)
