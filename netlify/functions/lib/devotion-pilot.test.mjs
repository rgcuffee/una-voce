import assert from 'node:assert/strict';
import test from 'node:test';
import {
  generateParticipantToken,
  hashParticipantToken,
  isParticipantToken,
  participantLink,
  prayerDateAt,
  resolvePilotDay,
} from './devotion-pilot.mjs';

const configured = {
  status: 'active',
  start_date: '2026-08-10',
  duration_days: 7,
  timezone: 'America/Los_Angeles',
};

test('opaque participant tokens are URL-safe, non-recoverable hashes', () => {
  const token = generateParticipantToken();
  const hash = hashParticipantToken(token);

  assert.equal(isParticipantToken(token), true);
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes(token), false);
  assert.equal(
    participantLink(token, 'http://127.0.0.1:8888'),
    `http://127.0.0.1:8888/devotions/holy-spirit-mens-ministry/night-prayer?p=${token}`,
  );
});

test('invalid participant tokens are rejected before hashing', () => {
  for (const token of ['', 'plain label', 'a'.repeat(42), 'a'.repeat(44)]) {
    assert.equal(isParticipantToken(token), false);
    assert.throws(() => hashParticipantToken(token), /Invalid participant token/);
  }
});

test('the devotion night stays on the prior prayer date until 4 a.m. locally', () => {
  assert.equal(
    prayerDateAt('2026-08-13T07:30:00.000Z', 'America/Los_Angeles'),
    '2026-08-12',
  );
  assert.equal(
    prayerDateAt('2026-08-13T10:59:59.000Z', 'America/Los_Angeles'),
    '2026-08-12',
  );
  assert.equal(
    prayerDateAt('2026-08-13T11:00:00.000Z', 'America/Los_Angeles'),
    '2026-08-13',
  );
});

test('pilot resolution covers pre-start, Nights 1-7, and completion', () => {
  assert.deepEqual(
    resolvePilotDay(configured, '2026-08-10T06:00:00.000Z'),
    { phase: 'not_started', pilotDay: null, prayerDate: '2026-08-09' },
  );

  for (let pilotDay = 1; pilotDay <= 7; pilotDay += 1) {
    const day = String(9 + pilotDay).padStart(2, '0');
    assert.equal(
      resolvePilotDay(configured, `2026-08-${day}T19:00:00.000Z`).pilotDay,
      pilotDay,
    );
  }
  assert.deepEqual(
    resolvePilotDay(configured, '2026-08-10T19:00:00.000Z'),
    { phase: 'active', pilotDay: 1, prayerDate: '2026-08-10' },
  );
  assert.deepEqual(
    resolvePilotDay(configured, '2026-08-17T10:59:59.000Z'),
    { phase: 'active', pilotDay: 7, prayerDate: '2026-08-16' },
  );
  assert.deepEqual(
    resolvePilotDay(configured, '2026-08-17T11:00:00.000Z'),
    { phase: 'completed', pilotDay: null, prayerDate: '2026-08-17' },
  );
});

test('the 4 a.m. boundary remains stable through daylight-saving changes', () => {
  assert.equal(
    prayerDateAt('2026-11-01T11:30:00.000Z', 'America/Los_Angeles'),
    '2026-10-31',
  );
  assert.equal(
    prayerDateAt('2026-11-01T12:00:00.000Z', 'America/Los_Angeles'),
    '2026-11-01',
  );
});

test('browser location cannot override the configured devotion timezone', () => {
  const instant = '2026-08-13T09:30:00.000Z';
  assert.equal(prayerDateAt(instant, 'America/Los_Angeles'), '2026-08-12');
  assert.equal(prayerDateAt(instant, 'America/New_York'), '2026-08-13');
});

test('an unconfigured devotion remains inactive', () => {
  assert.deepEqual(
    resolvePilotDay({ ...configured, status: 'inactive', start_date: null }),
    { phase: 'inactive', pilotDay: null, prayerDate: null },
  );
});
