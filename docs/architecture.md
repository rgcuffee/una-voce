# Architecture

This project has three main layers:

1. A Vite/React client for the public prayer experience and admin pages.
2. Netlify Functions for privileged server operations.
3. Supabase for persistent data, auth-adjacent checks, analytics, partners, media ingestion, and liturgical calendar tables.

## Frontend

The app entry point is `src/App.tsx`.

Public routes fall through to `PrayerOfficeMockup`, which currently owns the main user-facing experience. Admin routes are protected by `AdminAuthGate` and render a routed admin shell or the calendar-engine tools. The routed shell lazy-loads the partner dashboard and exposes stable Home, partner operations, content review, analytics, and devotion URLs while continuing to use the existing combined admin payloads. Activity Analytics is a bounded authorized projection of existing `analytics_events` and `analytics_sessions`: date/dimension filters are URL-backed, event exploration is paginated, and session drilldowns contain a limited ordered sequence. This projection excludes raw event metadata, authenticated user identifiers, and participant-link material. Production uses Google OAuth and email allowlists; Vite development additionally exposes a local-password path validated by the admin API against `ADMIN_SHARED_SECRET`.

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
- `devotion.mjs` resolves opaque participant links and upserts the current nightly report.
- `admin-devotion.mjs` provides the allowlisted Devotion Analytics cohort and results contract.
- `admin-partners.mjs` powers the admin dashboard and partner/media management actions.
- `youtube-ingest.mjs`, `spotify-ingest.mjs`, and `apple-podcast-ingest.mjs` import partner media.
- `*-scheduled.mjs` wrappers run ingestion on the schedule configured in `netlify.toml`.
- `partner-content-preview.mjs` supports previewing partner content from privileged data.
- `cathoholic-videos.mjs` and `worth-abbey-videos.mjs` expose partner-specific helpers backed by `netlify/functions/lib/`.

Functions that write or read privileged data use `SUPABASE_SERVICE_ROLE_KEY`. Keep those workflows server-only.

The Holy Spirit Men's Ministry alpha uses the existing analytics event/session tables for attributable page, readable resource, and per-resource measurable player-duration evidence. Its participant, devotion, and current nightly report records are separate bounded tables created by the checked-in devotion migration. Public participant/report writes never go directly from the browser to Supabase. Admin-visible participant links use stable HMAC-derived opaque tokens; raw tokens are not stored in devotion records or returned in dashboard loads.

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

Use `npm run dev` for a loopback client server with local admin middleware. Use `npm run dev:lan` only for an explicitly requested trusted-private-LAN development session; it prints the usable private IPv4 URLs. Use `npm run dev:functions` when testing the complete Netlify redirect/function stack on loopback.

The admin API client automatically prefers local Netlify Functions when running through the expected local dev ports. If needed, set `VITE_ADMIN_API_BASE_URL` to point the admin UI at another API origin.

## Build

`npm run build` runs TypeScript project builds and then Vite. Netlify uses the same command and publishes `dist`.
