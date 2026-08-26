# Devotion Engine

The devotion engine supports multiple Night Prayer campaigns under `/devotions/:devotionSlug/night-prayer`. The original Holy Spirit Men's Ministry URL remains valid. Every participant link is campaign-scoped and contains an opaque HMAC-derived token; raw participant tokens are never stored.

## Operational model

- A `devotions` row is a campaign. Campaigns have a stable slug, display metadata, a 1–40-night duration, default schedule, surveys, and lifecycle status.
- A `devotion_cohorts` row is a named group inside a campaign. Cohorts can use independent start dates, IANA timezones, and lifecycle status while sharing the campaign experience.
- Every participant belongs to exactly one cohort in the same campaign. Participant status is `enrolled`, `active`, `completed`, or `withdrawn`.
- Revocation is recoverable. Restoring a link clears `revoked_at`; the stable server-derived token remains the same. Campaign and cohort archive states are also reversible through an owner-authorized status change.
- Scheduling is configuration only. The system does not collect participant email addresses or phone numbers and does not send outbound reminders. Operational attention flags describe missing current-night evidence without claiming delivery or conversion.

Campaign/cohort lifecycle states are `inactive`, `draft`, `scheduled`, `active`, `paused`, `completed`, and `archived`. `scheduled` and `active` records require a start date and timezone. Scheduled records become available according to their configured civil date without a separate background job.

## Admin roles and audit

The devotion API authorizes independently on the server:

- `owner`: full access, including campaign creation and archive actions.
- `editor`: campaign/cohort configuration and participant operations, excluding owner-only actions.
- `viewer`: read-only operations and analytics.

`ADMIN_ALLOWED_EMAILS` remains the authorization allowlist. Optional `ADMIN_DEVOTION_EDITOR_EMAILS` and `ADMIN_DEVOTION_VIEWER_EMAILS` assign narrower roles to emails already in that allowlist. The local/shared-secret path is an owner. Successful mutations write a service-role-only `devotion_admin_audit` record. Audit records contain action/target/status metadata, never participant tokens or request credentials. A failed audit write is disclosed in the mutation response and UI without retrying the completed mutation.

## Analytics and bounds

Selected-campaign analytics retain the existing evidence distinction:

- page opened;
- resource opened;
- measured in-player duration;
- participant report outcome.

These units are not presented as a conversion funnel. Portfolio intelligence compares the same raw evidence across campaigns. PostgREST reads are deterministic and paged. Campaign metrics and the per-night campaign rollup use the full bounded population and remain stable while an admin pages through participant detail. Expanded 1–40-night participant detail is returned in explicit 100-participant pages so a maximum-duration campaign cannot create an oversized Function response; detail filters and CSV are labeled as current-page operations. Reports, events, sessions, and portfolio sources are capped at 10,000 rows each. When a cap is reached, the API and UI label the result sampled/lower-bound and name the affected source. Absence-based follow-up alerts are suppressed when report, event, or session evidence is sampled.

Research projections add smaller response caps inside that bounded source read:
40 activity sessions, 20 events in each timeline, 25 resource rows in each
participant-night cell, 50 resource rows in each nightly research row, and 250
privacy-safe survey-response detail rows. Reaching a projection cap labels the
affected evidence lower-bound and exposes observed, shown, and cap values.
Participant-night and nightly resource detail share a deterministic global
budget of 1,000 rows (600 and 400 respectively), and nightly prayer-date arrays
are capped at 10. Aggregates still consume the full bounded evidence source.

Public resource attribution is projected before it reaches the admin response. Dangerous URLs, token-shaped identifiers, unsupported providers/media types, and obvious PII-shaped labels are replaced with bounded generic labels.

## Campaign surveys

Campaign research uses a bounded first-party pre/post survey rather than an external form platform. The public Function resolves the participant link server-side and stores one response per devotion, participant, and phase. Survey rows contain the participant UUID membership key and approved structured answers only; raw participant tokens and token hashes are never copied into survey storage.

Opening the survey, beginning it, and completing it are distinct states. Opening emits the existing survey-click event, choosing Begin creates a `partial` response and emits the survey-start event, and only a successful complete server submission emits the survey-submit event. Partial saves never count as completion. An identical completed retry returns the existing row without changing its timestamps; a later changed completion is allowed only through another complete submission and updates `updated_at` while preserving the original `started_at` and `submitted_at`.

Pre surveys are available before and during an active devotion; post surveys become available after completion. The concise participant notice states that responses are pseudonymously linked to participation and activity and are not anonymous. Authenticated devotion analytics exposes partial and submitted rows separately, joined only to one-way devotion/participant display identifiers for display and CSV. Legacy `pre_survey_url` and `post_survey_url` columns remain for schema compatibility but are not rendered as completion-capable campaign surveys.

## Operator and research evidence

Authenticated devotion analytics consumes the existing campaign evidence and
does not write derived dashboard state. It exposes bounded chronological
session/event evidence, cohort and participant-by-day summaries, nightly
resource/provider/media and report detail, submitted pre/post comparisons, and
canonical source/surface plus device breakdowns. Stored fields and deterministic derived
fields are labeled separately. Any source or response cap is disclosed as an
exact-versus-lower-bound status.

The deterministic six-stage participant funnel and duration definitions live
in `docs/analytics-architecture.md`. Funnel stages are nested by construction,
and every displayed stage count reconciles to its safe participant-ID
drilldown. Raw non-nested evidence remains visible separately; clicks never
stand in for survey, prayer, campaign, or third-party completion.

