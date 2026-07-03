import { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CalendarConflictReason, CalendarConflictSeverity, Json } from '../lib/database.types';
import type {
    Calendar,
    CalendarConflict,
    CalendarConflictRun,
    CalendarReviewItem,
    CalendarSource,
} from '../lib/liturgicalCalendar';

type CalendarStats = {
    calendar: Calendar;
    days: number;
    options: number;
    hours: number;
    sources: number;
    openReviews: number;
};

type ConflictDetails = {
    base?: ConflictDetailDay | null;
    comparison?: ConflictDetailDay | null;
    base_options?: ConflictDetailOption[];
    comparison_options?: ConflictDetailOption[];
    differences?: string[];
    notes?: string[];
};

type ConflictDetailDay = {
    canonical_celebration_id?: string | null;
    celebration_id?: string | null;
    title?: string | null;
    display_title?: string | null;
    rank?: string | null;
    color?: string | null;
    country_scope?: string | null;
    obligation_status?: string | null;
    precedence_rank?: number | null;
};

type ConflictDetailOption = {
    canonical_celebration_id?: string | null;
    celebration_id?: string | null;
    title?: string | null;
    rank?: string | null;
    color?: string | null;
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const reasonLabels: Record<CalendarConflictReason, string> = {
    same: 'Same',
    missing_base_day: 'Missing base day',
    missing_comparison_day: 'Missing comparison day',
    missing_canonical_identity: 'Missing identity',
    missing_precedence: 'Missing precedence',
    different_principal_celebration: 'Different principal',
    different_title: 'Different title',
    different_rank: 'Different rank',
    different_color: 'Different color',
    different_holy_day_obligation: 'Different obligation',
    different_obligation: 'Different obligation',
    different_options: 'Different options',
    country_specific: 'Country specific',
    manual_review: 'Manual review',
};

const severityLabels: Record<CalendarConflictSeverity, string> = {
    none: 'None',
    minor: 'Minor',
    major: 'Major',
};

function asDetails(value: Json): ConflictDetails {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as ConflictDetails;
}

function formatDate(value: string | null) {
    if (!value) return 'Not completed';
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(value));
}

function titleForCalendar(calendar: Calendar) {
    return calendar.id.toUpperCase();
}

function pct(part: number, whole: number) {
    if (!whole) return '0%';
    return `${Math.round((part / whole) * 100)}%`;
}

async function exactCount(table: string, apply: (query: any) => any) {
    if (!supabase) return 0;
    const { count, error } = await apply(supabase.from(table).select('id', { count: 'exact', head: true }));
    if (error) throw error;
    return count ?? 0;
}

function DetailValue({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="engine-detail-value">
            <span>{label}</span>
            <strong>{value ?? 'None'}</strong>
        </div>
    );
}

function DayDetail({ title, day, options }: { title: string; day?: ConflictDetailDay | null; options?: ConflictDetailOption[] }) {
    return (
        <div className="engine-day-detail">
            <div className="engine-day-detail-heading">{title}</div>
            <h3>{day?.display_title || day?.title || 'Missing day'}</h3>
            <div className="engine-detail-grid">
                <DetailValue label="Canonical" value={day?.canonical_celebration_id} />
                <DetailValue label="Rank" value={day?.rank} />
                <DetailValue label="Color" value={day?.color} />
                <DetailValue label="Scope" value={day?.country_scope} />
                <DetailValue label="Obligation" value={day?.obligation_status} />
                <DetailValue label="Precedence" value={day?.precedence_rank} />
            </div>
            <div className="engine-options-list">
                <span>Options</span>
                {(options ?? []).length === 0 ? (
                    <p>None</p>
                ) : (
                    (options ?? []).map((option) => (
                        <p key={`${option.celebration_id}-${option.title}`}>
                            {option.title}
                            {option.rank ? ` · ${option.rank}` : ''}
                        </p>
                    ))
                )}
            </div>
        </div>
    );
}

