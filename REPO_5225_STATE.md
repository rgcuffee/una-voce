# Repository 5225 State

- Repository: `/Users/richcuff/Documents/_werk/una-voce`
- Branch: `main`
- Upstream: `origin/main` (local checkpoint only; not pushed or deployed)
- Recovery baseline: `841b2507cc4f568fa66d76fd9d9d2818860e0ed6`
- Last verified commit: `20d47c42d5a4d88926e0657e9f0134170496d31d`
- Last verified: `2026-08-25`
- Last completed sprint: Pre-Alpha Campaign Sprint C — Pre/Post Surveys + Research Linkage
- QA: PASS — independent GPT-5.6-Sol read-only review found zero remaining P0–P3 defects after one bounded remediation round.

## Runtime

- `npm run dev`: loopback Vite development server at `http://127.0.0.1:5173`.
- `npm run dev:lan`: explicitly requested private-LAN Vite server; prints usable private IPv4 URLs.
- `npm run dev:functions`: loopback Netlify development stack at `http://127.0.0.1:8888`.

## Authentication boundary

- Production admin access remains Google OAuth plus the configured client and server email allowlists.
- Development mode also accepts `ADMIN_SHARED_SECRET` as the local admin password. It is validated by the local admin API and stored only after successful validation.
- `ADMIN_SHARED_SECRET` remains server-only and must never use a `VITE_` prefix.

## Recent completed checkpoints

- Prayer text provider and prayer-card wiring.
- Instagram export checkpoint.
- Una Voce Studio baseline and source-metadata alignment.
- Sprint 1 Holy Spirit Men's Ministry 7-Day Night Prayer Devotion: `ae33c661d74e235e0b4b2e867bfbede97abf51c1`.
- Admin Redesign Sprint 1 routed hub and partner reorganization: `d83b293829a1c18c1e7c32356eee9c5c17b07cc1`.
- Admin Redesign Sprint 2 analytics and devotion intelligence: `d59fc473b7f573e18762c413c969c86ca444f0b0`.
- Devotion Engine Sprints 4–5 operations, analytics, and hardening: `aa626ca267cc657a15bf46b55f2ea12fbdf00f60`.
- Smart Prayer Links deterministic direct-Hour hash navigation, including StrictMode safety: `b3dd6f741de5d8db97201d294a012d3465919893`.
- Pre-Alpha Campaign Sprint A pilot-operability reconciliation: `4282d3d8eec4c4edd6025a89813da61672d2b592`.
- Pre-Alpha Campaign Sprint B links, attribution, and telemetry contract: `9c4ac9992f0e3e9280a97b156d3dc5523de5ec90`.
- Pre-Alpha Campaign Sprint C pre/post surveys and research linkage: `20d47c42d5a4d88926e0657e9f0134170496d31d`.

## Pre-Alpha Campaign Sprint C verification

- The participant devotion flow now contains a bounded first-party pre/post research instrument with truthful pseudonymous-linkage language. Survey view, start, partial save, and submitted completion remain separate states and telemetry evidence.
- Survey responses are stored once per devotion, participant, and phase behind RLS and a service-role-only RPC. Raw participant tokens and token hashes are never stored with or projected from responses; exact retries preserve first-start/first-submit timestamps, while explicit completed-response updates retain the original submission time.
- The authenticated devotion admin exposes bounded partial/submitted response evidence and a spreadsheet-safe CSV joined through shortened devotion and participant identifiers. Missing survey schema is disclosed without masking unrelated repository failures.
- Full verification: `npm test` — 138/138 PASS; `npx tsc -b` — PASS; `npm run build:verify` — PASS; isolated PGlite migration/RPC privilege, linkage, validation, retry, and update smoke — PASS.
- Independent read-only QA: 44/44 focused adversarial checks PASS after one remediation round; zero remaining P0–P3 findings. `git diff --check` and the 5225 checkpoint gate passed.
- The survey migration is checked in but was not applied remotely. No production data, deployment, Git push, or participant-link disclosure was performed.

