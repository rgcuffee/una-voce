import { useEffect, useState, type FormEvent } from 'react';
import {
  createDevotionParticipant,
  loadDevotionAnalytics,
  revokeDevotionParticipant,
  showDevotionParticipantLink,
  updateDevotionConfiguration,
  type DevotionAnalyticsData,
  type DevotionParticipantResult,
  type DevotionReportOutcome,
} from './devotionAdminApi';
import { spreadsheetSafe } from './analyticsWorkflow';

type GeneratedLink = {
  label: string;
  url: string;
  changedLegacyLink: boolean;
} | null;

const OUTCOME_LABELS: Record<DevotionReportOutcome, string> = {
  prayed: 'Prayed',
  started_not_finished: "Started, didn't finish",
  not_tonight: 'Not tonight',
};

const COMMON_TIMEZONES = [
  ['America/New_York', 'Eastern — New York'],
  ['America/Chicago', 'Central — Chicago'],
  ['America/Denver', 'Mountain — Denver'],
  ['America/Phoenix', 'Arizona — Phoenix'],
  ['America/Los_Angeles', 'Pacific — Los Angeles'],
  ['America/Anchorage', 'Alaska — Anchorage'],
  ['Pacific/Honolulu', 'Hawaii — Honolulu'],
  ['America/Puerto_Rico', 'Atlantic — Puerto Rico'],
] as const;

const commonTimezoneValues = new Set<string>(
  COMMON_TIMEZONES.map(([value]) => value),
);
const supportedValuesOf = (
  Intl as typeof Intl & {
    supportedValuesOf?: (key: 'timeZone') => string[];
  }
).supportedValuesOf;
const ALL_TIMEZONES = supportedValuesOf
  ? supportedValuesOf('timeZone').filter(
      (timezone) => !commonTimezoneValues.has(timezone),
    )
  : [];

