import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type {
  DevotionActivityEvent,
  DevotionActivitySession,
  DevotionAnalyticsData,
  DevotionNightResult,
  DevotionSurveyResult,
} from './devotionAdminApi';
import {
  analyticsEventLabel,
  buildDevotionParticipantStories,
  devotionStoryNightNumbers,
  observedSpanSeconds,
  type DevotionParticipantStory,
} from './sessionStories';

type DevotionSessionsSectionProps = {
  data: DevotionAnalyticsData;
  campaignControls: ReactNode;
  onRefresh: () => Promise<void>;
  state: 'loading' | 'ready' | 'error';
  error: string | null;
};

export function DevotionSessionsSection({ data, campaignControls, onRefresh, state, error }: DevotionSessionsSectionProps) {
  const [query, setQuery] = useState('');
  const [pilotDay, setPilotDay] = useState('all');
  const stories = useMemo(() => buildDevotionParticipantStories(data), [data]);
  const visibleStories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stories.filter((story) => {
      const matchesDay = pilotDay === 'all'
        || story.participant.nights.some((night) => night.pilotDay === Number(pilotDay))
        || story.sessions.some((session) => session.pilotDay === Number(pilotDay));
      const matchesQuery = !needle || [
        story.participant.safeId,
        story.participant.status,
        ...story.sessions.map((session) => session.sessionSafeId),
        ...story.sessions.flatMap((session) => session.timeline.map((event) => event.event)),
      ].some((value) => value.toLowerCase().includes(needle));
      return matchesDay && matchesQuery;
    });
  }, [pilotDay, query, stories]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = visibleStories.find((story) => story.participant.safeId === selectedId) ?? visibleStories[0] ?? null;

  useEffect(() => {
    setQuery(''); setPilotDay('all'); setSelectedId(null);
  }, [data.devotion?.id, data.participantDetail.page]);
  useEffect(() => {
    if (selected && selected.participant.safeId !== selectedId) setSelectedId(selected.participant.safeId);
    if (!selected && selectedId) setSelectedId(null);
  }, [selected, selectedId]);

  const projectedEvents = data.activity.sessions.reduce((total, session) => total + session.timeline.length, 0);
  const sampled = data.activity.status === 'sampled' || data.sourceStatus?.status === 'sampled';

  return <section className="engine-section admin-session-explorer devotion-session-explorer">
    <div className="engine-section-heading">
      <div><span>Participant stories</span><h2>{data.devotion?.name}</h2><p>Choose a privacy-safe participant to read its campaign activity by night and session.</p></div>
      <button type="button" className="admin-button" onClick={() => void onRefresh()}>Refresh</button>
    </div>
    {campaignControls}
    {state === 'loading' ? <div className="admin-analytics-comparison" role="status">Updating devotion sessions…</div> : null}
    {error ? <div className="engine-empty engine-error" role="alert">{error}</div> : null}
    {sampled ? <div className="admin-analytics-warning" role="status">Session stories use bounded evidence. The response shows {data.activity.shownSessionCount} of at least {data.activity.observedSessionCount} observed sessions and {data.activity.shownEventCount} of at least {data.activity.observedEventCount} stored events; absence is not definitive when a source is sampled.</div> : null}
    {data.activity.attributionStatus === 'unavailable' ? <div className="admin-analytics-warning">Canonical source and surface are unavailable. Device, route, resource, report, survey, and other stored evidence remain visible.</div> : null}
    <section className="engine-metrics admin-session-metrics" aria-label="Devotion session summary">
      <SessionMetric label="Enrolled" value={data.metrics?.participantsEnrolled ?? 0} detail="Full bounded campaign population" />
      <SessionMetric label="On this page" value={stories.length} detail={`Participant detail page ${data.participantDetail.page}`} />
      <SessionMetric label="Sessions" value={`${sampled ? '≥' : ''}${data.activity.shownSessionCount}`} detail="Stored and event-only groups" />
      <SessionMetric label="Timeline events" value={`${sampled ? '≥' : ''}${projectedEvents}`} detail="Projected stored events" />
    </section>
    <div className="admin-session-filters" aria-label="Devotion session filters">
      <label>Night<select value={pilotDay} onChange={(event) => setPilotDay(event.target.value)}><option value="all">All nights</option>{Array.from({ length: data.devotion?.durationDays ?? 0 }, (_, index) => <option value={index + 1} key={index + 1}>Night {index + 1}</option>)}</select></label>
      <label className="admin-session-search">Find<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Participant, session, event…" /></label>
      <span className="admin-session-filter-note">Safe IDs only · newest activity first</span>
    </div>
    <div className="admin-session-workspace">
      <aside className="admin-session-people" aria-label="Devotion participants">
        <div className="admin-session-pane-heading"><strong>{visibleStories.length} participants</strong><span>Page {data.participantDetail.page}</span></div>
        {visibleStories.length ? visibleStories.map((story) => <ParticipantButton story={story} selected={story.participant.safeId === selected?.participant.safeId} onSelect={() => setSelectedId(story.participant.safeId)} key={story.participant.safeId} />) : <div className="engine-empty small">No participants match these filters on this detail page.</div>}
      </aside>
      <article className="admin-session-story" aria-live="polite">
        {selected ? <DevotionParticipantTimeline data={data} story={selected} pilotDay={pilotDay === 'all' ? null : Number(pilotDay)} /> : <div className="engine-empty">Choose a participant to inspect its campaign story.</div>}
      </article>
    </div>
    <p className="admin-session-boundary">Stored events, reports, survey responses, player measures, and campaign status remain separate evidence. Observed session spans are derived from stored timestamps. External clicks never imply prayer completion or time on another site.</p>
  </section>;
}

function SessionMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="engine-metric"><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>;
}

function ParticipantButton({ story, selected, onSelect }: { story: DevotionParticipantStory; selected: boolean; onSelect: () => void }) {
  return <button type="button" className="admin-session-person" aria-pressed={selected} onClick={onSelect}>
    <span><strong>{story.participant.safeId}</strong><small>{story.participant.status} · {formatTimelineTime(story.lastActivityAt)}</small></span>
    <span><strong>{story.nightsWithEvidence}</strong><small>{story.nightsWithEvidence === 1 ? 'night' : 'nights'}</small></span>
    <span><strong>{story.actionCount}</strong><small>evidence</small></span>
  </button>;
}

function DevotionParticipantTimeline({ data, story, pilotDay }: { data: DevotionAnalyticsData; story: DevotionParticipantStory; pilotDay: number | null }) {
  const participant = story.participant;
  const cohort = data.cohorts.find((item) => item.id === participant.cohortId)?.name ?? 'Unknown cohort';
  const nights = devotionStoryNightNumbers(story).filter((night) => pilotDay === null || night === pilotDay);
  const pre = story.surveys.find((survey) => survey.phase === 'pre');
  const post = story.surveys.find((survey) => survey.phase === 'post');

  return <>
    <header className="admin-session-story-heading">
      <div><span>Campaign participant</span><h3>{participant.safeId}</h3><p>{cohort} · enrolled {formatTimelineTime(participant.createdAt)}</p></div>
      <dl><div><dt>Status</dt><dd>{participant.status}</dd></div><div><dt>Nights</dt><dd>{story.nightsWithEvidence}</dd></div><div><dt>Sessions</dt><dd>{story.sessions.length}</dd></div></dl>
    </header>
    <ResearchSummary pre={pre} post={post} completedAt={participant.completedAt} />
    <div className="admin-session-timeline devotion-participant-timeline">
      {nights.length ? nights.map((nightNumber) => {
        const night = participant.nights.find((item) => item.pilotDay === nightNumber) ?? null;
        const sessions = story.sessions.filter((session) => session.pilotDay === nightNumber);
        return <NightStory data={data} nightNumber={nightNumber} night={night} sessions={sessions} key={nightNumber ?? 'other'} />;
      }) : <section className="admin-session-group"><div className="engine-empty small">No stored night or session activity is projected for this participant.</div></section>}
    </div>
  </>;
}

function ResearchSummary({ pre, post, completedAt }: { pre?: DevotionSurveyResult; post?: DevotionSurveyResult; completedAt: string | null }) {
  if (!pre && !post && !completedAt) return null;
  return <div className="devotion-session-research" aria-label="Campaign and survey status">
    {completedAt ? <span><strong>Campaign completed</strong>{formatTimelineTime(completedAt)}</span> : null}
    {pre ? <span><strong>Pre survey</strong>{pre.status}{pre.submittedAt ? ` · ${formatTimelineTime(pre.submittedAt)}` : ''}</span> : null}
    {post ? <span><strong>Post survey</strong>{post.status}{post.submittedAt ? ` · ${formatTimelineTime(post.submittedAt)}` : ''}</span> : null}
  </div>;
}

