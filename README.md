# Una Voce

Una Voce is a Vite/React prototype for praying the Liturgy of the Hours with partner community content, liturgical calendar data, and lightweight admin tooling for reviewing media ingestion.

The app is deployed as a static Vite build with Netlify Functions for analytics, admin APIs, and scheduled media ingestion. Supabase stores partner data, prayer analytics, ingested media, and the liturgical calendar engine tables.

## Quick Start

```sh
npm install
cp .env.example .env.local
npm run dev
```

The Vite app runs on `http://localhost:5173`. For Netlify redirects and local functions, use:

```sh
npx netlify dev
```

Netlify dev serves the app on `http://localhost:8888` and proxies Vite requests to port `5173`.

## Common Commands

```sh
npm run dev
npm run build
npm run preview
npm run build:us-calendar-sql
npm run seed:us-calendar
npm run seed:ew-calendar
npm run seed:us-calendar-canonical
npm run generate:calendar-conflicts
npm run build:ew-calendar-report
```

## Environment

Copy `.env.example` to `.env.local` and fill in the keys needed for the workflow you are running.

The client can run without Supabase credentials, but data-backed features will throw configuration errors or show empty states. Netlify Functions and calendar seed scripts require server-side Supabase credentials.

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_SHARED_SECRET`, or `ADMIN_SHARED_SECRET` in client-visible configuration.

## Project Map

- `src/App.tsx` wires the public app and admin routes.
- `src/components/PrayerOfficeMockup.tsx` contains the current main prayer-office experience.
- `src/admin/` contains the admin dashboard UI and API client.
- `src/lib/liturgicalCalendar.ts` contains browser-side calendar queries.
- `src/lib/calendarConflictClassifier.ts` classifies calendar differences for review.
- `netlify/functions/` contains analytics, admin, and media ingestion endpoints.
- `scripts/` contains calendar import, canonicalization, reporting, and conflict-generation jobs.
- `supabase/migrations/` defines the database schema over time.
- `supabase/seed_*.sql` files seed known partner/community records.

## Docs

- [Architecture](docs/architecture.md)
- [Admin and Ingestion](docs/admin-and-ingestion.md)
- [Liturgical Calendar](docs/liturgical-calendar.md)

## Deployment Notes

The production build command is `npm run build`. Netlify publishes `dist` and serves functions from `netlify/functions`.

Scheduled ingestion functions currently run every 30 minutes:

- `youtube-ingest-scheduled`
- `spotify-ingest-scheduled`
- `apple-podcast-ingest-scheduled`

Manual API routes are exposed through Netlify redirects in `netlify.toml`.

