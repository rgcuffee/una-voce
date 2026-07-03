import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const CALENDAR_ID = 'ew';
const YEAR = 2026;
const START_DATE = '2025-11-30';
const END_DATE = '2026-12-31';
const SOURCE_ROOT = 'https://www.liturgyoffice.org.uk/Calendar';
const SOURCE_RETRIEVED_AT = '2026-07-03T00:00:00.000Z';
const TMP_DIR = join(repoRoot, 'tmp', 'calendar', CALENDAR_ID, String(YEAR));
const HTML_DIR = join(TMP_DIR, 'html');
const RAW_BLOCKS_PATH = join(TMP_DIR, 'raw_day_blocks.json');
const NORMALIZED_DAYS_PATH = join(TMP_DIR, 'normalized_days.json');
const PARSER_WARNINGS_PATH = join(TMP_DIR, 'parser_warnings.json');
const SOURCE_MANIFEST_PATH = join(TMP_DIR, 'source_manifest.json');

const MONTH_PAGES = [
    { year: 2025, month: 10, slug: 'Nov' },
    { year: 2025, month: 11, slug: 'Dec' },
    { year: 2026, month: 0, slug: 'Jan' },
    { year: 2026, month: 1, slug: 'Feb' },
    { year: 2026, month: 2, slug: 'Mar' },
    { year: 2026, month: 3, slug: 'Apr' },
    { year: 2026, month: 4, slug: 'May' },
    { year: 2026, month: 5, slug: 'Jun' },
    { year: 2026, month: 6, slug: 'Jul' },
    { year: 2026, month: 7, slug: 'Aug' },
    { year: 2026, month: 8, slug: 'Sep' },
    { year: 2026, month: 9, slug: 'Oct' },
    { year: 2026, month: 10, slug: 'Nov' },
    { year: 2026, month: 11, slug: 'Dec' },
];

const WEEKDAY_INDEX = new Map([
    ['Sunday', 0],
    ['Monday', 1],
    ['Tuesday', 2],
    ['Wednesday', 3],
    ['Thursday', 4],
    ['Friday', 5],
    ['Saturday', 6],
]);

const RANKS = new Map([
    ['solemnity', 'solemnity'],
    ['feast', 'feast'],
    ['memorial', 'memorial'],
]);

const HOLY_DAY_DATES = new Set([
    '2025-12-25',
    '2026-01-06',
    '2026-05-14',
    '2026-11-01',
    '2026-12-25',
]);

const TRANSFERRED_HOLY_DAY_DATES = new Set(['2026-06-28', '2026-08-16']);

function writeJson(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function normalizeSpaces(value) {
    return value.replace(/\s+/g, ' ').trim();
}

function normalizeAscii(value) {
    return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function decodeEntities(value) {
    return value
        .replace(/&mdash;/g, '-')
        .replace(/&ndash;/g, '-')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

function cleanText(value) {
    return normalizeSpaces(
        decodeEntities(value)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/\bDoct\s+or\b/g, 'Doctor'),
    );
}

function cleanCelebrationCell(value) {
    return decodeEntities(value)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/\bDoct\s+or\b/g, 'Doctor')
        .split(/\n+/)
        .map(normalizeSpaces)
        .filter(Boolean)
        .join('\n');
}

function dateFor(page, day) {
    return new Date(Date.UTC(page.year, page.month, day)).toISOString().slice(0, 10);
}

function pageUrl(page) {
    return `${SOURCE_ROOT}/${page.year}/${page.slug}.shtml`;
}

function pagePath(page) {
    return join(HTML_DIR, `${page.year}-${String(page.month + 1).padStart(2, '0')}-${page.slug}.html`);
}

async function fetchPage(page) {
    const destination = pagePath(page);
    if (existsSync(destination)) {
        return readFileSync(destination, 'utf8');
    }

    const response = await fetch(pageUrl(page));
    if (!response.ok) {
        throw new Error(`Failed to fetch ${pageUrl(page)}: HTTP ${response.status}`);
    }

    const html = await response.text();
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, html);
    return html;
}

