# Poopipoo: A Crowdsourced Restroom Finder Application for the Philippines

**Author:** Brian Francisco (BryxCinco)
**Date:** October 2026
**Version:** 1.0
**Live system:** https://poopipoo.vercel.app
**Source code:** https://github.com/BryxCinco/poopipoo

---

## Table of Contents

| Chapter | File |
| --- | --- |
| Front matter: Abstract, Keywords | this file |
| Chapter 1. Background of the Study and Rationale | [01-background.md](01-background.md) |
| Chapter 2. Statement of the Problem, Objectives, Significance, Scope and Limitations | [02-problem.md](02-problem.md) |
| Chapter 3. Review of Related Literature | [03-literature.md](03-literature.md) |
| Chapter 4. Methodology | [04-methodology.md](04-methodology.md) |
| Chapter 5. System Architecture | [05-architecture.md](05-architecture.md) |
| Chapter 6. Implementation | [06-implementation.md](06-implementation.md) |
| Chapter 7. Testing | [07-testing.md](07-testing.md) |
| Chapter 8. Results and Discussion | [08-results.md](08-results.md) |
| Chapter 9. Summary, Conclusions and Recommendations | [09-conclusion.md](09-conclusion.md) |
| Chapter 10. References | [10-references.md](10-references.md) |
| Chapter 11. Appendices (schema, API, components, environment, deployment, code, test results, screenshots) | [11-appendices.md](11-appendices.md) |

---

## Abstract

Finding a clean, accessible public restroom (locally called a *CR*, or "comfort room") is a common daily problem in Philippine cities, yet there is no free, centralized and community-maintained source of this information. This project presents **Poopipoo**, a crowdsourced restroom finder delivered as a mobile-first web application and Progressive Web App (PWA). Users can find nearby restrooms on a map or list, filter by amenities such as a bidet, tissue or wheelchair access, read and write reviews, and get walking or driving directions with spoken turn-by-turn guidance. A conversational AI assistant answers natural-language questions in Tagalog or English using Retrieval-Augmented Generation (RAG) over the project's own database.

The system was built with Next.js 14 and TypeScript on the client and server, Supabase (PostgreSQL with Row Level Security and pgvector) for data and authentication, Leaflet with OpenStreetMap data for maps, OSRM for routing, Nominatim for place search, and Groq-hosted open-weight language models for the assistant and for automated moderation. Sentence embeddings (all-MiniLM-L6-v2) are generated locally with transformers.js when the hosted inference API is unavailable. To address the cold-start problem of crowdsourced platforms, 829 public toilets were imported from OpenStreetMap under the Open Database License, giving 859 restrooms across Metro Manila, Cebu, Davao, Iloilo and Bacolod at launch. Gamification (points, levels, badges and a leaderboard) encourages contributions, while database-enforced rate limits, community verification, reports, AI moderation and a moderator dashboard protect data quality.

The application was developed in thirteen incremental phases and deployed on free tiers of Vercel and Supabase at zero cost. Automated end-to-end and database tests, accessibility audits (WCAG 2.1 AA) and production checks verified the system. The results show that a useful, privacy-conscious public-utility app can be built and operated entirely on open data and free infrastructure.

**Keywords:** crowdsourcing, volunteered geographic information, restroom finder, OpenStreetMap, Progressive Web App, Retrieval-Augmented Generation, gamification, content moderation, Philippines

---

## Notes on this document

- The system descriptions, numbers and test results in these chapters come from the source code, the Git history and the test runs of the live system (October 2026).
- **Before submitting:** check the items marked *[to verify]* or *[add local source]*. They are places where a school will expect a citation from an official Philippine source (for example, sanitation or internet-access statistics) that should be looked up directly rather than estimated.
- Follow your school's citation style (APA 7 is used here) and page format if it differs from these Markdown files.
