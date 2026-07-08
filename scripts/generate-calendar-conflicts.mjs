import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_START_DATE = '2025-11-30';
const DEFAULT_END_DATE = '2026-12-31';

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

function parseArgs(argv) {
    const args = {
        base: null,
        comparison: null,
        start: DEFAULT_START_DATE,
        end: DEFAULT_END_DATE,
        includeNone: false,
        dryRun: false,
    };

    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = argv[index + 1];

        if (arg === '--base') {
            args.base = next;
            index += 1;
        } else if (arg === '--comparison') {
            args.comparison = next;
            index += 1;
        } else if (arg === '--start') {
            args.start = next;
            index += 1;
        } else if (arg === '--end') {
            args.end = next;
            index += 1;
        } else if (arg === '--include-none') {
            args.includeNone = true;
        } else if (arg === '--dry-run') {
            args.dryRun = true;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!args.base || !args.comparison) {
        throw new Error('Usage: npm run generate:calendar-conflicts -- --base us --comparison ew [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--dry-run]');
    }

    if (args.base === args.comparison) {
        throw new Error('Base and comparison calendars must be different.');
    }

    return args;
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

function byDate(rows) {
    return new Map(rows.map((row) => [row.date, row]));
}

function optionMap(rows) {
    const grouped = new Map();

    for (const row of rows) {
        const dateOptions = grouped.get(row.date) ?? [];
        dateOptions.push(row);
        grouped.set(row.date, dateOptions);
    }

    return grouped;
}

function optionIdentity(option) {
    return option.canonical_celebration_id ?? option.celebration_id;
}

function optionSet(options) {
    return new Set(options.map(optionIdentity).filter(Boolean));
}

function sameSet(left, right) {
    if (left.size !== right.size) return false;

    for (const value of left) {
        if (!right.has(value)) return false;
    }

    return true;
}

function display(day) {
    if (!day) return '(missing day)';

    return day.display_title || day.title;
}

function summarizeDay(day) {
    if (!day) return null;

    return {
        canonical_celebration_id: day.canonical_celebration_id,
        celebration_id: day.celebration_id,
        title: day.title,
        display_title: day.display_title,
        rank: day.rank,
        color: day.color,
        country_scope: day.country_scope,
        obligation_status: day.obligation_status,
        precedence_rank: day.precedence_rank,
    };
}

function summarizeOptions(options) {
    return options.map((option) => ({
        canonical_celebration_id: option.canonical_celebration_id,
        celebration_id: option.celebration_id,
        title: option.title,
        rank: option.rank,
        color: option.color,
    }));
}

function classification(
    severity,
    reason,
    shouldShowWarning,
    baseDay,
    comparisonDay,
    baseOptions,
    comparisonOptions,
    differences,
    notes,
) {
    return {
        severity,
        reason,
        should_show_warning: shouldShowWarning,
        base_display: display(baseDay),
        comparison_display: display(comparisonDay),
        notes,
        details: {
            base: summarizeDay(baseDay),
            comparison: summarizeDay(comparisonDay),
            base_options: summarizeOptions(baseOptions),
            comparison_options: summarizeOptions(comparisonOptions),
            differences,
            notes,
        },
    };
}

function classifyCalendarConflict(baseDay, comparisonDay, baseOptions = [], comparisonOptions = []) {
    if (!baseDay) {
        return classification('major', 'missing_base_day', true, baseDay, comparisonDay, baseOptions, comparisonOptions, ['base_day'], [
            'Base calendar has no liturgical day for this date.',
        ]);
    }

    if (!comparisonDay) {
        return classification(
            'major',
            'missing_comparison_day',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['comparison_day'],
            ['Comparison calendar has no liturgical day for this date.'],
        );
    }

    if (!baseDay.canonical_celebration_id || !comparisonDay.canonical_celebration_id) {
        return classification(
            'major',
            'missing_canonical_identity',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['canonical_celebration_id'],
            ['Missing canonical celebration identity.'],
        );
    }

    if (baseDay.precedence_rank === null || comparisonDay.precedence_rank === null) {
        return classification('major', 'missing_precedence', true, baseDay, comparisonDay, baseOptions, comparisonOptions, ['precedence_rank'], [
            'Missing precedence rank.',
        ]);
    }

    if (baseDay.canonical_celebration_id !== comparisonDay.canonical_celebration_id) {
        if (baseDay.country_scope !== comparisonDay.country_scope) {
            return classification(
                'major',
                'country_specific',
                true,
                baseDay,
                comparisonDay,
                baseOptions,
                comparisonOptions,
                ['canonical_celebration_id', 'country_scope'],
                ['Principal celebration differs and country scope differs.'],
            );
        }

        return classification(
            'major',
            'different_principal_celebration',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['canonical_celebration_id'],
            ['Principal canonical celebration differs.'],
        );
    }

    if (baseDay.obligation_status !== comparisonDay.obligation_status) {
        return classification('major', 'different_obligation', true, baseDay, comparisonDay, baseOptions, comparisonOptions, ['obligation_status'], [
            'Holy day obligation status differs.',
        ]);
    }

    if (baseDay.precedence_rank !== comparisonDay.precedence_rank || baseDay.rank !== comparisonDay.rank) {
        return classification(
            'major',
            'different_rank',
            true,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['rank', 'precedence_rank'],
            ['Rank or precedence differs for the same canonical celebration.'],
        );
    }

    if (baseDay.color !== comparisonDay.color) {
        return classification('minor', 'different_color', false, baseDay, comparisonDay, baseOptions, comparisonOptions, ['color'], [
            'Liturgical color differs.',
        ]);
    }

    if (!sameSet(optionSet(baseOptions), optionSet(comparisonOptions))) {
        return classification(
            'minor',
            'different_options',
            false,
            baseDay,
            comparisonDay,
            baseOptions,
            comparisonOptions,
            ['optional_celebrations'],
            ['Optional celebrations differ.'],
        );
    }

    const baseDisplay = display(baseDay);
    const comparisonDisplay = display(comparisonDay);
    if (baseDisplay !== comparisonDisplay) {
        return classification('none', 'different_title', false, baseDay, comparisonDay, baseOptions, comparisonOptions, ['display_title'], [
            'Display title differs but canonical celebration matches; this is an editorial variant, not a material conflict.',
        ]);
    }

    return classification('none', 'same', false, baseDay, comparisonDay, baseOptions, comparisonOptions, [], []);
}

async function loadCalendarRows(supabase, calendarId, start, end) {
    const dayResult = await throwIfError(
        `read ${calendarId} liturgical days`,
        await supabase
            .from('liturgical_days')
            .select('id,calendar_id,date,canonical_celebration_id,celebration_id,title,display_title,rank,color,country_scope,obligation_status,precedence_rank')
            .eq('calendar_id', calendarId)
            .gte('date', start)
            .lte('date', end),
    );

    const optionResult = await throwIfError(
        `read ${calendarId} liturgical day options`,
        await supabase
            .from('liturgical_day_options')
            .select('id,calendar_id,date,canonical_celebration_id,celebration_id,title,rank,color')
            .eq('calendar_id', calendarId)
            .gte('date', start)
            .lte('date', end),
    );

    return {
        days: dayResult.data,
        options: optionResult.data,
    };
}

const args = parseArgs(process.argv);
const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const base = await loadCalendarRows(supabase, args.base, args.start, args.end);
const comparison = await loadCalendarRows(supabase, args.comparison, args.start, args.end);
const baseDays = byDate(base.days);
const comparisonDays = byDate(comparison.days);
const baseOptions = optionMap(base.options);
const comparisonOptions = optionMap(comparison.options);
const dates = [...new Set([...baseDays.keys(), ...comparisonDays.keys()])].sort();

const conflictRows = dates
    .map((date) => {
        const baseDay = baseDays.get(date);
        const comparisonDay = comparisonDays.get(date);
        const classification = classifyCalendarConflict(
            baseDay,
            comparisonDay,
            baseOptions.get(date) ?? [],
            comparisonOptions.get(date) ?? [],
        );

        return {
            date,
            base_calendar_id: args.base,
            comparison_calendar_id: args.comparison,
            base_liturgical_day_id: baseDay?.id ?? null,
            comparison_liturgical_day_id: comparisonDay?.id ?? null,
            severity: classification.severity,
            reason: classification.reason,
            base_display: classification.base_display,
            comparison_display: classification.comparison_display,
            should_show_warning: classification.should_show_warning,
            details: classification.details,
        };
    })
    .filter((row) => args.includeNone || row.severity !== 'none');

console.log(
    `Compared ${dates.length} date(s) from ${args.base} to ${args.comparison}; generated ${conflictRows.length} conflict row(s).`,
);

if (args.dryRun) {
    console.log(JSON.stringify(conflictRows.slice(0, 20), null, 2));
    process.exit(0);
}

const runResult = await throwIfError(
    'create calendar conflict run',
    await supabase
        .from('calendar_conflict_runs')
        .insert({
            base_calendar_id: args.base,
            comparison_calendar_id: args.comparison,
            start_date: args.start,
            end_date: args.end,
            compared_date_count: dates.length,
            conflict_count: conflictRows.length,
            include_none: args.includeNone,
            status: 'running',
            details: {
                generated_at: new Date().toISOString(),
                generator_args: args,
            },
        })
        .select('id')
        .single(),
);

const runId = runResult.data.id;

try {
    await throwIfError(
        'delete stale calendar conflicts',
        await supabase
            .from('calendar_conflicts')
            .delete()
            .eq('base_calendar_id', args.base)
            .eq('comparison_calendar_id', args.comparison)
            .gte('date', args.start)
            .lte('date', args.end),
    );

    for (const rows of chunk(conflictRows)) {
        await throwIfError(
            'upsert calendar conflicts',
            await supabase
                .from('calendar_conflicts')
                .upsert(
                    rows.map((row) => ({ ...row, run_id: runId })),
                    { onConflict: 'date,base_calendar_id,comparison_calendar_id' },
                ),
        );
    }

    await throwIfError(
        'complete calendar conflict run',
        await supabase
            .from('calendar_conflict_runs')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString(),
            })
            .eq('id', runId),
    );
} catch (error) {
    await supabase
        .from('calendar_conflict_runs')
        .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            details: {
                generated_at: new Date().toISOString(),
                generator_args: args,
                error: error instanceof Error ? error.message : String(error),
            },
        })
        .eq('id', runId);

    throw error;
}

console.log(`Wrote ${conflictRows.length} calendar conflict row(s) for run ${runId}.`);
