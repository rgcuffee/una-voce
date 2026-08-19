# Repository 5225 State

- Repository: `/Users/richcuff/Documents/_werk/una-voce`
- Branch: `main`
- Upstream: `origin/main` (ahead 3, behind 0 at recovery start)
- Recovery baseline: `841b2507cc4f568fa66d76fd9d9d2818860e0ed6`
- Last verified commit: `ae33c661d74e235e0b4b2e867bfbede97abf51c1`
- Last verified: `2026-08-18`
- Last completed sprint: Sprint 1 — Holy Spirit Men's Ministry 7-Day Night Prayer Devotion
- QA: PASS — three scoped independent slices plus final integration gate

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

## Sprint 1 verification

- `npm test`: 52/52 PASS.
- `npm run build:verify`: PASS; production build emitted the nested devotion document and PWA artifacts.
- Independent QA: data/security/telemetry PASS; participant/accessibility/visual PASS; admin/integration/privacy PASS; final integration gate PASS.
- The migration is checked in but was not applied. No production data was mutated and nothing was pushed or deployed.

## Documentation reconnaissance note

- This file, `README.md`, and `docs/architecture.md` contain loopback-only language for the Netlify development stack. Dev-function binding behavior was explicitly outside the devotion recovery scope and was not changed or re-authorized by Sprint 1.
- The sprint source names `docs/5225/REPO_5225_STATE.md` as canonical, while this repository contract and verifier use this root file. Both are maintained at this checkpoint pending a documentation-only canonical-path reconciliation.

## 5225 update gate

Read this file and `docs/5225-sprint-contract.md` before implementation work. A sprint checkpoint is not complete until implementation, verification, independent QA, this state file, and the checkpoint commit agree. Run `npm run checkpoint:verify` before declaring completion.
