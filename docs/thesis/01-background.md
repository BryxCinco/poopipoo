# Chapter 1. Background of the Study

## 1.1 Restroom scarcity in Philippine cities

In the Philippines, a public restroom is commonly called a *CR* (comfort room). For commuters, delivery riders, tourists, parents with small children, senior citizens and persons with disabilities (PWDs), knowing where the nearest usable CR is matters every day. In practice, most restrooms people rely on are inside malls, fast-food restaurants, gas stations, transport terminals and government buildings. Their availability depends on opening hours, whether they are for customers only, whether a fee is charged, and their condition (water, tissue, soap, a bidet or *tabo*, cleanliness).

This information exists, but it is scattered: it lives in people's memories, in social media posts, and partially in general-purpose map services where restrooms are rarely the focus. There is no free, centralized and community-maintained source that answers the simple question "Saan ang pinakamalapit na malinis na CR?" (Where is the nearest clean restroom?).

The Code on Sanitation of the Philippines (Presidential Decree No. 856, 1975) sets sanitation standards for public places, but it does not provide a way for the public to *find* facilities. *[add local source: a recent report or news article on public toilet availability in Metro Manila or other cities]*

## 1.2 The cold-start problem of crowdsourced applications

Crowdsourced platforms depend on their users for content, but users only join a platform that already has useful content. This chicken-and-egg situation is known as the **cold-start problem**. A restroom finder with an empty map gives a first-time user no reason to come back, and therefore no reason to contribute.

Poopipoo addresses this by **seeding** the database before launch:

- 30 hand-entered restrooms at well-known Metro Manila locations (malls, parks, terminals), and
- 829 public toilets imported from **OpenStreetMap** (OSM), where they are mapped as `amenity=toilets`.

At launch, the map therefore shows 859 restrooms in five cities, and community contributions add to that base instead of starting from zero.

## 1.3 The digital divide and mobile-first design

For many Filipinos, the smartphone is the main or only way to access the internet, often over mobile data with limited allowances and on low- to mid-range devices. *[add local source: e.g., DataReportal "Digital 2025: The Philippines", or PSA/DICT statistics on mobile internet use]*

These conditions shaped the design:

- **Mobile-first:** every screen is designed and tested at a 375-pixel-wide viewport first, then scaled up to desktop.
- **No app-store install needed:** Poopipoo is a web app that can be installed as a **Progressive Web App (PWA)**, so it works on any phone with a modern browser and takes little storage.
- **Offline support:** a service worker caches visited pages, so a previously opened restroom page still works with a weak signal.
- **Two languages:** the interface is fully available in Tagalog and English.

## 1.4 The open data movement

**OpenStreetMap** (founded in 2004) is a collaborative map of the world built by volunteers, distributed under the **Open Database License (ODbL)**. The ODbL allows anyone to use, share and adapt the data, on the condition that the source is credited and derived databases stay open.

Poopipoo uses OSM in several ways: map data (through CARTO base map tiles), imported restroom locations, place search (Nominatim) and routing (OSRM). As the ODbL requires, every imported restroom page shows "This restroom comes from OpenStreetMap. © OpenStreetMap contributors (ODbL)", and the About page explains the license.

## 1.5 The democratization of AI

Large language models (LLMs) used to require expensive proprietary APIs. Two developments made them practical for a zero-budget project:

- **Open-weight models** that anyone can download and run, served by inference providers such as **Groq** with a free tier. Poopipoo's assistant and its automated moderation use the open-weight `gpt-oss-120b` model on Groq.
- **Small embedding models** such as **all-MiniLM-L6-v2** (sentence-transformers), which convert text into 384-number vectors for semantic search. These can be called through the Hugging Face Inference API or run directly on the server with **transformers.js** (ONNX Runtime). Poopipoo uses the API when credits are available and otherwise runs the same model itself, at no cost.

Combined with a vector database (pgvector), these components allow a small project to offer a natural-language assistant ("May CR ba na may bidet sa Makati?") that answers only from verified data in its own database.

## 1.6 Local-first and privacy-first approach

Poopipoo collects only what it needs:

- **Without an account,** the map, list, restroom pages, search and navigation all work. The user's location is used in the browser to sort restrooms by distance and to request a route (the start and end points go to the public OSRM routing server), and it is never saved in the database. (When a signed-in user asks the AI assistant a "near me" question, the location is sent with that one request so distances can be computed, including to the AI provider, but it is not stored.)
- **With an account,** users store an email, a username, an optional photo, and the restrooms, reviews and votes they add.
- **Local data:** preferences such as theme, language, recent searches and the AI-assistant toggle are kept on the device, and users can clear them from Settings.
- **User control:** users can **export** all their data as a JSON file and **permanently delete** their account. Deletion removes their profile, reviews, votes and points. Restrooms they added stay on the map without their name, because other people depend on them.
- **No tracking for advertising:** the only analytics are aggregate, cookie-free page-view and performance metrics (Vercel Web Analytics and Speed Insights).

---

## 1.7 Rationale

### Why Poopipoo?

A restroom is an urgent need, and a slow or cluttered app fails exactly when it is needed. Poopipoo focuses on one job: show the nearest suitable CR and how to get there, as quickly as possible. The friendly name and visual identity also make a sensitive topic approachable and shareable.

### Why crowdsourced?

Restroom information changes often. A CR closes, starts charging a fee, runs out of water, or is renovated. No single organization can keep this current across a country, but the people who use the restrooms every day can. The "Waze model", in which users both consume and report information, keeps the data alive. Community verification ("Nakita ko na ito", "I've seen this") and reviews give each restroom a visible track record.

### Why free?

The people who most need a public restroom finder, such as commuters, workers in the field and travellers on a budget, are the least likely to pay for one. Poopipoo is free to use, has no ads, and is built only on free tiers and open data, so it can stay free as long as it stays within those limits.

### Why no Google Maps?

Google Maps Platform and Mapbox charge per map load, search and route once a project grows past their free quota, and Google's terms restrict extracting or storing its place data, which a restroom database would need to do. Open alternatives cover every need of the project:

| Need | Open alternative used |
| --- | --- |
| Map display | Leaflet + CARTO tiles (OpenStreetMap data) |
| Place search | Nominatim |
| Directions | OSRM (routing.openstreetmap.de) |
| Restroom data | OpenStreetMap `amenity=toilets` (ODbL) + community |

This keeps the running cost at zero, avoids lock-in to a single vendor, and gives back to the open-data ecosystem through attribution and open data.
