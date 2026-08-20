# Repository 5225 State

- Repository: `/Users/richcuff/Documents/_werk/una-voce`
- Branch: `main`
- Upstream: `origin/main` (local checkpoint only; not pushed or deployed)
- Recovery baseline: `841b2507cc4f568fa66d76fd9d9d2818860e0ed6`
- Last verified commit: `d59fc473b7f573e18762c413c969c86ca444f0b0`
- Last verified: `2026-08-20`
- Last completed sprint: Admin Redesign Sprint 2 — analytics and devotion intelligence
- QA: PASS — independent GPT-5.6-Sol xhigh review found no remaining P0-P3 issues

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

- This file, `README.md`, and `docs/architecture.md` contain loopback-only language for the Netlify development stack. Dev-function binding behavior was explicitly outside the devotion recovery scope and was not changed or re-authorized by Sprint 1.
- The sprint source names `docs/5225/REPO_5225_STATE.md` as canonical, while this repository contract and verifier use this root file. Both are maintained at this checkpoint pending a documentation-only canonical-path reconciliation.

## 5225 update gate

Read this file and `docs/5225-sprint-contract.md` before implementation work. A sprint checkpoint is not complete until implementation, verification, independent QA, this state file, and the checkpoint commit agree. Run `npm run checkpoint:verify` before declaring completion.
