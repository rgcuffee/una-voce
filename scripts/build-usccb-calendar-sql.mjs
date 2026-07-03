import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const YEAR = 2026;
const CALENDAR_ID = 'us';
const SOURCE_URL = 'https://www.usccb.org/resources/2026cal.pdf';
const SOURCE_TITLE = 'Liturgical Calendar for the Dioceses of the United States of America - 2026';
const SOURCE_RETRIEVED_AT = '2026-06-29T00:00:00.000Z';
const START_DATE = '2025-11-30';
const END_DATE = '2026-12-31';

const PDF_PATH = join(repoRoot, 'tmp', 'pdfs', 'usccb-2026cal.pdf');
const TEXT_PATH = join(repoRoot, 'tmp', 'pdfs', 'usccb-2026cal.txt');
const CALENDAR_TMP_DIR = join(repoRoot, 'tmp', 'calendar', CALENDAR_ID, String(YEAR));
const RAW_BLOCKS_PATH = join(CALENDAR_TMP_DIR, 'raw_day_blocks.json');
const NORMALIZED_DAYS_PATH = join(CALENDAR_TMP_DIR, 'normalized_days.json');
const PARSER_WARNINGS_PATH = join(CALENDAR_TMP_DIR, 'parser_warnings.json');
const OUTPUT_PATH = join(repoRoot, 'supabase', 'seed_us_calendar_2026.sql');

const MONTHS = new Map([
  ['JANUARY', 0],
  ['FEBRUARY', 1],
  ['MARCH', 2],
  ['APRIL', 3],
  ['MAY', 4],
  ['JUNE', 5],
  ['JULY', 6],
  ['AUGUST', 7],
  ['SEPTEMBER', 8],
  ['OCTOBER', 9],
  ['NOVEMBER', 10],
  ['DECEMBER', 11],
]);
const WEEKDAYS = new Set(['SUN', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const RAW_WEEKDAY_TO_INDEX = new Map([
  ['SUN', 0],
  ['Mon', 1],
  ['Tue', 2],
  ['Wed', 3],
  ['Thu', 4],
  ['Fri', 5],
  ['Sat', 6],
]);
const COLORS = ['green', 'white', 'red', 'violet', 'rose', 'black'];
const COLOR_PATTERN = COLORS.join('|');
const CANONICAL_RANKS = new Set(['weekday', 'commemoration', 'optional_memorial', 'memorial', 'feast', 'solemnity', 'sunday']);
const OBLIGATION_STATUSES = new Set(['none', 'sunday', 'holy_day', 'transferred', 'suppressed', 'particular_law']);
const RANKS = new Map([
  ['Optional Memorial', 'optional_memorial'],
  ['Memorial', 'memorial'],
  ['Feast', 'feast'],
  ['Solemnity', 'solemnity'],
]);
const PSALTER_WEEKS = new Map([
  ['I', 1],
  ['II', 2],
  ['III', 3],
  ['IV', 4],
]);
const ORDINAL_WORDS = [
  null,
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
  'Thirteenth',
  'Fourteenth',
  'Fifteenth',
  'Sixteenth',
  'Seventeenth',
  'Eighteenth',
  'Nineteenth',
  'Twentieth',
  'Twenty-First',
  'Twenty-Second',
  'Twenty-Third',
  'Twenty-Fourth',
  'Twenty-Fifth',
  'Twenty-Sixth',
  'Twenty-Seventh',
  'Twenty-Eighth',
  'Twenty-Ninth',
  'Thirtieth',
  'Thirty-First',
  'Thirty-Second',
  'Thirty-Third',
  'Thirty-Fourth',
];

async function downloadFile(url, destination) {
  mkdirSync(dirname(destination), { recursive: true });

  await new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          downloadFile(response.headers.location, destination).then(resolve, reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Download failed with HTTP ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          writeFileSync(destination, Buffer.concat(chunks));
          resolve();
        });
      })
      .on('error', reject);
  });
}

function ensureTextExtraction() {
  mkdirSync(dirname(PDF_PATH), { recursive: true });
  execFileSync('pdftotext', ['-layout', PDF_PATH, TEXT_PATH], { stdio: 'inherit' });
}

function normalizeSpaces(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeAscii(value) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function computedWeekday(date) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay();
}

function computedWeekdayName(date) {
  return WEEKDAY_NAMES[computedWeekday(date)];
}

function detectMonth(line) {
  const normalized = normalizeSpaces(line).replace(/\f/g, '');
  const match = normalized.match(/^([A-Z]+)(?:[-–][A-Z]+)?\s+(\d{4})$/);
  if (!match || !MONTHS.has(match[1])) {
    return null;
  }

  return { monthIndex: MONTHS.get(match[1]), year: Number(match[2]) };
}

function parseDayHeader(line, currentMonth) {
  if (!currentMonth) {
    return null;
  }

  const normalized = normalizeSpaces(line.replace(/\f/g, ''));
  const match = normalized.match(
    new RegExp(
      `^(\\d{1,2})\\s+(SUN|Mon|Tue|Wed|Thu|Fri|Sat)\\s+(.+?)\\s+((?:${COLOR_PATTERN})(?:(?:\\s+or\\s+|\\/)(?:${COLOR_PATTERN}))*)$`,
      'i',
    ),
  );

  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const date = new Date(Date.UTC(currentMonth.year, currentMonth.monthIndex, day));

  return {
    day,
    date: date.toISOString().slice(0, 10),
    weekday: match[2],
    firstTitle: normalizeSpaces(match[3]),
    rawColor: normalizeSpaces(match[4].toLowerCase()),
    rawLine: normalized,
  };
}

