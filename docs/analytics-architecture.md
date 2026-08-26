# Campaign analytics contract

`src/lib/analyticsContract.mjs` is the public source of truth. It defines the
ten canonical acquisition sources, current surfaces (`web`, `pwa`), and every
event accepted by the ingestion Function and admin explorer. Raw, validated
UTM values (for example `newsletter`) are retained separately from the
canonical acquisition source (for example `links_page`); no credential-like
key or participant-token-shaped value is carried into URLs or telemetry.

Browser sessions have a UUID and strict RFC3339 start time in session storage.
They expire after seven days, reject future/malformed values, and freeze the
surface at launch. PWA lifecycle events keep the current session surface and
declare a separate `installSurface: pwa`; standalone launches use `pwa`.

Links handoffs carry only safe attribution and the session identifiers. The
links React route and static fallback use the same keys and priority rules.

For migrated databases, `record_campaign_analytics_event` is the required
transactional RPC: it persists a canonical payload fingerprint, inserts the
event and applies the session mutation atomically, returns `duplicate` only
for the exact same event/session/fingerprint, and rejects conflicting reuse.
Before that migration exists, the Function uses a bounded legacy fallback:
event IDs/fingerprints are kept in safe legacy metadata, existing records are
looked up before retry insertion, and session upserts omit acquisition fields.

`pwa_install_prompted` remains a public reserved event for later work.
`devotion_survey_submitted` is emitted only after the first-party survey API
confirms a complete response. Survey clicked, started, and submitted map to
three different transitions: revealing the survey, explicitly beginning it,
and completing every required answer. A partial save emits no submission
event and remains distinguishable in `devotion_survey_responses`. Emitted
Sprint B events include session/landing, links and
current-hour CTA, devotion/resource/report/survey start, PWA eligibility and
install, and continuation. Devotion reports require night context; survey
events require a pre/post kind and survey resource but may occur outside an
active night.

## Campaign session and research projections

The authenticated devotion analytics workflow is a bounded projection of the
existing `analytics_events`, `analytics_sessions`, devotion participant/cohort,
nightly report, and first-party survey tables. It does not add event names or
store dashboard-only interpretations. Selected-campaign reads remain capped at
10,000 rows per evidence source. The activity response projects at most 40
session groups and 20 chronological events per session. Participant-night
resource lists are capped at 25 rows, nightly research resource lists at 50,
and authenticated survey-response detail at 250. Resource detail also shares a
deterministic 1,000-row global budget: 600 rows for participant-night detail and
400 for nightly research detail. Within each allocation rows are ordered by
participant detail order, pilot day, and resource key. Nightly distinct prayer
dates are capped at 10. Every reached source or projection cap is disclosed as
sampled/lower-bound with its observed and shown row counts; aggregate counts
and duration calculations continue to use the full bounded source read.

An activity session is the deterministic union of a stored prayer-player
session row and events with the same stored session ID. Event-only IDs remain
visible as derived groupings rather than invented stored sessions. Session
day/date context uses the valid stored session context first, otherwise the
first chronologically valid event context. Identifiers are shortened or
one-way display hashes. A shared fail-closed privacy predicate removes decoded
route segments, resource identifiers, and labels that resemble participant
tokens, hashes, UUIDs, long numbers/phone values, credentials, URLs/query
values, or PII. Concatenated/camel credential markers such as `resetToken`,
`clientSecret`, or a Bearer-prefixed value also fail closed. Routes also lose
all query parameters and are rejected if one decoding pass leaves a percent
octet, preventing double-encoded PII from reaching the response. Raw metadata and
anonymous IDs are never projected. Sessions are newest-first, each valid event
timeline is oldest-first, and malformed timestamps sort after valid evidence.

Duration fields retain separate meanings:

- active play seconds are stored player-active evidence and are the only input
  to measured-media totals;
- panel-open seconds are stored prayer-player panel visibility;
- elapsed session seconds are a derived wall-clock difference between stored
  start and end timestamps;
- observed timeline span is derived from the first and last stored event;
- page time and third-party resource time are unavailable.

Duration aggregates have three states. `exact` means every observed value was
a valid stored non-negative integer, including a real stored zero. `partial`
means the displayed known-only sum is a lower bound because one or more
observed values were null/blank/invalid or the session source was sampled.
`unavailable` means no known numeric value exists and the projected value is
null. This rule applies consistently to campaign metrics, night rollups,
participant nights and days, nightly resources, and portfolio totals; active
play and panel-open measures remain separate. `vimeo`, `survey_link`, and the provider/media values emitted
by the current prayer-player and text-provider runtime retain their canonical
labels in the projection.

A resource click remains click evidence only. Prayer-player completion is shown
as stored session evidence but is not silently converted into campaign or
survey completion. Survey completion requires a `devotion_survey_responses`
row with `status = submitted`; click/start telemetry and partial saves never
count.

The selected-campaign participant funnel is deliberately nested so its counts
can reconcile directly to pseudonymous participant drilldowns:

1. **Invited / enrolled:** a stored participant row.
2. **Opened:** enrolled plus at least one `devotion_page_opened` event.
3. **Engaged / prayed:** opened plus a `devotion_resource_opened` event or a
   nightly report whose outcome is `prayed`.
4. **Returned:** engaged plus event, report, or player-session evidence on at
   least two distinct pilot days.
5. **Completed:** returned plus explicit stored participant status
   `completed`.
6. **Continued:** completed plus a submitted post survey explicitly answering
   `continuedAfterWindow = yes`.

Opened and Engaged / prayed retain their stored event/report evidence even when
its pilot day is missing or outside the selected campaign's configured range.
Only canonical integer pilot days from 1 through that campaign's
`duration_days` participate in participant-day rows, nightly rollups, or the
distinct-day Returned rule. Equivalent numeric/string values collapse to the
same day; negative and out-of-campaign values do not create return evidence.

Raw evidence totals and their safe participant-ID drilldowns are disclosed
beside the nested stages because explicit completion, continuation, or
multi-day activity can exist without satisfying an earlier stage. Those
non-nested units are never presented as conversion. Acquisition uses only the
canonical Sprint B source values. Canonical source and web/PWA surface
breakdowns become `unavailable` when the Sprint B columns required compatibility
fallback; they do not render an exact empty/unknown summary. Device breakdowns
remain independently sourced from stored event evidence. If the first-party
survey schema is unavailable, Continued and survey comparisons are explicitly
unavailable while other independently supported stages retain their own exact
or sampled status.

When the survey source is sampled, completion and paired-participant counts are
lower-bound counts and render with `≥`. Survey averages and changes are instead
labeled sampled/partial observations; an average is never described as a lower
bound.

## People-first session views

The existing aggregate dashboards remain available. Two additive authenticated
views expose the same bounded, privacy-safe evidence as chronological stories:

- `/admin/analytics/sessions` groups projected events first by one-way visitor
  identity and then by one-way session identity. The newest 1,000 matching
  event projection is the detail ceiling; when either the source or projection
  cap is reached, people, sessions, and actions are labeled as lower bounds.
- `/admin/devotions/sessions` groups the existing campaign participant, night,
  report, survey, prayer-player session, and event projections by one-way
  participant identity. Campaign and survey completion remain separate from
  prayer-player completion, and explicit night reports remain visible even
  when no player-session row is projected.

Both views label stored evidence separately from timestamp-derived observed
spans. They do not infer identity across missing anonymous IDs, time on an
external destination, or completion from a click. Existing Activity,
Communities, Devotion Analytics, and Devotion Operations routes are unchanged.
