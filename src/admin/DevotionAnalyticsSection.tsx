import { useEffect, useState, type FormEvent } from 'react';
import {
  createDevotionParticipant,
  loadDevotionAnalytics,
  revokeDevotionParticipant,
  showDevotionParticipantLink,
  updateDevotionConfiguration,
  type DevotionAnalyticsData,
  type DevotionNightResult,
  type DevotionReportOutcome,
} from './devotionAdminApi';

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

export function DevotionAnalyticsSection() {
  const [data, setData] = useState<DevotionAnalyticsData | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

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
      setCopyState('idle');
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
      setCopyState('idle');
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
      setCopyState('copied');
    } catch {
      setCopyState('error');
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
              {copyState === 'copied' ? <small>Copied to clipboard.</small> : null}
              {copyState === 'error' ? <small role="alert">Copy failed. Select the URL and copy it manually.</small> : null}
            </div>
          ) : null}
        </section>

        <DevotionConfiguration data={data} onSaved={refresh} onError={setError} />
      </div>

      <div className="engine-section-heading compact devotion-matrix-heading">
        <div><span>Seven-night results</span><h3>Participant activity</h3></div>
      </div>
      {data.participants.length === 0 ? (
        <div className="engine-empty">No participants enrolled yet.</div>
      ) : (
        <div className="engine-table-wrap devotion-matrix-wrap">
          <table className="engine-table devotion-matrix">
            <thead>
              <tr>
                <th scope="col">Participant</th>
                {Array.from({ length: 7 }, (_, index) => <th scope="col" key={index}>Night {index + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              {data.participants.map((participant) => (
                <tr key={participant.id}>
                  <th scope="row" className="devotion-participant-cell">
                    <strong>{participant.label}</strong>
                    <code>{participant.safeId}</code>
                    <span className={`devotion-link-status ${participant.linkStatus}`}>{participant.linkStatus}</span>
                    <div>
                      <button type="button" className="admin-button" disabled={busyParticipantId === participant.id || participant.linkStatus === 'revoked'} onClick={() => void showLink(participant.id, participant.label)}>Show link</button>
                      <button type="button" className="admin-button danger" disabled={busyParticipantId === participant.id || participant.linkStatus === 'revoked'} onClick={() => void revoke(participant.id)}>Revoke</button>
                    </div>
                  </th>
                  {participant.nights.map((night) => <NightCell key={night.pilotDay} night={night} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function NightCell({ night }: { night: DevotionNightResult }) {
  return (
    <td className={night.opened || night.outcome ? 'has-evidence' : ''}>
      <div className="devotion-night-cell">
        <strong>{night.opened ? `Opened ×${night.openCount}` : 'Not opened'}</strong>
        {night.resources.map((resource) => (
          <span className="devotion-resource-result" key={`${resource.resourceId}:${resource.provider}:${resource.mediaType}`}>
            <strong>{resource.label}</strong>
            <small>
              {formatResourceType(resource.provider, resource.mediaType)} · {resource.count} {resource.count === 1 ? 'click' : 'clicks'}
              {resource.measuredMinutes > 0 ? ` · ${resource.measuredMinutes} min open` : ''}
            </small>
          </span>
        ))}
        {night.measuredMediaMinutes > 0 ? <span>{night.measuredMediaMinutes} total measured min</span> : null}
        <em>{night.outcome ? OUTCOME_LABELS[night.outcome] : 'No report'}</em>
      </div>
    </td>
  );
}

function formatResourceType(provider: string, mediaType: string) {
  const providerLabel = provider
    .split(/[-_]/)
    .map((part) => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part)
    .join(' ');
  const mediaLabel = mediaType.replace(/_/g, ' ');
  return `${providerLabel} · ${mediaLabel}`;
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
