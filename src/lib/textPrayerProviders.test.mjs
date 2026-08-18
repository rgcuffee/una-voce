import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  formatProviderDate,
  getTextPrayerProviders,
  normalizeTextPrayerHour,
  shiftCivilDate,
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

test('calendar navigation steps forward and backward by one local date key', () => {
  assert.equal(shiftCivilDate('2026-08-20', 1), '2026-08-21');
  assert.equal(shiftCivilDate('2026-08-20', -1), '2026-08-19');
  assert.equal(shiftCivilDate('2026-08-20', 0), '2026-08-20');
});

test('calendar navigation crosses August and September in either direction', () => {
  assert.equal(shiftCivilDate('2026-08-31', 1), '2026-09-01');
  assert.equal(shiftCivilDate('2026-09-01', -1), '2026-08-31');
});

test('calendar navigation crosses December and January in either direction', () => {
  assert.equal(shiftCivilDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftCivilDate('2027-01-01', -1), '2026-12-31');
});

test('calendar navigation is timezone independent because it operates on date keys', () => {
  const moduleUrl = new URL('./textPrayerProviders.mjs', import.meta.url).href;
  const script = `
    const module = await import(${JSON.stringify(moduleUrl)});
    process.stdout.write(JSON.stringify({
      forward: module.shiftCivilDate('2026-08-31', 1),
      backward: module.shiftCivilDate('2027-01-01', -1),
      formatted: module.formatProviderDate('2026-08-20'),
    }));
  `;

  for (const timezone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    const result = spawnSync(
      process.execPath,
      ['--input-type=module', '--eval', script],
      {
        env: { ...process.env, TZ: timezone },
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      forward: '2026-09-01',
      backward: '2026-12-31',
      formatted: '20260820',
    });
  }
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

test('provider destinations recompute for forward and backward date navigation', () => {
  const initial = getTextPrayerProviders('segment-morning', '2026-08-31');
  const forwardDate = shiftCivilDate('2026-08-31', 1);
  const backwardDate = shiftCivilDate('2026-09-01', -1);
  const forward = getTextPrayerProviders('segment-morning', forwardDate);
  const backward = getTextPrayerProviders('segment-morning', backwardDate);

  assert.equal(forwardDate, '2026-09-01');
  assert.equal(backwardDate, '2026-08-31');
  assert.notDeepEqual(forward, initial);
  assert.deepEqual(backward, initial);
  assert.ok(forward.every((option) => option.url.includes('20260901')));
  assert.ok(backward.every((option) => option.url.includes('20260831')));
});

test('provider destinations recompute across the year boundary', () => {
  const endOfYear = getTextPrayerProviders('segment-night', '2026-12-31');
  const startOfYear = getTextPrayerProviders('segment-night', '2027-01-01');

  assert.ok(endOfYear.every((option) => option.url.includes('20261231')));
  assert.ok(startOfYear.every((option) => option.url.includes('20270101')));
  assert.notDeepEqual(startOfYear, endOfYear);
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