function extractCells(rowHtml) {
    return [...rowHtml.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map((match) => ({
        className: match[1].match(/\bclass="([^"]*)"/i)?.[1] ?? '',
        text: cleanText(match[2]),
        rawText: cleanCelebrationCell(match[2]),
    }));
}

function parseCelebrations(rawCelebration) {
    const lines = rawCelebration
        .split(/\n+/)
        .map(normalizeSpaces)
        .filter(Boolean);

    const weekdayWithCommemoration = lines[0]?.match(
        /^(Weekday of Advent|Weekday of Christmas|Weekday after Epiphany|Weekday in Ordinary Time|Lenten Weekday|Easter Weekday),\s+(.+)$/i,
    );
    if (weekdayWithCommemoration) {
        const optionText = [weekdayWithCommemoration[2], ...lines.slice(1)].join(' ');
        return {
            principal: cleanTitle(weekdayWithCommemoration[1]),
            options: optionText
                .split(/;\s*/)
                .map(cleanTitle)
                .filter(Boolean),
        };
    }

    const weekdayHeading = lines[0]?.match(
        /^(Weekday of Advent|Weekday of Christmas|Weekday after Epiphany|Weekday in Ordinary Time|Lenten Weekday|Easter Weekday),?$/i,
    );
    if (weekdayHeading && lines.length > 1) {
        return {
            principal: cleanTitle(weekdayHeading[1]),
            options: lines
                .slice(1)
                .flatMap((line) => line.split(/;\s*/))
                .map(cleanTitle)
                .filter(Boolean),
        };
    }

    const principal = [];
    const options = [];
    let currentOption = null;

    for (const line of lines) {
        const optionMatch = line.match(/^or\s+(.+)$/i);
        if (optionMatch) {
            currentOption = [optionMatch[1]];
            options.push(currentOption);
            continue;
        }

        if (currentOption) {
            currentOption.push(line);
        } else {
            principal.push(line);
        }
    }

    return {
        principal: cleanTitle(principal.join(' ')),
        options: options.map((optionLines) => cleanTitle(optionLines.join(' '))).filter(Boolean),
    };
}

function extractCountryScope(title, fallback = 'EW') {
    if (/\(E\)\s*$/.test(title)) return 'E';
    if (/\(W\)\s*$/.test(title)) return 'W';
    return fallback;
}

function cleanTitle(title) {
    return normalizeSpaces(title)
        .replace(/\s+\((?:E|W)\)\s*$/g, '')
        .replace(/\s+\(Wk\s+[IVX]+\)\s*$/i, '')
        .replace(/\s+\(Week\s+\d+\)\s*$/i, '')
        .trim();
}

