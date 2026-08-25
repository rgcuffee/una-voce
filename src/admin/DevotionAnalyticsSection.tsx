import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  bulkRevokeDevotionParticipants,
  createDevotionCampaign,
  createDevotionCohort,
  createDevotionParticipant,
  loadDevotionAnalytics,
  restoreDevotionParticipant,
  revokeDevotionParticipant,
  showDevotionParticipantLink,
  updateDevotionCohort,
  updateDevotionConfiguration,
  updateDevotionParticipantStatus,
  type DevotionAnalyticsData,
  type DevotionCampaign,
  type DevotionCampaignDraft,
  type DevotionCohort,
  type DevotionParticipantResult,
  type DevotionParticipantStatus,
  type DevotionReportOutcome,
  type DevotionStatus,
} from './devotionAdminApi';
import { spreadsheetSafe } from './analyticsWorkflow';

type GeneratedLink = { campaignId: string; label: string; url: string; changedLegacyLink: boolean } | null;

const OUTCOME_LABELS: Record<DevotionReportOutcome, string> = {
  prayed: 'Prayed',
  started_not_finished: "Started, didn't finish",
  not_tonight: 'Not tonight',
};
const STATUS_OPTIONS: DevotionStatus[] = ['inactive', 'draft', 'scheduled', 'active', 'paused', 'completed', 'archived'];
const PARTICIPANT_STATUS_OPTIONS: DevotionParticipantStatus[] = ['enrolled', 'active', 'completed', 'withdrawn'];
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
const commonTimezoneValues = new Set<string>(COMMON_TIMEZONES.map(([value]) => value));
const supportedValuesOf = (Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] }).supportedValuesOf;
const ALL_TIMEZONES = supportedValuesOf ? supportedValuesOf('timeZone').filter((timezone) => !commonTimezoneValues.has(timezone)) : [];

