# Chapter 8. Results and Discussion

This chapter presents the results of the project against its objectives, the measured characteristics of the system and its data, a comparison with existing applications, and a discussion of what worked and what did not.

## 8.1 Achievement of the objectives

| # | Objective (Chapter 2) | Result | Status |
| --- | --- | --- | --- |
| 1 | Import 500+ restrooms from OpenStreetMap | 829 imported across 5 cities (859 total with 30 seeded) | Achieved (166% of target) |
| 2 | AI agent with Groq and Hugging Face | Tool-calling assistant with RAG; 859 of 859 restrooms embedded; works when the Hugging Face API has no credits (local model) | Achieved |
| 3 | Free navigation with OSRM | Walking and driving routes, bilingual turn-by-turn instructions, spoken guidance, re-routing | Achieved |
| 4 | Gamification system | Points, 5 levels, 6 badges and a leaderboard, all computed in the database | Achieved |
| 5 | Anti-spam and moderation | Rate limits, reports, verification, AI moderation, trust score, bans, dashboard; 63 of 63 database rule checks passed | Achieved |
| 6 | English and Tagalog | Complete bilingual interface, checked at compile time | Achieved |
| 7 | Free deployment on Vercel | Live at https://poopipoo.vercel.app; running cost ₱0 | Achieved |

All seven specific objectives were met. The general objective, a free, crowdsourced and AI-assisted restroom finder for the Philippines, is met in the sense that the system exists, is publicly available, and is seeded with data. Whether it becomes truly *crowdsourced* depends on community adoption, which has not started yet (see 8.5).

## 8.2 The restroom data

### Coverage by city

| City (area) | Restrooms | From OSM | Seeded | Shown as free |
| --- | --- | --- | --- | --- |
| Metro Manila | 615 | 585 | 30 | 589 |
| Cebu (incl. Mandaue, Lapu-Lapu) | 91 | 91 | 0 | 87 |
| Davao | 74 | 74 | 0 | 71 |
| Iloilo | 64 | 64 | 0 | 64 |
| Bacolod | 15 | 15 | 0 | 15 |
| **Total** | **859** | **829** | **30** | **826** |

### Naming

Of the 829 toilets imported from OpenStreetMap, **821 (99%) had no specific name**: they were either unnamed or had a generic name such as "Toilet" or "men/women". The naming algorithm (Section 6.2.7) gave all of them a descriptive name:

| Name based on | Count | Share |
| --- | --- | --- |
| A nearby landmark or a place in the address ("CR sa Rizal Park") | 773 | 94% |
| Street and barangay ("CR sa Taft Avenue, Malate") | 48 | 6% |

The remaining 8 imported toilets kept their real OSM names (e.g., "Hel-Loo", "Pay Lounge").

### Amenity information

| Amenity | Restrooms tagged |
| --- | --- |
| `free` tag (no fee recorded) | 819 |
| Wheelchair accessible | 85 |
| Toilet paper | 34 |
| Soap | 25 |
| Baby changing | 14 |
| Bidet | 13 |
| Air-conditioned | 12 |
| Shower | 1 |

Only **114 of 859 restrooms (13%)** have any amenity recorded besides the price, and only 13 record a bidet. OpenStreetMap is good at telling *where* toilets are, but says little about *what they have*. This is exactly the information that community reviews and edits are meant to add, and it is the strongest argument for the crowdsourced part of the design.

## 8.3 System metrics

| Metric | Value | Source |
| --- | --- | --- |
| Restrooms / cities | 859 / 5 | Database |
| Restrooms with an embedding | 859 (100%) | Database |
| Sitemap URLs | 870 (11 pages + 859 restrooms) | Production `/sitemap.xml` |
| First-load JavaScript, map page | 318 kB | `next build` |
| Map page ready on Fast 3G / unthrottled | 6.1 s / 1.8 s | Section 7.5 |
| Server-rendered pages ready on Fast 3G | about 1.7–2.1 s | Section 7.5 |
| AI assistant response time | about 3–4 s per question | Production test |
| Semantic search (after the model is loaded) | about 160 ms per query | Local measurement |
| Vector storage | about 1.3 MB (859 × 384 × 4 bytes, before index) | Calculated |
| Total database size | *[to verify: Supabase Dashboard, Database usage]* | — |
| Automated checks passed | 247 of 251 (227 of 227 in the six main suites) | Chapter 7 |
| WCAG 2.1 AA violations (axe) | 0 | Chapter 7 |
| Development time | 4 days (5–8 October 2026), 19 commits | Git history |
| Monthly running cost | ₱0 (free tiers) | Service dashboards |