function canonicalCelebrationId(title) {
    const clean = cleanTitle(title)
        .replace(/\s*\([^)]*\)/g, '')
        .replace(/^The\s+/i, '')
        .replace(/^St\.?\s+/i, 'Saint ')
        .replace(/^Ss\.?\s+/i, 'Saints ')
        .replace(/\bSs\b/g, 'Saints')
        .replace(/^Saint\s+([^,]+),.+$/i, 'Saint $1')
        .replace(/\bSaints\b/gi, 'sts')
        .replace(/\bSaint\b/gi, 'st');

    const id = normalizeAscii(clean)
        .toLowerCase()
        .replace(/\b1st\b/g, 'first')
        .replace(/\b2nd\b/g, 'second')
        .replace(/\b3rd\b/g, 'third')
        .replace(/\b4th\b/g, 'fourth')
        .replace(/\b5th\b/g, 'fifth')
        .replace(/\b6th\b/g, 'sixth')
        .replace(/\b7th\b/g, 'seventh')
        .replace(/\b8th\b/g, 'eighth')
        .replace(/\b9th\b/g, 'ninth')
        .replace(/\b10th\b/g, 'tenth')
        .replace(/\b11th\b/g, 'eleventh')
        .replace(/\b12th\b/g, 'twelfth')
        .replace(/\b13th\b/g, 'thirteenth')
        .replace(/\b14th\b/g, 'fourteenth')
        .replace(/\b15th\b/g, 'fifteenth')
        .replace(/\b16th\b/g, 'sixteenth')
        .replace(/\b17th\b/g, 'seventeenth')
        .replace(/\b18th\b/g, 'eighteenth')
        .replace(/\b19th\b/g, 'nineteenth')
        .replace(/\b20th\b/g, 'twentieth')
        .replace(/\b21st\b/g, 'twenty first')
        .replace(/\b22nd\b/g, 'twenty second')
        .replace(/\b23rd\b/g, 'twenty third')
        .replace(/\b24th\b/g, 'twenty fourth')
        .replace(/\b25th\b/g, 'twenty fifth')
        .replace(/\b26th\b/g, 'twenty sixth')
        .replace(/\b27th\b/g, 'twenty seventh')
        .replace(/\b28th\b/g, 'twenty eighth')
        .replace(/\b29th\b/g, 'twenty ninth')
        .replace(/\b30th\b/g, 'thirtieth')
        .replace(/\b31st\b/g, 'thirty first')
        .replace(/\b32nd\b/g, 'thirty second')
        .replace(/\b33rd\b/g, 'thirty third')
        .replace(/\b34th\b/g, 'thirty fourth')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');

    if (!id) {
        throw new Error(`Unable to make celebration id for ${title}`);
    }

    return id;
}

function rankFor(row) {
    const sourceRank = row.raw_rank.toLowerCase();
    if (RANKS.has(sourceRank)) return RANKS.get(sourceRank);
    if (row.weekday === 0) return 'sunday';
    return 'weekday';
}

function obligationStatus(date, rank) {
    if (TRANSFERRED_HOLY_DAY_DATES.has(date)) return 'transferred';
    if (HOLY_DAY_DATES.has(date)) return 'holy_day';
    if (rank === 'sunday') return 'sunday';
    return 'none';
}

function seasonForDate(date) {
    if (date >= '2025-11-30' && date <= '2025-12-24') return 'advent';
    if (date >= '2025-12-25' && date <= '2026-01-11') return 'christmas';
    if (date >= '2026-01-12' && date <= '2026-02-17') return 'ordinary_time';
    if (date >= '2026-02-18' && date <= '2026-04-01') return 'lent';
    if (date >= '2026-04-02' && date <= '2026-04-04') return 'triduum';
    if (date >= '2026-04-05' && date <= '2026-05-24') return 'easter';
    if (date >= '2026-05-25' && date <= '2026-11-28') return 'ordinary_time';
    if (date >= '2026-11-29' && date <= '2026-12-24') return 'advent';
    return 'christmas';
}

function dateDiffDays(date, startDate) {
    return Math.floor((new Date(`${date}T00:00:00.000Z`) - new Date(`${startDate}T00:00:00.000Z`)) / 86_400_000);
}

function weekFromStart(date, startDate, startWeek = 1) {
    if (date < startDate) return null;
    return startWeek + Math.floor(dateDiffDays(date, startDate) / 7);
}

function seasonWeekForDate(date, season) {
    if (season === 'advent') {
        if (date <= '2025-12-24') return Math.min(weekFromStart(date, '2025-11-30'), 4);
        return Math.min(weekFromStart(date, '2026-11-29'), 4);
    }

    if (season === 'ordinary_time') {
        if (date <= '2026-02-17') return weekFromStart(date, '2026-01-12', 1);
        return weekFromStart(date, '2026-05-25', 8);
    }

    if (season === 'lent' && date >= '2026-02-22') return weekFromStart(date, '2026-02-22', 1);
    if (season === 'easter') return weekFromStart(date, '2026-04-05', 1);
    return null;
}