export function DevotionAnalyticsSection({ mode = 'operations' }: { mode?: 'operations' | 'analytics' }) {
  const [data, setData] = useState<DevotionAnalyticsData | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [participantPage, setParticipantPage] = useState(1);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyParticipantId, setBusyParticipantId] = useState<string | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink>(null);
  const [participantCopyState, setParticipantCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [canonicalCopyState, setCanonicalCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const refreshSequence = useRef(0);

  async function refresh(campaignId = selectedCampaignId, page = participantPage) {
    const sequence = ++refreshSequence.current;
    setState('loading'); setError(null);
    try {
      const next = await loadDevotionAnalytics(campaignId || undefined, mode === 'analytics', page);
      if (sequence !== refreshSequence.current) return;
      setData(next);
      if (next.devotion) setSelectedCampaignId(next.devotion.id);
      setParticipantPage(next.participantDetail.page);
      setSelectedParticipantIds([]);
      setState('ready');
    } catch (loadError) {
      if (sequence !== refreshSequence.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Unable to load devotion operations.');
      setState('error');
    }
  }

  useEffect(() => { void refresh('', 1); }, []);

  async function mutate(action: () => Promise<unknown>, message: string) {
    setError(null); setNotice(null);
    try { const result = await action(); const audited = typeof result === 'object' && result !== null && 'auditRecorded' in result ? Boolean(result.auditRecorded) : true; setNotice(audited ? message : `${message} Warning: audit history could not be recorded.`); await refresh(); return true; }
    catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to complete devotion operation.'); return false; }
  }

  async function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data?.devotion) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const label = formData.get('participant-label')?.toString().trim() ?? '';
    const cohortId = formData.get('participant-cohort')?.toString() ?? '';
    if (!label || !cohortId) return;
    setError(null); setNotice(null);
    try {
      const result = await createDevotionParticipant(data.devotion.id, cohortId, label);
      setGeneratedLink({ campaignId: data.devotion.id, label: result.participant.label, url: result.generatedLink, changedLegacyLink: result.linkChanged });
      setParticipantCopyState('idle'); form.reset(); setNotice(result.auditRecorded ? 'Participant enrolled and link generated.' : 'Participant enrolled, but audit history could not be recorded.'); await refresh();
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to create participant.'); }
  }

  async function showLink(participantId: string, label: string) {
    if (!data?.devotion) return;
    setBusyParticipantId(participantId); setError(null);
    try {
      const result = await showDevotionParticipantLink(data.devotion.id, participantId);
      setGeneratedLink({ campaignId: data.devotion.id, label, url: result.generatedLink, changedLegacyLink: result.linkChanged });
      setParticipantCopyState('idle');
      if (!result.auditRecorded) setError('Link shown, but audit history could not be recorded.');
    } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Unable to show link.'); }
    finally { setBusyParticipantId(null); }
  }

  async function copyGeneratedLink() {
    if (!generatedLink) return;
    try { await navigator.clipboard.writeText(generatedLink.url); setParticipantCopyState('copied'); }
    catch { setParticipantCopyState('error'); }
  }

  if (state === 'loading' && !data) return <div className="engine-empty">Loading devotion operations…</div>;
  if (state === 'error' && !data) return <div className="engine-empty engine-error" role="alert">{error}</div>;
  if (!data) return null;

  const selectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    setParticipantPage(1);
    setGeneratedLink(null);
    setParticipantCopyState('idle');
    void refresh(id, 1);
  };
  const campaignControls = <CampaignControls data={data} selectedId={selectedCampaignId} canCreate={data.access.role === 'owner'} onSelect={selectCampaign} onCreated={selectCampaign} onError={setError} />;
  if (!data.devotion || !data.metrics) {
    return <section className="engine-section devotion-admin-section"><div className="engine-section-heading"><div><span>Devotion engine</span><h2>Create the first campaign</h2><p>No campaign records are available.</p></div></div>{campaignControls}</section>;
  }

  const metrics = [
    ['Participants', data.metrics.participantsEnrolled, 'Enrolled'],
    ['Active', data.metrics.participantsActive, 'Usable links'],
    ['Completed', data.metrics.participantsCompleted, 'Participant status'],
    ['Nights opened', data.metrics.nightsOpened, 'Unique participant-nights'],
    ['Resource engagements', data.metrics.resourceEngagements, 'Attributed opens'],
    ['Measured media', data.metrics.measuredMediaMinutes, 'Minutes'],
  ] as const;
  const canonicalUrl = `https://unavoce.net/devotions/${data.devotion.slug}/night-prayer`;
  const isOwner = data.access.role === 'owner';
  const canEdit = data.access.role !== 'viewer' && (data.devotion.status !== 'archived' || isOwner);
  const participantPager = <ParticipantDetailPager detail={data.participantDetail} onPage={(page) => { setParticipantPage(page); void refresh(selectedCampaignId, page); }} />;
  async function copyCanonicalUrl() { try { await navigator.clipboard.writeText(canonicalUrl); setCanonicalCopyState('copied'); } catch { setCanonicalCopyState('error'); } }

  if (mode === 'analytics') return <DevotionAnalyticsView data={data} metrics={metrics} campaignControls={<>{campaignControls}{participantPager}</>} onRefresh={refresh} state={state} error={error} />;

  const selectableCohorts = data.cohorts.filter((cohort) => cohort.status !== 'archived');
  return <section className="engine-section devotion-admin-section">
    <div className="engine-section-heading"><div><span>Campaign operations</span><h2>{data.devotion.organizationLabel}</h2><p>{data.devotion.name}</p></div><button type="button" className="admin-button" onClick={() => void refresh()}>Refresh</button></div>
    {campaignControls}
    {state === 'loading' ? <div className="admin-analytics-comparison" role="status">Updating devotion operations…</div> : null}
    {error ? <div className="engine-empty engine-error" role="alert">{error}</div> : null}
    {notice ? <div className="admin-analytics-comparison" role="status">{notice}</div> : null}
    <div className="admin-analytics-comparison">Access: {data.access.role}{data.access.email ? ` · ${data.access.email}` : ''}</div>
    {data.sourceStatus?.status === 'sampled' ? <div className="admin-analytics-warning" role="status">This campaign reached its evidence cap for {data.sourceStatus.truncatedSources.map((source) => `${source} (${data.sourceStatus?.caps[source]?.toLocaleString() ?? 'bounded'})`).join(', ')}. Displayed evidence is a lower bound.</div> : null}
    {data.operationalAlerts.length ? <section className="devotion-operations-alerts" aria-label="Operational attention">{data.operationalAlerts.map((alert) => <article className={alert.severity} key={`${alert.code}-${alert.cohortId ?? ''}`}><strong>{alert.severity === 'warning' ? 'Needs attention' : 'Status'}</strong><span>{alert.message}</span></article>)}</section> : null}
    <section className="engine-metrics devotion-admin-metrics" aria-label="Devotion summary">{metrics.map(([label, value, detail]) => <div className="engine-metric" key={label}><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>)}</section>
    <div className="devotion-public-url"><strong>Canonical public devotion URL</strong><code>{canonicalUrl}</code><a className="admin-button" href={canonicalUrl} target="_blank" rel="noreferrer">Open</a><button type="button" className="admin-button" onClick={() => void copyCanonicalUrl()}>Copy</button>{canonicalCopyState === 'copied' ? <small>Copied to clipboard.</small> : null}{canonicalCopyState === 'error' ? <small role="alert">Copy failed. Select the URL and copy it manually.</small> : null}<span>Status: {data.devotion.status} · {data.devotion.durationDays} nights</span></div>
    <CampaignPreview campaign={data.devotion} cohorts={data.cohorts} />
    {canEdit ? <div className="devotion-admin-tools">
      <section className="devotion-admin-card"><div className="engine-section-heading compact"><div><span>Enrollment</span><h3>Add participant</h3></div></div><form className="devotion-participant-form" onSubmit={addParticipant}><label htmlFor="participant-label">Participant label</label><label htmlFor="participant-cohort">Cohort</label><div><input id="participant-label" name="participant-label" maxLength={120} required /><select id="participant-cohort" name="participant-cohort" required defaultValue={selectableCohorts[0]?.id ?? ''}><option value="" disabled>Select cohort</option>{selectableCohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select><button type="submit" className="admin-button primary" disabled={!selectableCohorts.length}>Generate link</button></div></form>{generatedLink?.campaignId === data.devotion.id ? <div className="devotion-generated-link" role="status"><strong>Participant link for {generatedLink.label}</strong><p>You can return here and show this same link again.</p>{generatedLink.changedLegacyLink ? <p>The previous one-time link was upgraded and no longer works.</p> : null}<div><input aria-label={`Generated participant link for ${generatedLink.label}`} readOnly value={generatedLink.url} onFocus={(event) => event.currentTarget.select()} /><button type="button" className="admin-button primary" onClick={() => void copyGeneratedLink()}>Copy</button></div>{participantCopyState === 'copied' ? <small>Copied to clipboard.</small> : null}{participantCopyState === 'error' ? <small role="alert">Copy failed. Select the URL and copy it manually.</small> : null}</div> : null}</section>
      <DevotionConfiguration campaign={data.devotion} canArchive={isOwner} onSave={(draft) => mutate(() => updateDevotionConfiguration(data.devotion!.id, draft), 'Campaign configuration saved.')} />
    </div> : <div className="engine-empty">Viewer access is read-only. Campaign, cohort, and participant controls are hidden.</div>}
    {canEdit ? <CohortOperations campaign={data.devotion} cohorts={data.cohorts} canArchive={isOwner} onMutate={mutate} /> : null}
    <div className="engine-section-heading compact devotion-matrix-heading"><div><span>Participant operations</span><h3>Links, cohorts, and status</h3></div>{canEdit && selectedParticipantIds.length ? <button type="button" className="admin-button danger" onClick={() => void mutate(() => bulkRevokeDevotionParticipants(data.devotion!.id, selectedParticipantIds), `${selectedParticipantIds.length} participant link${selectedParticipantIds.length === 1 ? '' : 's'} revoked.`)}>Revoke selected ({selectedParticipantIds.length})</button> : null}</div>
    {participantPager}
    {data.participants.length === 0 ? <div className="engine-empty">No participants enrolled yet.</div> : <div className="admin-list">{data.participants.map((participant) => { const cohort = data.cohorts.find((item) => item.id === participant.cohortId); const checked = selectedParticipantIds.includes(participant.id); return <div key={participant.id} className="devotion-participant-cell">{canEdit ? <label className="devotion-participant-select"><input type="checkbox" checked={checked} onChange={(event) => setSelectedParticipantIds((current) => event.target.checked ? [...current, participant.id] : current.filter((id) => id !== participant.id))} /><span className="sr-only">Select {participant.label}</span></label> : <span aria-hidden="true">—</span>}<strong>{participant.label}</strong><code>{participant.safeId}</code><span>{cohort?.name ?? 'Unknown cohort'}</span><span className={`devotion-link-status ${participant.linkStatus}`}>{participant.linkStatus}</span>{canEdit ? <select aria-label={`Status for ${participant.label}`} value={participant.status} onChange={(event) => void mutate(() => updateDevotionParticipantStatus(data.devotion!.id, participant.id, event.target.value as DevotionParticipantStatus), `${participant.label} status updated.`)}>{PARTICIPANT_STATUS_OPTIONS.map((status) => <option value={status} key={status}>{status}</option>)}</select> : <span>{participant.status}</span>}{canEdit ? <div>{participant.linkStatus === 'revoked' ? <button type="button" className="admin-button" onClick={() => void mutate(() => restoreDevotionParticipant(data.devotion!.id, participant.id), `${participant.label} link restored.`)}>Restore link</button> : <><button type="button" className="admin-button" disabled={busyParticipantId === participant.id} onClick={() => void showLink(participant.id, participant.label)}>Show link</button><button type="button" className="admin-button danger" disabled={busyParticipantId === participant.id} onClick={() => void mutate(() => revokeDevotionParticipant(data.devotion!.id, participant.id), `${participant.label} link revoked.`)}>Revoke</button></>}</div> : <span>Read only</span>}</div>; })}</div>}
    <AuditHistory entries={data.auditHistory} />
  </section>;
}

function ParticipantDetailPager({ detail, onPage }: { detail: DevotionAnalyticsData['participantDetail']; onPage: (page: number) => void }) {
  const totalLabel = detail.totalStatus === 'lower_bound'
    ? `${detail.observedTotal.toLocaleString()}+ observed`
    : detail.observedTotal.toLocaleString();
  return <nav className="devotion-participant-pager" aria-label="Participant detail pages"><span>Showing {detail.shown.toLocaleString()} participant records · {totalLabel} · Page {detail.page}</span><div><button type="button" className="admin-button" disabled={!detail.hasPrevious} onClick={() => onPage(detail.page - 1)}>Previous</button><button type="button" className="admin-button" disabled={!detail.hasNext} onClick={() => onPage(detail.page + 1)}>Next</button></div></nav>;
}

function CampaignControls({ data, selectedId, canCreate, onSelect, onCreated, onError }: { data: DevotionAnalyticsData; selectedId: string; canCreate: boolean; onSelect: (id: string) => void; onCreated: (id: string) => void; onError: (message: string | null) => void }) {
  const [showCreate, setShowCreate] = useState(false);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); onError(null);
    try { const result = await createDevotionCampaign({ slug: fields.get('campaign-slug')?.toString() ?? '', name: fields.get('campaign-name')?.toString() ?? '', organizationLabel: fields.get('campaign-organization')?.toString() ?? '', description: fields.get('campaign-description')?.toString() || null, durationDays: Number(fields.get('campaign-duration') ?? 7), status: 'draft' }); form.reset(); setShowCreate(false); onCreated(result.devotion.id); if (!result.auditRecorded) onError('Campaign created, but audit history could not be recorded.'); }
    catch (error) { onError(error instanceof Error ? error.message : 'Unable to create campaign.'); }
  }
  return <section className="devotion-campaign-controls"><label>Campaign<select value={data.devotion?.id ?? selectedId} onChange={(event) => onSelect(event.target.value)}>{data.campaigns.map((campaign) => <option value={campaign.id} key={campaign.id}>{campaign.name} · {campaign.status}</option>)}</select></label>{canCreate ? <button type="button" className="admin-button" onClick={() => setShowCreate((value) => !value)}>{showCreate ? 'Cancel' : 'New campaign'}</button> : <span>Only owners can create campaigns.</span>}{showCreate && canCreate ? <form className="devotion-inline-form" onSubmit={create}><label>Name<input name="campaign-name" maxLength={160} required /></label><label>Organization<input name="campaign-organization" maxLength={160} required /></label><label>Slug<input name="campaign-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Nights<input name="campaign-duration" type="number" min="1" max="40" defaultValue="7" required /></label><label>Description<textarea name="campaign-description" maxLength={2000} /></label><button type="submit" className="admin-button primary">Create draft</button></form> : null}</section>;
}

