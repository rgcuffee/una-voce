import { createHash, createHmac, randomBytes } from 'node:crypto';

export const DEVOTION_SLUG = 'holy-spirit-mens-ministry';
export const DEVOTION_PATH = `/devotions/${DEVOTION_SLUG}/night-prayer`;
export const REPORT_OUTCOMES = new Set([
  'prayed',
  'started_not_finished',
  'not_tonight',
]);

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PARTICIPANT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function generateParticipantToken() {
  return randomBytes(32).toString('base64url');
}

export function deriveParticipantToken(participantId, secret) {
  if (!PARTICIPANT_ID_PATTERN.test(participantId ?? '')) {
    throw new Error('Invalid participant ID');
  }
  if (typeof secret !== 'string' || !secret) {
    throw new Error('Participant link secret is not configured');
  }

  return createHmac('sha256', secret)
    .update(`una-voce:devotion-participant:${participantId}`, 'utf8')
    .digest('base64url');
}

export function isParticipantToken(value) {
  return typeof value === 'string' && TOKEN_PATTERN.test(value);
}

export function hashParticipantToken(token) {
  if (!isParticipantToken(token)) {
    throw new Error('Invalid participant token');
  }

  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export function participantLink(token, siteUrl = 'https://unavoce.net') {
  const base = new URL(siteUrl);
  base.pathname = DEVOTION_PATH;
  base.search = '';
  base.hash = '';
  base.searchParams.set('p', token);
  return base.toString();
}

export function resolvePilotDay(devotion, now = new Date()) {
  const durationDays = Number(devotion?.duration_days ?? 7);

  if (
    devotion?.status !== 'active' ||
    !DATE_PATTERN.test(devotion?.start_date ?? '') ||
    typeof devotion?.timezone !== 'string' ||
    !devotion.timezone.trim() ||
    !Number.isInteger(durationDays) ||
    durationDays < 1
  ) {
    return {
      phase: 'inactive',
      pilotDay: null,
      prayerDate: null,
    };
  }

  const prayerDate = prayerDateAt(now, devotion.timezone);
  const pilotDay = civilDayDifference(devotion.start_date, prayerDate) + 1;

  if (pilotDay < 1) {
    return { phase: 'not_started', pilotDay: null, prayerDate };
  }

  if (pilotDay > durationDays) {
    return { phase: 'completed', pilotDay: null, prayerDate };
  }

  return { phase: 'active', pilotDay, prayerDate };
}

export function prayerDateAt(now, timeZone) {
  const instant = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(instant.getTime())) {
    throw new Error('Invalid current time');
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(instant)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  const localDate = `${parts.year}-${parts.month}-${parts.day}`;

  return Number(parts.hour) < 4 ? shiftCivilDate(localDate, -1) : localDate;
}

export function shiftCivilDate(date, days) {
  if (!DATE_PATTERN.test(date)) {
    throw new Error('Invalid civil date');
  }

  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12));
  return shifted.toISOString().slice(0, 10);
}

export function safeParticipantId(id) {
  return typeof id === 'string' ? id.slice(0, 8) : '';
}

function civilDayDifference(start, end) {
  const startMs = Date.parse(`${start}T12:00:00Z`);
  const endMs = Date.parse(`${end}T12:00:00Z`);
  return Math.round((endMs - startMs) / 86_400_000);
}
