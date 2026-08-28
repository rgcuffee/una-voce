const PRAYER_HOUR_WINDOWS = Object.freeze([
  Object.freeze({
    segmentId: 'segment-morning',
    startsAt: 5 * 60,
    endsAt: 11 * 60,
  }),
  Object.freeze({
    segmentId: 'segment-midday',
    startsAt: 11 * 60,
    endsAt: 16 * 60,
  }),
  Object.freeze({
    segmentId: 'segment-evening',
    startsAt: 16 * 60,
    endsAt: 20 * 60,
  }),
  Object.freeze({
    segmentId: 'segment-night',
    startsAt: 20 * 60,
    endsAt: 5 * 60,
  }),
]);

function numericPart(parts, type) {
  const value = parts.find((part) => part.type === type)?.value;
  return value === undefined ? null : Number(value);
}

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function localClockMinutes(
  now = new Date(),
  timeZone = getBrowserTimeZone(),
) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = numericPart(parts, 'hour');
  const minute = numericPart(parts, 'minute');

  if (hour === null || minute === null) {
    throw new Error(`Unable to format a local time for ${timeZone}.`);
  }

  return hour * 60 + minute;
}

export function prayerSegmentForMinutes(minutesSinceMidnight) {
  if (
    !Number.isInteger(minutesSinceMidnight) ||
    minutesSinceMidnight < 0 ||
    minutesSinceMidnight >= 24 * 60
  ) {
    throw new Error('Minutes since midnight must be an integer from 0 to 1439.');
  }

  const window = PRAYER_HOUR_WINDOWS.find(({ startsAt, endsAt }) =>
    startsAt < endsAt
      ? minutesSinceMidnight >= startsAt && minutesSinceMidnight < endsAt
      : minutesSinceMidnight >= startsAt || minutesSinceMidnight < endsAt,
  );

  if (!window) {
    throw new Error('Prayer hour configuration does not cover the full day.');
  }

  return window.segmentId;
}

export function suggestedPrayerSegment(
  now = new Date(),
  timeZone = getBrowserTimeZone(),
) {
  return prayerSegmentForMinutes(localClockMinutes(now, timeZone));
}