function CampaignPreview({ campaign, cohorts }: { campaign: DevotionCampaign; cohorts: DevotionCohort[] }) {
  const runnableCohorts = cohorts.filter((cohort) => cohort.status === 'active').length;
  const scheduledCohorts = cohorts.filter((cohort) => cohort.status === 'scheduled').length;
  const publication = campaign.status === 'active'
    ? 'Published now'
    : campaign.status === 'scheduled'
      ? `Scheduled${campaign.startDate ? ` for ${campaign.startDate}` : ''}`
      : `Not published · ${campaign.status}`;
  return <section className="devotion-campaign-preview" aria-label="Campaign preview"><span>Admin preview</span><h3>{campaign.name}</h3><strong>{campaign.organizationLabel}</strong><p>{campaign.description ?? 'No campaign description has been added.'}</p><div><span>{campaign.durationDays} nights</span><span>{publication}</span><span>{runnableCohorts} live cohort{runnableCohorts === 1 ? '' : 's'}</span><span>{scheduledCohorts} scheduled cohort{scheduledCohorts === 1 ? '' : 's'}</span></div></section>;
}

function CohortOperations({ campaign, cohorts, canArchive, onMutate }: { campaign: DevotionCampaign; cohorts: DevotionCohort[]; canArchive: boolean; onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean> }) {
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); const saved = await onMutate(() => createDevotionCohort(campaign.id, { slug: fields.get('cohort-slug')?.toString() ?? '', name: fields.get('cohort-name')?.toString() ?? '', startDate: fields.get('cohort-start')?.toString() || null, timezone: fields.get('cohort-timezone')?.toString() || null, status: fields.get('cohort-status')?.toString() as DevotionStatus }), 'Cohort created.'); if (saved) form.reset(); }
  return <section className="devotion-cohort-operations"><div className="engine-section-heading compact"><div><span>Cohorts</span><h3>Schedules and lifecycle</h3><p>Cohorts share campaign content but can start independently.</p></div></div><form className="devotion-inline-form" onSubmit={create}><label>Name<input name="cohort-name" maxLength={120} required /></label><label>Slug<input name="cohort-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required /></label><label>Start<input type="date" name="cohort-start" /></label><TimezoneField name="cohort-timezone" /><label>Status<StatusSelect name="cohort-status" defaultValue="draft" canArchive={canArchive} /></label><button type="submit" className="admin-button primary">Add cohort</button></form><div className="admin-list">{cohorts.map((cohort) => <CohortCard campaignId={campaign.id} cohort={cohort} canArchive={canArchive} onMutate={onMutate} key={cohort.id} />)}</div></section>;
}

