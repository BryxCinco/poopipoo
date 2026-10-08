# Components

Components live in `components/<feature>/`. Server Components are the default; files that start with `"use client"` run in the browser. Every visible text comes from the i18n dictionaries (`useI18n()` in client components, `getT()` on the server). Icons are Lucide only.

## Building blocks (`components/ui`)

shadcn/ui primitives (`button`, `input`, `textarea`, `label`, `badge`, `card`, `skeleton`, `sheet`, `tabs`, `tooltip`, `avatar`, `dialog`, `alert-dialog`, `dropdown-menu`, `popover`, `separator`, `toast`) plus:

| Component | Use |
| --- | --- |
| `Modal` | Radix Dialog + Framer Motion: focus trap, Escape/backdrop close, exit animation, `shakeKey` for errors, `dismissible={false}` while saving |
| `ConfirmModal` | Title, description, confirm/cancel. `onConfirm` may return a Promise (spinner, stays open and shakes on failure) |
| `AnimatedButton` | Button with tap feedback and `loading`/`loadingText` |
| `AnimatedCard`, `AnimatedCheck`, `CountUp` | Motion helpers |
| `EmptyState` | Icon, title, description and action for empty or error lists |
| `SearchInput` | Labelled search field with a clear button |

Animations come from `lib/animations.ts` (shared durations, springs and variants). All of them respect "reduce motion".

## Layout (`components/layout`)

`Header`, `BottomNav` (Map, List, Add, Profile), `Providers` (i18n, reduced motion, tooltips), `StatusScreen` (404/403/error pages), `LegalPage` (privacy, terms), `UnsavedChangesGuard`.

## Map (`components/map`)

All Leaflet components are client-only (`dynamic(..., { ssr: false })`).

| Component | Use |
| --- | --- |
| `RestroomMap` | Full-screen map: tiles, clustered restroom pins, user location, route |
| `ClusteredMarkers` | Grid clustering without a plugin: pins in the same ~64 px cell become a count bubble; only the visible area is drawn; no clustering from zoom 16 |
| `MiniMap` / `MiniMapLoader` | Small map on restroom pages and the add form |
| `LocationPicker` | Draggable pin for adding a restroom |
| `SearchBar` | Nominatim place search with recent searches |
| `NearMeButton`, `UserLocationLayer`, `RouteLayer`, `MapController`, `BaseTileLayer` | Location, routes, fly-to, CARTO/OSM tiles |

## Restrooms (`components/restroom`)

`RestroomList` / `RestroomListItem` (search, filters, sorted by distance, 40 at a time), `RestroomSheet` (map bottom sheet), `RestroomDetail` (full page), `RestroomFilters`, `RestroomBadges` (price, amenities, "yours"), `RestroomRating`, `StarRating`, `ReviewsSection` / `ReviewList` / `ReviewForm` (optimistic create, edit, delete, helpful votes, pagination), `ShareButton`, `DeleteRestroomButton`, `DeleteReviewButton`, `DistanceFromUser`, `LocalRestroomsUpload`.

## Moderation (`components/moderation`)

| Component | Use |
| --- | --- |
| `RestroomStatusBadge` | Not verified yet / Verified / Under review / Rejected |
| `VerifyButton` | "I've seen this" with a 0–5 progress bar and undo |
| `ReportButton` | Flag button + report modal (`variant="full"` or `"icon"`) |
| `Notices` | `RateLimitNotice` (live countdown) and `BannedNotice` |
| `ModerationDashboard` | Flagged restrooms, reports grouped by item, banned users, AI-unchecked restrooms |

## Other features

- `add/AddRestroomForm`: four-step form with validation, address from the pin, rate-limit countdown, unsaved-changes guard.
- `agent/AgentChat`: AI assistant chat (lazy-loaded on first open).
- `navigation/*`: route preview, live turn-by-turn panel, voice toggle.
- `profile/*`: level card, badges grid, settings rows.
- `leaderboard/Leaderboard`, `onboarding/Onboarding`, `settings/*`, `auth/*`.
- `i18n/*`: `I18nProvider`, `LanguageSwitch`, `T` (inline text in Server Components).

## Conventions

- Mobile first: design and test at 375px, no horizontal scroll.
- Every input has a `<Label>`; every icon-only button has an `aria-label`; decorative icons have `aria-hidden="true"`.
- Writes are optimistic where it helps (reviews, votes, deletes) and roll back with a toast on failure.
- Errors shown to users go through `errorText()` (`lib/i18n/errors.ts`), which translates known errors (bans, rate limits) into the current language.
