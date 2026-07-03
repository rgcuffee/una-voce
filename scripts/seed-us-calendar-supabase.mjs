import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const CALENDAR_ID = 'us';
const SOURCE_URL = 'https://www.usccb.org/resources/2026cal.pdf';
const DATE_START = '2025-11-30';
const DATE_END = '2026-12-31';

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

function extractValuesBlock(sql, label) {
    const labelIndex = sql.indexOf(`${label} (`);

    if (labelIndex === -1) {
        throw new Error(`Could not find ${label} block.`);
    }

    const valuesIndex = sql.indexOf('values', labelIndex);
    const nextStatementIndex = sql.indexOf('\n)', valuesIndex);

    if (valuesIndex === -1 || nextStatementIndex === -1) {
        throw new Error(`Could not parse ${label} values.`);
    }

    return sql.slice(valuesIndex + 'values'.length, nextStatementIndex);
}

function splitTuples(block) {
    const tuples = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let index = 0; index < block.length; index += 1) {
        const char = block[index];
        const next = block[index + 1];

        if (inString) {
            current += char;

            if (char === "'" && next === "'") {
                current += next;
                index += 1;
            } else if (char === "'") {
                inString = false;
            }

            continue;
        }

        if (char === "'") {
            inString = true;
            current += char;
            continue;
        }

        if (char === '(') {
            depth += 1;
            if (depth > 1) {
                current += char;
            }
            continue;
        }

        if (char === ')') {
            depth -= 1;
            if (depth === 0) {
                tuples.push(current.trim());
                current = '';
            } else {
                current += char;
            }
            continue;
        }

        if (depth > 0) {
            current += char;
        }
    }

    return tuples;
}

function splitFields(tuple) {
    const fields = [];
    let current = '';
    let inString = false;

    for (let index = 0; index < tuple.length; index += 1) {
        const char = tuple[index];
        const next = tuple[index + 1];

        if (inString) {
            current += char;

            if (char === "'" && next === "'") {
                current += next;
                index += 1;
            } else if (char === "'") {
                inString = false;
            }

            continue;
        }

        if (char === "'") {
            inString = true;
            current += char;
            continue;
        }

        if (char === ',') {
            fields.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    fields.push(current.trim());
    return fields.map(parseSqlValue);
}

function parseSqlValue(value) {
    if (value === 'null') {
        return null;
    }

    if (/^-?\d+$/.test(value)) {
        return Number(value);
    }

    const stringMatch = value.match(/^'((?:[^']|'')*)'(?:\:\:public\.[a-z_]+|\:\:date)?$/s);

    if (stringMatch) {
        return stringMatch[1].replaceAll("''", "'");
    }

    throw new Error(`Unsupported SQL value: ${value.slice(0, 80)}`);
}

function chunk(rows, size = 100) {
    const chunks = [];

    for (let index = 0; index < rows.length; index += size) {
        chunks.push(rows.slice(index, index + size));
    }

    return chunks;
}

async function throwIfError(label, result) {
    if (result.error) {
        throw new Error(`${label}: ${result.error.message}`);
    }

    return result;
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
}

const sql = fs.readFileSync('supabase/seed_us_calendar_2026.sql', 'utf8');
const rawRows = splitTuples(extractValuesBlock(sql, 'raw_rows')).map((tuple) => {
    const [date, raw_title, raw_rank, raw_color, raw_notes, country_scope] =
        splitFields(tuple);

    return {
        calendar_id: CALENDAR_ID,
        date,
        raw_title,
        raw_rank,
        raw_color,
        raw_notes,
        country_scope,
    };
});

const liturgicalDays = splitTuples(extractValuesBlock(sql, 'days')).map((tuple) => {
    const [
        date,
        weekday,
        weekday_name,
        celebration_id,
        title,
        display_title,
        season,
        season_week,
        psalter_week,
        rank,
        color,
        country_scope,
        obligation_status,
        raw_source_text,
        parser_notes,
    ] = splitFields(tuple);

    return {
        calendar_id: CALENDAR_ID,
        date,
        weekday,
        weekday_name,
        celebration_id,
        title,
        display_title,
        season,
        season_week,
        psalter_week,
        rank,
        color,
        country_scope,
        obligation_status,
        raw_source_text,
        parser_notes,
    };
});