function CohortCard({ campaignId, cohort, canArchive, onMutate }: { campaignId: string; cohort: DevotionCohort; canArchive: boolean; onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean> }) {
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const fields = new FormData(event.currentTarget); await onMutate(() => updateDevotionCohort(campaignId, cohort.id, { name: fields.get('cohort-name')?.toString() ?? cohort.name, startDate: fields.get('cohort-start')?.toString() || null, timezone: fields.get('cohort-timezone')?.toString() || null, status: fields.get('cohort-status')?.toString() as DevotionStatus }), `${cohort.name} saved.`); }
  return <form className="devotion-cohort-card" onSubmit={save}><strong>{cohort.name}</strong><code>{cohort.slug}</code><label>Name<input name="cohort-name" defaultValue={cohort.name} maxLength={120} required /></label><label>Start<input type="date" name="cohort-start" defaultValue={cohort.startDate ?? ''} /></label><TimezoneField name="cohort-timezone" defaultValue={cohort.timezone ?? ''} /><label>Status<StatusSelect name="cohort-status" defaultValue={cohort.status} canArchive={canArchive} /></label><button type="submit" className="admin-button">Save cohort</button></form>;
}

function DevotionConfiguration({ campaign, canArchive, onSave }: { campaign: DevotionCampaign; canArchive: boolean; onSave: (draft: Partial<DevotionCampaignDraft>) => Promise<unknown> }) {
  const [saving, setSaving] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const fields = new FormData(event.currentTarget); setSaving(true); try { await onSave({ name: fields.get('campaign-name')?.toString() ?? campaign.name, organizationLabel: fields.get('campaign-organization')?.toString() ?? campaign.organizationLabel, description: fields.get('campaign-description')?.toString() || null, startDate: fields.get('start-date')?.toString() || null, durationDays: Number(fields.get('duration-days')), timezone: fields.get('timezone')?.toString() || null, status: fields.get('status')?.toString() as DevotionStatus }); } finally { setSaving(false); } }
  return <section className="devotion-admin-card"><div className="engine-section-heading compact"><div><span>Campaign settings</span><h3>Configuration and publishing</h3><p>Scheduled publishes on its civil start date; Active is available immediately. Draft, inactive, and paused do not accept reports. Pre/post research uses the built-in campaign survey.</p></div></div><form className="devotion-config-form" onSubmit={save}><label>Name<input name="campaign-name" defaultValue={campaign.name} maxLength={160} required /></label><label>Organization<input name="campaign-organization" defaultValue={campaign.organizationLabel} maxLength={160} required /></label><label>Description<textarea name="campaign-description" defaultValue={campaign.description ?? ''} maxLength={2000} /></label><label>Default start<input type="date" name="start-date" defaultValue={campaign.startDate ?? ''} /></label><label>Duration<input type="number" name="duration-days" min="1" max="40" defaultValue={campaign.durationDays} required /></label><TimezoneField name="timezone" defaultValue={campaign.timezone ?? ''} /><label>Status<StatusSelect name="status" defaultValue={campaign.status} canArchive={canArchive} /></label><button type="submit" className="admin-button primary" disabled={saving}>{saving ? 'Saving…' : 'Save and apply lifecycle'}</button></form></section>;
}

