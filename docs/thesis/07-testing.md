# Chapter 7. Testing

This chapter describes how Poopipoo was tested, the results of the final test run, and what the tests do not cover.

## 7.1 Testing strategy

Testing focused on the risks that matter most for a public, crowdsourced app:

1. **Data integrity and abuse:** the database rules (rate limits, moderation, Row Level Security) must hold even against direct API calls.
2. **User flows:** the main tasks must work end to end in a real browser.
3. **Accessibility and mobile layout:** the app must be usable at 375 px, with assistive technologies, and in light and dark mode.
4. **Production behaviour:** what works locally must also work on the deployed site.

| Level | Used? | How |
| --- | --- | --- |
| Static analysis | Yes | TypeScript strict mode (`tsc --noEmit`), ESLint (`next lint`), production build (`next build`) on every phase |
| Unit tests | No | No unit-test framework was set up. Pure functions (distance, levels, naming, address parsing) were checked through the end-to-end and database suites and with one-off scripts during development |
| Integration tests | Yes | Database suite: calls the Supabase REST API as temporary users with different roles and checks every rule |
| End-to-end (E2E) tests | Yes | Scripts that drive headless Microsoft Edge (Chromium) through the Chrome DevTools Protocol |
| Accessibility tests | Yes | axe-core 4.10.2 injected into each page; WCAG 2.0 A/AA and WCAG 2.1 AA rule sets |
| Performance tests | Yes | Production bundle sizes; cold page loads with network throttling (see 7.5) |
| Security tests | Yes | CSRF (cross-site POST), RLS (reading or writing other users' data), privilege escalation (setting one's own role or points), secrets not exposed |
| Usability tests with users | No | Not yet done (see Chapter 9) |

### Test environment

- **Local:** a production build (`next build` + `next start`) on port 3123, connected to the real Supabase project.
- **Production:** https://poopipoo.vercel.app after each deploy.
- **Browser:** headless Microsoft Edge (Chromium), controlled through the Chrome DevTools Protocol.
- **Viewports:** 375 × 812 (phone, the main target), 1440 × 900 (desktop), and desktop zoom levels from 100% to 200%, simulated by smaller CSS viewports.
- **Test data:** every script creates its own temporary users and restrooms and deletes them at the end, so the tests can run against the live database without leaving data behind.

**Note on the test scripts.** The test scripts were written and run during development in a separate working folder; they are **not yet in the repository**. This means the tests cannot currently be re-run by someone else from the repository alone. Moving them into the repository with a test runner is recommended future work (Chapter 9).

## 7.2 Test suites and results

Final run, October 2026.

| Suite | What it covers | Checks | Passed |
| --- | --- | --- | --- |
| Database rules | Rate limits, verification and report thresholds, trust score, bans, RLS, column grants, moderation functions | 63 | **63** |
| Phase 11 UI | AI moderation route, rate-limit countdown, verify, report, profile, moderator dashboard, ban flow, at 375 px | 29 | **29** |
| Phase 12 | robots.txt, sitemap, security headers, CSRF, JSON-LD, canonical URLs, OSM attribution, pin clustering, list paging, axe at 375 and 1440 px, keyboard focus, 3G load, offline mode | 42 | **42** |
| Brand and theme | Icons, manifest, favicon, OG image, header logo, background pattern, axe and horizontal scroll on 7 pages in light and dark mode | 41 | **41** |
| Phase 13 pages | City page titles in both languages, canonical and Open Graph tags, unknown city, sitemap, site description, axe at 375 and 1440 px in light and dark, city page content and links | 34 | **34** |
| Account deletion | API without a session, cross-site request, wrong username, modal focus and labels, axe with the modal open, full deletion and every cascade | 18 | **18** |
| Login at desktop zoom | Every part of the login and signup forms reachable at 8 viewport sizes | 20 | **20** |
| Login fits without scrolling | Stricter check: the whole form visible without scrolling at 100–175% zoom | 4 | 0 |
| **Total** | | **251** | **247** |

The six suites listed in the original test plan (database, Phase 11, Phase 12, brand, Phase 13 and deletion) account for **227 checks, all passed**. Including the 20 reachability checks of the zoom suite, **247 checks passed**.

The four stricter zoom checks are not counted as failures of the requirement ("everything stays visible and usable when zooming"), because every element remains reachable by scrolling. The login form fits without scrolling up to 150% zoom, while the longer signup form needs scrolling from 125% zoom upward. This is recorded as a known limitation.

### Examples of individual checks

**Database rules (selected):**

| Check | Expected result |
| --- | --- |
| Second restroom within 5 minutes | Error "Rate limit exceeded" with the retry time |
| Sixth restroom in 24 hours | Blocked until the oldest one is 24 hours old |
| User sets their own role or trust score | Refused (column grants) |
| User verifies their own restroom | Refused |
| 5th confirmation | Restroom becomes `approved`; author's trust score +10 |
| 3rd report / 5th report | `flagged` / `rejected` (hidden from guests and other users, visible to the author and moderators) |
| 11th report in 24 hours | Error "Report limit exceeded" |
| AI flag with confidence 0.75 / 0.95 | Not flagged / flagged and logged |
| Moderator bans a moderator | Refused (only admins can) |
| Banned user adds, reviews, votes or reports | Refused with the ban reason |

**Account deletion (all 18):** a request without a session returns 401, a cross-site request returns 403, and a wrong username returns 400. The modal opens with the text field focused and labelled and the delete button disabled, and axe finds no violations. A wrong name keeps the button disabled; the matching name, in any letter case, enables it. After deletion: the user is redirected with a confirmation; the auth user, profile, review and helpful vote are gone; the restroom remains with no author; the avatar files are removed; `moderation_log` has a `delete_account` entry; the restroom's review count is recalculated; and the user is signed out. Before migration 0007 was applied, the same suite confirmed that a failed deletion leaves the account fully intact and leaves no log entry.