export function DevotionAnalyticsSection({ mode = 'operations' }: { mode?: 'operations' | 'analytics' }) {
  const [data, setData] = useState<DevotionAnalyticsData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink>(null);
  const [participantCopyState, setParticipantCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [canonicalCopyState, setCanonicalCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  async function refresh() {
    setState('loading');
    setError(null);
    try {
      setData(await loadDevotionAnalytics());
      setState('ready');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load devotion analytics.');
      setState('error');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const label = formData.get('participant-label')?.toString().trim() ?? '';
    if (!label) return;
    setError(null);
    try {
      const result = await createDevotionParticipant(label);
      setGeneratedLink({
        label: result.participant.label,
        url: result.generatedLink,
        changedLegacyLink: result.linkChanged,
      });
      setParticipantCopyState('idle');
      form.reset();
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to create participant.');
    }
  }

  async function showLink(participantId: string, label: string) {
    setBusyParticipantId(participantId);
    setError(null);
    try {
      const result = await showDevotionParticipantLink(participantId);
      setGeneratedLink({
        label,
        url: result.generatedLink,
        changedLegacyLink: result.linkChanged,
      });
      setParticipantCopyState('idle');
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to show link.');
    } finally {
      setBusyParticipantId(null);
    }
  }

  async function revoke(participantId: string) {
    setBusyParticipantId(participantId);
    setError(null);
    try {
      await revokeDevotionParticipant(participantId);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to revoke link.');
    } finally {
      setBusyParticipantId(null);
    }
  }

  async function copyGeneratedLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink.url);
      setParticipantCopyState('copied');
    } catch {
      setParticipantCopyState('error');
    }
  }

  if (state === 'loading' && !data) {
    return <div className="engine-empty">Loading devotion analytics…</div>;
  }

  if (state === 'error' && !data) {
    return <div className="engine-empty engine-error" role="alert">{error}</div>;
  }

  if (!data) return null;

  const metrics = [
    ['Participants', data.metrics.participantsEnrolled, 'Enrolled'],
    ['Nights opened', data.metrics.nightsOpened, 'Unique participant-nights'],
    ['Resource engagements', data.metrics.resourceEngagements, 'Raw attributed opens'],
    ['Measured media', data.metrics.measuredMediaMinutes, 'Minutes'],
    ['Prayed', data.metrics.reportedPrayed, 'Reported nights'],
    ['Partial', data.metrics.reportedPartial, "Started, didn't finish"],
    ['Not tonight', data.metrics.reportedNotTonight, 'Reported nights'],
  ] as const;
  const canonicalUrl = `https://unavoce.net/devotions/${data.devotion.slug}/night-prayer`;
  async function copyCanonicalUrl() { try { await navigator.clipboard.writeText(canonicalUrl); setCanonicalCopyState('copied'); } catch { setCanonicalCopyState('error'); } }

  if (mode === 'analytics') {
    return <DevotionAnalyticsView data={data} metrics={metrics} onRefresh={refresh} state={state} error={error} />;
  }

  return (
    <section className="engine-section devotion-admin-section">
      <div className="engine-section-heading">
        <div>
          <span>Pilot operations</span>
          <h2>{data.devotion.organizationLabel}</h2>
          <p>{data.devotion.name}</p>
        </div>
        <button type="button" className="admin-button" onClick={() => void refresh()}>Refresh results</button>
      </div>

      {error ? <div className="engine-empty engine-error" role="alert">{error}</div> : null}

      <section className="engine-metrics devotion-admin-metrics" aria-label="Devotion summary">
        {metrics.map(([label, value, detail]) => (
          <div className="engine-metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <p>{detail}</p>
          </div>
        ))}
      </section>

      <div className="devotion-public-url"><strong>Canonical public devotion URL</strong><code>{canonicalUrl}</code><a className="admin-button" href={canonicalUrl} target="_blank" rel="noreferrer">Open</a><button type="button" className="admin-button" onClick={() => void copyCanonicalUrl()}>Copy</button>{canonicalCopyState === 'copied' ? <small>Copied to clipboard.</small> : null}{canonicalCopyState === 'error' ? <small role="alert">Copy failed. Select the URL and copy it manually.</small> : null}<span>Status: {data.devotion.status} · Starts: {data.devotion.startDate ?? 'Unavailable'} · {data.devotion.timezone ?? 'Timezone unavailable'}</span></div>

      <div className="devotion-admin-tools">
        <section className="devotion-admin-card">
          <div className="engine-section-heading compact">
            <div><span>Enrollment</span><h3>Add participant</h3></div>
          </div>
          <form className="devotion-participant-form" onSubmit={addParticipant}>
            <label htmlFor="participant-label">Participant label</label>
            <div>
              <input id="participant-label" name="participant-label" maxLength={120} required />
              <button type="submit" className="admin-button primary">Generate link</button>
            </div>
          </form>
          {generatedLink ? (
            <div className="devotion-generated-link" role="status">
              <strong>Participant link for {generatedLink.label}</strong>
              <p>You can return here and show this same link again.</p>
              {generatedLink.changedLegacyLink ? (
                <p>The previous one-time link was upgraded and no longer works.</p>
              ) : null}
              <div>
                <input aria-label={`Generated participant link for ${generatedLink.label}`} readOnly value={generatedLink.url} onFocus={(event) => event.currentTarget.select()} />
                <button type="button" className="admin-button primary" onClick={() => void copyGeneratedLink()}>Copy</button>
              </div>
              {participantCopyState === 'copied' ? <small>Copied to clipboard.</small> : null}
              {participantCopyState === 'error' ? <small role="alert">Copy failed. Select the URL and copy it manually.</small> : null}
            </div>
          ) : null}
        </section>

        <DevotionConfiguration data={data} onSaved={refresh} onError={setError} />
      </div>

      <div className="engine-section-heading compact devotion-matrix-heading"><div><span>Participant security</span><h3>Links and enrollment state</h3></div></div>
      {data.participants.length === 0 ? <div className="engine-empty">No participants enrolled yet.</div> : <div className="admin-list">{data.participants.map((participant) => <div key={participant.id} className="devotion-participant-cell"><strong>{participant.label}</strong><code>{participant.safeId}</code><span className={`devotion-link-status ${participant.linkStatus}`}>{participant.linkStatus}</span><div><button type="button" className="admin-button" disabled={busyParticipantId === participant.id || participant.linkStatus === 'revoked'} onClick={() => void showLink(participant.id, participant.label)}>Show link</button><button type="button" className="admin-button danger" disabled={busyParticipantId === participant.id || participant.linkStatus === 'revoked'} onClick={() => void revoke(participant.id)}>Revoke</button></div></div>)}</div>}
    </section>
  );
}