function DevotionAnalyticsView({ data, metrics, campaignControls, onRefresh, state, error }: { data: DevotionAnalyticsData; metrics: ReadonlyArray<readonly [string, number, string]>; campaignControls: ReactNode; onRefresh: () => Promise<void>; state: 'loading' | 'ready' | 'error'; error: string | null }) {
  const [outcome, setOutcome] = useState<DevotionReportOutcome | 'all'>('all');
  const [night, setNight] = useState('all');
  const [participantId, setParticipantId] = useState('all');
  const [cohortId, setCohortId] = useState('all');

  useEffect(() => {
    setOutcome('all');
    setNight('all');
    setParticipantId('all');
    setCohortId('all');
  }, [data.devotion?.id, data.participantDetail.page]);

  const selectedNights = (participant: DevotionParticipantResult) => participant.nights.filter((item) => (night === 'all' || item.pilotDay === Number(night)) && (outcome === 'all' || item.outcome === outcome));
  const rows = data.participants.filter((participant) => (participantId === 'all' || participant.safeId === participantId) && (cohortId === 'all' || participant.cohortId === cohortId) && selectedNights(participant).length > 0);
  const rollup = data.nightRollup.filter((item) => night === 'all' || item.night === Number(night));
  const exportRows = () => {
    const content = [
      'participant,cohort,night,opened,resources,measured_minutes,outcome',
      ...rows.flatMap((participant) => selectedNights(participant).map((item) => [
        participant.safeId,
        data.cohorts.find((cohort) => cohort.id === participant.cohortId)?.name ?? '',
        item.pilotDay,
        item.opened,
        item.resourceCount,
        item.measuredMediaMinutes,
        item.outcome ?? '',
      ].map((value) => `"${spreadsheetSafe(value).replace(/"/g, '""')}"`).join(','))),
    ].join('\n');
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }));
    anchor.download = `devotion-analytics-page-${data.participantDetail.page}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return <section className="engine-section devotion-admin-section">
    <div className="engine-section-heading"><div><span>Analytics</span><h2>{data.devotion?.name}</h2><p>Only reported, opened, and measured activity is shown. Evidence units are not treated as a conversion funnel.</p></div><button type="button" className="admin-button" onClick={() => void onRefresh()}>Refresh</button></div>
    {campaignControls}
    {state === 'loading' ? <div className="admin-analytics-comparison" role="status">Updating devotion analytics…</div> : null}
    {error ? <div className="engine-empty engine-error" role="alert">{error}</div> : null}
    {data.sourceStatus?.status === 'sampled' ? <div className="admin-analytics-warning">Selected-campaign evidence is capped and shown as a lower bound.</div> : null}
    <PortfolioAnalytics portfolio={data.portfolio} />
    <section className="engine-metrics devotion-admin-metrics" aria-label="Devotion analytics summary">{metrics.map(([label, value, detail]) => <div className="engine-metric" key={label}><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>)}</section>
    <SurveyResponseEvidence data={data} />
    <div className="admin-analytics-filters">
      <label>Cohort<select value={cohortId} onChange={(event) => setCohortId(event.target.value)}><option value="all">All cohorts on this page</option>{data.cohorts.map((cohort) => <option value={cohort.id} key={cohort.id}>{cohort.name}</option>)}</select></label>
      <label>Night<select value={night} onChange={(event) => setNight(event.target.value)}><option value="all">All nights</option>{Array.from({ length: data.devotion?.durationDays ?? 0 }, (_, index) => <option value={index + 1} key={index}>Night {index + 1}</option>)}</select></label>
      <label>Outcome<select value={outcome} onChange={(event) => setOutcome(event.target.value as DevotionReportOutcome | 'all')}><option value="all">All outcomes on this page</option>{Object.entries(OUTCOME_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>Participant<select value={participantId} onChange={(event) => setParticipantId(event.target.value)}><option value="all">All participants on this page</option>{data.participants.map((participant) => <option value={participant.safeId} key={participant.id}>{participant.label}</option>)}</select></label>
      <button type="button" className="admin-button" onClick={exportRows}>Export current page CSV</button>
    </div>
    <section className="devotion-heatmap" aria-label="Campaign night rollup">
      <h3>Campaign rollup</h3>
      <p>Full bounded campaign population; participant-detail filters do not change these totals.</p>
      {rollup.map((item) => <article key={item.night}><strong>Night {item.night}</strong><div><span className={item.opened ? 'has-evidence' : ''}>Opened: {item.opened}</span><span className={item.engaged ? 'has-evidence' : ''}>Engaged: {item.engaged}</span><span className={item.reported ? 'has-evidence' : ''}>Reported: {item.reported}</span><span>Measured: {item.measuredMediaMinutes} min</span></div></article>)}
    </section>
    <div className="devotion-heatmap" aria-label="Participant engagement heatmap">{rows.length === 0 ? <p>Unavailable: no participant-nights on this detail page match these filters.</p> : rows.map((participant) => <article key={participant.id}><strong>{participant.label}</strong><small>{data.cohorts.find((cohort) => cohort.id === participant.cohortId)?.name ?? 'Unknown cohort'}</small><div>{selectedNights(participant).map((item) => <span className={item.opened || item.outcome ? 'has-evidence' : ''} key={item.pilotDay}>N{item.pilotDay}: {item.opened ? 'opened' : '—'}{item.outcome ? ` · ${OUTCOME_LABELS[item.outcome]}` : ''}{item.resources.length ? ` · ${item.resources.map((resource) => `${resource.label} (${resource.count} clicks, ${resource.measuredMinutes} min)`).join(', ')}` : ''}</span>)}</div></article>)}</div>
    <p className="devotion-analytics-boundary">Participant filters and CSV cover only the current 100-record detail page. Measured minutes are player-duration evidence only; external links can record a click but cannot measure time on a third-party page.</p>
  </section>;
}

function SurveyResponseEvidence({ data }: { data: DevotionAnalyticsData }) {
  const rows = data.surveyResponses;
  const exportRows = () => {
    const headers = ['devotion_safe_id', 'participant_safe_id', 'phase', 'status', 'started_at', 'submitted_at', 'updated_at', 'liturgy_familiarity', 'mass_frequency', 'prayer_frequency', 'hour_confidence', 'friction', 'continue_likelihood', 'experience_rating', 'continued_after_window'];
    const values = rows.map((row) => [
      row.devotionSafeId,
      row.participantSafeId,
      row.phase,
      row.status,
      row.startedAt,
      row.submittedAt ?? '',
      row.updatedAt,
      row.answers.liturgyFamiliarity ?? '',
      row.answers.massFrequency ?? '',
      row.answers.prayerFrequency ?? '',
      row.answers.hourConfidence ?? '',
      row.answers.friction?.join('|') ?? '',
      row.answers.continueLikelihood ?? '',
      row.answers.experienceRating ?? '',
      row.answers.continuedAfterWindow ?? '',
    ]);
    const content = [headers, ...values]
      .map((record) => record.map((value) => `"${spreadsheetSafe(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    anchor.download = `devotion-survey-responses-${data.devotion?.slug ?? 'campaign'}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };

  return <section className="devotion-survey-evidence" aria-label="Survey response evidence">
    <div className="engine-section-heading compact"><div><span>Research linkage</span><h3>Pre/post survey responses</h3><p>Responses are pseudonymously linked, not anonymous. Partial saves are shown separately from completed submissions.</p></div>{rows.length ? <button type="button" className="admin-button" onClick={exportRows}>Export survey CSV</button> : null}</div>
    {!data.surveySchemaReady ? <div className="engine-empty">Survey storage is unavailable until the campaign survey migration is applied.</div> : rows.length === 0 ? <div className="engine-empty">No survey starts or submissions recorded.</div> : <div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Participant</th><th>Phase</th><th>Status</th><th>Started</th><th>Submitted</th><th>Key responses</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.participantSafeId}-${row.phase}`}><td data-label="Participant"><code>{row.participantSafeId}</code></td><td data-label="Phase">{row.phase}</td><td data-label="Status">{row.status}</td><td data-label="Started">{new Date(row.startedAt).toLocaleString()}</td><td data-label="Submitted">{row.submittedAt ? new Date(row.submittedAt).toLocaleString() : 'Not submitted'}</td><td data-label="Key responses">{surveyAnswerSummary(row.answers)}</td></tr>)}</tbody></table></div>}
    <p className="devotion-analytics-boundary">The export contains only shortened devotion/participant identifiers and approved response fields. It never includes participant labels, raw link tokens, or token hashes.</p>
  </section>;
}

function surveyAnswerSummary(answers: DevotionAnalyticsData['surveyResponses'][number]['answers']) {
  const summary = [
    answers.hourConfidence ? `Confidence ${answers.hourConfidence}/5` : null,
    answers.continueLikelihood ? `Continue ${answers.continueLikelihood}/5` : null,
    answers.experienceRating ? `Experience ${answers.experienceRating}/5` : null,
    answers.friction?.length ? `Friction: ${answers.friction.join(', ')}` : null,
  ].filter(Boolean);
  return summary.join(' · ') || 'No answers saved yet';
}

function PortfolioAnalytics({ portfolio }: { portfolio: DevotionAnalyticsData['portfolio'] }) {
  if (!portfolio) return <div className="engine-empty">Portfolio comparison is unavailable.</div>;
  return <section className="devotion-portfolio"><div className="engine-section-heading compact"><div><span>Portfolio intelligence</span><h3>Campaign comparison</h3><p>{portfolio.status === 'sampled' ? `Lower-bound evidence; configured caps were reached for ${portfolio.truncatedSources.join(', ')}.` : 'Exact within the current stored evidence.'}</p></div></div><div className="admin-table-wrap"><table className="admin-responsive-table"><thead><tr><th>Campaign</th><th>Status</th><th>Participants</th><th>Active</th><th>Completed</th><th>Nights opened</th><th>Reports</th><th>Prayed</th><th>Resource opens</th><th>Measured min</th></tr></thead><tbody>{portfolio.campaigns.map((row) => <tr key={row.devotion.id}><td data-label="Campaign">{row.devotion.name}</td><td data-label="Status">{row.devotion.status}</td><td data-label="Participants">{row.participants}</td><td data-label="Active">{row.activeParticipants}</td><td data-label="Completed">{row.completedParticipants}</td><td data-label="Nights opened">{row.nightsOpened}</td><td data-label="Reports">{row.reports}</td><td data-label="Prayed">{row.prayedReports}</td><td data-label="Resource opens">{row.resourceEngagements}</td><td data-label="Measured min">{row.measuredMediaMinutes}</td></tr>)}</tbody></table></div></section>;
}

function AuditHistory({ entries }: { entries: DevotionAnalyticsData['auditHistory'] }) {
  return <section className="devotion-audit-history"><div className="engine-section-heading compact"><div><span>Recovery and accountability</span><h3>Recent admin history</h3><p>Latest 100 successful operations, newest first.</p></div></div>{entries.length === 0 ? <div className="engine-empty">No audited changes recorded yet.</div> : <div className="admin-list">{entries.map((entry) => <article key={entry.id}><strong>{entry.action}</strong><span>{entry.actorEmail ?? entry.actorRole}</span><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()} local</time>{typeof entry.summary.status === 'string' ? <small>Status: {entry.summary.status}</small> : null}{typeof entry.summary.participantCount === 'number' ? <small>Participants: {entry.summary.participantCount}</small> : null}</article>)}</div>}</section>;
}

function StatusSelect({ name, defaultValue, canArchive = false }: { name: string; defaultValue: DevotionStatus; canArchive?: boolean }) { const statuses = !canArchive && defaultValue === 'archived' ? ['archived'] : STATUS_OPTIONS.filter((status) => status !== 'archived' || canArchive); return <select name={name} defaultValue={defaultValue}>{statuses.map((status) => <option value={status} key={status}>{status}</option>)}</select>; }
function TimezoneField({ name, defaultValue = '' }: { name: string; defaultValue?: string }) { return <label>Timezone<select name={name} defaultValue={defaultValue}><option value="">Select timezone</option><optgroup label="Common US timezones">{COMMON_TIMEZONES.map(([value, label]) => <option key={value} value={value}>{label} ({value})</option>)}</optgroup>{ALL_TIMEZONES.length ? <optgroup label="All IANA timezones">{ALL_TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</optgroup> : null}</select></label>; }