function NightStory({ data, nightNumber, night, sessions }: { data: DevotionAnalyticsData; nightNumber: number | null; night: DevotionNightResult | null; sessions: DevotionActivitySession[] }) {
  const prayerDate = night?.prayerDate ?? sessions.find((session) => session.prayerDate)?.prayerDate ?? null;
  return <section className="admin-session-group devotion-night-story">
    <div className="admin-session-group-heading"><div><strong>{nightNumber ? `Night ${nightNumber}` : 'Other campaign activity'}</strong><span>{prayerDate ?? 'Prayer date unavailable'}</span></div><span>{night?.outcome ? `Report: ${outcomeLabel(night.outcome)}` : 'No explicit report'}{night?.measuredMediaMinutes !== null && night?.measuredMediaMinutes !== undefined ? ` · ${night.measuredMediaMinutes} active min` : ''}</span></div>
    {night ? <div className="devotion-night-evidence-line"><span>Opened: {night.opened ? 'yes' : 'no'}</span><span>Resource opens: {night.resourceCount}</span><span>Outcome: {night.outcome ? outcomeLabel(night.outcome) : 'unavailable'}</span><span>Measured media: {night.measuredMediaStatus === 'unavailable' ? 'unavailable' : `${night.measuredMediaStatus === 'partial' ? '≥' : ''}${night.measuredMediaMinutes ?? 0} min`}</span></div> : null}
    {sessions.length ? sessions.map((session) => <DevotionSession data={data} session={session} key={session.sessionSafeId} />) : <p className="devotion-session-no-row">No projected session row for this night. Report and participant-night evidence above remain independently stored.</p>}
  </section>;
}

function DevotionSession({ data, session }: { data: DevotionAnalyticsData; session: DevotionActivitySession }) {
  const observedSpan = observedSpanSeconds(session.timeline[0]?.timestamp ?? session.startedAt, session.timeline[session.timeline.length - 1]?.timestamp ?? session.endedAt);
  return <div className="devotion-session-block">
    <div><strong>{session.sessionSafeId}</strong><span>{formatTimelineTime(session.startedAt)}{observedSpan !== null ? ` · observed span ${formatDuration(observedSpan)}` : ''}</span><small>{session.storedSession ? 'Stored prayer-player session' : 'Event-only derived grouping'} · {data.activity.attributionStatus === 'unavailable' ? 'source/surface unavailable' : `${session.source} / ${session.surface}`} · {session.device}</small></div>
    <div className="devotion-session-measures"><span>Active {secondsLabel(session.durationMeasures.activePlaySeconds)}</span><span>Panel {secondsLabel(session.durationMeasures.panelOpenSeconds)}</span><span>Completion {booleanEvidence(session.prayerCompletionStored)}</span><span>Highest progress {session.highestProgressStored === null ? 'unavailable' : `${session.highestProgressStored}%`}</span></div>
    {session.timelineStatus === 'sampled' ? <p className="admin-session-sampled">Timeline capped at {data.activity.timelineCap} events; shown evidence is a lower bound.</p> : null}
    {session.timeline.length ? <ol>{session.timeline.map((event, index) => <DevotionEvent event={event} key={`${event.timestamp}-${event.event}-${index}`} />)}</ol> : <p className="devotion-session-no-row">No event rows are stored for this prayer-player session.</p>}
  </div>;
}

function DevotionEvent({ event }: { event: DevotionActivityEvent }) {
  const context = [event.route, event.resource ? `${event.resource.label} · ${event.resource.provider}/${event.resource.mediaType}` : null].filter(Boolean);
  const emphasized = /(?:clicked|opened|completed|submitted|prayed)$/.test(event.event);
  return <li className={emphasized ? 'emphasis' : ''}>
    <time dateTime={event.timestamp ?? undefined}>{formatEventClock(event.timestamp)}</time>
    <span className="admin-session-event-dot" aria-hidden="true" />
    <div><strong>{analyticsEventLabel(event.event)}</strong><p>{context.join(' · ') || 'No additional safe context'}</p><small>Stored event{event.playbackSecondsStored !== null ? ` · playback ${event.playbackSecondsStored}s` : ''}{event.progressPercentStored !== null ? ` · progress ${event.progressPercentStored}%` : ''}</small></div>
  </li>;
}

function outcomeLabel(value: NonNullable<DevotionNightResult['outcome']>) {
  return value === 'started_not_finished' ? 'Started, not finished' : value === 'not_tonight' ? 'Not tonight' : 'Prayed';
}

function secondsLabel(value: number | null) {
  return value === null ? 'unavailable' : formatDuration(value);
}

function booleanEvidence(value: boolean | null) {
  return value === null ? 'unavailable' : value ? 'yes' : 'no';
}

function formatTimelineTime(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatEventClock(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