function isPageNoise(line) {
  const trimmed = normalizeSpaces(line.replace(/\f/g, ''));
  return !trimmed || /^\d+$/.test(trimmed);
}

function isProvinceHeader(line) {
  return /Ecclesiastical Provinces:$/.test(normalizeSpaces(line));
}

function isCalendarAppendix(line) {
  return /APPENDIX|APÉNDICE/.test(line);
}

function isCalendarNarrative(line) {
  const trimmed = normalizeSpaces(line);
  return (
    isProvinceHeader(trimmed) ||
    /^Citations indicating\b/.test(trimmed) ||
    /^designated by\b/.test(trimmed) ||
    /^Optional Memorials are indicated\b/.test(trimmed) ||
    /^The following readings may be used\b/.test(trimmed) ||
    /^Woman is not read\b/.test(trimmed) ||
    /^is not read\b/.test(trimmed) ||
    /^For the (Vigil|Extended Vigil):/.test(trimmed) ||
    /^Morning:/.test(trimmed)
  );
}

function canAttachToCurrentBlock(line) {
  const trimmed = normalizeSpaces(line);
  if (!trimmed || isPageNoise(trimmed) || detectMonth(trimmed) || isProvinceHeader(trimmed)) {
    return false;
  }

  return true;
}

function extractRawDayBlocks(text) {
  const blocks = [];
  const lines = text.split(/\r?\n/);
  let currentMonth = null;
  let lastDayNumber = null;
  let currentBlock = null;

  for (const line of lines) {
    if (isCalendarAppendix(line)) {
      break;
    }

    const month = detectMonth(line);
    if (month) {
      currentMonth = month;
      lastDayNumber = null;
      currentBlock = null;
      continue;
    }

    const header = parseDayHeader(line, currentMonth);
    if (header && WEEKDAYS.has(header.weekday)) {
      if (lastDayNumber !== null && header.day < lastDayNumber) {
        currentMonth.monthIndex += 1;
        if (currentMonth.monthIndex > 11) {
          currentMonth.monthIndex = 0;
          currentMonth.year += 1;
        }

        const rolledDate = new Date(Date.UTC(currentMonth.year, currentMonth.monthIndex, header.day));
        header.date = rolledDate.toISOString().slice(0, 10);
      }

      lastDayNumber = header.day;
      currentBlock = {
        date: header.date,
        weekday: header.weekday,
        raw_lines: [header.rawLine],
      };
      blocks.push(currentBlock);
      continue;
    }

    if (!currentBlock || !canAttachToCurrentBlock(line)) {
      continue;
    }

    const trimmed = normalizeSpaces(line);
    if (isCalendarNarrative(trimmed)) {
      continue;
    }

    currentBlock.raw_lines.push(trimmed);
  }

  return blocks.filter((block) => block.date >= START_DATE && block.date <= END_DATE);
}

