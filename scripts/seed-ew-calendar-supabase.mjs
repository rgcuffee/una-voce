import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CALENDAR_ID = 'ew';
const DATE_START = '2025-11-30';
const DATE_END = '2026-12-31';
const NORMALIZED_DAYS_PATH = 'tmp/calendar/ew/2026/normalized_days.json';
const RAW_BLOCKS_PATH = 'tmp/calendar/ew/2026/raw_day_blocks.json';
const SOURCE_MANIFEST_PATH = 'tmp/calendar/ew/2026/source_manifest.json';

function loadEnv(path = '.env.local') {
    return Object.fromEntries(
        fs
            .readFileSync(path, 'utf8')
            .split(/\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#'))
            .map((line) => {
                const separator = line.indexOf('=');
                return [line.slice(0, separator), line.slice(separator + 1)];
            }),
    );
}

async function throwIfError(label, result) {
    if (result.error) {
        throw new Error(`${label}: ${result.error.message}`);
    }

    return result;
}

function chunk(rows, size = 100) {
    const chunks = [];

    for (let index = 0; index < rows.length; index += size) {
        chunks.push(rows.slice(index, index + size));
    }

    return chunks;
}

function notes(value) {
    if (Array.isArray(value)) {
        return value.length ? value.join('; ') : null;
    }

    return value || null;
}

function sourceYear(url) {
    const match = url.match(/\/Calendar\/(\d{4})\//);
    return match ? Number(match[1]) : 2026;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
}

const normalizedDays = JSON.parse(fs.readFileSync(NORMALIZED_DAYS_PATH, 'utf8'));
const rawBlocks = JSON.parse(fs.readFileSync(RAW_BLOCKS_PATH, 'utf8'));
const sourceManifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, 'utf8'));
const supabase = createClient(supabaseUrl, serviceRoleKey);

await throwIfError(
    'assert liturgical_days schema',
    await supabase
        .from('liturgical_days')
        .select('calendar_id,date,weekday,weekday_name,celebration_id,obligation_status,parser_notes')
        .limit(1),
);

await throwIfError(
    'assert liturgical_day_options schema',
    await supabase
        .from('liturgical_day_options')
        .select('calendar_id,date,celebration_id,title,rank,color,country_scope,parser_notes')
        .limit(1),
);

await throwIfError(
    'upsert calendars',
    await supabase.from('calendars').upsert(
        {
            id: CALENDAR_ID,
            name: 'England and Wales liturgical calendar',
            authority: "Liturgy Office of the Catholic Bishops' Conference of England and Wales",
            default_locale: 'en-GB',
            timezone: 'Europe/London',
            notes: 'Generated from official Liturgy Office 2025-2026 monthly calendar pages.',
        },
        { onConflict: 'id' },
    ),
);

await throwIfError(
    'delete liturgical_day_options',
    await supabase
        .from('liturgical_day_options')
        .delete()
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

await throwIfError(
    'delete liturgical_days',
    await supabase
        .from('liturgical_days')
        .delete()
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

await throwIfError(
    'delete raw_calendar_rows',
    await supabase
        .from('raw_calendar_rows')
        .delete()
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

for (const year of [2025, 2026]) {
    await throwIfError(
        `delete ${year} calendar_sources`,
        await supabase
            .from('calendar_sources')
            .delete()
            .eq('calendar_id', CALENDAR_ID)
            .eq('year', year),
    );
}

const sourceRows = sourceManifest.map((source) => ({
    calendar_id: CALENDAR_ID,
    year: sourceYear(source.url),
    source_type: 'html_month_page',
    title: `England and Wales liturgical calendar month page - ${source.url.match(/\/([^/]+)\.shtml$/)?.[1] ?? source.year}`,
    url: source.url,
    retrieved_at: source.retrieved_at,
    notes: `Cached at ${source.local_path}; sha256=${source.sha256}; parsed_day_count=${source.parsed_day_count}`,
}));

const insertedSources = [];
for (const rows of chunk(sourceRows)) {
    const result = await throwIfError(
        'insert calendar_sources',
        await supabase.from('calendar_sources').insert(rows).select('id,url'),
    );
    insertedSources.push(...result.data);
}

const sourceIdByUrl = new Map(insertedSources.map((source) => [source.url, source.id]));

const rawRows = rawBlocks.map((block) => ({
    calendar_id: CALENDAR_ID,
    source_id: sourceIdByUrl.get(block.source_url),
    date: block.date,
    raw_title: block.principal,
    raw_rank: block.raw_rank || null,
    raw_color: null,
    raw_notes: block.raw_celebration,
    country_scope: block.options.some((option) => /\((?:E|W)\)$/.test(option))
        ? 'EW'
        : block.principal.match(/\((E|W)\)$/)?.[1] ?? 'EW',
}));

const liturgicalDays = normalizedDays.map((day) => ({
    calendar_id: CALENDAR_ID,
    source_id: sourceIdByUrl.get(day.source_url),
    date: day.date,
    weekday: day.weekday,
    weekday_name: day.weekday_name,
    celebration_id: day.celebration_id,
    title: day.title,
    display_title: day.display_title,
    season: day.season,
    season_week: day.season_week,
    psalter_week: day.psalter_week,
    rank: day.rank,
    color: day.color,
    country_scope: day.country_scope,
    obligation_status: day.obligation_status,
    raw_source_text: day.raw_source_text,
    parser_notes: notes(day.parser_notes),
}));

const liturgicalDayOptions = normalizedDays.flatMap((day) =>
    day.options.map((option) => ({
        calendar_id: CALENDAR_ID,
        source_id: sourceIdByUrl.get(day.source_url),
        date: day.date,
        celebration_id: option.celebration_id,
        title: option.title,
        rank: option.rank,
        color: option.color,
        country_scope: option.country_scope,
        raw_source_text: day.raw_source_text,
        raw_option_text: option.raw_option_text,
        parser_notes: notes(option.parser_notes),
    })),
);

for (const rows of chunk(rawRows)) {
    await throwIfError('insert raw_calendar_rows', await supabase.from('raw_calendar_rows').insert(rows));
}

for (const rows of chunk(liturgicalDays)) {
    await throwIfError('insert liturgical_days', await supabase.from('liturgical_days').insert(rows));
}

for (const rows of chunk(liturgicalDayOptions)) {
    await throwIfError(
        'insert liturgical_day_options',
        await supabase.from('liturgical_day_options').insert(rows),
    );
}

const { count: dayCount } = await throwIfError(
    'count liturgical_days',
    await supabase
        .from('liturgical_days')
        .select('*', { count: 'exact', head: true })
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

const { count: optionCount } = await throwIfError(
    'count liturgical_day_options',
    await supabase
        .from('liturgical_day_options')
        .select('*', { count: 'exact', head: true })
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

const { count: hourCount } = await throwIfError(
    'count liturgical_hour_instances',
    await supabase
        .from('liturgical_hour_instances')
        .select('*', { count: 'exact', head: true })
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

console.log(`Seeded ${dayCount} EW liturgical days, ${optionCount} optional celebrations, and ${hourCount} hour instances.`);
