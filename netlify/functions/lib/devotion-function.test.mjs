import assert from 'node:assert/strict';
import test from 'node:test';
import { createDevotionHandler } from '../devotion.mjs';
import { generateParticipantToken, hashParticipantToken } from './devotion-pilot.mjs';

test('participant resolution is isolated and returns safe current-night state', async () => {
  const token = generateParticipantToken();
  const participant = fixtureParticipant(hashParticipantToken(token));
  const repository = memoryRepository([participant]);
  const handler = createDevotionHandler({
    repository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  });

  const result = await handler(request(devotionAction('resolve', token)));
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(body.participant.id, participant.id);
  assert.equal(body.timing.pilotDay, 1);
  assert.equal(body.timing.prayerDate, '2026-08-10');
  assert.equal(JSON.stringify(body).includes(token), false);
  assert.equal('token_hash' in body.participant, false);
  assert.equal(result.headers['access-control-allow-origin'], undefined);
});

test('a report change updates the same participant and pilot-day identity', async () => {
  const token = generateParticipantToken();
  const repository = memoryRepository([fixtureParticipant(hashParticipantToken(token))]);
  const handler = createDevotionHandler({
    repository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  });

  const first = await handler(request(devotionAction('report', token, { outcome: 'prayed' })));
  const changed = await handler(request({
    ...devotionAction('report', token), outcome: 'started_not_finished',
  }));

  assert.equal(first.statusCode, 200);
  assert.equal(changed.statusCode, 200);
  assert.equal(repository.reports.size, 1);
  assert.equal([...repository.reports.values()][0].outcome, 'started_not_finished');
  assert.equal([...repository.reports.values()][0].first_reported_at, '2026-08-11T06:30:00.000Z');
});

test('invalid, revoked, and other participant tokens fail without roster disclosure', async () => {
  const valid = generateParticipantToken();
  const revoked = generateParticipantToken();
  const repository = memoryRepository([
    fixtureParticipant(hashParticipantToken(valid)),
    { ...fixtureParticipant(hashParticipantToken(revoked)), id: '22222222-2222-4222-8222-222222222222', revoked_at: '2026-08-10' },
  ]);
  const handler = createDevotionHandler({ repository });

  for (const token of ['not-a-token', revoked, generateParticipantToken()]) {
    const result = await handler(request(devotionAction('resolve', token)));
    assert.equal(result.statusCode, 404);
    assert.deepEqual(JSON.parse(result.body), {
      error: 'This participant link is invalid or unavailable.',
    });
  }
});

test('a participant token cannot resolve on another campaign route', async () => {
  const token = generateParticipantToken();
  const handler = createDevotionHandler({
    repository: memoryRepository([fixtureParticipant(hashParticipantToken(token))]),
  });
  const result = await handler(request({
    action: 'resolve',
    token,
    devotionSlug: 'another-campaign',
  }));

  assert.equal(result.statusCode, 404);
  assert.deepEqual(JSON.parse(result.body), {
    error: 'This participant link is invalid or unavailable.',
  });
});

test('archived campaigns fail closed even when an old participant token remains valid', async () => {
  const token = generateParticipantToken();
  const participant = fixtureParticipant(hashParticipantToken(token));
  participant.devotions.status = 'archived';
  participant.devotions.archived_at = '2026-08-22T00:00:00Z';
  const handler = createDevotionHandler({ repository: memoryRepository([participant]) });
  const result = await handler(request(devotionAction('resolve', token)));

  assert.equal(result.statusCode, 404);
  assert.deepEqual(JSON.parse(result.body), { error: 'This devotion is unavailable.' });
});

test('public devotion endpoint rejects oversized bodies before repository access', async () => {
  let queried = false;
  const handler = createDevotionHandler({
    repository: { findParticipant: async () => { queried = true; return null; } },
  });
  const result = await handler(request({
    action: 'resolve', devotionSlug: 'holy-spirit-mens-ministry',
    token: generateParticipantToken(), padding: 'x'.repeat(9_000),
  }));
  assert.equal(result.statusCode, 413);
  assert.equal(queried, false);
});

function fixtureParticipant(tokenHash) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    label: 'Participant',
    devotion_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    cohort_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    token_hash: tokenHash,
    status: 'active',
    revoked_at: null,
    devotions: {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      slug: 'holy-spirit-mens-ministry',
      name: '7-Day Night Prayer Devotion',
      organization_label: "Holy Spirit Men's Ministry",
      description: null,
      hour_key: 'compline',
      start_date: '2026-08-10',
      duration_days: 7,
      timezone: 'America/Los_Angeles',
      status: 'active',
      pre_survey_url: null,
      post_survey_url: null,
      published_at: '2026-08-09T00:00:00Z',
      archived_at: null,
    },
    devotion_cohorts: {
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      slug: 'general',
      name: 'General',
      status: 'active',
      start_date: '2026-08-10',
      timezone: 'America/Los_Angeles',
      archived_at: null,
    },
  };
}

function memoryRepository(participants) {
  const reports = new Map();
  return {
    reports,
    async findParticipant(tokenHash) {
      return participants.find((participant) => participant.token_hash === tokenHash) ?? null;
    },
    async findReport({ devotionId, participantId, pilotDay }) {
      return reports.get(`${devotionId}:${participantId}:${pilotDay}`) ?? null;
    },
    async upsertReport(report) {
      const key = `${report.devotion_id}:${report.participant_id}:${report.pilot_day}`;
      const previous = reports.get(key);
      const saved = {
        id: previous?.id ?? 'report-1',
        ...report,
        first_reported_at: previous?.first_reported_at ?? '2026-08-11T06:30:00.000Z',
        updated_at: '2026-08-11T06:30:00.000Z',
      };
      reports.set(key, saved);
      return saved;
    },
  };
}

function request(body) {
  return { httpMethod: 'POST', headers: {}, body: JSON.stringify(body) };
}

function devotionAction(action, token, extra = {}) {
  return {
    action,
    token,
    devotionSlug: 'holy-spirit-mens-ministry',
    ...extra,
  };
}
