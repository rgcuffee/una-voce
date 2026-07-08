import { useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { CalendarConflictReason, CalendarConflictSeverity, Json } from '../lib/database.types';
import type {
    Calendar,
    CalendarConflict,
    CalendarConflictRun,
    CalendarReviewItem,
    CalendarSource,
    LiturgicalDay,
    LiturgicalDayOption,
    LiturgicalHourInstance,
    RawCalendarRow,
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

type InspectorDifference = {
    id: string;
    severity: CalendarConflictSeverity;
    reason: CalendarConflictReason;
    baseCalendarId: string;
    comparisonCalendarId: string;
    baseDisplay: string;
    comparisonDisplay: string;
    differences: string[];
    notes: string[];
};

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type DayInspectorState = 'idle' | 'loading' | 'ready' | 'error';

type DayInspectorData = {
    days: LiturgicalDay[];
    options: LiturgicalDayOption[];
    hours: LiturgicalHourInstance[];
    rawRows: RawCalendarRow[];
    reviews: CalendarReviewItem[];
    conflicts: CalendarConflict[];
};

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

const severityWeight: Record<CalendarConflictSeverity, number> = {
    none: 0,
    minor: 1,
    major: 2,
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

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function dayDisplay(day: LiturgicalDay | null | undefined) {
    if (!day) return '(missing day)';
    return day.display_title || day.title;
}

function pairKey(left: string, right: string) {
    return [left, right].sort().join(':');
}

function conflictPairKey(conflict: CalendarConflict) {
    return pairKey(conflict.base_calendar_id, conflict.comparison_calendar_id);
}

function buildInspectorDifferences(calendars: Calendar[], data: DayInspectorData): InspectorDifference[] {
    const persisted = data.conflicts.map((conflict) => {
        const details = asDetails(conflict.details);

        return {
            id: conflict.id,
            severity: conflict.severity,
            reason: conflict.reason,
            baseCalendarId: conflict.base_calendar_id,
            comparisonCalendarId: conflict.comparison_calendar_id,
            baseDisplay: conflict.base_display,
            comparisonDisplay: conflict.comparison_display,
            differences: details.differences ?? [],
            notes: details.notes ?? [],
        };
    });
    const persistedPairs = new Set(data.conflicts.map(conflictPairKey));
    const derived: InspectorDifference[] = [];

    for (let leftIndex = 0; leftIndex < calendars.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < calendars.length; rightIndex += 1) {
            const leftCalendar = calendars[leftIndex];
            const rightCalendar = calendars[rightIndex];
            const key = pairKey(leftCalendar.id, rightCalendar.id);
            if (persistedPairs.has(key)) continue;

            const leftDay = data.days.find((day) => day.calendar_id === leftCalendar.id);
            const rightDay = data.days.find((day) => day.calendar_id === rightCalendar.id);
            if (!leftDay || !rightDay) continue;
            if (leftDay.canonical_celebration_id !== rightDay.canonical_celebration_id) continue;
            if (dayDisplay(leftDay) === dayDisplay(rightDay)) continue;

            derived.push({
                id: `title-variant:${key}`,
                severity: 'none',
                reason: 'different_title',
                baseCalendarId: leftCalendar.id,
                comparisonCalendarId: rightCalendar.id,
                baseDisplay: dayDisplay(leftDay),
                comparisonDisplay: dayDisplay(rightDay),
                differences: ['display_title'],
                notes: [
                    'Display title differs but canonical celebration matches; this is an editorial variant, not a material conflict.',
                ],
            });
        }
    }

    return [...persisted, ...derived];
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

function DayInspector({
    calendars,
    selectedDate,
    onDateChange,
    data,
    state,
    error,
}: {
    calendars: Calendar[];
    selectedDate: string;
    onDateChange: (date: string) => void;
    data: DayInspectorData;
    state: DayInspectorState;
    error: string | null;
}) {
    const conflictCount = data.conflicts.length;
    const reviewCount = data.reviews.length;
    const inspectorDifferences = buildInspectorDifferences(calendars, data);
    const noticeCount = inspectorDifferences.filter((difference) => difference.severity === 'none').length;

    return (
        <section className="engine-section" id="day-inspector">
            <div className="engine-section-heading">
                <div>
                    <p>Daily lookup</p>
                    <h2>Day Inspector</h2>
                </div>
                <div className="engine-controls">
                    <button type="button" className="engine-quiet-button" onClick={() => onDateChange(todayIso())}>
                        Today
                    </button>
                    <label>
                        Date
                        <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
                    </label>
                </div>
            </div>

            {state === 'loading' && <div className="engine-empty small">Loading {selectedDate}...</div>}
            {state === 'error' && <div className="engine-empty engine-error">{error}</div>}

            {state === 'ready' && (
                <>
                    <div className="engine-day-summary">
                        <span>{data.days.length} calendar day{data.days.length === 1 ? '' : 's'}</span>
                        <span>{conflictCount} conflict{conflictCount === 1 ? '' : 's'}</span>
                        <span>{noticeCount} notice{noticeCount === 1 ? '' : 's'}</span>
                        <span>{reviewCount} review item{reviewCount === 1 ? '' : 's'}</span>
                    </div>
                    {inspectorDifferences.length > 0 && (
                        <div className="engine-inspector-differences">
                            {inspectorDifferences.map((difference) => (
                                <div className="engine-inspector-difference" key={difference.id}>
                                    <div className="engine-inspector-difference-heading">
                                        <div>
                                            <span>
                                                {difference.baseCalendarId.toUpperCase()} vs {difference.comparisonCalendarId.toUpperCase()}
                                            </span>
                                            <strong>{reasonLabels[difference.reason]}</strong>
                                        </div>
                                        <span className={`engine-badge ${difference.severity}`}>
                                            {difference.severity === 'none' ? 'Notice' : severityLabels[difference.severity]}
                                        </span>
                                    </div>
                                    <p>{difference.baseDisplay} / {difference.comparisonDisplay}</p>
                                    <div className="engine-evidence compact">
                                        <span>Differences</span>
                                        <p>{difference.differences.join(', ') || 'No structured differences recorded.'}</p>
                                        <span>Why</span>
                                        <p>{difference.notes.join(' ') || 'No notes recorded.'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="engine-inspector-grid">
                        {calendars.map((calendar) => {
                            const day = data.days.find((item) => item.calendar_id === calendar.id);
                            const options = data.options.filter((option) => option.calendar_id === calendar.id);
                            const hours = data.hours.filter((hour) => hour.calendar_id === calendar.id);
                            const rawRows = data.rawRows.filter((row) => row.calendar_id === calendar.id);
                            const reviews = data.reviews.filter((review) => review.calendar_id === calendar.id);
                            const conflicts = data.conflicts.filter(
                                (conflict) => conflict.base_calendar_id === calendar.id || conflict.comparison_calendar_id === calendar.id,
                            );

                            return (
                                <article className="engine-inspector-card" key={calendar.id}>
                                    <div className="engine-inspector-card-header">
                                        <div>
                                            <p>{titleForCalendar(calendar)}</p>
                                            <h3>{day?.display_title || day?.title || 'Missing day'}</h3>
                                        </div>
                                        <span className={day ? 'engine-badge completed' : 'engine-badge failed'}>
                                            {day ? 'Found' : 'Missing'}
                                        </span>
                                    </div>

                                    {day ? (
                                        <div className="engine-detail-grid">
                                            <DetailValue label="Weekday" value={day.weekday_name} />
                                            <DetailValue label="Season" value={day.season} />
                                            <DetailValue label="Rank" value={day.rank} />
                                            <DetailValue label="Color" value={day.color} />
                                            <DetailValue label="Psalter" value={day.psalter_week ? `Week ${day.psalter_week}` : null} />
                                            <DetailValue label="Precedence" value={day.precedence_rank} />
                                            <DetailValue label="Canonical" value={day.canonical_celebration_id} />
                                            <DetailValue label="Obligation" value={day.obligation_status} />
                                        </div>
                                    ) : (
                                        <div className="engine-empty small">No liturgical day exists for this calendar/date.</div>
                                    )}

                                    <div className="engine-inspector-subsection">
                                        <span>Hours</span>
                                        {hours.length === 0 ? (
                                            <p>None</p>
                                        ) : (
                                            <div className="engine-chip-row">
                                                {hours.map((hour) => (
                                                    <span key={hour.id}>{hour.display_name}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="engine-inspector-subsection">
                                        <span>Options</span>
                                        {options.length === 0 ? (
                                            <p>None</p>
                                        ) : (
                                            options.map((option) => (
                                                <p key={option.id}>
                                                    {option.title}
                                                    {option.rank ? ` · ${option.rank}` : ''}
                                                </p>
                                            ))
                                        )}
                                    </div>

                                    <div className="engine-inspector-subsection">
                                        <span>Raw source rows</span>
                                        {rawRows.length === 0 ? (
                                            <p>None</p>
                                        ) : (
                                            rawRows.map((row) => (
                                                <p key={row.id}>
                                                    {row.raw_title}
                                                    {row.raw_rank ? ` · ${row.raw_rank}` : ''}
                                                </p>
                                            ))
                                        )}
                                    </div>

                                    <div className="engine-inspector-flags">
                                        {conflicts.map((conflict) => (
                                            <a href="#conflicts" className={`engine-badge ${conflict.severity}`} key={conflict.id}>
                                                {reasonLabels[conflict.reason]}
                                            </a>
                                        ))}
                                        {reviews.map((review) => (
                                            <a href="#review" className={`engine-badge ${review.severity}`} key={review.id}>
                                                {review.issue_type}
                                            </a>
                                        ))}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </>
            )}
        </section>
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
    const [inspectorDate, setInspectorDate] = useState(todayIso());
    const [inspectorState, setInspectorState] = useState<DayInspectorState>('idle');
    const [inspectorError, setInspectorError] = useState<string | null>(null);
    const [inspectorData, setInspectorData] = useState<DayInspectorData>({
        days: [],
        options: [],
        hours: [],
        rawRows: [],
        reviews: [],
        conflicts: [],
    });

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

    useEffect(() => {
        let cancelled = false;

        async function loadDayInspector() {
            if (!supabase || !isSupabaseConfigured || !inspectorDate) {
                setInspectorData({
                    days: [],
                    options: [],
                    hours: [],
                    rawRows: [],
                    reviews: [],
                    conflicts: [],
                });
                return;
            }

            setInspectorState('loading');
            setInspectorError(null);

            try {
                const [
                    dayResult,
                    optionResult,
                    hourResult,
                    rawResult,
                    reviewResult,
                    conflictResult,
                ] = await Promise.all([
                    supabase.from('liturgical_days').select('*').eq('date', inspectorDate).order('calendar_id'),
                    supabase
                        .from('liturgical_day_options')
                        .select('*')
                        .eq('date', inspectorDate)
                        .order('calendar_id')
                        .order('precedence_rank', { ascending: true, nullsFirst: false })
                        .order('title'),
                    supabase
                        .from('liturgical_hour_instances')
                        .select('*')
                        .eq('date', inspectorDate)
                        .order('calendar_id')
                        .order('sort_order'),
                    supabase.from('raw_calendar_rows').select('*').eq('date', inspectorDate).order('calendar_id'),
                    supabase
                        .from('calendar_review_items')
                        .select('*')
                        .eq('date', inspectorDate)
                        .neq('status', 'resolved')
                        .order('severity')
                        .order('detected_at', { ascending: false }),
                    supabase.from('calendar_conflicts').select('*').eq('date', inspectorDate).order('severity'),
                ]);

                if (dayResult.error) throw dayResult.error;
                if (optionResult.error) throw optionResult.error;
                if (hourResult.error) throw hourResult.error;
                if (rawResult.error) throw rawResult.error;
                if (reviewResult.error) throw reviewResult.error;
                if (conflictResult.error) throw conflictResult.error;

                if (!cancelled) {
                    setInspectorData({
                        days: dayResult.data,
                        options: optionResult.data,
                        hours: hourResult.data,
                        rawRows: rawResult.data,
                        reviews: reviewResult.data,
                        conflicts: conflictResult.data,
                    });
                    setInspectorState('ready');
                }
            } catch (loadError) {
                if (!cancelled) {
                    setInspectorError(loadError instanceof Error ? loadError.message : 'Unable to load day inspector data.');
                    setInspectorState('error');
                }
            }
        }

        loadDayInspector();

        return () => {
            cancelled = true;
        };
    }, [inspectorDate]);

    const reasonBuckets = useMemo(() => {
        const buckets = new Map<CalendarConflictReason, { count: number; severity: CalendarConflictSeverity }>();
        for (const conflict of conflicts) {
            const current = buckets.get(conflict.reason);
            buckets.set(conflict.reason, {
                count: (current?.count ?? 0) + 1,
                severity:
                    current && severityWeight[current.severity] > severityWeight[conflict.severity]
                        ? current.severity
                        : conflict.severity,
            });
        }
        return [...buckets.entries()]
            .map(([reason, bucket]) => ({ reason, ...bucket }))
            .sort((left, right) => right.count - left.count);
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
                    <a href="/admin">Admin Home</a>
                    <a href="#day-inspector">Day Inspector</a>
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
                        <nav className="engine-breadcrumbs" aria-label="Breadcrumb">
                            <a href="/admin">Admin Home</a>
                            <span>/</span>
                            <span>Calendar Engine</span>
                        </nav>
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

                        <DayInspector
                            calendars={calendars}
                            selectedDate={inspectorDate}
                            onDateChange={setInspectorDate}
                            data={inspectorData}
                            state={inspectorState}
                            error={inspectorError}
                        />

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
                                            {reasonBuckets.map(({ reason }) => (
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
                                    {reasonBuckets.map(({ reason, count, severity }) => (
                                        <button
                                            type="button"
                                            key={reason}
                                            className={`severity-${severity}${reasonFilter === reason ? ' active' : ''}`}
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
