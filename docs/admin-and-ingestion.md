# Admin and Ingestion

The admin system manages partner communities, partner feeds, classification rules, and imported media review.

## Admin Access

The admin UI lives at:

- `/admin`
- `/admin/partners`
- `/admin/calendar-engine`

`AdminAuthGate` checks `VITE_ADMIN_ALLOWED_EMAILS` on the client. Privileged API requests also require an admin shared secret stored in browser local storage by `src/admin/adminApi.ts`.

Server-side admin authorization uses:

- `ADMIN_SHARED_SECRET`, falling back to `INGEST_SHARED_SECRET`
- `ADMIN_ALLOWED_EMAILS`

## Admin API

`netlify/functions/admin-partners.mjs` is the main admin API. It supports:

- Loading dashboard data.
- Managing partners and relationship status.
- Managing YouTube, Spotify, and Apple Podcast feeds.
- Managing classification rules.
- Updating imported media display status and prayer metadata.

The API returns a combined dashboard payload with partners, feeds, rules, recent YouTube videos, recent audio episodes, summaries, and totals.

## Ingestion Functions

Manual ingestion endpoints:

- `/api/youtube-ingest`
- `/api/spotify-ingest`
- `/api/apple-podcast-ingest`

Scheduled functions:

- `youtube-ingest-scheduled`
- `spotify-ingest-scheduled`
- `apple-podcast-ingest-scheduled`

All three scheduled jobs are configured in `netlify.toml` to run every 30 minutes.

## Feed Types

YouTube feeds can use channel or playlist metadata, depending on the partner record. Spotify and Apple Podcast ingestion use podcast/show identifiers plus canonical and embed URLs.

Imported content is normalized around:

- Provider identity.
- Partner and feed identity.
- Published date.
- Prayer date when detected.
- Prayer type when classified.
- Display status for review and publication.

## Classification Rules

Partner classification rules use include and exclude keywords, optional prayer type, language hints, priority, and default display status. Higher-priority rules are ordered first in the admin dashboard and should be used for more specific matches.

When adding rules, prefer narrowly targeted include keywords and explicit exclusions over broad phrases that could catch unrelated reflections, announcements, or music.

## Local Testing

Use Netlify dev for API testing:

```sh
npx netlify dev
```

Set `.env.local` with:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_SHARED_SECRET`
- `ADMIN_SHARED_SECRET`
- `ADMIN_ALLOWED_EMAILS`

For client admin access, also set:

- `VITE_ADMIN_ALLOWED_EMAILS`
- `VITE_ADMIN_API_BASE_URL` when the API is not on the same local origin