function splitColors(rawColor) {
  return rawColor
    .split(/\//)
    .map((color) => color.trim())
    .filter(Boolean);
}

function splitAlternativeColors(rawColor) {
  return rawColor
    .split(/\s+or\s+/)
    .map((color) => color.trim())
    .filter(Boolean);
}

function rankFromLine(line) {
  const match = normalizeSpaces(line).match(/^(Optional Memorial|Memorial|Feast|Solemnity)\b/);
  return match ? RANKS.get(match[1]) : null;
}

function extractRankLineText(line) {
  const match = normalizeSpaces(line).match(/^(Optional Memorial|Memorial|Feast|Solemnity)\b/);
  return match ? match[1] : null;
}

function stripUsaPrefix(title) {
  return title.replace(/^USA:\s*/, '').trim();
}

function cleanTitle(title) {
  return stripUsaPrefix(title)
    .replace(/\s*\[[^\]]+\]/g, '')
    .replace(/\s*\(Patronal Feastday of the United States of America\)/g, '')
    .replace(/\s*\((?:First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth|Twenty-first|Twenty-second|Twenty-third|Twenty-fourth|Twenty-fifth|Twenty-sixth|Twenty-seventh|Twenty-eighth|Twenty-ninth|Thirtieth|Thirty-first|Thirty-second|Thirty-third|Thirty-fourth) Week in Ordinary Time\)/gi, '')
    .replace(/([A-Za-z)])\d+\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalCelebrationId(title) {
  let value = cleanTitle(title)
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/^THE\s+/i, '')
    .replace(/^The\s+/i, '')
    .replace(/^Saint\s+([^,]+),.+$/i, 'Saint $1')
    .replace(/^St\.\s+/i, 'Saint ')
    .replace(/\bSaints\b/gi, 'sts')
    .replace(/\bSaint\b/gi, 'st');

  value = normalizeAscii(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  if (!value) {
    throw new Error(`Unable to create celebration id for title: ${title}`);
  }

  return value;
}

function parseHeaderParts(line) {
  const match = normalizeSpaces(line).match(
    new RegExp(
      `^\\d{1,2}\\s+(SUN|Mon|Tue|Wed|Thu|Fri|Sat)\\s+(.+?)\\s+((?:${COLOR_PATTERN})(?:(?:\\s+or\\s+|\\/)(?:${COLOR_PATTERN}))*)$`,
      'i',
    ),
  );

  if (!match) {
    throw new Error(`Unable to parse day header: ${line}`);
  }

  const rawColor = normalizeSpaces(match[3].toLowerCase());
  const alternativeColors = rawColor.includes(' or ') ? splitAlternativeColors(rawColor) : [];
  const usesColorAlternatives = alternativeColors.length > 1;
  const colors = usesColorAlternatives ? [alternativeColors[0]] : splitColors(rawColor);
  const colorNotes = [];
  if (usesColorAlternatives) {
    const alternatives = alternativeColors.slice(1).map((color) => `${color[0].toUpperCase()}${color.slice(1)}`);
    colorNotes.push(`${alternatives.join(' or ')} may be used.`);
  }

  return {
    weekday: match[1],
    title: normalizeSpaces(match[2]),
    colors,
    rawColor,
    parserNotes: colorNotes,
  };
}

function extractBracketedCelebrations(line) {
  const match = normalizeSpaces(line).match(/^\[(.+)\]\d*$/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(/;\s*/)
    .map((rawTitle) => ({
      title: cleanTitle(rawTitle),
      raw_option_text: `[${normalizeSpaces(rawTitle)}]`,
    }))
    .filter((celebration) => celebration.title);
}

function collectBracketedLines(lines, startIndex) {
  const collected = [lines[startIndex]];
  let index = startIndex;

  while (!/\]\d*$/.test(normalizeSpaces(collected.join(' '))) && index + 1 < lines.length) {
    index += 1;
    collected.push(lines[index]);
  }

  return {
    line: normalizeSpaces(collected.join(' ')),
    nextIndex: index,
  };
}

function extractPsalterNote(line) {
  const match = normalizeSpaces(line).match(/\bPss\s+(Prop|I|II|III|IV)\d*\b/);
  return match ? `Pss ${match[1]}` : null;
}

function stripPsalterNote(line) {
  return normalizeSpaces(line).replace(/\s*Pss\s+(Prop|I|II|III|IV)\d*\b/g, '').trim();
}

function isLectionaryLine(line) {
  const trimmed = normalizeSpaces(line);
  return (
    /^Pss\s+(Prop|I|II|III|IV)$/.test(trimmed) ||
    /^(Chrism Mass|Evening Mass|Easter Vigil|Vigil|Day):/.test(trimmed) ||
    /^(If necessary|Nine readings|demand in individual cases|both from the Law|about the escape|Although not given|celebrated as Solemnities)\b/.test(trimmed) ||
    /^When the Ascension of the Lord is celebrated\b/.test(trimmed) ||
    /^Seventh Sunday of Easter\b/.test(trimmed) ||
    /^Ecclesiastical Provinces of\b/.test(trimmed) ||
    /^[1-3]?\s?[A-Z][a-z]{1,4}\s+\d/.test(trimmed) ||
    /\(\d+[A-Z]?(?:-\d+[A-Z]?)?\b[^)]*\)/.test(trimmed) ||
    /Lectionary for Mass Supplement/.test(trimmed) ||
    /^or,/.test(trimmed) ||
    /^or any readings/.test(trimmed) ||
    /^or the Mass/.test(trimmed)
  );
}

function isHolyDayLine(line) {
  return /\[Holyday of Obligation\]/.test(line);
}

function obligationStatus(rank, isHolyDayOfObligation) {
  if (isHolyDayOfObligation) {
    return 'holy_day';
  }

  return rank === 'sunday' ? 'sunday' : 'none';
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

function seasonWeekFromText(text) {
  const match = text.match(
    /\b(First|Second|Third|Fourth|Fifth|Sixth|Seventh|Eighth|Ninth|Tenth|Eleventh|Twelfth|Thirteenth|Fourteenth|Fifteenth|Sixteenth|Seventeenth|Eighteenth|Nineteenth|Twentieth|Twenty-first|Twenty-second|Twenty-third|Twenty-fourth|Twenty-fifth|Twenty-sixth|Twenty-seventh|Twenty-eighth|Twenty-ninth|Thirtieth|Thirty-first|Thirty-second|Thirty-third|Thirty-fourth)\s+(?:Sunday|Week)\b/i,
  );
  return match ? ordinalWordToNumber(match[1]) : null;
}

function seasonWeek(day) {
  const explicitWeek = seasonWeekFromText(`${day.principal.title} ${day.raw_source_text}`);
  if (explicitWeek) {
    return explicitWeek;
  }

  return seasonWeekForDate(day.date, day.season);
}

function dateDiffDays(date, startDate) {
  const current = new Date(`${date}T00:00:00.000Z`);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  return Math.floor((current - start) / 86_400_000);
}

function weekFromStart(date, startDate, startWeek = 1) {
  if (date < startDate) {
    return null;
  }

  return startWeek + Math.floor(dateDiffDays(date, startDate) / 7);
}

function seasonWeekForDate(date, season) {
  if (season === 'advent') {
    if (date >= '2025-11-30' && date <= '2025-12-24') return Math.min(weekFromStart(date, '2025-11-30'), 4);
    if (date >= '2026-11-29' && date <= '2026-12-24') return Math.min(weekFromStart(date, '2026-11-29'), 4);
  }

  if (season === 'ordinary_time') {
    if (date >= '2026-01-12' && date <= '2026-02-17') return weekFromStart(date, '2026-01-12', 1);
    if (date >= '2026-05-25' && date <= '2026-11-28') return weekFromStart(date, '2026-05-25', 8);
  }

  if (season === 'lent') {
    if (date >= '2026-02-22' && date <= '2026-04-01') return weekFromStart(date, '2026-02-22', 1);
  }

  if (season === 'easter') {
    if (date >= '2026-04-05' && date <= '2026-05-24') return weekFromStart(date, '2026-04-05', 1);
  }

  return null;
}

function ordinalWordToNumber(word) {
  const values = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    eleventh: 11,
    twelfth: 12,
    thirteenth: 13,
    fourteenth: 14,
    fifteenth: 15,
    sixteenth: 16,
    seventeenth: 17,
    eighteenth: 18,
    nineteenth: 19,
    twentieth: 20,
    'twenty-first': 21,
    'twenty-second': 22,
    'twenty-third': 23,
    'twenty-fourth': 24,
    'twenty-fifth': 25,
    'twenty-sixth': 26,
    'twenty-seventh': 27,
    'twenty-eighth': 28,
    'twenty-ninth': 29,
    thirtieth: 30,
    'thirty-first': 31,
    'thirty-second': 32,
    'thirty-third': 33,
    'thirty-fourth': 34,
  };

  return values[word.toLowerCase()] ?? null;
}

