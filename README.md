# Poopipoo — "Waze for restrooms" in the Philippines

Find the nearest clean restroom (CR), see what it has (bidet, tissue, PWD access), get walking or driving directions, and help others by adding and reviewing restrooms. A crowdsourced web app and PWA, in Tagalog and English.

**Live:** https://poopipoo.vercel.app

## Features

- **Map and list.** Restrooms near you, sorted by distance, with filters (free, bidet, wheelchair, baby changing...) and place search. Pins group into count bubbles when zoomed out.
- **Restroom pages.** Amenities, ratings and reviews, a share link, and turn-by-turn navigation with voice (OSRM routing).
- **Contribute.** Add a restroom in four steps (pin on a map, details, amenities, review), write reviews, and vote reviews "helpful".
- **AI assistant.** Ask in Tagalog or English ("May CR ba na may bidet sa Makati?"). It searches our own data with retrieval (pgvector) and tool calling, then answers with restroom cards.
- **Gamification.** Points, five levels, badges, and a leaderboard.
- **Anti-spam and moderation.** Rate limits, reports, community verification ("I've seen this", 5 = verified), AI moderation of new restrooms, a moderator dashboard, bans, and a trust score.
- **Real data.** Public toilets imported from OpenStreetMap (Metro Manila), plus community additions.
- **PWA.** Installable and works offline for pages you've visited. Light and dark mode. Mobile first, built for 375px screens.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 14 (App Router), TypeScript (strict), React 18 |
| UI | Tailwind CSS, shadcn/ui (Radix), Framer Motion, Lucide icons |
| Backend | Supabase: Postgres, Auth, Storage, Row Level Security, pgvector |
| Maps | Leaflet + OpenStreetMap data, CARTO tiles, OSRM routing, Nominatim search |
| AI | Groq (`openai/gpt-oss-120b`) for chat and moderation; Hugging Face (`all-MiniLM-L6-v2`) for embeddings |
| PWA | Serwist |
| Hosting | Vercel (with Web Analytics and Speed Insights) |

Everything runs on free tiers. No Google Maps or Mapbox.

## Architecture

```
Browser (Next.js client components, Leaflet map, PWA service worker)
   │  reads/writes with the publishable key; Row Level Security decides what's allowed
   ▼
Supabase Postgres ── triggers: ratings, points, rate limits, bans, reports, verification
   ▲
   │  server-only secret key (badges, AI results, imports)
Next.js server (Server Components, route handlers)
   ├─ /api/agent     AI assistant: Groq tool calling over a RAG search (pgvector, keyword fallback)
   ├─ /api/moderate  AI check of a new restroom (Groq, JSON output)
   ├─ /api/report    report a restroom or review
   └─ /api/verify    "I've seen this" vote
External: OSRM (routes), Nominatim (search), CARTO/OSM (tiles), Overpass (OSM import)
```

The database is the source of truth for the rules: points, rate limits, ban checks and moderation thresholds are Postgres triggers, and every table has Row Level Security. The UI only explains what the database already enforces. More detail is in [docs/database.md](docs/database.md) and [docs/api.md](docs/api.md).

## Getting started

Requirements: Node.js 20.12+ and a free [Supabase](https://supabase.com) project.

```bash
git clone https://github.com/BryxCinco/poopipoo.git
cd poopipoo
npm install
cp .env.example .env.local   # then fill it in (see below)
```

1. **Database.** In Supabase → SQL Editor, run the files in `supabase/migrations/` in order (`0001` to `0006`). Each one is safe to re-run.
2. **Auth.** In Supabase → Authentication → URL Configuration, set the Site URL to `http://localhost:3000` (and your production URL later) and add `/auth/callback` to the redirect URLs.
3. **Data (optional):**
   ```bash
   npx tsx scripts/seed-restrooms.ts          # 10 sample restrooms
   npx tsx scripts/import-osm.ts --dry-run    # preview the OpenStreetMap import
   npx tsx scripts/import-osm.ts              # import Metro Manila public toilets
   npx tsx scripts/generate-embeddings.ts     # vectors for the AI search
   ```
   `scripts/seed-manila-cr.sql` adds 20 hand-picked Manila restrooms (run it in the SQL Editor).
4. **Run:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

To make yourself an admin (for `/moderation`), run in the SQL Editor:

```sql
update public.profiles set role = 'admin' where username = 'your-username';
```

### Environment variables

| Name | Where | What |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Publishable key (`sb_publishable_...`); RLS limits what it can do |
| `SUPABASE_SECRET_KEY` | **server only** | Secret key (`sb_secret_...`); bypasses RLS. Never expose it |
| `GROQ_API_KEY` | server only | AI assistant and AI moderation |
| `HUGGINGFACE_API_KEY` | server only | Embeddings; token with "Inference Providers" permission. Without credits the assistant falls back to keyword search |
| `NEXT_PUBLIC_CARTO_API_KEY` | browser | Optional CARTO basemap key; without it, OpenStreetMap tiles are used |
| `NEXT_PUBLIC_SITE_URL` | server | Optional. Canonical site URL for metadata and the sitemap (Vercel's production URL is used by default) |

### Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Development server (service worker off) |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |

## Deployment (Vercel)

1. Import the GitHub repo in Vercel (framework: Next.js).
2. Add the environment variables above in Project → Settings → Environment Variables.
3. In Supabase → Authentication → URL Configuration, add your Vercel URL as Site URL and `https://<your-domain>/auth/callback` as a redirect URL.
4. Enable **Analytics** and **Speed Insights** in the Vercel project to see the data.
5. Every push to `main` deploys to production.

After a deploy, installed PWAs may show the old version until reloaded (Ctrl+Shift+R, or close and reopen the app).

## Project structure

```
app/          routes (App Router), API route handlers, sitemap, robots, OG image
components/   UI by feature: map, restroom, add, agent, moderation, profile, ...
hooks/        client hooks (restrooms store, geolocation, navigation, i18n, ...)
lib/          data access, AI (agent, RAG, moderation), i18n dictionaries, routing, OSM
types/        shared TypeScript types, including the hand-written Supabase types
supabase/     SQL migrations
scripts/      seed, OSM import, embeddings
docs/         API, database and component docs
```

## Contributing

1. Fork and create a branch from `main`.
2. Keep TypeScript strict (no `any`), use Lucide icons (no emoji in the UI), and design for 375px first.
3. Every new UI text goes in **both** `lib/i18n/dictionaries/tl.ts` and `en.ts` (TypeScript checks that the keys match).
4. Schema changes go in a new numbered file in `supabase/migrations/` (re-runnable), with `types/database.ts` updated to match.
5. Before opening a pull request: `npx tsc --noEmit`, `npm run lint` and `npm run build` must pass.

Restroom data errors (wrong location, closed CR) can be reported from the restroom's page in the app.

## Data and credits

- Map data and imported restrooms: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the Open Database License (ODbL). Imported restrooms show this credit on their page.
- Map tiles: © [CARTO](https://carto.com/attributions).
- Routing: [OSRM](https://project-osrm.org) via routing.openstreetmap.de. Search: [Nominatim](https://nominatim.org).

See the About page in the app for the full list.
