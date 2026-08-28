import assert from 'node:assert/strict';
import test from 'node:test';

import {
  localClockMinutes,
  prayerSegmentForMinutes,
  suggestedPrayerSegment,
} from './prayerHourSuggestion.mjs';

const minutes = (hour, minute) => hour * 60 + minute;

test('local prayer Hour changes at the links.unavoce.net boundaries', () => {
  const checks = [
    [4, 59, 'segment-night'],
    [5, 0, 'segment-morning'],
    [10, 59, 'segment-morning'],
    [11, 0, 'segment-midday'],
    [15, 59, 'segment-midday'],
    [16, 0, 'segment-evening'],
    [19, 59, 'segment-evening'],
    [20, 0, 'segment-night'],
  ];

  for (const [hour, minute, expected] of checks) {
    assert.equal(
      prayerSegmentForMinutes(minutes(hour, minute)),
      expected,
      `${hour}:${String(minute).padStart(2, '0')}`,
    );
  }
});

test('every minute of the local day maps to one supported prayer segment', () => {
  const supported = new Set([
    'segment-morning',
    'segment-midday',
    'segment-evening',
    'segment-night',
  ]);

  for (let minute = 0; minute < 24 * 60; minute += 1) {
    assert.ok(supported.has(prayerSegmentForMinutes(minute)));
  }
});

test('suggestion respects the visitor IANA timezone', () => {
  const cases = [
    ['America/Los_Angeles', '2026-08-23T12:00:00Z', 5 * 60, 'segment-morning'],
    ['America/New_York', '2026-08-23T16:00:00Z', 12 * 60, 'segment-midday'],
    ['Europe/London', '2026-08-23T17:00:00Z', 18 * 60, 'segment-evening'],
    ['Asia/Tokyo', '2026-08-23T13:00:00Z', 22 * 60, 'segment-night'],
  ];

  for (const [timeZone, iso, expectedMinutes, expectedSegment] of cases) {
    const now = new Date(iso);
    assert.equal(localClockMinutes(now, timeZone), expectedMinutes, timeZone);
    assert.equal(suggestedPrayerSegment(now, timeZone), expectedSegment, timeZone);
  }
});

test('DST transitions retain the correct local Night Prayer suggestion', () => {
  const instants = [
    '2026-03-08T09:59:00Z',
    '2026-03-08T10:00:00Z',
    '2026-11-01T08:30:00Z',
    '2026-11-01T09:30:00Z',
  ];

  for (const instant of instants) {
    assert.equal(
      suggestedPrayerSegment(new Date(instant), 'America/Los_Angeles'),
      'segment-night',
    );
  }
});

test('invalid minute values fail closed', () => {
  for (const value of [-1, 1440, 1.5, Number.NaN]) {
    assert.throws(() => prayerSegmentForMinutes(value), /integer from 0 to 1439/);
  }
});