function psalterWeek(psalterNote) {
  if (!psalterNote) {
    return null;
  }

  const match = psalterNote.match(/^Pss\s+(I|II|III|IV)$/);
  return match ? PSALTER_WEEKS.get(match[1]) : null;
}

function weekdaySeasonPhrase(season) {
  const names = {
    advent: 'of Advent',
    christmas: 'of Christmas',
    ordinary_time: 'in Ordinary Time',
    lent: 'of Lent',
    triduum: 'of the Sacred Paschal Triduum',
    easter: 'of Easter',
  };

  return names[season] ?? season;
}

function weekdayDisplayTitle(day) {
  if (day.principal.rank !== 'weekday') {
    return day.principal.display_title;
  }

  if (!['Weekday', 'Advent Weekday', 'Lenten Weekday', 'Christmas Weekday', 'Easter Weekday'].includes(day.principal.title)) {
    return day.principal.display_title;
  }

  if (!day.season_week || !ORDINAL_WORDS[day.season_week]) {
    return day.principal.display_title;
  }

  return `${day.weekday_name} of the ${ORDINAL_WORDS[day.season_week]} Week ${weekdaySeasonPhrase(day.season)}`;
}

function normalizeBlock(block, parserWarnings = []) {
  const header = parseHeaderParts(block.raw_lines[0]);
  const rawSourceText = block.raw_lines.join('\n');
  const optionalCelebrationSources = [];
  const lectionaryNotes = [];
  const principalTitleParts = [header.title];
  let rank = header.weekday === 'SUN' ? 'sunday' : 'weekday';
  let psalterNote = null;
  let isHolyDayOfObligation = false;

  const remainingLines = block.raw_lines.slice(1);
  for (let index = 0; index < remainingLines.length; index += 1) {
    let line = remainingLines[index];
    const rankValue = rankFromLine(line);
    if (rankValue) {
      rank = rankValue;
      if (isHolyDayLine(line)) {
        isHolyDayOfObligation = true;
      }
      continue;
    }

    if (isHolyDayLine(line)) {
      isHolyDayOfObligation = true;
      continue;
    }

    if (normalizeSpaces(line).startsWith('[') && !normalizeSpaces(line).endsWith(']')) {
      const bracketed = collectBracketedLines(remainingLines, index);
      line = bracketed.line;
      index = bracketed.nextIndex;
    }

    const bracketedCelebrations = extractBracketedCelebrations(line);
    if (bracketedCelebrations.length > 0) {
      optionalCelebrationSources.push(...bracketedCelebrations);
      continue;
    }

    const foundPsalterNote = extractPsalterNote(line);
    if (foundPsalterNote) {
      psalterNote = foundPsalterNote;
    }

    if (isLectionaryLine(line)) {
      const lectionaryNote = stripPsalterNote(line);
      if (lectionaryNote) {
        lectionaryNotes.push(lectionaryNote);
      }
      continue;
    }

    if (/^\(.+Week in Ordinary Time\)$/.test(line)) {
      continue;
    }

    principalTitleParts.push(line);
  }

  const principalColor = header.colors[0] ?? null;
  const optionalColors = header.colors.slice(1);
  const optionalCelebrations = optionalCelebrationSources.map((celebration, index) => ({
    celebration_id: canonicalCelebrationId(celebration.title),
    title: celebration.title,
    rank: 'optional_memorial',
    color: optionalColors[index] ?? null,
    raw_option_text: celebration.raw_option_text,
  }));
  const representedCelebrationCount = 1 + optionalCelebrations.length;
  if (header.rawColor.includes('/') && header.colors.length !== representedCelebrationCount) {
    parserWarnings.push({
      date: block.date,
      type: 'color_celebration_count_mismatch',
      message: `Found ${header.colors.length} slash-delimited color(s) for ${representedCelebrationCount} celebration(s).`,
      colors: header.colors,
      optional_celebrations: optionalCelebrations.map((celebration) => celebration.title),
      raw_color: header.rawColor,
    });
  }
  const extraOptionalColors = optionalColors.slice(optionalCelebrationSources.length);
  if (extraOptionalColors.length > 0) {
    parserWarnings.push({
      date: block.date,
      type: 'extra_optional_colors',
      message: `Found ${extraOptionalColors.length} optional color(s) without matching optional celebration(s).`,
      colors: extraOptionalColors,
      raw_color: header.rawColor,
    });
  }

  const title = cleanTitle(principalTitleParts.join(' '));
  const weekday = computedWeekday(block.date);

  const normalized = {
    date: block.date,
    weekday,
    weekday_name: WEEKDAY_NAMES[weekday],
    raw_weekday: block.weekday,
    principal: {
      celebration_id: canonicalCelebrationId(title),
      title,
      display_title: title,
      rank,
      color: principalColor,
    },
    optional_celebrations: optionalCelebrations,
    season: seasonForDate(block.date),
    season_week: null,
    psalter_week: psalterWeek(psalterNote),
    country_scope: /^USA:/.test(header.title) ? 'US' : 'US',
    obligation_status: obligationStatus(rank, isHolyDayOfObligation),
    lectionary_notes: lectionaryNotes,
    parser_notes: header.parserNotes,
    psalter_note: psalterNote,
    raw_color: header.rawColor,
    raw_source_text: rawSourceText,
  };

  normalized.season_week = seasonWeek(normalized);
  normalized.principal.display_title = weekdayDisplayTitle(normalized);
  return normalized;
}