function psalterWeek(rawSourceText) {
    const match = rawSourceText.match(/\bWk\s+([IVX]+)\b/i);
    if (!match) return null;
    return { I: 1, II: 2, III: 3, IV: 4 }[match[1].toUpperCase()] ?? null;
}

function inferColor(day) {
    const text = day.title;

    if (/Good Friday|Palm Sunday|Pentecost|Martyr|Martyrs|Apostle|Evangelist|The Passion/i.test(text)) {
        return 'red';
    }

    if (/All Souls|Commemoration of All the Faithful Departed/i.test(text)) {
        return 'violet';
    }

    if (['solemnity', 'feast', 'memorial', 'optional_memorial'].includes(day.rank)) {
        return 'white';
    }

    if (day.season === 'advent') return day.season_week === 3 && day.rank === 'sunday' ? 'rose' : 'violet';
    if (day.season === 'lent') return day.season_week === 4 && day.rank === 'sunday' ? 'rose' : 'violet';
    if (day.season === 'ordinary_time' && day.rank === 'weekday') return 'green';
    if (day.season === 'ordinary_time' && day.rank === 'sunday') return 'green';
    if (day.season === 'triduum') return /Good Friday/i.test(text) ? 'red' : 'white';
    return 'white';
}

function precedence(day) {
    if (day.season === 'triduum') return { rank: 1, category: 'paschal_triduum' };
    if (/Easter Sunday|Nativity of the Lord|Epiphany|Ascension|Pentecost/i.test(day.title)) {
        return { rank: 2, category: 'highest_solemnities' };
    }
    if (day.rank === 'solemnity') return { rank: 3, category: 'solemnity' };
    if (day.rank === 'sunday' && ['advent', 'lent', 'easter'].includes(day.season)) {
        return { rank: 4, category: 'privileged_sunday' };
    }
    if (day.rank === 'feast' && /Lord|Baptism|Presentation|Transfiguration|Holy Family/i.test(day.title)) {
        return { rank: 5, category: 'feast_of_the_lord' };
    }
    if (day.rank === 'sunday') return { rank: 6, category: 'ordinary_sunday' };
    if (day.rank === 'feast') return { rank: 8, category: 'feast' };
    if (day.rank === 'memorial') return { rank: 10, category: 'memorial' };
    if (['advent', 'lent', 'christmas', 'easter'].includes(day.season)) return { rank: 12, category: 'seasonal_weekday' };
    return { rank: 13, category: 'weekday' };
}

function parseMonth(page, html) {
    const blocks = [];
    const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];

    for (const rowMatch of rows) {
        const cells = extractCells(rowMatch[1]);
        if (cells.length !== 4 || !/^\d{1,2}$/.test(cells[1].text)) continue;

        const dayNumber = Number(cells[1].text);
        const date = dateFor(page, dayNumber);
        if (date < START_DATE || date > END_DATE) continue;

        const weekdayName = cells[0].text;
        const weekday = WEEKDAY_INDEX.get(weekdayName);
        const rawCelebration = cells[2].rawText;
        const parsed = parseCelebrations(rawCelebration);
        const rawRank = cells[3].text;

        blocks.push({
            date,
            weekday,
            weekday_name: weekdayName,
            raw_celebration: rawCelebration,
            raw_rank: rawRank,
            principal: parsed.principal,
            options: parsed.options,
            source_url: pageUrl(page),
        });
    }

    return blocks;
}

