# Chapter 9. Summary, Conclusions and Recommendations

## 9.1 Summary

This project set out to address the lack of a centralized, free and crowdsourced way to find public restrooms (CRs) in the Philippines. It produced **Poopipoo**, a mobile-first web application and PWA, live at https://poopipoo.vercel.app.

The system was built in thirteen incremental phases between 5 and 8 October 2026 with Next.js, TypeScript, Supabase, Leaflet and open map services, and with Groq-hosted open-weight language models for the AI features. At launch it holds **859 restrooms in five cities** (Metro Manila, Cebu, Davao, Iloilo and Bacolod), 829 of them imported from OpenStreetMap under the ODbL. Users can browse and filter restrooms, get walking or driving directions with spoken guidance, ask an AI assistant in Tagalog or English, add and review restrooms, earn points and badges, and report or confirm entries. Moderators have a dashboard. Users can export their data and delete their account.

The system passed 247 of 251 automated checks, including all 227 checks in the six main test suites, had no WCAG 2.1 AA violations in the final axe run, and runs entirely on free tiers.

## 9.2 Conclusions

The conclusions answer the specific problems stated in Chapter 2.

1. **Scalable database.** A PostgreSQL schema with business rules in triggers, Row Level Security on every table and column-level grants handles 859 restrooms and their related data consistently and securely, and the rules cannot be bypassed by calling the API directly. One limit was found in the client, not the database: the map loads all restrooms in one request, which must change before 1,000 restrooms.
2. **Natural-language AI agent.** Combining tool calling with retrieval-augmented generation over pgvector produces an assistant that answers questions in Tagalog or English using only real restrooms from the database. Running the embedding model locally removed the dependency on paid inference credits without changing the results (cosine similarity ≈ 0.99 with the API).
3. **Free navigation.** OSRM on OpenStreetMap data, together with the browser's geolocation and speech APIs, provides walking and driving directions with spoken, bilingual turn-by-turn guidance at no cost and without Google Maps.
4. **Gamification.** Points, levels, badges and a leaderboard were implemented, with points computed by the database so they cannot be farmed. Whether they actually increase contributions could not yet be measured, because the app has no community users yet.
5. **Moderation.** A layered approach (rate limits, community verification, report thresholds, AI screening, trust score, bans and a moderator dashboard), enforced in the database, blocked every abuse scenario that was tested.
6. **Multi-language support.** Deriving the English dictionary's type from the Tagalog one makes a missing translation a build error, which kept both languages complete across all features.
7. **Free deployment.** Vercel, Supabase and Groq free tiers, with open map services, run the complete system at a monthly cost of ₱0.

Overall, the project shows that a complete, useful public-utility application can be built and run by one developer on open data and free infrastructure. It also shows that **open data solves the "where" but not the "what"**: OpenStreetMap supplied the locations of 829 toilets but amenity information for only 13% of the restrooms, and almost none of them had a meaningful name. Collecting that missing information is the job of the community, which makes adoption the next and most important step.

## 9.3 Recommendations

### For the system

| Priority | Recommendation | Reason |
| --- | --- | --- |
| High | Load restrooms by visible map area (or in pages) | Required before the database passes 1,000 restrooms; also makes the map faster on slow networks |
| High | Move the test scripts into the repository with a test runner, add unit tests, and run them on every push (CI) | Makes the results in Chapter 7 reproducible and protects against regressions |
| High | Run a usability study with target users (commuters, PWDs, parents, tourists) | Validates the design and the gamification with real people |
| Medium | Test on Firefox and Safari, including iOS Safari as an installed PWA | Only Chromium was tested |
| Medium | Photo uploads for restrooms and reviews, with image moderation | Photos are the fastest way to judge a CR's condition |
| Medium | Real-time status reports ("no water", "closed", "long line") that expire after a few hours | The app cannot show the current state of a restroom |
| Medium | Reduce first-load JavaScript of the map page below 200 kB | Faster first visit on mobile data |
| Medium | Ask users to confirm or correct the fee and amenities of imported restrooms | 87% of restrooms have no amenity data, and fees are uncertain |
| Low | Add more cities (e.g., Baguio, Cagayan de Oro, Zamboanga, General Santos) | The import already supports new cities through `lib/cities.ts` |
| Low | Self-host OSRM and Nominatim if traffic grows | The public servers have usage limits |
| Low | A multilingual embedding model | Better semantic matching for Tagalog and other Philippine languages |

### For stakeholders

- **Local government units** could share their lists of public toilets as open data, and use the map's gaps and low ratings to plan facilities.
- **Establishments** could confirm and keep their own restroom details up to date.
- **The OpenStreetMap community** could receive improvements back: new or corrected toilets found through the app could be contributed to OSM, which benefits every app that uses it.

## 9.4 Future work

| Phase | Theme | Possible scope |
| --- | --- | --- |
| 14 | Community and data quality | Map loading by area; fee and amenity confirmations; real-time status reports; push notifications |
| 15 | Photos | Photo upload for restrooms and reviews; automatic image moderation; storage limits |
| 16 | Quality engineering | Tests in the repository with CI; unit tests; Firefox and Safari testing; performance budget |
| 17 | Reach | More cities; LGU and establishment data partnerships; contributing data back to OpenStreetMap |
| 18 | Sustainability | A way to cover costs above the free tiers that keeps the app free and ad-free for users, for example donations, grants, or opt-in "verified establishment" listings that do not change search ranking |

Monetization is listed last on purpose: the app's value to the public depends on it staying free, ad-free and neutral, so any revenue model should be judged against those principles first.