## 7.3 Accessibility

axe-core 4.10.2 was run with the WCAG 2.0 A, WCAG 2.0 AA and WCAG 2.1 AA rule sets on these pages: map, list, restroom (seeded and imported), profile, leaderboard, settings, about, privacy, login, signup and the city pages. It ran at 375 px and 1440 px, in light and dark mode, and on the settings page with the account-deletion modal open. **The final run reported no violations.** The add-restroom form, the terms page and the moderation dashboard were checked for layout and labels by the UI suites but were not part of the final axe run.

One issue found and fixed during development was insufficient colour contrast of grey text on grey backgrounds (measured 4.3:1, below the required 4.5:1). Manual and scripted checks also covered:

- keyboard navigation: Tab reaches every link and button with a visible focus outline;
- focus management: modals move focus inside and keep it there; destructive dialogs focus "Cancel" or a text field first;
- labels: every form field has a label and every icon button an accessible name;
- no horizontal scrolling at 375 px on any page.

Automated tools cannot detect every accessibility problem; testing with screen-reader users is recommended (Chapter 9).

## 7.4 Responsive design

| Viewport | Coverage |
| --- | --- |
| 375 × 667 and 375 × 812 (phone) | All pages; no horizontal scrolling; bottom navigation does not cover content |
| 1440 × 900 (desktop) | All pages; centred layouts; login shown in two columns |
| Desktop zoom 125%, 150%, 175%, 200% | Login and signup fully reachable. Two-column layout on wide but short windows; the logo stays visible while the form scrolls |

## 7.5 Performance

### Bundle size

From the production build (`next build`), the JavaScript loaded on first visit:

| Route | First-load JS |
| --- | --- |
| `/` (map) | 318 kB |
| `/restroom/[id]` | 298 kB |
| `/list` | 272 kB |
| `/city/[slug]` | 174 kB |
| `/about` | 105 kB |
| Shared by all pages | 89.5 kB |

The map page is above the 200 kB target set during development. Most of it is the Supabase client, React DOM and the animation library; Leaflet and the AI chat are loaded only when needed.

### Page loads on a slow network

Cold loads of the production site were measured in a fresh incognito browser context for each run (empty cache, no service worker), at 375 px. Each value is the median of three runs. "Content ready" means the main content is visible: pins on the map, at least 10 list items, or the page heading. "Fast 3G" is the Chrome DevTools preset (1.44 Mbps down, 675 kbps up, 562.5 ms round-trip time).

| Page | Network | First Contentful Paint | Content ready | Transferred | JavaScript |
| --- | --- | --- | --- | --- | --- |
| `/` (map) | Unthrottled | 0.6 s | 1.8 s | 1,011 kB | 408 kB |
| `/` (map) | Fast 3G | 1.6 s | 6.1 s | 1,012 kB | 408 kB |
| `/list` | Unthrottled | 0.6 s | 1.6 s | 566 kB | 367 kB |
| `/list` | Fast 3G | 1.7 s | 5.9 s | 568 kB | 367 kB |
| `/restroom/[id]` | Unthrottled | 1.3 s | 1.9 s | 607 kB | 428 kB |
| `/restroom/[id]` | Fast 3G | 1.8 s | 2.1 s | 504 kB | 370 kB |
| `/city/cebu` | Fast 3G | 1.7 s | 1.8 s | 440 kB | 296 kB |
| `/about` | Fast 3G | 1.6 s | 1.7 s | 433 kB | 292 kB |

Transferred sizes are compressed. The map page's total includes map tiles and the restroom data.

On a slow 3G connection, server-rendered pages (restroom, city, about) show their content in about 2 seconds, while the map and list take about 6 seconds because they first download the JavaScript and the data for all 859 restrooms. After the first visit, the service worker serves cached assets, and a page that was visited before opens even without a connection (checked in the Phase 12 suite).

## 7.6 Security testing

| Threat | Test | Result |
| --- | --- | --- |
| Cross-site request forgery | POST to each API route with a foreign `Origin` header | Refused (403) |
| Reading hidden data | Guest and other users request rejected restrooms, other users' reports and the moderation log | Not returned (RLS) |
| Privilege escalation | User sets their own role, trust score, points or a restroom's status | Refused (column grants) |
| Abuse | Rapid restroom submissions, mass reporting, banned user writing | Refused by the database rules |
| Unauthenticated API use | Assistant and deletion APIs without a session | 401 |
| Exposed secrets | All 42 JavaScript chunks served by nine production pages (1.4 MB) searched for the values and the names of the three server-only keys | None found. The only match of the prefix `sb_secret_` is supabase-js's own check of the key type |
| Security headers | Response headers checked on production | HSTS, X-Frame-Options, nosniff, Referrer-Policy and Permissions-Policy present |

## 7.7 Limitations of the testing

- There are no unit tests, and the test scripts are not yet in the repository.
- Only a Chromium-based browser was used. Firefox and Safari (including iOS Safari, where PWA support differs) were not tested.
- Real phones were not part of the automated tests, which emulate mobile viewports and touch in a desktop browser.
- The AI assistant's answer quality was checked with sample questions, not measured systematically (for example, precision of the returned restrooms over a set of test questions).
- No load testing was done; behaviour under many simultaneous users is unknown, and the free tiers of the external services would be the first limit.
- No usability study with target users has been done yet.