## 8.4 Comparison with existing applications

| Feature | Google Maps | Waze | Toilet-finder apps (SitOrSquat, Flush, OSM-based) | **Poopipoo** |
| --- | --- | --- | --- | --- |
| Main purpose | General maps and places | Driving navigation | Finding toilets | **Finding CRs in the Philippines** |
| Restroom-specific details (bidet, tissue, PWD, fee) | Limited (some accessibility info) | No | Some | **Yes, filterable** |
| Philippine coverage of restrooms | Incidental (places that have toilets) | No | Sparse | **859 in 5 cities** |
| Tagalog interface | Yes | Yes | No | **Yes** |
| Conversational search | Emerging AI features | No | No | **Yes, grounded in own data** |
| Walking directions | Yes | No (driving) | Usually via another app | **Yes, built in, with voice** |
| Community moderation | Yes | Yes | Basic | **Yes, enforced in the database** |
| Open data | No | No | Some (OSM-based ones) | **Yes, ODbL with attribution** |
| Install | App | App | App | **Web or PWA, no app store** |
| Cost to user | Free (ads, data) | Free (ads) | Free with ads / paid | **Free, no ads** |

Google Maps and Waze are far more mature and have vastly larger user bases, so Poopipoo does not compete with them as a general map. Its contribution is **focus**: the questions it answers ("Which CR near me is free and has a bidet?") are not first-class questions in the general apps, and the specialized toilet apps do not serve Philippine users in Tagalog or record Philippine amenities.

## 8.5 Discussion

### What worked

- **Seeding solved the cold start.** Importing OpenStreetMap data turned an empty map into one with 859 restrooms on the first visit, at no cost and with a clear license.
- **Rules in the database.** Putting points, rate limits and moderation thresholds in PostgreSQL triggers and RLS made them impossible to bypass and easy to test directly (63 database checks). It also kept the API layer small: ordinary reads and writes go directly from the browser to the database.
- **Grounded AI.** Because the assistant may only answer from tool results, it recommends real restrooms from the database instead of inventing them.
- **Graceful degradation.** Every external dependency has a fallback: semantic search falls back to keyword search; the Hugging Face API falls back to the local model; the Overpass import tries three servers; the PWA serves visited pages offline.
- **Zero cost.** Every service used has a free tier sufficient for the current scale.

### Problems encountered and how they were solved

| Problem | Cause | Solution |
| --- | --- | --- |
| Most imported toilets were called "Public CR" | 99% of OSM toilets have no specific name | Landmark-based naming algorithm (Section 6.2.7) |
| AI search stopped using embeddings | Hugging Face Inference API credits ran out (HTTP 402) | Same model run locally with transformers.js; vectors from both sources agree (cosine similarity ≈ 0.99) |
| AI assistant returned errors | The model began sending `null` for optional filters, which the provider's tool validation rejected | Tool schema accepts `null` ("any") |
| OpenStreetMap import failed at times | Public Overpass servers busy (HTTP 504/500) | Three mirrors, retries, per-city runs; failure detection moved before slow steps |
| Model download corrupted | An interrupted 23 MB download was saved without verification | Re-downloaded with resume and verified with its SHA-256 hash |
| Login form cut off when zoomed in on desktop | `overflow: hidden` on the page frame stopped the page from scrolling | Frame clips only sideways; two-column layout on wide but short windows |

### Limitations of the results

- **No community data yet.** At the time of writing, the database has one user profile (the author's) and no reviews. All restrooms come from OpenStreetMap or manual seeding. The contribution, gamification and moderation features are tested and working, but their effect on real users has not been observed.
- **Thin amenity data.** Only 13% of restrooms record any amenity, so amenity filters return few results until the community adds details.
- **Fee information is uncertain.** When OSM does not record a fee, the restroom is shown as free (826 of 859). Some are likely paid in practice.
- **Uneven coverage between cities,** from 615 restrooms in Metro Manila to 15 in Bacolod, following OSM's own coverage.
- **Map performance on slow networks.** The map takes about 6 seconds to show pins on a Fast 3G connection, mostly to download the JavaScript and all restroom data.
- **Scalability limit in data loading.** The map loads all restrooms in one request. Supabase returns at most 1,000 rows per request by default, so loading must be changed (by map area or in pages) before the database passes 1,000 restrooms.
