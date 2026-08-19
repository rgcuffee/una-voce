# Admin and Ingestion

The admin system manages partner communities, partner feeds, classification rules, and imported media review.

The same protected admin shell also contains a top-level **Devotion Analytics** tab for the Holy Spirit Men's Ministry seven-night alpha. Its separate `/api/admin/devotion` Function reuses the existing shared-secret or Google bearer/server-allowlist authorization boundary.

## Admin Access

The admin UI lives at:

- `/admin`
- `/admin/partners`
- `/admin/calendar-engine`

In production, `AdminAuthGate` uses Google OAuth and checks `VITE_ADMIN_ALLOWED_EMAILS` on the client. The server independently enforces its configured authorization boundary.

In Vite development only, the sign-in screen also accepts `ADMIN_SHARED_SECRET` as a local password. The UI sends the candidate to the local admin API and stores it under `una-voce-admin-secret` only after a successful response. A wrong password is not persisted, and production builds do not render or invoke this local-password path.

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

The bounded devotion admin API supports participant label enrollment, explicitly requested opaque-link display, revocation, pilot configuration, and the participant-by-night results matrix. Participant tokens are derived server-side from the participant ID and `DEVOTION_LINK_SECRET`, so raw tokens are not stored or included in dashboard loads. Participants created before this change receive one clearly disclosed link upgrade the first time an admin selects **Show link**.

Devotion reporting presents readable resource labels, click counts, and measured time per media resource. External text links can record the click but cannot measure time spent on the third-party page.

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

Use the loopback Vite server for the client and local admin-password flow:

```sh
npm run dev
```

Use the full Netlify development stack for redirect/function testing:

```sh
npm run dev:functions
```

For an explicitly requested trusted-private-LAN development session, use:

```sh
npm run dev:lan
```

Set `.env.local` with:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INGEST_SHARED_SECRET`
- `ADMIN_SHARED_SECRET`
- `ADMIN_ALLOWED_EMAILS`
- `DEVOTION_LINK_SECRET` (recommended; otherwise participant links derive from `ADMIN_SHARED_SECRET`)

For client admin access, also set:

- `VITE_ADMIN_ALLOWED_EMAILS`
- `VITE_ADMIN_API_BASE_URL` when the API is not on the same local origin