Pilot-day evidence is normalized to an integer within the selected campaign's
configured duration before participant-day aggregation or distinct-day return
logic. Page-open, resource-open, and prayed-report evidence still supports the
Opened and Engaged / prayed stages when its day is missing or out of range; it
does not enter day views or advance Returned. Duration projections use `exact`,
`partial`, and `unavailable`: a stored
numeric zero is exact, mixed known and null/blank values produce a partial
known-only lower-bound sum, and all-missing evidence produces null/unavailable.
This applies to campaign, night, participant-day/resource, and portfolio
totals. Stored prayer-player completion, source-opened state, and highest progress
are shown in Activity as player evidence and remain distinct from explicit
campaign completion and submitted survey completion.

Schema compatibility is readiness, not zero evidence: when first-party survey
storage is unavailable, Continued and survey comparisons render unavailable;
when the Sprint B acquisition-column fallback is used, canonical source and
surface breakdowns render unavailable. Device evidence and independently valid
funnel stages keep their own exact/lower-bound state. Operations and Analytics
mount separate dashboard instances so Operations keeps mutation UUIDs while
Analytics receives only one-way portfolio identifiers and other privacy-safe
projections.

The additive `/admin/devotions/sessions` workflow presents those projections
participant-first: select a one-way participant ID, then inspect campaign
nights, explicit reports, survey state, player measures, and chronological
stored events. It shares the existing campaign selector and bounded response;
it does not expose participant labels or link material and does not replace the
aggregate `/admin/analytics/devotions` research dashboard.

Analytics-mode responses retain this full evidence shape even before the first
campaign exists. Activity, funnel, survey, source/surface/device, and comparison
sections are explicitly unavailable; arrays are empty, survey detail is
unavailable, and the access email remains removed.

## Database migrations

The operations schema is introduced in committed order because PostgreSQL enum additions must be committed before later migrations use them:

1. `20260822000000_devotion_operations_statuses.sql`
2. `20260822010000_devotion_operations_engine.sql`
3. `20260822020000_devotion_operations_audit.sql`
4. `20260824000000_campaign_analytics_contract.sql`
5. `20260825000000_devotion_campaign_surveys.sql`

The engine migration creates and backfills a `General` cohort for every existing campaign before making participant cohort membership required. New campaign plus `General` cohort creation uses the service-role-only `create_devotion_campaign` database function so both records commit or roll back together. All devotion and audit tables have RLS enabled with no browser policies; public participant/report traffic goes through Netlify Functions.

All five migrations are recorded as applied to production project `lbjtuekhnzbyivjhtlma`. The campaign analytics and survey migrations were applied on 2026-08-25; their ledger entries, schema objects, RLS posture, service-role-only RPC execute grants, and PostgREST schema-cache refresh were verified without inserting participant, survey, or analytics rows.

## Production configuration

Required server configuration remains:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SHARED_SECRET` or `INGEST_SHARED_SECRET`
- `ADMIN_ALLOWED_EMAILS` for bearer access
- `DEVOTION_LINK_SECRET` required for production deployment as a dedicated high-entropy value of at least 32 characters; the admin-secret fallback exists only for compatibility

Optional role configuration:

- `ADMIN_DEVOTION_EDITOR_EMAILS`
- `ADMIN_DEVOTION_VIEWER_EMAILS`

Schema migration and Netlify environment/deployment are separate operator-approved production actions. Checked-in code does not imply those actions have occurred.

## Sprint A pilot-operability reconciliation

Inspected checkpoint: `fa127729d374f3e7636642b116000bf592e8a37d` (2026-08-23).
Sprint A reconciles the original single-campaign alpha with the landed Devotion
Engine Sprints 4–5 model; the latter is authoritative where they differ and
does not introduce a second architecture.

| Pilot requirement | Status | Reconciliation evidence |
| --- | --- | --- |
| Configure/start without production DB edits | **SATISFIED** | Owner creates a draft campaign and atomic `General` cohort; owner/editor configuration requires an IANA timezone and start date before `scheduled`/`active`. Operations UI exposes the lifecycle form. |
| Create/show/revoke/restore participant links | **SATISFIED** | Authorized create/show derives a campaign-scoped HMAC token and stores only its SHA-256 hash. Revoke blocks resolve and disclosure; restore is recoverable. The UI provides Copy plus select/copy fallback for manual reminder/SMS use. |
| Sprint 1 one-time random-token “reissue” wording | **SATISFIED — superseded intentionally** | The current stable, server-derived token is reconstructed only for authorized Show link; a legacy random hash upgrades once. This intentionally replaces token rotation with recoverable revocation/restoration, route matching, role checks, and no raw-token persistence. |
| Timezone, 4 a.m. boundary, and participant identity isolation | **SATISFIED** | Server resolution uses cohort schedule with campaign fallback, configured timezone, 04:00 local rollover, and campaign-route matching. Tests cover pre-start, Nights 1–7, completion, DST, and invalid/revoked/cross-campaign links without roster disclosure. |
| Idempotent nightly outcome visible to operator | **SATISFIED** | Reports upsert on `devotion_id + participant_id + pilot_day`; participant/night evidence and campaign rollups expose the resulting outcome. |
| Existing resource/player telemetry attribution | **SATISFIED** | Page, resource, report, and player/session telemetry carries devotion, participant, pilot-day, and prayer-date attribution where designed; validation rejects incomplete attribution and storage removes participant tokens. |
| Automated SMS, generalized CMS, UX redesign, later analytics concepts | **DEFERRED** | Outside Sprint A; the engine intentionally collects no contact data and sends no outbound reminders. |

No P0/P1 pilot-operability gap was found at this checkpoint. Repository state
records the operations migrations as applied to production and a dedicated
production `DEVOTION_LINK_SECRET` as configured. Sprint A performed no
production mutation or deployment; any environment-specific deployment action
remains operator-controlled.