## Pre-Alpha Campaign Sprint B verification

- Canonical analytics sources, web/PWA surface, public campaign dimensions, event requirements, UUID session lifecycle, and links-to-parent handoff behavior are defined in `src/lib/analyticsContract.mjs` and `docs/analytics-architecture.md`.
- Migrated ingestion uses a service-role-only security-invoker RPC for atomic event insertion, exact payload-fingerprint retry deduplication, conflict rejection, and prayer-session rollups. The guarded pre-migration path scrubs credentials and repairs idempotent session mutations on retry.
- `links.unavoce.net` retains no analytics credential or backend write path. React and static Hour routes preserve one safe session and allowlisted attribution while excluding devotion participant tokens and other credentials.
- Main verification: `npm test` — 125/125 PASS; `npx tsc -b` — PASS; `npm run build:verify` — PASS. Local PGlite migration/RPC smoke and independent final frozen-diff QA passed with zero P0–P3 findings.
- The migration is checked in but was not applied remotely. No production data, schema, deployment, or Git push was performed.

## Pre-Alpha Campaign Sprint A verification

- Sprint A collapsed to a documentation-only reconciliation checkpoint: no P0/P1 pilot-operability code gap was found, and no runtime, schema, telemetry, authorization, or UI change was required.
- The durable `SATISFIED / DEFERRED` matrix in `docs/devotion-engine.md` reconciles the original single-campaign alpha against the authoritative Devotion Engine Sprints 4–5 operations model.
- The current stable HMAC-derived participant-link model, authorized Show link, revoke/restore behavior, one-time legacy upgrade, token-hash-only storage, route isolation, configured-timezone 4:00 a.m. boundary, idempotent nightly reports, and existing resource/player attribution all remain satisfied.
- Focused Builder verification: 47/47 PASS. Full `npm test`: 108/108 PASS. `npm run build:verify`: PASS. Independent QA: 49/49 focused PASS with zero blocking defects.
- Read-only local Function smoke passed for the public campaign route, invalid participant failure, unauthenticated admin denial, authenticated admin read, and the active/date/timezone configuration of the target campaign. No production mutation endpoint was called.
- Unrelated untracked operator files were preserved. No production mutation, participant-link disclosure, report submission, deployment, Git push, or schema change was performed.

## Smart Prayer Links integration verification

- `npm test`: 108/108 PASS.
- `npm run build:verify`: PASS. The verification build used its temporary output and did not update tracked `dist` artifacts.
- All four valid anchors, `segment-morning`, `segment-midday`, `segment-evening`, and `segment-night`, receive a post-mount `scrollIntoView({ behavior: 'auto', block: 'start' })` after direct hash entry.
- The direct-hash helper retains the hash through a React StrictMode setup, cancellation, and retry cycle; it marks completion only after the mounted target is successfully scrolled and does not repeat during later normal view changes.
- Existing in-app navigation retains its smooth scrolling and date selection behavior.
- No Git push or deployment was performed by agents for this integration. This checkpoint documents only the deterministic hash-navigation work, not unrelated operator changes.

## Devotion Engine Sprints 4–5 verification