function normalizeBlock(block) {
    const rank = rankFor(block);
    const season = seasonForDate(block.date);
    const day = {
        calendar_id: CALENDAR_ID,
        date: block.date,
        weekday: block.weekday,
        weekday_name: block.weekday_name,
        celebration_id: canonicalCelebrationId(block.principal),
        title: block.principal,
        display_title: block.principal,
        season,
        season_week: seasonWeekForDate(block.date, season),
        psalter_week: psalterWeek(block.raw_celebration),
        rank,
        color: null,
        country_scope: extractCountryScope(block.principal),
        obligation_status: obligationStatus(block.date, rank),
        raw_source_text: block.raw_celebration,
        parser_notes: [],
        source_url: block.source_url,
        options: [],
    };

    const optionIds = new Set();
    day.options = block.options.map((title) => {
        const countryScope = extractCountryScope(title);
        let celebrationId = canonicalCelebrationId(title);
        if (optionIds.has(celebrationId)) {
            celebrationId = `${celebrationId}_${countryScope.toLowerCase()}`;
        }
        optionIds.add(celebrationId);

        return {
            calendar_id: CALENDAR_ID,
            date: block.date,
            celebration_id: celebrationId,
            title,
            rank: 'optional_memorial',
            color: null,
            country_scope: countryScope,
            raw_option_text: title,
            parser_notes: [],
        };
    });
    const color = inferColor(day);

    day.color = color;
    day.options = day.options.map((option) => ({
        ...option,
        color: inferColor({ ...day, title: option.title, rank: option.rank, raw_source_text: option.title }),
    }));

    const dayPrecedence = precedence(day);
    day.precedence_rank = dayPrecedence.rank;
    day.precedence_category = dayPrecedence.category;

    return day;
}

function validate(days) {
    const warnings = [];
    const seen = new Set();

    for (const day of days) {
        if (seen.has(day.date)) {
            warnings.push({ date: day.date, issue: 'duplicate_date', detail: 'Date appeared more than once.' });
        }
        seen.add(day.date);

        const actualWeekday = new Date(`${day.date}T00:00:00.000Z`).getUTCDay();
        if (actualWeekday !== day.weekday) {
            warnings.push({
                date: day.date,
                issue: 'weekday_mismatch',
                detail: `Source said ${day.weekday_name}; computed weekday index ${actualWeekday}.`,
            });
        }

        if (!day.title || !day.celebration_id) {
            warnings.push({ date: day.date, issue: 'missing_principal_celebration', detail: day.raw_source_text });
        }

        if (day.options.some((option) => option.title === day.title)) {
            warnings.push({ date: day.date, issue: 'duplicate_option_title', detail: day.title });
        }
    }

    for (let cursor = new Date(`${START_DATE}T00:00:00.000Z`); cursor <= new Date(`${END_DATE}T00:00:00.000Z`); cursor.setUTCDate(cursor.getUTCDate() + 1)) {
        const date = cursor.toISOString().slice(0, 10);
        if (!seen.has(date)) {
            warnings.push({ date, issue: 'missing_date', detail: 'No liturgical day parsed for this date.' });
        }
    }

    return warnings;
}

const manifest = [];
const rawBlocks = [];

for (const page of MONTH_PAGES) {
    const html = await fetchPage(page);
    const hash = createHash('sha256').update(html).digest('hex');
    const blocks = parseMonth(page, html);
    rawBlocks.push(...blocks);
    manifest.push({
        url: pageUrl(page),
        local_path: pagePath(page).replace(`${repoRoot}/`, ''),
        sha256: hash,
        parsed_day_count: blocks.length,
        retrieved_at: SOURCE_RETRIEVED_AT,
    });
}

const normalizedDays = rawBlocks.map(normalizeBlock).sort((a, b) => a.date.localeCompare(b.date));
const parserWarnings = validate(normalizedDays).sort((a, b) => a.date.localeCompare(b.date) || a.issue.localeCompare(b.issue));

writeJson(SOURCE_MANIFEST_PATH, manifest);
writeJson(RAW_BLOCKS_PATH, rawBlocks);
writeJson(NORMALIZED_DAYS_PATH, normalizedDays);
writeJson(PARSER_WARNINGS_PATH, parserWarnings);

console.log(`Wrote ${rawBlocks.length} raw EW day blocks to ${RAW_BLOCKS_PATH}`);
console.log(`Wrote ${normalizedDays.length} normalized EW days to ${NORMALIZED_DAYS_PATH}`);
console.log(`Wrote ${parserWarnings.length} parser warning(s) to ${PARSER_WARNINGS_PATH}`);
