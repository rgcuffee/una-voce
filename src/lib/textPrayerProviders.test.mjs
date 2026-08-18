import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatProviderDate,
  getTextPrayerProviders,
  normalizeTextPrayerHour,
  TEXT_PRAYER_HOURS,
} from './textPrayerProviders.mjs';

const expectedHours = [
  ['office_of_readings', 'readings', 'office-of-readings'],
  ['morning_prayer', 'lauds', 'morning-prayer'],
  ['midmorning_prayer', 'terce', 'midmorning-prayer'],
  ['midday_prayer', 'sext', 'midday-prayer'],
  ['midafternoon_prayer', 'none', 'midafternoon-prayer'],
  ['evening_prayer', 'vespers', 'evening-prayer'],
  ['night_prayer', 'compline', 'night-prayer'],
];

test('provider date formatting keeps a selected civil date stable', () => {
  assert.equal(formatProviderDate('2026-08-20'), '20260820');
  assert.equal(formatProviderDate(new Date(2026, 7, 20, 23, 59)), '20260820');
  assert.equal(formatProviderDate('2026-12-31'), '20261231');
  assert.equal(formatProviderDate('2027-01-01'), '20270101');
  assert.equal(formatProviderDate('2028-02-29'), '20280229');
  assert.equal(
    formatProviderDate(new Date(2028, 1, 29, 23, 59)),
    '20280229',
  );
  assert.equal(formatProviderDate('2027-02-29'), null);
  assert.equal(formatProviderDate('2026-02-30'), null);
});

test('all canonical hours have the centralized mappings', () => {
  assert.deepEqual(TEXT_PRAYER_HOURS, expectedHours.map(([hour]) => hour));

  for (const [hour, universalisSlug, divineOfficeSlug] of expectedHours) {
    assert.equal(normalizeTextPrayerHour(hour), hour);
    const [divineOffice, universalis] = getTextPrayerProviders(
      hour,
      '2026-08-20',
    );

    assert.equal(
      divineOffice.url,
      `https://divineoffice.org/today/${divineOfficeSlug}/?date=20260820`,
    );
    assert.equal(
      universalis.url,
      `https://universalis.com/USA/20260820/${universalisSlug}.htm`,
    );
  }
});

test('all 14 options preserve the provider identities and selected date', () => {
  const options = expectedHours.flatMap(([hour]) =>
    getTextPrayerProviders(hour, '2026-08-20'),
  );

  assert.equal(options.length, 14);
  assert.equal(
    options.filter((option) => option.provider === 'divine_office').length,
    7,
  );
  assert.equal(
    options.filter((option) => option.provider === 'universalis').length,
    7,
  );
  assert.ok(options.every((option) => option.url.includes('20260820')));
  assert.ok(
    options
      .filter((option) => option.provider === 'universalis')
      .every((option) => option.url.includes('/USA/')),
  );
});

test('segment and traditional-hour aliases use the same safe mappings', () => {
  assert.equal(normalizeTextPrayerHour('segment-office'), 'office_of_readings');
  assert.equal(normalizeTextPrayerHour('lauds'), 'morning_prayer');
  assert.equal(normalizeTextPrayerHour('terce'), 'midmorning_prayer');
  assert.equal(normalizeTextPrayerHour('sext'), 'midday_prayer');
  assert.equal(normalizeTextPrayerHour('none'), 'midafternoon_prayer');
  assert.equal(normalizeTextPrayerHour('vespers'), 'evening_prayer');
  assert.equal(normalizeTextPrayerHour('compline'), 'night_prayer');
});

test('invalid hour and date fail closed without creating a trusted URL', () => {
  assert.deepEqual(getTextPrayerProviders('not-an-hour', '2026-08-20'), []);
  assert.deepEqual(getTextPrayerProviders('segment-office', 'not-a-date'), []);
  assert.deepEqual(getTextPrayerProviders('segment-office', '2026-02-30'), []);
});
