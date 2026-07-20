# Zoom test room

`/test-room` is an intentionally unlisted experiment. It embeds a Zoom Meeting SDK **Component View** inside the Una Voce page; it does not appear in the site navigation.

## What it does

1. Shows one server-controlled room with either a live or scheduled state.
2. Lets a visitor connect their Zoom account through OAuth, or join as a guest when the room policy allows it.
3. Generates the short-lived Meeting SDK JWT only in a Netlify Function. The Zoom client secret never reaches the browser.
4. When `ZOOM_TEST_ROOM_REQUIRES_AUTH=true`, uses the connected account to retrieve a short-lived ZAK and passes it directly to the Meeting SDK join call.

The room’s meeting number and password live only in server environment variables. The browser receives them only after it elects to join the configured room.

## Zoom configuration

Create a Zoom OAuth app with the Meeting SDK feature and use its Client ID and Client Secret. In the Zoom Marketplace app configuration:

- Add the production callback URL exactly as `https://YOUR-DOMAIN/api/zoom/oauth/callback`.
- Add the local callback URL exactly as `http://localhost:8888/api/zoom/oauth/callback` if using `netlify dev`.
- Give the app the user-read scope required to retrieve the current Zoom user and a ZAK for the authenticated account.
- Add the production domain to the Meeting SDK allow list.

Then copy the Zoom section of `.env.example` to the Netlify environment. Generate `ZOOM_SESSION_SECRET` as a long random value; it encrypts the browser’s HTTP-only Zoom session cookie.

For a room that authenticates participants through Zoom, set:

```text
ZOOM_TEST_ROOM_REQUIRES_AUTH=true
```

For a room hosted by the same Zoom account as the Meeting SDK app, guests can join with the Meeting SDK JWT alone. Set the value to `false` to allow that flow.

## Room state

`ZOOM_TEST_ROOM_STATUS` accepts `live` or `scheduled`. `ZOOM_TEST_ROOM_START_AT` is an ISO 8601 datetime shown for scheduled rooms. This first experiment deliberately uses operator-set state; it does not claim to infer whether a meeting is live.

For a production room directory, persist room records and update their state from Zoom `meeting.started` and `meeting.ended` webhooks. That provides a truthful live indicator and an audit trail rather than guessing from the calendar.

## Account boundary

The current implementation is designed for a room hosted under the Zoom account that owns the Meeting SDK app. Zoom requires extra authorization for Meeting SDK apps joining meetings outside that account: an approved app plus an OBF or ZAK-based attribution flow. Do not point this test room at arbitrary third-party Zoom meetings without completing that approval and flow.
