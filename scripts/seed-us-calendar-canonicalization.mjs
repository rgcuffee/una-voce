import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_CALENDAR_ID = 'us';
const DATE_START = '2025-11-30';
const DATE_END = '2026-12-31';

function parseArgs(argv) {
    const args = {
        calendarId: DEFAULT_CALENDAR_ID,
    };

    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = argv[index + 1];

        if (arg === '--calendar') {
            args.calendarId = next;
            index += 1;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (!args.calendarId) {
        throw new Error('Usage: npm run seed:us-calendar-canonical -- [--calendar us|ew]');
    }

    return args;
}

const { calendarId: CALENDAR_ID } = parseArgs(process.argv);
const REPORT_PATH = `tmp/calendar/${CALENDAR_ID}/2026/canonicalization_report.json`;

const MANUAL_CANONICAL_IDS = new Map([
    ['all_sts', 'all_saints'],
    ['commemoration_of_all_the_faithful_departed', 'all_souls'],
    ['most_holy_body_and_blood_of_christ', 'corpus_christi'],
    ['nativity_of_the_lord', 'christmas'],
    ['our_lord_jesus_christ_king_of_the_universe', 'christ_the_king'],
    ['or_sts_augustine_zhao_rong_priest_and_companions_martyrs', 'saint_augustine_zhao_rong'],
    ['st_juan_diego_cuahtlatoatzin', 'saint_juan_diego_cuauhtlatoatzin'],
]);

const NOISE_PATTERNS = [
    /\bif necessary\b/i,
    /\bwhen the ascension\b/i,
    /\bnine readings\b/i,
    /\becclesiastical provinces\b/i,
    /\bmay be celebrated\b/i,
    /\bmay be read\b/i,
    /\balthough not given\b/i,
    /\bchrism mass\b/i,
    /\b(old|new) testament\b/i,
    /\b\d+_\d+\b/,
];

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
        if (label.startsWith('assert ') && /Could not find|does not exist|schema cache/i.test(result.error.message)) {
            throw new Error(
                `${label}: ${result.error.message}. Apply supabase/migrations/20260703030000_calendar_review_items.sql, then run this seed again.`,
            );
        }

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

function titleCaseFromId(id) {
    const smallWords = new Set(['and', 'of', 'the', 'in', 'or']);
    return id
        .split('_')
        .filter(Boolean)
        .map((word, index) => {
            if (index > 0 && smallWords.has(word)) return word;
            if (word === 'bvm') return 'BVM';
            if (word === 'st') return 'Saint';
            if (word === 'sts') return 'Saints';
            return `${word[0].toUpperCase()}${word.slice(1)}`;
        })
        .join(' ');
}

function trimSaintRoleSuffixes(id) {
    if (!id.startsWith('saint_') && !id.startsWith('saints_')) return id;

    let current = id;
    let next = current;

    do {
        current = next;
        next = current
            .replace(/_doctor_of_the_church$/, '')
            .replace(/_(?:pope|bishop|priest|deacon)_and_(?:martyr|martyrs)$/, '')
            .replace(/_(?:pope|bishop|priest|deacon)_(?:martyr|martyrs)$/, '')
            .replace(/_(?:and_)?(?:pope|bishop|priest|deacon|virgin|religious|abbot|abbess|martyr|martyrs)$/, '');
    } while (next !== current);

    return current;
}

function canonicalIdFor(sourceId) {
    if (MANUAL_CANONICAL_IDS.has(sourceId)) {
        return MANUAL_CANONICAL_IDS.get(sourceId);
    }

    const normalized = sourceId
        .replace(/(^|_)1st(?=_|$)/g, '$1first')
        .replace(/(^|_)2nd(?=_|$)/g, '$1second')
        .replace(/(^|_)3rd(?=_|$)/g, '$1third')
        .replace(/(^|_)4th(?=_|$)/g, '$1fourth')
        .replace(/(^|_)5th(?=_|$)/g, '$1fifth')
        .replace(/(^|_)6th(?=_|$)/g, '$1sixth')
        .replace(/(^|_)7th(?=_|$)/g, '$1seventh')
        .replace(/(^|_)8th(?=_|$)/g, '$1eighth')
        .replace(/(^|_)9th(?=_|$)/g, '$1ninth')
        .replace(/(^|_)10th(?=_|$)/g, '$1tenth')
        .replace(/(^|_)11th(?=_|$)/g, '$1eleventh')
        .replace(/(^|_)12th(?=_|$)/g, '$1twelfth')
        .replace(/(^|_)13th(?=_|$)/g, '$1thirteenth')
        .replace(/(^|_)14th(?=_|$)/g, '$1fourteenth')
        .replace(/(^|_)15th(?=_|$)/g, '$1fifteenth')
        .replace(/(^|_)16th(?=_|$)/g, '$1sixteenth')
        .replace(/(^|_)17th(?=_|$)/g, '$1seventeenth')
        .replace(/(^|_)18th(?=_|$)/g, '$1eighteenth')
        .replace(/(^|_)19th(?=_|$)/g, '$1nineteenth')
        .replace(/(^|_)20th(?=_|$)/g, '$1twentieth')
        .replace(/(^|_)21st(?=_|$)/g, '$1twenty_first')
        .replace(/(^|_)22nd(?=_|$)/g, '$1twenty_second')
        .replace(/(^|_)23rd(?=_|$)/g, '$1twenty_third')
        .replace(/(^|_)24th(?=_|$)/g, '$1twenty_fourth')
        .replace(/(^|_)25th(?=_|$)/g, '$1twenty_fifth')
        .replace(/(^|_)26th(?=_|$)/g, '$1twenty_sixth')
        .replace(/(^|_)27th(?=_|$)/g, '$1twenty_seventh')
        .replace(/(^|_)28th(?=_|$)/g, '$1twenty_eighth')
        .replace(/(^|_)29th(?=_|$)/g, '$1twenty_ninth')
        .replace(/(^|_)30th(?=_|$)/g, '$1thirtieth')
        .replace(/(^|_)31st(?=_|$)/g, '$1thirty_first')
        .replace(/(^|_)32nd(?=_|$)/g, '$1thirty_second')
        .replace(/(^|_)33rd(?=_|$)/g, '$1thirty_third')
        .replace(/(^|_)34th(?=_|$)/g, '$1thirty_fourth')
        .replace(/^(weekday_of_advent|advent_weekday)$/, 'advent_weekday')
        .replace(/^(weekday_of_christmas|christmas_weekday)$/, 'christmas_weekday')
        .replace(/^(lenten_weekday|weekday_of_lent)$/, 'lenten_weekday')
        .replace(/^(easter_weekday|weekday_of_easter)$/, 'easter_weekday')
        .replace(/^(weekday_in_ordinary_time|weekday_of_ordinary_time|ordinary_time_weekday)$/, 'weekday')
        .replace(
            /^(fifth|sixth|seventh)_day_of_christmas_octave(?:_.*)?$/,
            '$1_day_within_the_octave_of_the_nativity_of_the_lord',
        )
        .replace(/^or_/, '')
        .replace(/^the_/, '')
        .replace(/^sts_/, 'saints_')
        .replace(/^st_/, 'saint_');

    return trimSaintRoleSuffixes(normalized);
}

function canonicalCategory(row) {
    const title = row.title.toLowerCase();
    const id = row.celebration_id;

    if (['friday_of_the_passion_of_the_lord', 'holy_saturday'].includes(id) || title.includes('paschal triduum')) {
        return 'paschal_triduum';
    }

    if (row.rank === 'sunday') {
        if (/advent|lent|easter|palm sunday|passion/.test(title)) {
            return 'privileged_sunday';
        }

        return 'sunday';
    }

    if (row.rank === 'solemnity') {
        return 'solemnity';
    }

    if (row.rank === 'feast') {
        return /\b(lord|jesus|cross|transfiguration|baptism|presentation)\b/.test(title)
            ? 'feast_of_the_lord'
            : 'feast';
    }

    if (row.rank === 'memorial') return 'memorial';
    if (row.rank === 'optional_memorial') return 'optional_memorial';
    if (row.rank === 'commemoration') return 'commemoration';

    if (row.season === 'lent' || /advent weekday|december_/.test(id)) {
        return 'privileged_weekday';
    }

    return 'weekday';
}

function precedenceFor(row) {
    const category = canonicalCategory(row);
    const ranks = {
        paschal_triduum: 10,
        privileged_sunday: 20,
        solemnity: 30,
        sunday: 40,
        feast_of_the_lord: 50,
        feast: 60,
        memorial: 70,
        optional_memorial: 80,
        privileged_weekday: 90,
        weekday: 100,
        commemoration: 110,
    };

    return {
        precedence_category: category,
        precedence_rank: ranks[category] ?? 999,
    };
}

function isSuspicious(row, canonicalId) {
    return (
        canonicalId.length > 90 ||
        NOISE_PATTERNS.some((pattern) => pattern.test(row.celebration_id) || pattern.test(row.title))
    );
}

function reviewIssueKey(item) {
    return [
        'canonicalization',
        item.calendar_id,
        item.source_table,
        item.source_row_id ?? item.date ?? 'unknown',
        item.source_celebration_id ?? 'unknown',
        item.issue_type,
    ].join(':');
}

function reviewItemsFromSuspicious(suspicious) {
    return suspicious.map((item) => {
        const reviewItem = {
            calendar_id: CALENDAR_ID,
            date: item.date,
            source_table: item.source_table,
            source_row_id: item.source_row_id,
            source_celebration_id: item.source_celebration_id,
            source_title: item.source_title,
            issue_type: 'suspicious_canonical_source',
            severity: 'medium',
            status: 'open',
            suggested_canonical_celebration_id: item.canonical_celebration_id,
            details: {
                generated_by: 'seed-us-calendar-canonicalization',
                canonical_celebration_id: item.canonical_celebration_id,
            },
            notes: 'Source celebration identifier appears to include narrative, lectionary, or other non-title text.',
            detected_at: new Date().toISOString(),
            resolved_at: null,
        };

        return {
            ...reviewItem,
            issue_key: reviewIssueKey(reviewItem),
        };
    });
}

function buildCanonicalRows(rows) {
    const byCanonicalId = new Map();
    const aliasesByKey = new Map();
    const suspicious = [];

    for (const row of rows) {
        const canonicalId = canonicalIdFor(row.celebration_id);
        const precedence = precedenceFor(row);
        const suspiciousAlias = isSuspicious(row, canonicalId);

        if (!byCanonicalId.has(canonicalId)) {
            byCanonicalId.set(canonicalId, {
                id: canonicalId,
                default_title: titleCaseFromId(canonicalId),
                category: precedence.precedence_category,
                is_universal: row.country_scope !== 'US',
                notes: suspiciousAlias ? 'Generated from a source identifier that needs manual review.' : null,
            });
        }

        const alias = {
            canonical_celebration_id: canonicalId,
            calendar_id: CALENDAR_ID,
            source_celebration_id: row.celebration_id,
            source_title: row.title,
            match_confidence: suspiciousAlias ? 0.5 : 1,
            notes: suspiciousAlias ? 'Source identifier appears to include narrative or lectionary text.' : null,
        };
        const aliasKey = `${alias.calendar_id}:${alias.source_celebration_id}:${alias.canonical_celebration_id}`;
        const existingAlias = aliasesByKey.get(aliasKey);
        if (!existingAlias || alias.match_confidence < existingAlias.match_confidence) {
            aliasesByKey.set(aliasKey, alias);
        }

        if (suspiciousAlias) {
            suspicious.push({
                calendar_id: CALENDAR_ID,
                date: row.date,
                source_row_id: row.id,
                source_celebration_id: row.celebration_id,
                source_title: row.title,
                canonical_celebration_id: canonicalId,
                source_table: row.source_table,
            });
        }
    }

    return {
        canonicalCelebrations: [...byCanonicalId.values()].sort((a, b) => a.id.localeCompare(b.id)),
        aliases: [...aliasesByKey.values()].sort((a, b) =>
            `${a.calendar_id}:${a.source_celebration_id}:${a.canonical_celebration_id}`.localeCompare(
                `${b.calendar_id}:${b.source_celebration_id}:${b.canonical_celebration_id}`,
            ),
        ),
        suspicious,
    };
}

function rowsWithEngineFields(rows) {
    return rows.map((row) => ({
        ...row,
        canonical_celebration_id: canonicalIdFor(row.celebration_id),
        ...precedenceFor(row),
    }));
}

const env = loadEnv();
const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

await throwIfError(
    'assert canonical schema',
    await supabase.from('canonical_celebrations').select('id,default_title,category').limit(1),
);

await throwIfError(
    'assert liturgical day canonical columns',
    await supabase
        .from('liturgical_days')
        .select('canonical_celebration_id,precedence_rank,precedence_category')
        .limit(1),
);

await throwIfError(
    'assert calendar review items schema',
    await supabase
        .from('calendar_review_items')
        .select('issue_key,calendar_id,status,issue_type,details')
        .limit(1),
);

const { data: principalRows } = await throwIfError(
    'read liturgical days',
    await supabase
        .from('liturgical_days')
        .select('id,date,celebration_id,title,rank,season,country_scope')
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

const { data: optionRows } = await throwIfError(
    'read liturgical day options',
    await supabase
        .from('liturgical_day_options')
        .select('id,date,celebration_id,title,rank,country_scope')
        .eq('calendar_id', CALENDAR_ID)
        .gte('date', DATE_START)
        .lte('date', DATE_END),
);

const principalRowsForCanon = principalRows.map((row) => ({ ...row, source_table: 'liturgical_days' }));
const optionRowsForCanon = optionRows.map((row) => ({
    ...row,
    season: null,
    source_table: 'liturgical_day_options',
}));
const allRows = [...principalRowsForCanon, ...optionRowsForCanon];
const { canonicalCelebrations, aliases, suspicious } = buildCanonicalRows(allRows);
const reviewItems = reviewItemsFromSuspicious(suspicious);
const currentAliasKeys = new Set(
    aliases.map((alias) => `${alias.calendar_id}:${alias.source_celebration_id}:${alias.canonical_celebration_id}`),
);
const currentCanonicalIds = new Set(canonicalCelebrations.map((celebration) => celebration.id));

for (const rows of chunk(canonicalCelebrations)) {
    await throwIfError(
        'upsert canonical celebrations',
        await supabase.from('canonical_celebrations').upsert(rows, { onConflict: 'id' }),
    );
}

for (const rows of chunk(aliases)) {
    await throwIfError(
        'upsert celebration aliases',
        await supabase
            .from('celebration_aliases')
            .upsert(rows, { onConflict: 'calendar_id,source_celebration_id,canonical_celebration_id' }),
    );
}

const existingAliases = await throwIfError(
    'read existing calendar aliases',
    await supabase
        .from('celebration_aliases')
        .select('id,calendar_id,source_celebration_id,canonical_celebration_id')
        .eq('calendar_id', CALENDAR_ID),
);
const staleAliasIds = existingAliases.data
    .filter(
        (alias) =>
            !currentAliasKeys.has(
                `${alias.calendar_id}:${alias.source_celebration_id}:${alias.canonical_celebration_id}`,
            ),
    )
    .map((alias) => alias.id);

for (const rows of chunk(staleAliasIds)) {
    await throwIfError(
        'delete stale celebration aliases',
        await supabase.from('celebration_aliases').delete().in('id', rows),
    );
}

const staleCanonicalIds = [];

for (const rows of chunk(rowsWithEngineFields(principalRows))) {
    await Promise.all(
        rows.map((row) =>
            throwIfError(
                `update liturgical day ${row.date}`,
                supabase
                    .from('liturgical_days')
                    .update({
                        canonical_celebration_id: row.canonical_celebration_id,
                        precedence_rank: row.precedence_rank,
                        precedence_category: row.precedence_category,
                    })
                    .eq('id', row.id),
            ),
        ),
    );
}

for (const rows of chunk(rowsWithEngineFields(optionRows.map((row) => ({ ...row, season: null }))))) {
    await Promise.all(
        rows.map((row) =>
            throwIfError(
                `update liturgical day option ${row.date}`,
                supabase
                    .from('liturgical_day_options')
                    .update({
                        canonical_celebration_id: row.canonical_celebration_id,
                        precedence_rank: row.precedence_rank,
                        precedence_category: row.precedence_category,
                    })
                    .eq('id', row.id),
            ),
        ),
    );
}

const openReviewItems = await throwIfError(
    'read open canonicalization review items',
    await supabase
        .from('calendar_review_items')
        .select('issue_key')
        .eq('calendar_id', CALENDAR_ID)
        .eq('issue_type', 'suspicious_canonical_source')
        .eq('status', 'open'),
);
const currentReviewKeys = new Set(reviewItems.map((item) => item.issue_key));
const resolvedReviewKeys = openReviewItems.data
    .map((item) => item.issue_key)
    .filter((issueKey) => !currentReviewKeys.has(issueKey));

for (const rows of chunk(reviewItems)) {
    await throwIfError(
        'upsert calendar review items',
        await supabase.from('calendar_review_items').upsert(rows, { onConflict: 'issue_key' }),
    );
}

for (const rows of chunk(resolvedReviewKeys)) {
    await throwIfError(
        'resolve stale calendar review items',
        await supabase
            .from('calendar_review_items')
            .update({
                status: 'resolved',
                resolved_at: new Date().toISOString(),
                notes: 'Resolved automatically because the canonicalization issue no longer appears.',
            })
            .in('issue_key', rows),
    );
}

const report = {
    generated_at: new Date().toISOString(),
    calendar_id: CALENDAR_ID,
    date_start: DATE_START,
    date_end: DATE_END,
    principal_count: principalRows.length,
    option_count: optionRows.length,
    canonical_celebration_count: canonicalCelebrations.length,
    alias_count: aliases.length,
    stale_alias_count: staleAliasIds.length,
    stale_canonical_count: staleCanonicalIds.length,
    suspicious_count: suspicious.length,
    review_item_count: reviewItems.length,
    resolved_review_item_count: resolvedReviewKeys.length,
    suspicious,
};

fs.mkdirSync(dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(
    `Canonicalized ${principalRows.length} days and ${optionRows.length} options into ${canonicalCelebrations.length} canonical celebrations.`,
);
console.log(
    `Wrote ${suspicious.length} review item(s) to ${join(process.cwd(), REPORT_PATH)} and resolved ${resolvedReviewKeys.length} stale database review item(s).`,
);