const liturgicalDayOptions = splitTuples(extractValuesBlock(sql, 'options')).map((tuple) => {
    const [
        date,
        celebration_id,
        title,
        rank,
        color,
        country_scope,
        raw_source_text,
        raw_option_text,
        parser_notes,
    ] = splitFields(tuple);

    return {
        calendar_id: CALENDAR_ID,
        date,
        celebration_id,
        title,
        rank,
        color,
        country_scope,
        raw_source_text,
        raw_option_text,
        parser_notes,
    };
});

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function assertEngineSchema() {
    const { error: dayError } = await supabase
        .from('liturgical_days')
        .select('calendar_id,date,weekday,weekday_name,celebration_id,obligation_status,parser_notes')
        .limit(1);

    if (dayError) {
        if (dayError.message?.includes('fetch failed')) {
            throw new Error(`Unable to reach Supabase. Check network/DNS access, then run this seed again. ${dayError.details || dayError.message}`);
        }

        throw new Error(
            [
                'Supabase liturgical_days is missing engine-ready columns.',
                'Apply supabase/migrations/20260703010000_liturgical_calendar_engine_readiness.sql, then run this seed again.',
                `${dayError.message}`,
            ].join(' '),
        );
    }

    const { error: optionError } = await supabase
        .from('liturgical_day_options')
        .select('calendar_id,date,celebration_id,title,rank,color,country_scope,parser_notes')
        .limit(1);

    if (optionError) {
        if (optionError.message?.includes('fetch failed')) {
            throw new Error(`Unable to reach Supabase. Check network/DNS access, then run this seed again. ${optionError.details || optionError.message}`);
        }

        throw new Error(
            [
                'Supabase liturgical_day_options is not available.',
                'Apply supabase/migrations/20260703010000_liturgical_calendar_engine_readiness.sql, then run this seed again.',
                `${optionError.message}`,
            ].join(' '),
        );
    }
}

await assertEngineSchema();

await throwIfError(
    'upsert calendars',
    await supabase.from('calendars').upsert(
        {
            id: CALENDAR_ID,
            name: 'United States liturgical calendar',
            authority: 'United States Conference of Catholic Bishops',
            default_locale: 'en-US',
            timezone: 'America/New_York',
            notes: 'Generated from the USCCB 2026 Liturgical Calendar PDF.',
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

await throwIfError(
    'delete calendar_sources',
    await supabase
        .from('calendar_sources')
        .delete()
        .eq('calendar_id', CALENDAR_ID)
        .eq('year', 2026)
        .eq('url', SOURCE_URL),
);

const { data: source } = await throwIfError(
    'insert calendar_sources',
    await supabase
        .from('calendar_sources')
        .insert({
            calendar_id: CALENDAR_ID,
            year: 2026,
            source_type: 'pdf',
            title: 'Liturgical Calendar for the Dioceses of the United States of America - 2026',
            url: SOURCE_URL,
            retrieved_at: '2026-06-29T00:00:00.000Z',
            notes: 'Generated from https://www.usccb.org/resources/2026cal.pdf; sha256=4bd9add07512396a2323aa977bc4816a5fad6348262e12740bcee97c77372d02',
        })
        .select('id')
        .single(),
);

const rawRowsWithSource = rawRows.map((row) => ({
    ...row,
    source_id: source.id,
}));

const liturgicalDaysWithSource = liturgicalDays.map((day) => ({
    ...day,
    source_id: source.id,
}));

const liturgicalDayOptionsWithSource = liturgicalDayOptions.map((option) => ({
    ...option,
    source_id: source.id,
}));

for (const rows of chunk(rawRowsWithSource)) {
    await throwIfError(
        'insert raw_calendar_rows',
        await supabase.from('raw_calendar_rows').insert(rows),
    );
}

for (const rows of chunk(liturgicalDaysWithSource)) {
    await throwIfError(
        'insert liturgical_days',
        await supabase.from('liturgical_days').insert(rows),
    );
}

for (const rows of chunk(liturgicalDayOptionsWithSource)) {
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

console.log(`Seeded ${dayCount} liturgical days, ${optionCount} optional celebrations, and ${hourCount} hour instances.`);
