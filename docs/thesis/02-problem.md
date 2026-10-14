# Chapter 2. The Problem

## 2.1 Statement of the Problem

### General problem

There is no centralized, free and crowdsourced platform for finding public restrooms (CRs) in the Philippines.

### Specific problems

1. How can a database be designed so that it stays fast, consistent and secure for 859 or more restrooms and their reviews, votes and reports, and can keep growing?
2. How can an AI agent find restrooms from natural-language questions in Tagalog or English, without inventing places that do not exist?
3. How can navigation to a restroom be provided for free, without Google Maps?
4. How can gamification encourage users to add and review restrooms?
5. How can moderation prevent fake, duplicate and spam data in an open, crowdsourced database?
6. How can the application support both English and Tagalog throughout?
7. How can the system be deployed to production at no cost?

## 2.2 Objectives

### General objective

To develop a free, crowdsourced and AI-assisted restroom finder application for the Philippines.

### Specific objectives

| # | Objective | Outcome in the final system |
| --- | --- | --- |
| 1 | Import 500 or more restrooms from OpenStreetMap | 829 restrooms imported (Metro Manila, Cebu, Davao, Iloilo, Bacolod); 859 in total with 30 seeded entries. Unnamed toilets receive descriptive names from nearby landmarks (e.g., "CR sa Rizal Park"). |
| 2 | Implement an AI agent using Groq and Hugging Face models | Tool-calling assistant on Groq (`gpt-oss-120b`) with RAG over pgvector, using all-MiniLM-L6-v2 embeddings (Hugging Face API, or the same model run locally with transformers.js); keyword-search fallback |
| 3 | Implement free navigation using OSRM | Walking and driving routes, turn-by-turn instructions in Tagalog and English, spoken guidance (Web Speech API), live progress and automatic re-routing |
| 4 | Implement a gamification system | Points (+10 per restroom, +5 per review, +1 per helpful vote), five levels, six badges and a leaderboard, all computed by database triggers |
| 5 | Implement anti-spam and moderation | Rate limits, reports, community verification, AI moderation of new restrooms, trust score, bans and a moderator dashboard |
| 6 | Implement English and Tagalog language support | Complete bilingual interface; the type checker guarantees that every text exists in both languages |
| 7 | Deploy on Vercel at no cost | Live at https://poopipoo.vercel.app on the free tiers of Vercel, Supabase and Groq |

## 2.3 Significance of the Study

**For users.** Commuters, workers in the field, tourists, parents and PWDs can find the nearest suitable CR, see beforehand whether it is free and has a bidet, tissue or wheelchair access, and get directions, in their preferred language and for free.

**For establishments.** Malls, restaurants, gas stations and terminals with good restrooms become visible to people nearby, and reviews give them direct feedback on cleanliness and supplies.

**For local government units (LGUs).** The aggregated data shows where public restrooms exist and where they are missing or poorly rated, which can support planning, maintenance and sanitation programs. The open-data approach also means the information can be shared rather than locked in a private platform.

**For the open-source community.** The project shows how a complete, production-grade application can be built only on open data and free infrastructure (OpenStreetMap, OSRM, Nominatim, open-weight AI models). The source code is public, and the OSM attribution and ODbL compliance serve as an example for similar projects.

## 2.4 Scope and Limitations

### Scope

- **Coverage:** Metro Manila, Cebu, Davao, Iloilo and Bacolod. The four cities outside Metro Manila are defined by a bounding box around the urban area, so neighbouring towns (for example, Mandaue and Lapu-Lapu around Cebu City) are included.
- **Platform:** a web application and installable PWA for phones and desktops.
- **Features:** map and list with filters; restroom pages with amenities, ratings and reviews; adding restrooms; walking and driving navigation with voice; AI assistant; gamification; moderation; English and Tagalog; light and dark mode; data export and account deletion.

### Limitations

- **No photo uploads for restrooms or reviews.** Only profile photos can be uploaded. Photos would need storage space and image moderation beyond the free tiers.
- **No real-time status.** The app cannot show whether a restroom is currently open, crowded or out of water; it relies on reviews and reports.
- **Voice guidance depends on the device.** Spoken directions use the browser's built-in voices. Most devices have no Filipino voice, so Tagalog instructions are read by the default voice.
- **Browser testing.** Automated tests ran on a Chromium-based browser (Microsoft Edge). The app was not formally tested on Firefox or Safari.
- **Uneven data coverage.** Imported data is only as complete as OpenStreetMap; for example, only 15 restrooms were found for Bacolod. When OSM does not say whether a fee is charged, the restroom is shown as free.
- **Free-tier limits.** Groq, Nominatim (one request per second) and the public OSRM server have usage limits and no service guarantee. Heavy traffic would require paid plans or self-hosted services.
- **English embedding model.** all-MiniLM-L6-v2 is trained mainly on English. Tagalog questions work because the assistant rewrites the search query in English before searching, but pure Tagalog semantic matching is weaker.
- **No user study.** The system was verified with automated functional, accessibility and production tests, but not yet with a formal usability study among target users.
- **Performance budget.** The home (map) page loads about 318 kB of JavaScript on first visit, above the 200 kB target set during development.