- `npm test`: 101/101 PASS.
- `npm run build:verify`: PASS; TypeScript, Vite, nested devotion output, and PWA verification completed successfully.
- Multi-campaign operations now include cohort scheduling, 1–40-night duration, lifecycle and participant statuses, stable campaign-scoped participant links, bulk revocation, owner/editor/viewer boundaries, and service-role-only audit history.
- Campaign creation and its General cohort are atomic through a security-invoker RPC with a fixed search path and execute access restricted to `service_role`.
- Portfolio and campaign analytics retain full bounded-population metrics while participant detail is paged; sampled evidence is disclosed and absence-based alerts are suppressed when sources are truncated.
- Responsive admin checks passed at phone, tablet, and desktop breakpoints, including the 900/901px navigation boundary and 44px narrow-layout controls.
- Supabase migrations `20260822000000`, `20260822010000`, and `20260822020000` were applied to production project `lbjtuekhnzbyivjhtlma`; migration history, backfills, RLS, RPC grants, PostgREST schema cache, and read-only REST access were verified.
- A dedicated write-only production `DEVOTION_LINK_SECRET` was configured for Netlify Functions. No secret value was printed or stored in the repository.
- Independent GPT-5.6-Sol xhigh QA: PASS with no remaining P0-P3 findings.
- No application deployment or Git push was performed. Before deployment, configure a dedicated high-entropy production `ADMIN_SHARED_SECRET`; the existing short ingest-secret fallback should not be treated as an acceptable admin credential.

## Admin redesign Sprint 2 verification

- `npm test`: 79/79 PASS.
- `npm run build:verify`: PASS; TypeScript, Vite, nested devotion output, and PWA verification completed successfully.
- Activity Analytics: bounded UTC date ranges, daily/weekly/monthly aggregation, prior-period comparison, URL-backed dimension filters, a paged explorer, safe session drilldowns, and capped CSV export were exercised against the local signed-in runtime.
- Community Performance: mapped attribution, sorting, client-side drilldown, chronological trends, destinations, and honest unavailable states passed runtime QA.
- Devotion Operations and Devotion Analytics remain distinct workflows; canonical/config/status/link-security behavior, the seven-night rollup, participant/night/outcome filters, resource/minute semantics, and mobile cards passed runtime QA.
- Responsive checks: no page-level horizontal overflow at 320px, 390px, 768px, 820px, 821px, 1024px, or 1440px; the drawer/sidebar breakpoint and 44px mobile controls passed.
- Privacy/adversarial checks reject arbitrary or secret-bearing routes, unsafe schemes, PII-like content, and unknown attribution while retaining trusted mapped routes and shortened hashed display identifiers.
- Independent GPT-5.6-Sol xhigh QA: PASS with no remaining P0-P3 findings.
- Existing analytics and devotion data were reorganized and projected without a schema change or new tracking fields. No production data, deployment, push, or migration was performed.

## Admin redesign Sprint 1 verification

- `npm test`: 61/61 PASS.
- `npm run build:verify`: PASS; the admin dashboard is emitted as a separate lazy-loaded chunk.
- Runtime smoke: every new and retained admin SPA route returned HTTP 200; Home, review deep links, partner selection, refresh persistence, and responsive layouts were exercised locally without mutation POSTs.
- Responsive checks: no page-level horizontal overflow at 768px, 390px, or 320px; mobile navigation and primary controls meet the 44px target.
- Independent QA: PASS with no remaining P0-P3 findings.
- No schema, telemetry collection, ingestion behavior, production data, deployment, or push was changed.

## Devotion Sprint 1 verification

- `npm test`: 52/52 PASS.
- `npm run build:verify`: PASS; production build emitted the nested devotion document and PWA artifacts.
- Independent QA: data/security/telemetry PASS; participant/accessibility/visual PASS; admin/integration/privacy PASS; final integration gate PASS.
- The migration is checked in but was not applied. No production data was mutated and nothing was pushed or deployed.

## Documentation reconnaissance note

- `docs/5225/REPO_5225_STATE.md` is the living 5225 narrative required by the orchestration standard; this root file remains the contract/verifier surface used by `npm run verify:5225-state`. Sprint A reconciled both surfaces to the same approved product truth.
- Loopback-only development behavior remains unchanged. The successful Function smoke used alternate loopback ports because port 5173 was occupied by another repository; no repository configuration changed.

## 5225 update gate

Read this file and `docs/5225-sprint-contract.md` before implementation work. A sprint checkpoint is not complete until implementation, verification, independent QA, this state file, and the checkpoint commit agree. Run `npm run checkpoint:verify` before declaring completion.
