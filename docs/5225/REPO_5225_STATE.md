# Una Voce 5225 Repository State

- Repository: `/Users/richcuff/Documents/_werk/una-voce`
- Branch: `main`
- Recovery baseline: `841b2507cc4f568fa66d76fd9d9d2818860e0ed6`
- Sprint mode: `STANDARD`
- 5225 version: `1.8`
- Last completed sprint: `Pre-Alpha Campaign Sprint A — Current-State Reconciliation + Pilot Gap Closure`
- Current Approved Checkpoint: `SELF (commit containing this state update)`
- Previous approved checkpoint: `fa127729d374f3e7636642b116000bf592e8a37d`
- Verified: `2026-08-23`
- QA: `PASS — one bounded independent GPT-5.6 Sol xhigh review; zero blocking defects`

## Sprint A result

- Sprint A collapsed to a documentation-only reconciliation checkpoint because the landed Devotion Engine satisfies every pilot-core P0/P1 acceptance criterion. No runtime, schema, telemetry, authorization, or UI change was required.
- The durable `SATISFIED / DEFERRED` matrix is recorded in `docs/devotion-engine.md`.
- The Devotion Engine Sprints 4–5 operations model is authoritative where it supersedes the original single-campaign alpha: participant links are stable, campaign-scoped HMAC derivations exposed only through authorized create/show actions; only their SHA-256 hashes are stored; revocation blocks resolution and disclosure; restoration is recoverable; legacy random hashes upgrade once.
- Campaign and cohort configuration, owner/editor/viewer boundaries, participant operations, idempotent nightly reporting, 4:00 a.m. configured-timezone resolution, participant isolation, and existing resource/player attribution remain on the established Netlify Functions, Supabase, analytics, and admin seams.
- Automated SMS, generalized campaign CMS, devotion UX redesign, and later campaign analytics concepts remain deferred.

## Validation and QA

- Focused Builder devotion verification: `47/47 PASS`.
- Full repository suite: `npm test` — `108/108 PASS`.
- Production-equivalent build: `npm run build:verify` — `PASS`.
- Independent read-only QA: `49/49` focused tests — `PASS`; zero blocking defects.
- Repository hygiene: `git diff --check` — `PASS`; unrelated untracked operator files were preserved.
- Read-only local Function smoke: public campaign route `200`; invalid participant resolution `404`; unauthenticated admin read `401`; authenticated admin read `200`; target campaign present, active, start-dated, and timezone-configured.
- The canonical port `5173` was already owned by another repository, so the successful Netlify Function smoke used loopback ports `5174/8889` in offline mode. No behavior or configuration was changed to accommodate the port conflict.

## Production and operator boundary

- Repository truth records the devotion operations migrations as applied to production and a dedicated production `DEVOTION_LINK_SECRET` as configured.
- Sprint A performed no production mutation, participant enrollment, participant-link disclosure, report submission, deployment, or Git push.
- Environment-specific deployment and the later pre-alpha campaign sprints remain operator-controlled.

## Documentation reconciliation

- This canonical state is reconciled to current Git and the root `REPO_5225_STATE.md` contract surface at the Sprint A checkpoint.
- Root `REPO_5225_STATE.md` remains the path enforced by `npm run verify:5225-state`; this file remains the canonical living 5225 narrative required by the orchestration standard.
