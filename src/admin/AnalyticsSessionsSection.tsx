import { useEffect, useMemo, useState } from 'react';
import type { AdminAnalyticsData } from './adminApi';
import { analyticsFiltersFromSearch, analyticsSearch, type AnalyticsFilters } from './analyticsWorkflow';
import {
  analyticsEventLabel,
  buildProductPeople,
  observedSpanSeconds,
  type ProductEventRow,
  type ProductPersonStory,
} from './sessionStories';

type AnalyticsSessionsSectionProps = {
  analytics: AdminAnalyticsData;
  search: string;
  onSearch: (search: string) => void;
};

export function AnalyticsSessionsSection({ analytics, search, onSearch }: AnalyticsSessionsSectionProps) {
  const filters = analyticsFiltersFromSearch(search);
  const [query, setQuery] = useState('');
  const people = useMemo(() => buildProductPeople(analytics.explorer?.exportRows ?? []), [analytics.explorer?.exportRows]);
  const visiblePeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter((person) => [
      person.id,
      person.source,
      person.device,
      ...person.sessions.map((session) => session.id),
      ...person.sessions.flatMap((session) => session.events.flatMap((event) => [event.event, event.route, event.destination])),
    ].some((value) => value?.toLowerCase().includes(needle)));
  }, [people, query]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = visiblePeople.find((person) => person.id === selectedId) ?? visiblePeople[0] ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected && selectedId) setSelectedId(null);
  }, [selected, selectedId]);

  const update = (next: Partial<AnalyticsFilters>) => onSearch(analyticsSearch({
    ...filters,
    ...next,
    pageNumber: 1,
  }));
  const sampled = analytics.totalsStatus === 'sampled' || Boolean(analytics.explorer?.exportTruncated);
  const projectedSessions = new Set((analytics.explorer?.exportRows ?? []).map((row) => row.sessionId).filter(Boolean)).size;

  return <section className="engine-section admin-session-explorer">
    <div className="engine-section-heading">
      <div>
        <span>People-first analytics</span>
        <h2>People and session timelines</h2>
        <p>Select a privacy-safe identity to see its stored events in chronological session order.</p>
      </div>
    </div>
    {analytics.schemaStatus === 'migration_required' ? <div className="admin-analytics-warning">{analytics.schemaMessage ?? 'Event timelines are unavailable until analytics event storage is ready.'}</div> : null}
    {sampled ? <div className="admin-analytics-warning" role="status">The list is bounded to the newest {analytics.explorer?.exportCap ?? analytics.sourceCap ?? 1000} matching events. Counts marked with ≥ are lower bounds, and an identity absent from this list may still have older activity.</div> : null}
    <section className="engine-metrics admin-session-metrics" aria-label="Session timeline summary">
      <SessionMetric label="People" value={`${sampled ? '≥' : ''}${analytics.totals.activeUsers}`} detail="Privacy-safe browser identities" />
      <SessionMetric label="Projected people" value={people.length} detail="Visible in the bounded timeline list" />
      <SessionMetric label="Sessions" value={`${sampled ? '≥' : ''}${projectedSessions}`} detail="Distinct projected session IDs" />
      <SessionMetric label="Actions" value={`${sampled ? '≥' : ''}${analytics.explorer?.exportRows.length ?? 0}`} detail="Stored events in this view" />
    </section>
    <div className="admin-session-filters" aria-label="Session filters">
      <label>Range<select value={filters.range} onChange={(event) => update({ range: event.target.value as AnalyticsFilters['range'], start: '', end: '' })}><option value="today">Today</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="custom">Custom</option></select></label>
      {filters.range === 'custom' ? <><label>Start<input type="date" value={filters.start} onChange={(event) => update({ start: event.target.value })} /></label><label>End<input type="date" value={filters.end} onChange={(event) => update({ end: event.target.value })} /></label></> : null}
      <label>Device<select value={filters.device} onChange={(event) => update({ device: event.target.value })}><option value="">All devices</option>{analytics.facets?.devices.map((value) => <option value={value} key={value}>{value}</option>)}</select></label>
      <label>Event<select value={filters.event} onChange={(event) => update({ event: event.target.value })}><option value="">All events</option>{analytics.facets?.events.map((value) => <option value={value} key={value}>{analyticsEventLabel(value)}</option>)}</select></label>
      <label className="admin-session-search">Find<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, session, click, route…" /></label>
    </div>
    <div className="admin-session-workspace">
      <aside className="admin-session-people" aria-label="People">
        <div className="admin-session-pane-heading"><strong>{visiblePeople.length} {visiblePeople.length === 1 ? 'person' : 'people'}</strong><span>Newest activity first</span></div>
        {visiblePeople.length ? visiblePeople.map((person) => <PersonButton person={person} selected={person.id === selected?.id} onSelect={() => setSelectedId(person.id)} key={person.id} />) : <div className="engine-empty small">No privacy-safe identities match these filters.</div>}
      </aside>
      <article className="admin-session-story" aria-live="polite">
        {selected ? <ProductPersonTimeline person={selected} /> : <div className="engine-empty">Choose a person to inspect its sessions.</div>}
      </article>
    </div>
    <p className="admin-session-boundary">Every entry is a stored event. Session spans are derived only from the first and last projected timestamps. External clicks show the destination but never claim time spent after leaving Una Voce.</p>
  </section>;
}

function SessionMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="engine-metric"><span>{label}</span><strong>{value}</strong><p>{detail}</p></div>;
}

function PersonButton({ person, selected, onSelect }: { person: ProductPersonStory; selected: boolean; onSelect: () => void }) {
  return <button type="button" className="admin-session-person" aria-pressed={selected} onClick={onSelect}>
    <span><strong>{personLabel(person.id)}</strong><small>Last seen {formatTimelineTime(person.lastSeen)}</small></span>
    <span><strong>{person.sessionCount}</strong><small>{person.sessionCount === 1 ? 'session' : 'sessions'}</small></span>
    <span><strong>{person.actionCount}</strong><small>actions</small></span>
  </button>;
}

function ProductPersonTimeline({ person }: { person: ProductPersonStory }) {
  return <>
    <header className="admin-session-story-heading">
      <div><span>{person.id === 'unattributed' ? 'Unattributed evidence' : 'Privacy-safe identity'}</span><h3>{personLabel(person.id)}</h3><p>Last seen {formatTimelineTime(person.lastSeen)}</p></div>
      <dl><div><dt>Source</dt><dd>{person.source ?? 'Unavailable'}</dd></div><div><dt>Device</dt><dd>{person.device ?? 'Unavailable'}</dd></div><div><dt>Sessions</dt><dd>{person.sessionCount}</dd></div></dl>
    </header>
    <div className="admin-session-timeline">
      {person.sessions.map((session) => {
        const span = observedSpanSeconds(session.startedAt, session.endedAt);
        return <section className="admin-session-group" key={session.id}>
          <div className="admin-session-group-heading"><div><strong>{session.id}</strong><span>{formatTimelineTime(session.startedAt)}{span !== null ? ` · observed span ${formatDuration(span)}` : ''}</span></div><span>{session.source ?? 'source unavailable'} · {session.device ?? 'device unavailable'}</span></div>
          <ol>{session.events.map((event, index) => <ProductEvent event={event} key={`${event.timestamp}-${event.event}-${index}`} />)}</ol>
        </section>;
      })}
    </div>
  </>;
}

function personLabel(value: string) {
  return value === 'unattributed' ? 'Unattributed activity' : value;
}

function ProductEvent({ event }: { event: ProductEventRow }) {
  const context = [event.route, event.content, event.partner, event.community, event.destination].filter(Boolean);
  const emphasized = /(?:clicked|opened|completed|submitted)$/.test(event.event);
  return <li className={emphasized ? 'emphasis' : ''}>
    <time dateTime={event.timestamp}>{formatEventClock(event.timestamp)}</time>
    <span className="admin-session-event-dot" aria-hidden="true" />
    <div><strong>{analyticsEventLabel(event.event)}</strong><p>{context.join(' · ') || 'No additional safe context'}</p><small>Stored event{event.acquisition ? ` · ${event.acquisition}` : ''}{event.device ? ` · ${event.device}` : ''}</small></div>
  </li>;
}

function formatTimelineTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return 'unavailable';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatEventClock(value: string) {
  if (!Number.isFinite(Date.parse(value))) return '—';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}
