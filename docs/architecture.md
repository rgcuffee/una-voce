# Architecture

This project has three main layers:

1. A Vite/React client for the public prayer experience and admin pages.
2. Netlify Functions for privileged server operations.
3. Supabase for persistent data, auth-adjacent checks, analytics, partners, media ingestion, and liturgical calendar tables.

## Frontend

The app entry point is `src/App.tsx`.

Public routes fall through to `PrayerOfficeMockup`, which currently owns the main user-facing experience. Admin routes are protected by `AdminAuthGate` and render the partner dashboard or calendar-engine tools.

Important frontend areas:

- `src/components/` contains reusable UI and the main prayer office shell.
- `src/pages/` contains page-level views used by the prayer office experience.
- `src/admin/` contains admin-only components and the admin API client.
- `src/data/` contains static partner/hour data used by the client.
- `src/lib/` contains Supabase clients, analytics, calendar queries, and calendar conflict logic.

## Social Studio

The private social design workspace lives in `social/` and is served at `/social/` during local development.

It is intentionally separate from the public prayer experience:

- `social/index.html` defines the studio and carousel preview shell.
- `social/app.js` handles the first-nine grid, modal navigation, keyboard controls, crop modes, and deep links.
- `social/designs.js` contains the approved launch sequence, captions, and slide markup.
- `social/styles.css` contains the studio interface and crop behavior.
- `social/artwork.css` contains the approved editorial artwork system and motif library.

The studio must preserve 4:5 artwork review, centered 1:1 crop review, carousel navigation, caption previews, and links to specific designs and slides.

Brand and writing rules live in `docs/brand/`. The current first nine are the reference implementation for future social work.

## Serverless Functions

Netlify Functions live in `netlify/functions`.

- `analytics.mjs` records prayer-player analytics.
- `admin-partners.mjs` powers the admin dashboard and partner/media management actions.
- `youtube-ingest.mjs`, `spotify-ingest.mjs`, and `apple-podcast-ingest.mjs` import partner media.
- `*-scheduled.mjs` wrappers run ingestion on the schedule configured in `netlify.toml`.
- `partner-content-preview.mjs` supports previewing partner content from privileged data.
- `cathoholic-videos.mjs` and `worth-abbey-videos.mjs` expose partner-specific helpers backed by `netlify/functions/lib/`.

Functions that write or read privileged data use `SUPABASE_SERVICE_ROLE_KEY`. Keep those workflows server-only.

## Data

Supabase is the system of record.

The migration history currently covers:

- Liturgical calendar schema and canonical celebration identity.
- Prayer player analytics.
- Partner YouTube, Spotify, and Apple Podcast ingestion.
- Calendar review items and conflict details.
- Partner relationship status and partner metadata.
- Daytime prayer keyword handling for Divine Office content.

Browser-side Supabase access uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Server-side jobs and functions use `SUPABASE_URL` or `VITE_SUPABASE_URL` plus `SUPABASE_SERVICE_ROLE_KEY`.

## Local Development

Use `npm run dev` for client-only work. Use `npx netlify dev` when testing `/api/*` routes or Netlify Functions.

The admin API client automatically prefers local Netlify Functions when running through the expected local dev ports. If needed, set `VITE_ADMIN_API_BASE_URL` to point the admin UI at another API origin.

## Build

`npm run build` runs TypeScript project builds and then Vite. Netlify uses the same command and publishes `dist`.
