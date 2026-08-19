# Una Voce 5225 Repository State

- Repository: `/Users/richcuff/Documents/_werk/una-voce`
- Branch: `main`
- Recovery baseline: `841b2507cc4f568fa66d76fd9d9d2818860e0ed6`
- Sprint mode: `LONG-SPRINT`
- 5225 version: `1.8`
- Last completed sprint: `Sprint 1 — Holy Spirit Men's Ministry 7-Day Night Prayer Devotion`
- Current Approved Checkpoint: `SELF`
- Verified: `2026-08-18`
- QA: `PASS — three scoped slices plus final independent integration gate`

## Approved product truth

- The checked-in migration adds the bounded devotion, participant, nightly-report, and attributable analytics schema. The Holy Spirit Men's Ministry alpha seed remains inactive and unconfigured until an operator supplies the start date, timezone, survey URLs, and participant labels.
- Participant links use one stable opaque token at a time. Only the SHA-256 token hash is stored. The complete URL is disclosed once on create or reissue; later admin loads expose only a safe participant ID and link status.
- Participant resolution and current nightly-report upserts run through the existing Netlify Function/service-role boundary. Report identity is `devotion + participant + pilot_day`; `prayer_date` remains recorded data.
- Pilot-night resolution uses the configured IANA timezone and a 4:00 a.m. local rollover. Active Night 1–7, pre-start, completed, invalid, and revoked states are implemented without browser-timezone dependence.
- The participant page reuses the existing Night Prayer resource/provider/date/media engine. Resource opens and measurable prayer-player sessions retain structured devotion, participant, night, provider, resource, media, and duration attribution.
- The existing admin application has a native top-level **Devotion Analytics** tab with the required summary metrics, enrollment and one-time link display, configuration controls, link reissue/revoke actions, and participant × Night 1–7 evidence matrix.
- The campaign document has route-specific crawler metadata and privacy headers. The PWA navigation fallback excludes `/devotions/*`, so service-worker-controlled visits retain the campaign document's referrer protections.
- Analytics removes participant-token keys, token-shaped values, and devotion `p` query parameters before persistence. Raw participant tokens are not stored in analytics, emitted in logs, returned by later dashboard loads, or embedded in the campaign document.

## Validation and QA

- Canonical tests: `npm test` — `52/52 PASS`.
- Production-equivalent build: `npm run build:verify` — `PASS` (`103` modules; nested devotion document and PWA artifacts emitted).
- Repository hygiene: `git diff --check` — `PASS`.
- Independent QA: Slice 1 data/security/telemetry `PASS`; Slice 2 participant/accessibility/visual `PASS`; Slice 3 admin/integration/privacy `PASS`; final integration gate `PASS`.
- Representative local smoke: participant active/pre-start/completed/invalid states, report create/update, admin dashboard, one-time link generation, protected APIs, route-specific HTTP metadata, and token-free referrer/service-worker behavior `PASS`.

## Operator follow-up before the alpha runs

- Apply the checked-in Supabase migration through the normal operator-controlled release process.
- Configure the real start date, IANA timezone, pre/post survey URLs, and participant labels in Devotion Analytics, then explicitly activate the devotion.
- No migration was applied, no production data was mutated, and nothing was pushed or deployed in Sprint 1.

## Documentation and reconnaissance debt

- The sprint source names this file as canonical, while the repository's current `AGENTS.md`, completion contract, and verifier use root `REPO_5225_STATE.md`. Both state surfaces are maintained for this checkpoint; a later documentation-only reconciliation should select one canonical path.
- Root `REPO_5225_STATE.md`, `README.md`, and `docs/architecture.md` contain loopback-only language for the Netlify development stack. Runtime binding behavior is outside this devotion sprint; no `dev:functions`, LAN, or loopback behavior was changed or re-authorized here.
