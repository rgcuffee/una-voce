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

test('survey schema error codes outside survey storage remain generic server failures', async () => {
  const token = generateParticipantToken();
  const participant = fixtureParticipant(hashParticipantToken(token));

  const participantRepository = memoryRepository([participant]);
  participantRepository.findParticipant = async () => {
    throw codedError('PGRST205', 'participant table unavailable');
  };
  const participantFailure = await createDevotionHandler({
    repository: participantRepository,
  })(request(devotionAction('resolve', token)));
  assert.equal(participantFailure.statusCode, 500);
  assert.deepEqual(JSON.parse(participantFailure.body), {
    error: 'Unable to load the devotion right now.',
  });

  const reportRepository = memoryRepository([participant]);
  reportRepository.findReport = async () => {
    throw codedError('42P01', 'report table unavailable');
  };
  const reportFailure = await createDevotionHandler({
    repository: reportRepository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  })(request(devotionAction('resolve', token)));
  assert.equal(reportFailure.statusCode, 500);
  assert.deepEqual(JSON.parse(reportFailure.body), {
    error: 'Unable to load the devotion right now.',
  });
});

test('survey start, partial save, completion, identical retry, and complete update share one linked row', async () => {
  const token = generateParticipantToken();
  const repository = memoryRepository([fixtureParticipant(hashParticipantToken(token))]);
  const handler = createDevotionHandler({
    repository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  });

  const started = JSON.parse((await handler(request(devotionAction('surveyStart', token, { phase: 'pre' })))).body);
  assert.equal(started.survey.status, 'partial');
  assert.deepEqual(started.survey.answers, {});

  const partial = await handler(request(devotionAction('surveySave', token, {
    phase: 'pre', answers: { hourConfidence: 2 },
  })));
  assert.equal(JSON.parse(partial.body).survey.status, 'partial');
  assert.equal(repository.surveys.size, 1);

  const incomplete = await handler(request(devotionAction('surveySubmit', token, {
    phase: 'pre', answers: { hourConfidence: 2 },
  })));
  assert.equal(incomplete.statusCode, 400);

  const answers = completePreSurvey();
  const submitted = JSON.parse((await handler(request(devotionAction('surveySubmit', token, {
    phase: 'pre', answers,
  })))).body);
  const duplicate = JSON.parse((await handler(request(devotionAction('surveySubmit', token, {
    phase: 'pre', answers,
  })))).body);
  assert.equal(submitted.survey.status, 'submitted');
  assert.equal(duplicate.survey.updatedAt, submitted.survey.updatedAt);
  assert.equal(repository.surveys.size, 1);

  const blockedPartial = await handler(request(devotionAction('surveySave', token, {
    phase: 'pre', answers: { hourConfidence: 5 },
  })));
  assert.equal(blockedPartial.statusCode, 409);

  const updated = JSON.parse((await handler(request(devotionAction('surveySubmit', token, {
    phase: 'pre', answers: { ...answers, hourConfidence: 5 },
  })))).body);
  assert.equal(updated.survey.answers.hourConfidence, 5);
  assert.equal(updated.survey.submittedAt, submitted.survey.submittedAt);
  assert.notEqual(updated.survey.updatedAt, submitted.survey.updatedAt);
  assert.equal(repository.surveys.size, 1);
});

test('survey availability follows campaign timing and revoked links fail before survey reads', async () => {
  const activeToken = generateParticipantToken();
  const revokedToken = generateParticipantToken();
  const revoked = fixtureParticipant(hashParticipantToken(revokedToken));
  revoked.id = '22222222-2222-4222-8222-222222222222';
  revoked.revoked_at = '2026-08-10T00:00:00Z';
  const repository = memoryRepository([
    fixtureParticipant(hashParticipantToken(activeToken)),
    revoked,
  ]);
  const handler = createDevotionHandler({
    repository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  });

  const active = JSON.parse((await handler(request(devotionAction('resolve', activeToken)))).body);
  assert.equal(active.survey.availablePhase, 'pre');
  assert.equal(active.survey.responses.pre, null);
  assert.equal(JSON.stringify(active.survey).includes(activeToken), false);

  const earlyPost = await handler(request(devotionAction('surveyStart', activeToken, { phase: 'post' })));
  assert.equal(earlyPost.statusCode, 409);
  const revokedResult = await handler(request(devotionAction('surveyStart', revokedToken, { phase: 'pre' })));
  assert.equal(revokedResult.statusCode, 404);
  assert.equal(repository.surveyReads, 1);
});

test('missing survey read and upsert schema return the bounded survey-unavailable response', async () => {
  const token = generateParticipantToken();
  const participant = fixtureParticipant(hashParticipantToken(token));

  const readRepository = memoryRepository([participant]);
  readRepository.findSurveyResponses = async () => {
    throw codedError('PGRST205', 'survey table unavailable');
  };
  const readFailure = await createDevotionHandler({
    repository: readRepository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  })(request(devotionAction('resolve', token)));
  assert.equal(readFailure.statusCode, 503);
  assert.deepEqual(JSON.parse(readFailure.body), {
    error: 'Survey responses are not available yet.',
  });

  const writeRepository = memoryRepository([participant]);
  writeRepository.upsertSurveyResponse = async () => {
    throw codedError('42883', 'survey RPC unavailable');
  };
  const writeFailure = await createDevotionHandler({
    repository: writeRepository,
    now: () => new Date('2026-08-11T06:30:00.000Z'),
  })(request(devotionAction('surveyStart', token, { phase: 'pre' })));
  assert.equal(writeFailure.statusCode, 503);
  assert.deepEqual(JSON.parse(writeFailure.body), {
    error: 'Survey responses are not available yet.',
  });
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
  const surveys = new Map();
  let surveyRevision = 0;
  return {
    reports,
    surveys,
    surveyReads: 0,
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
    async findSurveyResponses({ devotionId, participantId }) {
      this.surveyReads += 1;
      return {
        rows: [...surveys.values()].filter((row) =>
          row.devotion_id === devotionId && row.participant_id === participantId),
        schemaReady: true,
      };
    },
    async upsertSurveyResponse(input) {
      const key = `${input.devotionId}:${input.participantId}:${input.phase}`;
      const previous = surveys.get(key);
      if (
        previous?.status === input.status &&
        JSON.stringify(previous.answers) === JSON.stringify(input.answers)
      ) return previous;
      surveyRevision += 1;
      const saved = {
        id: previous?.id ?? `survey-${surveys.size + 1}`,
        devotion_id: input.devotionId,
        participant_id: input.participantId,
        phase: input.phase,
        status: input.status,
        answers: input.answers,
        created_at: previous?.created_at ?? '2026-08-11T06:30:00.000Z',
        started_at: previous?.started_at ?? '2026-08-11T06:30:00.000Z',
        submitted_at: input.status === 'submitted'
          ? previous?.submitted_at ?? '2026-08-11T06:35:00.000Z'
          : null,
        updated_at: `2026-08-11T06:${String(30 + surveyRevision).padStart(2, '0')}:00.000Z`,
      };
      surveys.set(key, saved);
      return saved;
    },
  };
}

function completePreSurvey() {
  return {
    liturgyFamiliarity: 'somewhat',
    massFrequency: 'weekly_or_more',
    prayerFrequency: 'daily',
    hourConfidence: 3,
    friction: ['finding_time'],
    continueLikelihood: 4,
  };
}

function codedError(code, message) {
  return Object.assign(new Error(message), { code });
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