function DevotionAnalyticsView({ data, metrics, onRefresh, state, error }: { data: DevotionAnalyticsData; metrics: ReadonlyArray<readonly [string, number, string]>; onRefresh: () => Promise<void>; state: 'loading' | 'ready' | 'error'; error: string | null }) {
  const [outcome, setOutcome] = useState<DevotionReportOutcome | 'all'>('all');
  const [night, setNight] = useState('all');
  const [participantId, setParticipantId] = useState('all');
  const selectedNights = (participant: DevotionParticipantResult) => participant.nights.filter((item) => (night === 'all' || item.pilotDay === Number(night)) && (outcome === 'all' || item.outcome === outcome));
  const rows = data.participants.filter((participant) => (participantId === 'all' || participant.safeId === participantId) && selectedNights(participant).length > 0);
  const rollup = Array.from({ length: data.devotion.durationDays }, (_, index) => {
    if (night !== 'all' && Number(night) !== index + 1) return null;
    const items = rows.flatMap((participant) => participant.nights.filter((item) => item.pilotDay === index + 1 && (outcome === 'all' || item.outcome === outcome)));
    return { night: index + 1, opened: items.filter((item) => item.opened).length, engaged: items.filter((item) => item.resourceEngaged).length, reported: items.filter((item) => item.outcome).length, minutes: items.reduce((sum, item) => sum + item.measuredMediaMinutes, 0) };
  }).filter(Boolean) as Array<{ night: number; opened: number; engaged: number; reported: number; minutes: number }>;
  const exportRows = () => {
    const content = ['participant,night,opened,resources,measured_minutes,outcome', ...rows.flatMap((participant) => selectedNights(participant).map((item) => [participant.safeId, item.pilotDay, item.opened, item.resourceCount, item.measuredMediaMinutes, item.outcome ?? ''].map((value) => `"${spreadsheetSafe(value).replace(/"/g, '""')}"`).join(',')))].join('\n');
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' })); anchor.download = 'devotion-analytics.csv'; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  return <section className="engine-section devotion-admin-section">
    <div className="engine-section-heading"><div><span>Analytics</span><h2>{data.devotion.name}</h2><p>Only reported, opened, and measured activity is shown. Enrollment is available; survey completion is unavailable in the current payload.</p></div><button type="button" className="admin-button" onClick={() => void onRefresh()}>Refresh</button></div>{state === 'loading' ? <div className="admin-analytics-comparison" role="status">Updating devotion analytics…</div> : null}{error ? <div className="engine-empty engine-error" role="alert">{error}</div> : null}
    <section className="engine-metrics devotion-admin-metrics" aria-label="Devotion analytics summary">{metrics.map(([label, value, detail]) => <div className="engine-metric" key={label}><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>)}</section>
    <div className="devotion-funnel"><strong>Enrollment {data.metrics.participantsEnrolled} participants</strong><span>·</span><strong>Opened {data.metrics.nightsOpened} participant-nights</strong><span>·</span><strong>Engaged {data.metrics.resourceEngagements} opens</strong><span>·</span><strong>Reported {data.metrics.reportedPrayed + data.metrics.reportedPartial + data.metrics.reportedNotTonight} nights</strong><small>Evidence counts use different units; this is not a conversion funnel.</small></div>
    <div className="admin-analytics-filters"><label>Night<select value={night} onChange={(event) => setNight(event.target.value)}><option value="all">All nights</option>{Array.from({ length: data.devotion.durationDays }, (_, index) => <option value={index + 1} key={index}>Night {index + 1}</option>)}</select></label><label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as DevotionReportOutcome | 'all')}><option value="all">All outcomes</option>{Object.entries(OUTCOME_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Participant<select value={participantId} onChange={(event) => setParticipantId(event.target.value)}><option value="all">All participants</option>{data.participants.map((participant) => <option value={participant.safeId} key={participant.id}>{participant.label}</option>)}</select></label><button type="button" className="admin-button" onClick={exportRows}>Export CSV</button></div>
    <section className="devotion-heatmap" aria-label="Seven-night rollup"><h3>Seven-night rollup</h3>{rollup.map((item) => <article key={item.night}><strong>Night {item.night}</strong><div><span className={item.opened ? 'has-evidence' : ''}>Opened: {item.opened}</span><span className={item.engaged ? 'has-evidence' : ''}>Engaged: {item.engaged}</span><span className={item.reported ? 'has-evidence' : ''}>Reported: {item.reported}</span><span>Measured: {item.minutes} min</span></div></article>)}</section>
    <div className="devotion-heatmap" aria-label="Seven-night engagement heatmap">{rows.length === 0 ? <p>Unavailable: no participant-nights match these filters.</p> : rows.map((participant) => <article key={participant.id}><strong>{participant.label}</strong><div>{selectedNights(participant).map((item) => <span className={item.opened || item.outcome ? 'has-evidence' : ''} key={item.pilotDay}>N{item.pilotDay}: {item.opened ? 'opened' : '—'}{item.outcome ? ` · ${OUTCOME_LABELS[item.outcome]}` : ''}{item.resources.length ? ` · ${item.resources.map((resource) => `${resource.label} (${resource.count} clicks, ${resource.measuredMinutes} min)`).join(', ')}` : ''}</span>)}</div></article>)}</div>
    <p className="devotion-analytics-boundary">Measured minutes are player-duration evidence only. External links can record a click but cannot measure time on a third-party page.</p>
  </section>;
}

function DevotionConfiguration({
  data,
  onSaved,
  onError,
}: {
  data: DevotionAnalyticsData;
  onSaved: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSaving(true);
    onError(null);
    try {
      await updateDevotionConfiguration({
        startDate: formData.get('start-date')?.toString() || null,
        timezone: formData.get('timezone')?.toString().trim() || null,
        status: formData.get('status')?.toString() as 'inactive' | 'active' | 'completed',
        preSurveyUrl: formData.get('pre-survey-url')?.toString().trim() || null,
        postSurveyUrl: formData.get('post-survey-url')?.toString().trim() || null,
      });
      await onSaved();
    } catch (saveError) {
      onError(saveError instanceof Error ? saveError.message : 'Unable to save configuration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="devotion-admin-card">
      <div className="engine-section-heading compact">
        <div><span>Pilot settings</span><h3>Configuration</h3></div>
      </div>
      <form className="devotion-config-form" onSubmit={save}>
        <label>Start date<input type="date" name="start-date" defaultValue={data.devotion.startDate ?? ''} /></label>
        <label>
          Timezone
          <select name="timezone" defaultValue={data.devotion.timezone ?? ''}>
            <option value="">Select a timezone</option>
            <optgroup label="Common US timezones">
              {COMMON_TIMEZONES.map(([value, label]) => (
                <option key={value} value={value}>{label} ({value})</option>
              ))}
            </optgroup>
            {ALL_TIMEZONES.length > 0 ? (
              <optgroup label="All IANA timezones">
                {ALL_TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>{timezone}</option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label>Status<select name="status" defaultValue={data.devotion.status}><option value="inactive">Inactive</option><option value="active">Active</option><option value="completed">Completed</option></select></label>
        <label>Pre-survey URL<input type="url" name="pre-survey-url" defaultValue={data.devotion.preSurveyUrl ?? ''} /></label>
        <label>Post-survey URL<input type="url" name="post-survey-url" defaultValue={data.devotion.postSurveyUrl ?? ''} /></label>
        <button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Saving…' : 'Save configuration'}</button>
      </form>
    </section>
  );
}