function normalizeDays(rawBlocks) {
  const byDate = new Map();
  const parserWarnings = [];

  for (const block of rawBlocks) {
    const normalized = normalizeBlock(block, parserWarnings);
    byDate.set(normalized.date, normalized);
  }

  return {
    days: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
    parserWarnings,
  };
}

function datesBetween(start, end) {
  const dates = [];
  const current = new Date(`${start}T00:00:00.000Z`);
  const final = new Date(`${end}T00:00:00.000Z`);

  while (current <= final) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateNormalizedDays(days) {
  const errors = [];
  const expectedDates = datesBetween(START_DATE, END_DATE);
  const counts = new Map();

  for (const day of days) {
    counts.set(day.date, (counts.get(day.date) ?? 0) + 1);
  }

  for (const date of expectedDates) {
    if (!counts.has(date)) {
      errors.push(`Missing normalized date ${date}`);
    } else if (counts.get(date) !== 1) {
      errors.push(`Duplicate normalized date ${date}`);
    }
  }

  const suspiciousTitleFragments = [
    'USA:',
    '[',
    ']',
    'Pss',
    'or any readings',
    'or, for the Optional Memorial',
    '(707-712)',
  ];
  for (const day of days) {
    const title = day.principal.title;
    const displayTitle = day.principal.display_title;
    const expectedWeekday = computedWeekday(day.date);
    const expectedWeekdayName = WEEKDAY_NAMES[expectedWeekday];
    const rawWeekdayIndex = RAW_WEEKDAY_TO_INDEX.get(day.raw_weekday);

    if (!title) errors.push(`${day.date} has no principal title`);
    if (!day.principal.rank) errors.push(`${day.date} has no principal rank`);
    if (!day.principal.color) errors.push(`${day.date} has no principal color`);
    if (!day.raw_source_text) errors.push(`${day.date} has no raw_source_text`);
    if (day.weekday !== expectedWeekday) {
      errors.push(`${day.date} weekday expected ${expectedWeekday}, got ${day.weekday}`);
    }
    if (day.weekday_name !== expectedWeekdayName) {
      errors.push(`${day.date} weekday_name expected ${expectedWeekdayName}, got ${day.weekday_name}`);
    }
    if (!day.principal.celebration_id) {
      errors.push(`${day.date} principal celebration has no stable identifier`);
    }
    if (!CANONICAL_RANKS.has(day.principal.rank)) {
      errors.push(`${day.date} principal has non-canonical rank: ${day.principal.rank}`);
    }
    if (!COLORS.includes(day.principal.color)) {
      errors.push(`${day.date} principal has invalid color: ${day.principal.color}`);
    }
    if (!OBLIGATION_STATUSES.has(day.obligation_status)) {
      errors.push(`${day.date} has invalid obligation_status: ${day.obligation_status}`);
    }
    if (day.parser_notes.some((note) => /[\[\]]/.test(note))) {
      errors.push(`${day.date} parser_notes contain bracket artifacts: ${day.parser_notes.join(' ')}`);
    }
    if (rawWeekdayIndex === undefined) {
      errors.push(`${day.date} has unknown raw_weekday: ${day.raw_weekday}`);
    } else if (rawWeekdayIndex !== expectedWeekday) {
      errors.push(
        `Weekday mismatch:\nDate: ${day.date}\nComputed: ${expectedWeekdayName}\nPDF: ${day.raw_weekday}`,
      );
    }
    if (/[\/]|\bor\b/.test(day.principal.color ?? '')) {
      errors.push(`${day.date} has compound normalized principal color: ${day.principal.color}`);
    }

    for (const fragment of suspiciousTitleFragments) {
      if (title.includes(fragment) || displayTitle.includes(fragment)) {
        errors.push(`${day.date} title contains suspicious fragment ${fragment}: ${title}`);
      }
    }

    for (const celebration of day.optional_celebrations) {
      if (!celebration.celebration_id) {
        errors.push(`${day.date} optional celebration has no stable identifier: ${celebration.title}`);
      }
      if (!CANONICAL_RANKS.has(celebration.rank)) {
        errors.push(`${day.date} optional celebration has non-canonical rank: ${celebration.rank}`);
      }
      if (celebration.color !== null && !COLORS.includes(celebration.color)) {
        errors.push(`${day.date} optional celebration has invalid color: ${celebration.color}`);
      }
      if (!celebration.raw_option_text) {
        errors.push(`${day.date} optional celebration has no raw_option_text: ${celebration.title}`);
      }
      if (/[\[\]]|;/.test(celebration.title)) {
        errors.push(`${day.date} optional celebration title is polluted: ${celebration.title}`);
      }
      if (celebration.color && (celebration.color.includes('/') || /\bor\b/.test(celebration.color))) {
        errors.push(`${day.date} optional celebration has compound color: ${celebration.color}`);
      }
    }
  }

  const byDate = new Map(days.map((day) => [day.date, day]));
  const immaculate = byDate.get('2026-12-08');
  assertSpotCheck(errors, immaculate, '2026-12-08', {
    title: 'THE IMMACULATE CONCEPTION OF THE BLESSED VIRGIN MARY',
    rank: 'solemnity',
    color: 'white',
    obligationStatus: 'holy_day',
  });

  const juanDiego = byDate.get('2026-12-09');
  assertSpotCheck(errors, juanDiego, '2026-12-09', {
    title: 'Advent Weekday',
    color: 'violet',
    optionalTitle: 'Saint Juan Diego Cuauhtlatoatzin',
    optionalColor: 'white',
  });

  const damascene = byDate.get('2025-12-04');
  assertSpotCheck(errors, damascene, '2025-12-04', {
    title: 'Advent Weekday',
    color: 'violet',
    optionalTitle: 'Saint John Damascene, Priest and Doctor of the Church',
    optionalColor: 'white',
  });

  const hilary = byDate.get('2026-01-13');
  assertSpotCheck(errors, hilary, '2026-01-13', {
    title: 'Weekday',
    color: 'green',
    optionalTitle: 'Saint Hilary, Bishop and Doctor of the Church',
    optionalColor: 'white',
  });

  const mariaGoretti = byDate.get('2026-07-06');
  assertSpotCheck(errors, mariaGoretti, '2026-07-06', {
    title: 'Weekday',
    rank: 'weekday',
    color: 'green',
    optionalTitle: 'Saint Maria Goretti, Virgin and Martyr',
    optionalColor: 'red',
  });

  const guadalupe = byDate.get('2026-12-12');
  assertSpotCheck(errors, guadalupe, '2026-12-12', {
    title: 'Our Lady of Guadalupe',
    rank: 'feast',
    color: 'white',
  });

  const june13 = byDate.get('2026-06-13');
  for (const optionalTitle of [
    'The Immaculate Heart of the Blessed Virgin Mary',
    'Saint Anthony of Padua, Priest and Doctor of the Church',
    'BVM',
  ]) {
    if (!june13?.optional_celebrations.some((celebration) => celebration.title === optionalTitle)) {
      errors.push(`2026-06-13 is missing optional celebration ${optionalTitle}`);
    }
  }
  if (!june13?.lectionary_notes.some((note) => note.startsWith('or, for the Optional Memorial of the Immaculate Heart'))) {
    errors.push('2026-06-13 is missing the optional memorial lectionary note');
  }

  const adventOne = byDate.get('2025-11-30');
  if (adventOne?.psalter_week !== 1) {
    errors.push(`2025-11-30 psalter week expected 1, got ${adventOne?.psalter_week}`);
  }
  if (adventOne?.season_week !== 1) {
    errors.push(`2025-11-30 season week expected 1, got ${adventOne?.season_week}`);
  }

  assertSpotCheck(errors, byDate.get('2026-04-06'), '2026-04-06', {
    title: 'Monday within the Octave of Easter',
    rank: 'weekday',
    color: 'white',
  });

  assertSpotCheck(errors, byDate.get('2026-05-11'), '2026-05-11', {
    title: 'Easter Weekday',
    rank: 'weekday',
    color: 'white',
  });

  assertSpotCheck(errors, byDate.get('2026-05-13'), '2026-05-13', {
    title: 'Easter Weekday',
    rank: 'weekday',
    color: 'white',
    optionalTitle: 'Our Lady of Fatima',
    optionalColor: 'white',
  });

  assertSpotCheck(errors, byDate.get('2026-05-16'), '2026-05-16', {
    title: 'Easter Weekday',
    rank: 'weekday',
    color: 'white',
  });

  assertSpotCheck(errors, byDate.get('2026-12-27'), '2026-12-27', {
    title: 'THE HOLY FAMILY OF JESUS, MARY AND JOSEPH',
    rank: 'feast',
    color: 'white',
  });

  if (errors.length > 0) {
    throw new Error(`Calendar validation failed:\n- ${errors.join('\n- ')}`);
  }
}

function assertSpotCheck(errors, day, date, expected) {
  if (!day) {
    errors.push(`${date} is missing`);
    return;
  }

  if (expected.title && day.principal.title !== expected.title) {
    errors.push(`${date} title expected ${expected.title}, got ${day.principal.title}`);
  }

  if (expected.rank && day.principal.rank !== expected.rank) {
    errors.push(`${date} rank expected ${expected.rank}, got ${day.principal.rank}`);
  }

  if (expected.color && day.principal.color !== expected.color) {
    errors.push(`${date} color expected ${expected.color}, got ${day.principal.color}`);
  }

  if (expected.obligationStatus && day.obligation_status !== expected.obligationStatus) {
    errors.push(`${date} obligation_status expected ${expected.obligationStatus}, got ${day.obligation_status}`);
  }

  if (
    expected.optionalTitle &&
    !day.optional_celebrations.some((celebration) => celebration.title === expected.optionalTitle)
  ) {
    errors.push(`${date} optional celebrations are missing ${expected.optionalTitle}`);
  }

  if (expected.optionalColor) {
    const celebration = day.optional_celebrations.find((item) => item.title === expected.optionalTitle);
    if (celebration?.color !== expected.optionalColor) {
      errors.push(`${date} optional color expected ${expected.optionalColor}, got ${celebration?.color}`);
    }
  }
}

function validateParserWarnings(parserWarnings) {
  if (parserWarnings.length > 0) {
    throw new Error(`Calendar parser emitted warnings:\n- ${parserWarnings.map((warning) => `${warning.date}: ${warning.message}`).join('\n- ')}`);
  }
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return 'null';
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlEnum(value, typeName) {
  if (value === null || value === undefined) {
    return 'null';
  }

  return `${sqlString(value)}::public.${typeName}`;
}

function sqlInt(value) {
  return value === null || value === undefined ? 'null' : String(value);
}

function valuesList(rows, columns) {
  return rows
    .map((row) => `    (${columns.map((column) => column(row)).join(', ')})`)
    .join(',\n');
}

function buildSql(rawBlocks, normalizedDays) {
  const sourceHash = createHash('sha256').update(readFileSync(PDF_PATH)).digest('hex');

  const rawRows = rawBlocks.map((block) => {
    const normalized = normalizeBlock(block, []);
    return {
      date: block.date,
      rawTitle: normalized.principal.title,
      rawRank: normalized.principal.rank,
      rawColor: normalized.raw_color,
      rawNotes: block.raw_lines.join('\n'),
      countryScope: 'US',
    };
  });

  return `-- Generated by scripts/${basename(fileURLToPath(import.meta.url))}
-- Source: ${SOURCE_URL}
-- Source SHA-256: ${sourceHash}
-- Date range: ${START_DATE} through ${END_DATE}

begin;

insert into public.calendars (
  id,
  name,
  authority,
  default_locale,
  timezone,
  notes
)
values (
  ${sqlString(CALENDAR_ID)},
  ${sqlString('United States liturgical calendar')},
  ${sqlString('United States Conference of Catholic Bishops')},
  ${sqlString('en-US')},
  ${sqlString('America/New_York')},
  ${sqlString('Generated from the USCCB 2026 Liturgical Calendar PDF.')}
)
on conflict (id) do update
  set name = excluded.name,
      authority = excluded.authority,
      default_locale = excluded.default_locale,
      timezone = excluded.timezone,
      notes = excluded.notes;

delete from public.liturgical_day_options
where calendar_id = ${sqlString(CALENDAR_ID)}
  and date between ${sqlString(START_DATE)}::date and ${sqlString(END_DATE)}::date;

delete from public.liturgical_days
where calendar_id = ${sqlString(CALENDAR_ID)}
  and date between ${sqlString(START_DATE)}::date and ${sqlString(END_DATE)}::date;

delete from public.raw_calendar_rows
where calendar_id = ${sqlString(CALENDAR_ID)}
  and source_id in (
    select id
    from public.calendar_sources
    where calendar_id = ${sqlString(CALENDAR_ID)}
      and year = ${YEAR}
      and url = ${sqlString(SOURCE_URL)}
  );

delete from public.calendar_sources
where calendar_id = ${sqlString(CALENDAR_ID)}
  and year = ${YEAR}
  and url = ${sqlString(SOURCE_URL)};

with source as (
  insert into public.calendar_sources (
    calendar_id,
    year,
    source_type,
    title,
    url,
    retrieved_at,
    notes
  )
  values (
    ${sqlString(CALENDAR_ID)},
    ${YEAR},
    'pdf'::public.calendar_source_type,
    ${sqlString(SOURCE_TITLE)},
    ${sqlString(SOURCE_URL)},
    ${sqlString(SOURCE_RETRIEVED_AT)}::timestamptz,
    ${sqlString(`Generated from ${SOURCE_URL}; sha256=${sourceHash}`)}
  )
  returning id
),
raw_rows (
  date,
  raw_title,
  raw_rank,
  raw_color,
  raw_notes,
  country_scope
) as (
  values
${valuesList(rawRows, [
  (row) => `${sqlString(row.date)}::date`,
  (row) => sqlString(row.rawTitle),
  (row) => sqlString(row.rawRank),
  (row) => sqlString(row.rawColor),
  (row) => sqlString(row.rawNotes),
  (row) => sqlString(row.countryScope),
])}
)
insert into public.raw_calendar_rows (
  calendar_id,
  source_id,
  date,
  raw_title,
  raw_rank,
  raw_color,
  raw_notes,
  country_scope
)
select
  ${sqlString(CALENDAR_ID)},
  source.id,
  raw_rows.date,
  raw_rows.raw_title,
  raw_rows.raw_rank,
  raw_rows.raw_color,
  raw_rows.raw_notes,
  raw_rows.country_scope
from source
cross join raw_rows;

with source as (
  select id
  from public.calendar_sources
  where calendar_id = ${sqlString(CALENDAR_ID)}
    and year = ${YEAR}
    and url = ${sqlString(SOURCE_URL)}
  order by retrieved_at desc
  limit 1
),
days (
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
  parser_notes
) as (
  values
${valuesList(normalizedDays, [
  (day) => `${sqlString(day.date)}::date`,
  (day) => sqlInt(day.weekday),
  (day) => sqlString(day.weekday_name),
  (day) => sqlString(day.principal.celebration_id),
  (day) => sqlString(day.principal.title),
  (day) => sqlString(day.principal.display_title),
  (day) => sqlEnum(day.season, 'liturgical_season'),
  (day) => sqlInt(day.season_week),
  (day) => sqlInt(day.psalter_week),
  (day) => sqlEnum(day.principal.rank, 'liturgical_rank'),
  (day) => sqlEnum(day.principal.color, 'liturgical_color'),
  (day) => sqlEnum(day.country_scope, 'country_scope'),
  (day) => sqlEnum(day.obligation_status, 'obligation_status'),
  (day) => sqlString(day.raw_source_text),
  (day) => sqlString(dayParserNotes(day)),
])}
)
insert into public.liturgical_days (
  calendar_id,
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
  source_id,
  raw_source_text,
  parser_notes
)
select
  ${sqlString(CALENDAR_ID)},
  days.date,
  days.weekday,
  days.weekday_name,
  days.celebration_id,
  days.title,
  days.display_title,
  days.season,
  days.season_week,
  days.psalter_week,
  days.rank,
  days.color,
  days.country_scope,
  days.obligation_status,
  source.id,
  days.raw_source_text,
  days.parser_notes
from days
cross join source
on conflict (calendar_id, date) do update
  set weekday = excluded.weekday,
      weekday_name = excluded.weekday_name,
      celebration_id = excluded.celebration_id,
      title = excluded.title,
      display_title = excluded.display_title,
      season = excluded.season,
      season_week = excluded.season_week,
      psalter_week = excluded.psalter_week,
      rank = excluded.rank,
      color = excluded.color,
      country_scope = excluded.country_scope,
      obligation_status = excluded.obligation_status,
      source_id = excluded.source_id,
      raw_source_text = excluded.raw_source_text,
      parser_notes = excluded.parser_notes;

with source as (
  select id
  from public.calendar_sources
  where calendar_id = ${sqlString(CALENDAR_ID)}
    and year = ${YEAR}
    and url = ${sqlString(SOURCE_URL)}
  order by retrieved_at desc
  limit 1
),
options (
  date,
  celebration_id,
  title,
  rank,
  color,
  country_scope,
  raw_source_text,
  raw_option_text,
  parser_notes
) as (
  values
${valuesList(
  normalizedDays.flatMap((day) =>
    day.optional_celebrations.map((celebration) => ({
      date: day.date,
      celebrationId: celebration.celebration_id,
      title: celebration.title,
      rank: celebration.rank,
      color: celebration.color,
      countryScope: day.country_scope,
      rawSourceText: day.raw_source_text,
      rawOptionText: celebration.raw_option_text,
      parserNotes: day.parser_notes.length > 0 ? day.parser_notes.join(' ') : null,
    })),
  ),
  [
    (option) => `${sqlString(option.date)}::date`,
    (option) => sqlString(option.celebrationId),
    (option) => sqlString(option.title),
    (option) => sqlEnum(option.rank, 'liturgical_rank'),
    (option) => sqlEnum(option.color, 'liturgical_color'),
    (option) => sqlEnum(option.countryScope, 'country_scope'),
    (option) => sqlString(option.rawSourceText),
    (option) => sqlString(option.rawOptionText),
    (option) => sqlString(option.parserNotes),
  ],
)}
)
insert into public.liturgical_day_options (
  calendar_id,
  date,
  celebration_id,
  title,
  rank,
  color,
  country_scope,
  source_id,
  raw_source_text,
  raw_option_text,
  parser_notes
)
select
  ${sqlString(CALENDAR_ID)},
  options.date,
  options.celebration_id,
  options.title,
  options.rank,
  options.color,
  options.country_scope,
  source.id,
  options.raw_source_text,
  options.raw_option_text,
  options.parser_notes
from options
cross join source
on conflict (calendar_id, date, celebration_id) do update
  set title = excluded.title,
      rank = excluded.rank,
      color = excluded.color,
      country_scope = excluded.country_scope,
      source_id = excluded.source_id,
      raw_source_text = excluded.raw_source_text,
      raw_option_text = excluded.raw_option_text,
      parser_notes = excluded.parser_notes;

commit;
`;
}

function dayParserNotes(day) {
  return day.parser_notes.length > 0 ? day.parser_notes.join(' ') : null;
}

if (!existsSync(PDF_PATH)) {
  console.log(`Downloading ${SOURCE_URL}`);
  await downloadFile(SOURCE_URL, PDF_PATH);
}

ensureTextExtraction();

const text = readFileSync(TEXT_PATH, 'utf8');
const rawBlocks = extractRawDayBlocks(text);
const { days: normalizedDays, parserWarnings } = normalizeDays(rawBlocks);

validateNormalizedDays(normalizedDays);
validateParserWarnings(parserWarnings);

writeJson(RAW_BLOCKS_PATH, rawBlocks);
writeJson(NORMALIZED_DAYS_PATH, normalizedDays);
writeJson(PARSER_WARNINGS_PATH, parserWarnings);
mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, buildSql(rawBlocks, normalizedDays));

console.log(`Wrote ${rawBlocks.length} raw day blocks to ${RAW_BLOCKS_PATH}`);
console.log(`Wrote ${normalizedDays.length} normalized days to ${NORMALIZED_DAYS_PATH}`);
console.log(`Wrote ${parserWarnings.length} parser warnings to ${PARSER_WARNINGS_PATH}`);
console.log(`Wrote SQL seed to ${OUTPUT_PATH}`);