export function CalendarEngineAdminPage() {
    const [state, setState] = useState<LoadState>('idle');
    const [error, setError] = useState<string | null>(null);
    const [calendars, setCalendars] = useState<Calendar[]>([]);
    const [stats, setStats] = useState<CalendarStats[]>([]);
    const [sources, setSources] = useState<CalendarSource[]>([]);
    const [runs, setRuns] = useState<CalendarConflictRun[]>([]);
    const [reviews, setReviews] = useState<CalendarReviewItem[]>([]);
    const [conflicts, setConflicts] = useState<CalendarConflict[]>([]);
    const [baseCalendarId, setBaseCalendarId] = useState('us');
    const [comparisonCalendarId, setComparisonCalendarId] = useState('ew');
    const [reasonFilter, setReasonFilter] = useState<CalendarConflictReason | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<CalendarConflictSeverity | 'all'>('all');
    const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function loadAdminData() {
            if (!supabase || !isSupabaseConfigured) {
                setState('error');
                setError('Supabase is not configured for this local app.');
                return;
            }

            setState('loading');
            setError(null);

            try {
                const [
                    calendarResult,
                    sourceResult,
                    runResult,
                    reviewResult,
                ] = await Promise.all([
                    supabase.from('calendars').select('*').order('id'),
                    supabase.from('calendar_sources').select('*').order('year', { ascending: false }),
                    supabase.from('calendar_conflict_runs').select('*').order('created_at', { ascending: false }).limit(12),
                    supabase.from('calendar_review_items').select('*').neq('status', 'resolved').order('detected_at', { ascending: false }).limit(50),
                ]);

                if (calendarResult.error) throw calendarResult.error;
                if (sourceResult.error) throw sourceResult.error;
                if (runResult.error) throw runResult.error;
                if (reviewResult.error) throw reviewResult.error;

                const loadedCalendars = calendarResult.data;
                const loadedStats = await Promise.all(
                    loadedCalendars.map(async (calendar) => ({
                        calendar,
                        days: await exactCount('liturgical_days', (query) => query.eq('calendar_id', calendar.id)),
                        options: await exactCount('liturgical_day_options', (query) => query.eq('calendar_id', calendar.id)),
                        hours: await exactCount('liturgical_hour_instances', (query) => query.eq('calendar_id', calendar.id)),
                        sources: await exactCount('calendar_sources', (query) => query.eq('calendar_id', calendar.id)),
                        openReviews: await exactCount('calendar_review_items', (query) =>
                            query.eq('calendar_id', calendar.id).eq('status', 'open'),
                        ),
                    })),
                );

                if (!cancelled) {
                    setCalendars(loadedCalendars);
                    setStats(loadedStats);
                    setSources(sourceResult.data);
                    setRuns(runResult.data);
                    setReviews(reviewResult.data);
                    if (!loadedCalendars.some((calendar) => calendar.id === baseCalendarId)) {
                        setBaseCalendarId(loadedCalendars[0]?.id ?? '');
                    }
                    if (!loadedCalendars.some((calendar) => calendar.id === comparisonCalendarId)) {
                        setComparisonCalendarId(loadedCalendars.find((calendar) => calendar.id !== loadedCalendars[0]?.id)?.id ?? '');
                    }
                    setState('ready');
                }
            } catch (loadError) {
                if (!cancelled) {
                    setState('error');
                    setError(loadError instanceof Error ? loadError.message : 'Unable to load calendar engine data.');
                }
            }
        }

        loadAdminData();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadConflicts() {
            if (!supabase || !baseCalendarId || !comparisonCalendarId || baseCalendarId === comparisonCalendarId) {
                setConflicts([]);
                return;
            }

            const { data, error: conflictError } = await supabase
                .from('calendar_conflicts')
                .select('*')
                .eq('base_calendar_id', baseCalendarId)
                .eq('comparison_calendar_id', comparisonCalendarId)
                .order('date');

            if (cancelled) return;

            if (conflictError) {
                setError(conflictError.message);
                setConflicts([]);
                return;
            }

            setConflicts(data);
            setSelectedConflictId(data[0]?.id ?? null);
        }

        loadConflicts();

        return () => {
            cancelled = true;
        };
    }, [baseCalendarId, comparisonCalendarId]);

    const reasonBuckets = useMemo(() => {
        const buckets = new Map<CalendarConflictReason, number>();
        for (const conflict of conflicts) {
            buckets.set(conflict.reason, (buckets.get(conflict.reason) ?? 0) + 1);
        }
        return [...buckets.entries()].sort((left, right) => right[1] - left[1]);
    }, [conflicts]);

    const severityBuckets = useMemo(() => {
        const buckets = new Map<CalendarConflictSeverity, number>();
        for (const conflict of conflicts) {
            buckets.set(conflict.severity, (buckets.get(conflict.severity) ?? 0) + 1);
        }
        return buckets;
    }, [conflicts]);

    const filteredConflicts = useMemo(
        () =>
            conflicts.filter(
                (conflict) =>
                    (reasonFilter === 'all' || conflict.reason === reasonFilter) &&
                    (severityFilter === 'all' || conflict.severity === severityFilter),
            ),
        [conflicts, reasonFilter, severityFilter],
    );

    const selectedConflict = useMemo(
        () => conflicts.find((conflict) => conflict.id === selectedConflictId) ?? filteredConflicts[0] ?? null,
        [conflicts, filteredConflicts, selectedConflictId],
    );

    const selectedDetails = selectedConflict ? asDetails(selectedConflict.details) : {};
    const latestRun = runs[0];
    const openReviewCount = reviews.filter((review) => review.status === 'open').length;
    const totalDays = stats.reduce((sum, item) => sum + item.days, 0);

    return (
        <main className="engine-admin">
            <aside className="engine-sidebar" aria-label="Calendar engine sections">
                <div className="engine-brand">
                    <span>Una Voce</span>
                    <strong>Calendar Engine</strong>
                </div>
                <nav>
                    <a href="#inventory">Calendars</a>
                    <a href="#conflicts">Conflicts</a>
                    <a href="#review">Review Queue</a>
                    <a href="#sources">Sources</a>
                    <a href="#runs">Runs</a>
                </nav>
            </aside>

            <section className="engine-workspace">
                <header className="engine-topbar">
                    <div>
                        <p>Local admin</p>
                        <h1>Liturgical Calendar Engine</h1>
                    </div>
                    <div className="engine-controls">
                        <label>
                            Base
                            <select value={baseCalendarId} onChange={(event) => setBaseCalendarId(event.target.value)}>
                                {calendars.map((calendar) => (
                                    <option key={calendar.id} value={calendar.id}>
                                        {titleForCalendar(calendar)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Compare
                            <select value={comparisonCalendarId} onChange={(event) => setComparisonCalendarId(event.target.value)}>
                                {calendars.map((calendar) => (
                                    <option key={calendar.id} value={calendar.id}>
                                        {titleForCalendar(calendar)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </header>

                {state === 'loading' && <div className="engine-empty">Loading calendar engine data...</div>}
                {state === 'error' && <div className="engine-empty engine-error">{error}</div>}

                {state === 'ready' && (
                    <>
                        <section className="engine-metrics" aria-label="Calendar engine summary">
                            <div className="engine-metric">
                                <span>Calendars</span>
                                <strong>{calendars.length}</strong>
                                <p>{totalDays.toLocaleString()} liturgical days indexed</p>
                            </div>
                            <div className="engine-metric">
                                <span>Active Conflicts</span>
                                <strong>{conflicts.length}</strong>
                                <p>{severityBuckets.get('major') ?? 0} major, {severityBuckets.get('minor') ?? 0} minor</p>
                            </div>
                            <div className="engine-metric">
                                <span>Open Reviews</span>
                                <strong>{openReviewCount}</strong>
                                <p>{reviews.length} unresolved queue item{reviews.length === 1 ? '' : 's'}</p>
                            </div>
                            <div className="engine-metric">
                                <span>Latest Run</span>
                                <strong>{latestRun?.status ?? 'None'}</strong>
                                <p>{latestRun ? `${latestRun.conflict_count} conflicts · ${formatDate(latestRun.completed_at)}` : 'No runs yet'}</p>
                            </div>
                        </section>

                        <section className="engine-section" id="inventory">
                            <div className="engine-section-heading">
                                <div>
                                    <p>Coverage</p>
                                    <h2>Calendar Inventory</h2>
                                </div>
                            </div>
                            <div className="engine-table-wrap">
                                <table className="engine-table">
                                    <thead>
                                        <tr>
                                            <th>Calendar</th>
                                            <th>Authority</th>
                                            <th>Days</th>
                                            <th>Options</th>
                                            <th>Hours</th>
                                            <th>Sources</th>
                                            <th>Open Reviews</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.map((item) => (
                                            <tr key={item.calendar.id}>
                                                <td>
                                                    <strong>{titleForCalendar(item.calendar)}</strong>
                                                    <span>{item.calendar.name}</span>
                                                </td>
                                                <td>{item.calendar.authority}</td>
                                                <td>{item.days}</td>
                                                <td>{item.options}</td>
                                                <td>{item.hours}</td>
                                                <td>{item.sources}</td>
                                                <td>
                                                    <span className={item.openReviews ? 'engine-badge warning' : 'engine-badge'}>
                                                        {item.openReviews}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="engine-section engine-conflict-grid" id="conflicts">
                            <div className="engine-conflict-panel">
                                <div className="engine-section-heading compact">
                                    <div>
                                        <p>{baseCalendarId.toUpperCase()} vs {comparisonCalendarId.toUpperCase()}</p>
                                        <h2>Conflict Explorer</h2>
                                    </div>
                                    <span>{pct(filteredConflicts.length, conflicts.length)} shown</span>
                                </div>

                                <div className="engine-filter-row">
                                    <label>
                                        Reason
                                        <select value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value as CalendarConflictReason | 'all')}>
                                            <option value="all">All reasons</option>
                                            {reasonBuckets.map(([reason]) => (
                                                <option key={reason} value={reason}>{reasonLabels[reason]}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Severity
                                        <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as CalendarConflictSeverity | 'all')}>
                                            <option value="all">All severities</option>
                                            <option value="major">Major</option>
                                            <option value="minor">Minor</option>
                                            <option value="none">None</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="engine-buckets">
                                    {reasonBuckets.map(([reason, count]) => (
                                        <button
                                            type="button"
                                            key={reason}
                                            className={reasonFilter === reason ? 'active' : ''}
                                            onClick={() => setReasonFilter(reasonFilter === reason ? 'all' : reason)}
                                        >
                                            <span>{reasonLabels[reason]}</span>
                                            <strong>{count}</strong>
                                        </button>
                                    ))}
                                </div>

                                <div className="engine-conflict-list">
                                    {filteredConflicts.map((conflict) => (
                                        <button
                                            type="button"
                                            key={conflict.id}
                                            className={selectedConflict?.id === conflict.id ? 'engine-conflict-row active' : 'engine-conflict-row'}
                                            onClick={() => setSelectedConflictId(conflict.id)}
                                        >
                                            <span className={`engine-dot ${conflict.severity}`}></span>
                                            <span>{conflict.date}</span>
                                            <strong>{reasonLabels[conflict.reason]}</strong>
                                            <span>{conflict.base_display}</span>
                                            <span>{conflict.comparison_display}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <aside className="engine-detail-panel">
                                {selectedConflict ? (
                                    <>
                                        <div className="engine-detail-header">
                                            <div>
                                                <p>{selectedConflict.date}</p>
                                                <h2>{reasonLabels[selectedConflict.reason]}</h2>
                                            </div>
                                            <span className={`engine-badge ${selectedConflict.severity}`}>
                                                {severityLabels[selectedConflict.severity]}
                                            </span>
                                        </div>
                                        <div className="engine-day-compare">
                                            <DayDetail title={baseCalendarId.toUpperCase()} day={selectedDetails.base} options={selectedDetails.base_options} />
                                            <DayDetail title={comparisonCalendarId.toUpperCase()} day={selectedDetails.comparison} options={selectedDetails.comparison_options} />
                                        </div>
                                        <div className="engine-evidence">
                                            <span>Differences</span>
                                            <p>{selectedDetails.differences?.join(', ') || 'No structured differences recorded.'}</p>
                                            <span>Why</span>
                                            <p>{selectedDetails.notes?.join(' ') || 'No notes recorded.'}</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="engine-empty">Select a conflict to inspect.</div>
                                )}
                            </aside>
                        </section>

                        <section className="engine-section engine-two-col">
                            <div id="review">
                                <div className="engine-section-heading compact">
                                    <div>
                                        <p>Work queue</p>
                                        <h2>Review Items</h2>
                                    </div>
                                </div>
                                <div className="engine-review-list">
                                    {reviews.length === 0 ? (
                                        <div className="engine-empty small">No unresolved review items.</div>
                                    ) : (
                                        reviews.map((review) => (
                                            <div className="engine-review-item" key={review.id}>
                                                <span className={`engine-badge ${review.severity}`}>{review.severity}</span>
                                                <strong>{review.source_title || review.issue_type}</strong>
                                                <p>{review.calendar_id.toUpperCase()} · {review.date ?? 'No date'} · {review.issue_type}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div id="runs">
                                <div className="engine-section-heading compact">
                                    <div>
                                        <p>Audit trail</p>
                                        <h2>Conflict Runs</h2>
                                    </div>
                                </div>
                                <div className="engine-run-list">
                                    {runs.map((run) => (
                                        <div className="engine-run-item" key={run.id}>
                                            <strong>{run.base_calendar_id.toUpperCase()} vs {run.comparison_calendar_id.toUpperCase()}</strong>
                                            <span className={`engine-badge ${run.status}`}>{run.status}</span>
                                            <p>{run.start_date} to {run.end_date} · {run.conflict_count} conflicts · {formatDate(run.completed_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>

                        <section className="engine-section" id="sources">
                            <div className="engine-section-heading compact">
                                <div>
                                    <p>Traceability</p>
                                    <h2>Sources</h2>
                                </div>
                            </div>
                            <div className="engine-source-grid">
                                {sources.slice(0, 12).map((source) => (
                                    <a className="engine-source-item" href={source.url} key={source.id} target="_blank" rel="noreferrer">
                                        <strong>{source.calendar_id.toUpperCase()} · {source.year}</strong>
                                        <span>{source.source_type}</span>
                                        <p>{source.title}</p>
                                    </a>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </section>
        </main>
    );
}
