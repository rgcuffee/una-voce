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
