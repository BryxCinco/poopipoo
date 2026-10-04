# Poopipoo — Project Context

## Ano ito
Crowdsourced restroom finder app para sa Pilipinas. "Waze ng CR."
Web + PWA. Later: React Native mobile.

## Tech Stack
- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui
- Supabase (Postgres + Auth + Storage + pgvector)
- Mapbox GL JS (o Leaflet + OSM)
- Groq API / Gemini API para sa AI agent
- PWA (Serwist o next-pwa)

## Conventions
- TypeScript strict mode — walang `any`
- Functional components, hooks
- Server Components by default, Client Components kung kailangan
- Mobile-first design
- Filipino + English UI
- Folder structure: /app, /components, /lib, /hooks, /types, /public

## Rules para kay Claude
- HUWAG mag-overreach. Gawin lang ang nasa phase.
- HUWAG mag-install ng package na hindi ko sinabi.
- HUWAG mag-modify ng files sa labas ng scope.
- Mag-ask muna bago mag-refactor ng existing code.
- Isulat ang code na may comments kung complex.
- Bawat phase, i-commit sa git.

## Current Phase
Phase 1: Scaffold only. Walang map, auth, o database.