import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdminDevotionRepository,
  createAdminDevotionHandler,
  firstNonEmpty,
  isAnalyticsContractSchemaUnavailable,
  participantLinkGenerationReady,
  readBoundedRows,
} from '../admin-devotion.mjs';

const LINK_SECRET = 'stable-admin-devotion-test-secret';
const DEVOTION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_DEVOTION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COHORT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('blank admin secrets do not block the configured fallback secret', () => {
  assert.equal(firstNonEmpty('', 'ingest-secret'), 'ingest-secret');
  assert.equal(firstNonEmpty('   ', 'ingest-secret'), 'ingest-secret');
  assert.equal(firstNonEmpty(undefined, '  dedicated-secret  '), 'dedicated-secret');
});

test('participant link operations disclose short or missing server configuration', async () => {
  assert.equal(participantLinkGenerationReady('short'), false);
  assert.equal(participantLinkGenerationReady('x'.repeat(32)), true);

  const repository = memoryRepository();
  const handler = createAdminDevotionHandler({
    repository,
    authorize: async () => true,
    linkSecret: 'too-short',
  });
  const dashboard = JSON.parse((await handler({ httpMethod: 'GET', headers: {} })).body);
  assert.deepEqual(dashboard.participantLinkGeneration, {
    ready: false,
    message: 'Participant link generation is not configured. Set DEVOTION_LINK_SECRET to at least 32 characters and restart the server.',
  });

  const create = await handler(request(participantAction('createParticipant', { label: 'Blocked' })));
  assert.equal(create.statusCode, 503);
  assert.match(JSON.parse(create.body).error, /DEVOTION_LINK_SECRET/);
  assert.equal(repository.participants.length, 0);
});

test('analytics evidence compatibility fallback is limited to missing Sprint B columns', () => {
  assert.equal(isAnalyticsContractSchemaUnavailable({ code: '42703', message: 'column acquisition_source does not exist' }), true);
  assert.equal(isAnalyticsContractSchemaUnavailable({ code: 'PGRST204', details: 'analytics_sessions.acquisition_surface missing' }), true);
  assert.equal(isAnalyticsContractSchemaUnavailable({ code: '42703', message: 'column devotion_id does not exist' }), false);
  assert.equal(isAnalyticsContractSchemaUnavailable({ code: '42P01', message: 'analytics_events missing' }), false);
});

test('Sprint B acquisition compatibility fallback discloses readiness and preserves real failures', async () => {
  const selected = [];
  const client = {
    from(table) {
      let fields = '';
      const query = {
        select(value) { fields = value; selected.push([table, value]); return query; },
        eq() { return query; },
        order() { return query; },
        async range() {
          if (fields.includes('acquisition_source')) {
            return { data: null, error: { code: '42703', message: 'column acquisition_source does not exist' } };
          }
          return { data: [], error: null };
        },
      };
      return query;
    },
  };
  const repository = createAdminDevotionRepository(client);
  const [events, sessions] = await Promise.all([
    repository.listEvents(DEVOTION_ID), repository.listSessions(DEVOTION_ID),
  ]);

  assert.equal(events.acquisitionReady, false);
  assert.equal(sessions.acquisitionReady, false);
  assert.equal(selected.some(([, fields]) => fields.includes('acquisition_source')), true);
  assert.equal(selected.some(([, fields]) => !fields.includes('acquisition_source')), true);

  const brokenRepository = createAdminDevotionRepository({
    from() {
      const query = {
        select() { return query; }, eq() { return query; }, order() { return query; },
        async range() { return { data: null, error: { code: '42P01', message: 'analytics_events missing' } }; },
      };
      return query;
    },
  });
  await assert.rejects(
    () => brokenRepository.listEvents(DEVOTION_ID),
    (error) => error?.code === '42P01' && error?.message === 'analytics_events missing',
  );
});

test('admin participant creation returns a campaign-scoped stable link and allows duplicate labels', async () => {
  const repository = memoryRepository();
  const handler = adminHandler(repository);
  const input = { action: 'createParticipant', devotionId: DEVOTION_ID, cohortId: COHORT_ID, label: 'John' };

  const first = await handler(request(input));
  const second = await handler(request(input));
  const firstBody = JSON.parse(first.body);
  const secondBody = JSON.parse(second.body);

  assert.equal(first.statusCode, 200);
  assert.equal(repository.participants.length, 2);
  assert.notEqual(firstBody.generatedLink, secondBody.generatedLink);
  assert.match(firstBody.generatedLink, /\/devotions\/holy-spirit-mens-ministry\/night-prayer\?p=[A-Za-z0-9_-]{43}$/);
  assert.equal(firstBody.participant.cohortId, COHORT_ID);
  assert.equal(JSON.stringify(repository.participants).includes('?p='), false);
  assert.match(repository.participants[0].token_hash, /^[a-f0-9]{64}$/);
  assert.equal(firstBody.linkChanged, false);
});

test('show link reconstructs the same token and revoke prevents disclosure', async () => {
  const repository = memoryRepository();
  const handler = adminHandler(repository);
  const created = JSON.parse((await handler(request(participantAction('createParticipant', { label: 'Peter' })))).body);
  const beforeHash = repository.participants[0].token_hash;
  const shown = JSON.parse((await handler(request(participantAction('showParticipantLink', {
    participantId: created.participant.id,
  })))).body);

  assert.equal(repository.participants[0].token_hash, beforeHash);
  assert.equal(shown.generatedLink, created.generatedLink);
  assert.equal(shown.linkChanged, false);

  const revoked = JSON.parse((await handler(request(participantAction('revokeParticipant', {
    participantId: created.participant.id,
  })))).body);
  assert.equal(revoked.participant.linkStatus, 'revoked');
  const blocked = await handler(request(participantAction('showParticipantLink', {
    participantId: created.participant.id,
  })));
  assert.equal(blocked.statusCode, 409);
  assert.equal(JSON.stringify(blocked).includes(created.generatedLink), false);
});

test('show link upgrades a legacy random token once and then remains stable', async () => {
  const repository = memoryRepository();
  const handler = adminHandler(repository);
  const created = JSON.parse((await handler(request(participantAction('createParticipant', {
    label: 'Legacy participant',
  })))).body);
  repository.participants[0].token_hash = 'a'.repeat(64);

  const upgraded = JSON.parse((await handler(request(participantAction('showParticipantLink', {
    participantId: created.participant.id,
  })))).body);
  const shownAgain = JSON.parse((await handler(request(participantAction('showParticipantLink', {
    participantId: created.participant.id,
  })))).body);

  assert.equal(upgraded.linkChanged, true);
  assert.equal(shownAgain.linkChanged, false);
  assert.equal(upgraded.generatedLink, shownAgain.generatedLink);
});

test('campaign selection isolates dashboards and enrollment from other campaigns', async () => {
  const repository = memoryRepository({ includeSecondCampaign: true });
  const handler = adminHandler(repository);

  const selected = await handler({
    httpMethod: 'GET',
    headers: {},
    queryStringParameters: { devotionId: OTHER_DEVOTION_ID },
  });
  const body = JSON.parse(selected.body);
  assert.equal(body.devotion.id, OTHER_DEVOTION_ID);
  assert.equal(body.campaigns.length, 2);
  assert.deepEqual(body.participants, []);

  const crossCampaign = await handler(request({
    action: 'createParticipant',
    devotionId: OTHER_DEVOTION_ID,
    cohortId: COHORT_ID,
    label: 'Wrong cohort',
  }));
  assert.equal(crossCampaign.statusCode, 404);
});

test('campaign creation starts as a recoverable draft with a General cohort', async () => {
  const repository = memoryRepository();
  const handler = adminHandler(repository);
  const result = await handler(request({
    action: 'createDevotion',
    devotion: {
      slug: 'parish-advent-prayer',
      name: 'Parish Advent Prayer',
      organizationLabel: 'St. Example Parish',
      durationDays: 12,
      status: 'draft',
    },
  }));
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(body.devotion.slug, 'parish-advent-prayer');
  assert.equal(body.devotion.durationDays, 12);
  assert.equal(body.devotion.status, 'draft');
  assert.equal(body.cohort.slug, 'general');
  assert.equal(body.cohort.devotionId, body.devotion.id);
});

test('portfolio mode compares campaigns without treating evidence units as conversions', async () => {
  const repository = memoryRepository({ includeSecondCampaign: true });
  const handler = adminHandler(repository);
  await handler(request(participantAction('createParticipant', { label: 'Portfolio participant' })));
  const result = await handler({
    httpMethod: 'GET', headers: {},
    queryStringParameters: { devotionId: DEVOTION_ID, portfolio: 'true' },
  });
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(body.portfolio.status, 'exact');
  assert.equal(body.portfolio.campaigns.length, 2);
  assert.equal(body.portfolio.campaigns.find((row) => row.devotion.id === DEVOTION_ID).participants, 1);
  assert.equal('conversionRate' in body.portfolio.campaigns[0], false);
  assert.equal(body.portfolio.campaigns[0].measuredMediaMinutes, null);
  assert.equal(body.portfolio.campaigns[0].measuredMediaStatus, 'unavailable');
});

test('portfolio duration totals distinguish mixed known-only evidence from explicit zero', async () => {
  const repository = memoryRepository({ includeSecondCampaign: true });
  repository.portfolioData = async () => ({
    participants: [], reports: [], events: [],
    sessions: {
      rows: [
        { devotion_id: DEVOTION_ID, active_play_seconds: null },
        { devotion_id: DEVOTION_ID, active_play_seconds: 60 },
        { devotion_id: OTHER_DEVOTION_ID, active_play_seconds: 0 },
      ],
      truncated: false,
      cap: 10_000,
    },
  });
  const response = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const body = JSON.parse(response.body);
  const mixed = body.portfolio.campaigns.find((row) => row.devotion.id === DEVOTION_ID);
  const zero = body.portfolio.campaigns.find((row) => row.devotion.id === OTHER_DEVOTION_ID);

  assert.equal(mixed.measuredMediaMinutes, 1);
  assert.equal(mixed.measuredMediaStatus, 'partial');
  assert.equal(zero.measuredMediaMinutes, 0);
  assert.equal(zero.measuredMediaStatus, 'exact');
});

test('authenticated dashboard projects survey evidence with safe linkage and completion status', async () => {
  const repository = memoryRepository();
  repository.surveyResponses.push({
    id: 'survey-1',
    devotion_id: DEVOTION_ID,
    participant_id: '11111111-1111-4111-8111-111111111111',
    phase: 'pre',
    status: 'partial',
    answers: { hourConfidence: 2 },
    started_at: '2026-08-25T00:00:00Z',
    submitted_at: null,
    updated_at: '2026-08-25T00:02:00Z',
    token_hash: 'must-not-project',
  });
  const result = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(body.surveySchemaReady, true);
  assert.deepEqual(body.surveyResponses[0], {
    devotionSafeId: 'devotion-303617b973',
    participantSafeId: 'participant-bd7662a5ee',
    phase: 'pre',
    status: 'partial',
    answers: { hourConfidence: 2 },
    startedAt: '2026-08-25T00:00:00Z',
    submittedAt: null,
    updatedAt: '2026-08-25T00:02:00Z',
  });
  assert.equal(JSON.stringify(body.surveyResponses).includes('token'), false);
});

test('research readiness and survey response caps remain explicit at the authenticated API boundary', async () => {
  const repository = memoryRepository();
  const participantId = '11111111-1111-4111-8111-111111111111';
  repository.participants.push({
    id: participantId, devotion_id: DEVOTION_ID, cohort_id: COHORT_ID,
    label: 'Participant', status: 'completed', completed_at: '2026-08-25T00:00:00Z',
    revoked_at: null, created_at: '2026-08-19T00:00:00Z',
  });
  repository.listEvents = async () => ({
    rows: [{
      id: 'event-1', session_id: 'session-1', devotion_participant_id: participantId,
      pilot_day: 1, prayer_date: '2026-08-24', event_name: 'devotion_page_opened',
      occurred_at: '2026-08-24T01:00:00Z', device_class: 'mobile',
    }],
    truncated: false, cap: 10_000, acquisitionReady: false,
  });
  repository.listSessions = async () => ({ rows: [], truncated: false, cap: 10_000, acquisitionReady: false });
  repository.listSurveyResponses = async () => ({
    rows: Array.from({ length: 300 }, (_, index) => ({
      id: `survey-${index}`, devotion_id: DEVOTION_ID, participant_id: participantId,
      phase: 'post', status: 'submitted', answers: { continuedAfterWindow: 'yes' },
      started_at: '2026-08-25T02:00:00Z', submitted_at: '2026-08-25T02:01:00Z',
      updated_at: '2026-08-25T02:01:00Z',
    })),
    truncated: false, cap: 10_000, schemaReady: false,
  });
  const result = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const body = JSON.parse(result.body);
  const continued = body.research.funnel.stages.find((stage) => stage.key === 'continued');

  assert.equal(result.statusCode, 200);
  assert.equal(body.surveySchemaReady, false);
  assert.equal(body.research.survey.status, 'unavailable');
  assert.equal(continued.status, 'unavailable');
  assert.equal(continued.count, null);
  assert.equal(body.research.acquisitionStatus, 'unavailable');
  assert.equal(body.research.surfaceStatus, 'unavailable');
  assert.equal(body.activity.attributionStatus, 'unavailable');
  assert.deepEqual(body.research.devices, [
    { value: 'mobile', storedEventCount: 1, participants: 1 },
  ]);
  assert.deepEqual(body.surveyResponseDetail, {
    status: 'unavailable', observed: 0, shown: 0, cap: 250,
  });
  assert.deepEqual(body.surveyResponses, []);
  assert.ok(Buffer.byteLength(result.body, 'utf8') <= 1_500_000);

  repository.listSurveyResponses = async () => ({
    rows: Array.from({ length: 300 }, (_, index) => ({
      id: `ready-survey-${index}`, devotion_id: DEVOTION_ID, participant_id: participantId,
      phase: 'post', status: 'submitted', answers: { continuedAfterWindow: 'yes' },
      started_at: '2026-08-25T02:00:00Z', submitted_at: '2026-08-25T02:01:00Z',
      updated_at: '2026-08-25T02:01:00Z',
    })),
    truncated: false, cap: 10_000, schemaReady: true,
  });
  const readyResult = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const readyBody = JSON.parse(readyResult.body);
  assert.deepEqual(readyBody.surveyResponseDetail, {
    status: 'sampled', observed: 300, shown: 250, cap: 250,
  });
  assert.equal(readyBody.surveyResponses.length, 250);
});

test('authenticated research dashboard projects bounded privacy-safe evidence and exact drilldowns', async () => {
  const repository = memoryRepository();
  const participantId = '11111111-1111-4111-8111-111111111111';
  const rawSessionId = '22222222-2222-4222-8222-222222222222';
  repository.participants.push({
    id: participantId, devotion_id: DEVOTION_ID, cohort_id: COHORT_ID,
    label: 'private@example.test', status: 'completed', completed_at: '2026-08-25T00:00:00Z',
    revoked_at: null, created_at: '2026-08-19T00:00:00Z',
  });
  repository.listReports = async () => [{
    participant_id: participantId, pilot_day: 1, prayer_date: '2026-08-24', outcome: 'prayed',
  }];
  repository.listEvents = async () => [
    { id: 'event-1', session_id: rawSessionId, devotion_participant_id: participantId, pilot_day: 1, prayer_date: '2026-08-24', event_name: 'devotion_page_opened', occurred_at: '2026-08-24T01:00:00Z', page_path: '/devotions/test/night-prayer?p=secret', device_class: 'mobile', acquisition_source: 'qr', acquisition_surface: 'web', metadata: { token: 'never-project' } },
    { id: 'event-2', session_id: rawSessionId, devotion_participant_id: participantId, pilot_day: 1, prayer_date: '2026-08-24', event_name: 'devotion_resource_opened', occurred_at: '2026-08-24T01:01:00Z', resource_id: 'audio', provider: 'spotify', media_type: 'audio', acquisition_source: 'qr', acquisition_surface: 'web' },
    { id: 'event-3', session_id: rawSessionId, devotion_participant_id: participantId, pilot_day: 2, prayer_date: '2026-08-25', event_name: 'devotion_page_opened', occurred_at: '2026-08-25T01:00:00Z', acquisition_source: 'sms', acquisition_surface: 'pwa' },
  ];
  repository.listSessions = async () => [{
    session_id: rawSessionId, devotion_participant_id: participantId, pilot_day: 2, prayer_date: '2026-08-25',
    started_at: '2026-08-25T01:00:00Z', ended_at: '2026-08-25T01:02:00Z',
    active_play_seconds: 30, panel_open_seconds: 90,
  }];
  repository.surveyResponses.push({
    id: 'survey-1', devotion_id: DEVOTION_ID, participant_id: participantId,
    phase: 'post', status: 'submitted', answers: { continuedAfterWindow: 'yes' },
    started_at: '2026-08-25T02:00:00Z', submitted_at: '2026-08-25T02:01:00Z', updated_at: '2026-08-25T02:01:00Z',
  });

  const result = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const body = JSON.parse(result.body);
  const projected = JSON.stringify({ activity: body.activity, research: body.research });
  assert.equal(result.statusCode, 200);
  assert.equal(body.activity.status, 'exact');
  assert.deepEqual(body.research.funnel.stages.map((stage) => stage.count), [1, 1, 1, 1, 1, 1]);
  assert.equal(body.research.funnel.reconciliation.nested, true);
  assert.equal(body.participants[0].id, body.participants[0].safeId);
  assert.equal(body.participants[0].label, body.participants[0].safeId);
  assert.equal(body.access.email, null);
  assert.deepEqual(body.auditHistory, []);
  assert.equal(projected.includes(rawSessionId), false);
  assert.equal(projected.includes('private@example.test'), false);
  assert.equal(projected.includes('never-project'), false);
  assert.equal(projected.includes('?p=secret'), false);
});

test('cohort schedules, participant statuses, and bounded bulk revocation validate at the API edge', async () => {
  const repository = memoryRepository();
  const handler = adminHandler(repository);

  const invalidSchedule = await handler(request({
    action: 'createCohort', devotionId: DEVOTION_ID,
    cohort: { slug: 'fall', name: 'Fall', status: 'scheduled', startDate: '', timezone: '' },
  }));
  assert.equal(invalidSchedule.statusCode, 400);

  const created = JSON.parse((await handler(request(participantAction('createParticipant', { label: 'Thomas' })))).body);
  const completed = await handler(request(participantAction('updateParticipantStatus', {
    participantId: created.participant.id,
    status: 'completed',
  })));
  assert.equal(JSON.parse(completed.body).participant.status, 'completed');

  const bulk = await handler(request({
    action: 'bulkRevokeParticipants',
    devotionId: DEVOTION_ID,
    participantIds: [created.participant.id],
  }));
  assert.equal(JSON.parse(bulk.body).participants[0].linkStatus, 'revoked');

  const restored = await handler(request(participantAction('restoreParticipant', {
    participantId: created.participant.id,
  })));
  assert.equal(JSON.parse(restored.body).participant.linkStatus, 'active');

  const tooMany = await handler(request({
    action: 'bulkRevokeParticipants',
    devotionId: DEVOTION_ID,
    participantIds: Array.from({ length: 101 }, (_, index) => `${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`),
  }));
  assert.equal(tooMany.statusCode, 400);
});

test('devotion roles enforce read-only and owner-only boundaries while successful changes are audited', async () => {
  const repository = memoryRepository();
  const viewer = createAdminDevotionHandler({ repository, authorize: async () => ({ actorId: 'viewer-1', email: 'viewer@example.com', role: 'viewer' }), linkSecret: LINK_SECRET });
  const editor = createAdminDevotionHandler({ repository, authorize: async () => ({ actorId: 'editor-1', email: 'editor@example.com', role: 'editor' }), linkSecret: LINK_SECRET });

  assert.equal((await viewer({ httpMethod: 'GET', headers: {} })).statusCode, 200);
  assert.equal((await viewer(request(participantAction('createParticipant', { label: 'Blocked' })))).statusCode, 403);
  assert.equal((await editor(request({ action: 'createDevotion', devotion: { slug: 'blocked', name: 'Blocked', organizationLabel: 'Blocked', durationDays: 7 } }))).statusCode, 403);

  const allowed = await editor(request(participantAction('createParticipant', { label: 'Allowed' })));
  assert.equal(allowed.statusCode, 200);
  assert.equal(JSON.parse(allowed.body).auditRecorded, true);
  assert.equal(repository.audits[0].actor_email, 'editor@example.com');
  assert.equal(repository.audits[0].action, 'createParticipant');
  assert.equal(JSON.stringify(repository.audits).includes(LINK_SECRET), false);
});

test('editors cannot create archived cohorts or recover archived records', async () => {
  const createRepository = memoryRepository();
  const createEditor = editorHandler(createRepository);
  const createArchived = await createEditor(request({
    action: 'createCohort', devotionId: DEVOTION_ID,
    cohort: { slug: 'closed', name: 'Closed', status: 'archived', startDate: null, timezone: null },
  }));
  assert.equal(createArchived.statusCode, 403);

  const campaignRepository = memoryRepository();
  const owner = adminHandler(campaignRepository);
  await owner(request({ action: 'updateDevotion', devotionId: DEVOTION_ID, devotion: { status: 'archived' } }));
  const recoverCampaign = await editorHandler(campaignRepository)(request({
    action: 'updateDevotion', devotionId: DEVOTION_ID, devotion: { status: 'draft' },
  }));
  assert.equal(recoverCampaign.statusCode, 403);

  const cohortRepository = memoryRepository();
  await adminHandler(cohortRepository)(request({
    action: 'updateCohort', devotionId: DEVOTION_ID, cohortId: COHORT_ID,
    cohort: { status: 'archived', startDate: null, timezone: null },
  }));
  const recoverCohort = await editorHandler(cohortRepository)(request({
    action: 'updateCohort', devotionId: DEVOTION_ID, cohortId: COHORT_ID,
    cohort: { status: 'draft', startDate: null, timezone: null },
  }));
  assert.equal(recoverCohort.statusCode, 403);
});

test('participant detail is paged while campaign metrics retain the bounded population', async () => {
  const repository = memoryRepository();
  for (let index = 0; index < 250; index += 1) {
    repository.participants.push({
      id: `${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`,
      devotion_id: DEVOTION_ID,
      cohort_id: COHORT_ID,
      label: `Participant ${index + 1}`,
      status: 'enrolled',
      completed_at: null,
      revoked_at: null,
      created_at: '2026-08-19T00:00:00Z',
    });
  }
  const response = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { participantPage: '2' },
  });
  const body = JSON.parse(response.body);

  assert.equal(body.metrics.participantsEnrolled, 250);
  assert.equal(body.participants.length, 100);
  assert.deepEqual(body.participantDetail, {
    page: 2, pageSize: 100, shown: 100, observedTotal: 250,
    totalStatus: 'exact', hasPrevious: true, hasNext: true,
  });
});

test('analytics-mode empty dashboard retains the complete unavailable evidence contract', async () => {
  const repository = memoryRepository();
  repository.listDevotions = async () => [];
  const response = await createAdminDevotionHandler({
    repository,
    authorize: async () => ({ actorId: 'owner-1', email: 'owner@example.test', role: 'owner' }),
    linkSecret: LINK_SECRET,
  })({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const body = JSON.parse(response.body);

  assert.equal(response.statusCode, 200);
  assert.equal(body.access.email, null);
  assert.equal(body.devotion, null);
  assert.equal(body.activity.status, 'unavailable');
  assert.deepEqual(body.activity.sessions, []);
  assert.equal(body.research.funnel.status, 'unavailable');
  assert.equal(body.research.survey.status, 'unavailable');
  assert.equal(body.research.deviceStatus, 'unavailable');
  assert.deepEqual(body.surveyResponseDetail, {
    status: 'unavailable', observed: 0, shown: 0, cap: 250,
  });
  assert.equal(body.surveySchemaReady, false);
  assert.deepEqual(body.resourceProjection, {
    status: 'exact', observedRows: 0, shownRows: 0, globalCap: 1_000,
    participantNightAllocation: 600, nightlyAllocation: 400,
    order: 'participant detail order, then pilot day and resource key; nightly pilot day, then resource key',
  });
});

test('authenticated max-cap analytics response stays below four MiB with a global resource budget', async () => {
  const repository = memoryRepository({ devotionOverrides: { duration_days: 40 } });
  const participants = Array.from({ length: 2_000 }, (_, index) => ({
    id: uuidFor(index + 1),
    devotion_id: DEVOTION_ID,
    cohort_id: COHORT_ID,
    label: `Participant ${index + 1}`,
    status: 'enrolled',
    completed_at: null,
    revoked_at: null,
    created_at: '2026-08-19T00:00:00Z',
  }));
  repository.participants.push(...participants);
  const events = Array.from({ length: 10_000 }, (_, index) => {
    const participant = participants[index % 100];
    const pilotDay = Math.floor(index / 100) % 40 + 1;
    return {
      id: uuidFor(index + 20_001),
      session_id: uuidFor(index + 40_001),
      devotion_participant_id: participant.id,
      pilot_day: pilotDay,
      prayer_date: `2026-09-${String(pilotDay).padStart(2, '0')}`,
      event_name: 'devotion_resource_opened',
      occurred_at: '2026-09-01T01:00:00Z',
      resource_id: `event-resource-${String(index).padStart(5, '0')}`,
      provider: 'vimeo',
      media_type: 'video',
      device_class: 'mobile',
      acquisition_source: 'qr',
      acquisition_surface: 'web',
    };
  });
  const sessions = Array.from({ length: 10_000 }, (_, index) => {
    const participant = participants[index % 100];
    const pilotDay = Math.floor(index / 100) % 40 + 1;
    return {
      session_id: uuidFor(index + 40_001),
      devotion_participant_id: participant.id,
      pilot_day: pilotDay,
      prayer_date: `2026-09-${String(pilotDay).padStart(2, '0')}`,
      resource_id: `session-resource-${String(index).padStart(5, '0')}`,
      provider: 'vimeo',
      media_type: 'video',
      active_play_seconds: 60,
      panel_open_seconds: 120,
      started_at: '2026-09-01T01:00:00Z',
      ended_at: '2026-09-01T01:02:00Z',
      acquisition_source: 'qr',
      acquisition_surface: 'web',
    };
  });
  const surveys = Array.from({ length: 250 }, (_, index) => ({
    id: uuidFor(index + 60_001), devotion_id: DEVOTION_ID,
    participant_id: participants[index % participants.length].id,
    phase: index % 2 ? 'pre' : 'post', status: 'submitted',
    answers: index % 2
      ? { hourConfidence: 3, continueLikelihood: 4 }
      : { hourConfidence: 4, continueLikelihood: 5, continuedAfterWindow: 'yes' },
    started_at: '2026-09-01T01:00:00Z', submitted_at: '2026-09-01T01:01:00Z',
    updated_at: '2026-09-01T01:01:00Z',
  }));
  repository.listEvents = async () => ({ rows: events, truncated: false, cap: 10_000, acquisitionReady: true });
  repository.listSessions = async () => ({ rows: sessions, truncated: false, cap: 10_000, acquisitionReady: true });
  repository.listSurveyResponses = async () => ({ rows: surveys, truncated: false, cap: 10_000, schemaReady: true });

  const response = await adminHandler(repository)({
    httpMethod: 'GET', headers: {}, queryStringParameters: { portfolio: 'true' },
  });
  const body = JSON.parse(response.body);
  const bytes = Buffer.byteLength(response.body, 'utf8');

  assert.equal(response.statusCode, 200);
  assert.equal(body.activity.sessions.length, 40);
  assert.equal(body.activity.sessions.every((session) => session.timeline.length <= 20), true);
  assert.equal(body.participants.length, 100);
  assert.equal(body.participants.every((participant) => participant.nights.length === 40), true);
  assert.equal(body.research.participantDays.length, 4_000);
  assert.equal(body.research.nights.every((night) => night.prayerDates.length <= 10), true);
  assert.equal(body.research.funnel.stages.every((stage) => stage.participantSafeIds.length <= 2_000), true);
  assert.equal(body.research.funnel.rawEvidence.every((row) => row.participantSafeIds.length <= 2_000), true);
  assert.deepEqual(body.resourceProjection, {
    status: 'sampled', observedRows: 40_000, shownRows: 1_000, globalCap: 1_000,
    participantNightAllocation: 600, nightlyAllocation: 400,
    order: 'participant detail order, then pilot day and resource key; nightly pilot day, then resource key',
  });
  assert.equal(body.participants.flatMap((participant) => participant.nights).flatMap((night) => night.resources).length, 600);
  assert.equal(body.research.nights.flatMap((night) => night.resources).length, 400);
  assert.equal(body.surveyResponses.length, 250);
  assert.ok(bytes <= 4 * 1024 * 1024, `authenticated response was ${bytes} bytes`);
});

test('sampled evidence suppresses absence-based follow-up claims', async () => {
  const repository = memoryRepository();
  repository.listEvents = async () => ({ rows: [], truncated: true, cap: 10_000 });
  const response = await adminHandler(repository)({ httpMethod: 'GET', headers: {} });
  const alerts = JSON.parse(response.body).operationalAlerts;

  assert.equal(alerts.some((alert) => alert.code === 'attention_sampled'), true);
  assert.equal(alerts.some((alert) => alert.code === 'follow_up_ready'), false);
});

test('bounded devotion reader pages through PostgREST limits and discloses truncation', async () => {
  const source = Array.from({ length: 2_105 }, (_, index) => ({ id: index }));
  const pages = [];
  const exact = await readBoundedRows(async (from, to) => {
    pages.push([from, to]);
    return { data: source.slice(from, to + 1), error: null };
  });
  assert.equal(exact.rows.length, 2_105);
  assert.equal(exact.truncated, false);
  assert.deepEqual(pages, [[0, 999], [1000, 1999], [2000, 2999]]);

  const truncated = await readBoundedRows(async (from, to) => ({
    data: Array.from({ length: to - from + 1 }, (_, index) => ({ id: from + index })),
    error: null,
  }), 1_500);
  assert.equal(truncated.rows.length, 1_500);
  assert.equal(truncated.truncated, true);
});

test('admin endpoint enforces authorization and active configuration requirements', async () => {
  const repository = memoryRepository();
  const denied = createAdminDevotionHandler({
    repository,
    authorize: async () => false,
    linkSecret: LINK_SECRET,
  });
  assert.equal((await denied({ httpMethod: 'GET', headers: {} })).statusCode, 401);

  const allowed = adminHandler(repository);
  const invalid = await allowed(request({
    action: 'updateDevotion',
    devotionId: DEVOTION_ID,
    devotion: { status: 'active', startDate: '', timezone: '' },
  }));
  assert.equal(invalid.statusCode, 400);
  assert.match(JSON.parse(invalid.body).error, /requires a start date and timezone/);
  const oversized = await allowed(request({
    action: 'updateDevotion', devotionId: DEVOTION_ID, padding: 'x'.repeat(70_000), devotion: {},
  }));
  assert.equal(oversized.statusCode, 413);
});

function memoryRepository({ includeSecondCampaign = false, devotionOverrides = {} } = {}) {
  const devotions = [devotionFixture(devotionOverrides)];
  const cohorts = [cohortFixture()];
  if (includeSecondCampaign) {
    devotions.push(devotionFixture({
      id: OTHER_DEVOTION_ID,
      slug: 'second-campaign',
      name: 'Second Campaign',
    }));
    cohorts.push(cohortFixture({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      devotion_id: OTHER_DEVOTION_ID,
    }));
  }
  const participants = [];
  const audits = [];
  const surveyResponses = [];
  return {
    participants,
    audits,
    surveyResponses,
    async listDevotions() { return devotions; },
    async listCohorts(devotionId) { return cohorts.filter((cohort) => cohort.devotion_id === devotionId); },
    async listParticipants(devotionId) { return participants.filter((participant) => participant.devotion_id === devotionId); },
    async listReports() { return []; },
    async listEvents() { return []; },
    async listSessions() { return []; },
    async listSurveyResponses(devotionId) {
      return {
        rows: surveyResponses.filter((response) => response.devotion_id === devotionId),
        truncated: false,
        cap: 10_000,
        schemaReady: true,
      };
    },
    async portfolioData(devotionIds) {
      return {
        participants: participants.filter((participant) => devotionIds.includes(participant.devotion_id)),
        reports: [], events: [], sessions: [],
      };
    },
    async listAudits(devotionId) { return audits.filter((audit) => audit.devotion_id === devotionId); },
    async createAudit(entry) {
      const audit = { id: `audit-${audits.length + 1}`, created_at: '2026-08-22T00:00:00Z', ...entry };
      audits.push(audit);
      return audit;
    },
    async createParticipant(input) {
      const participant = {
        ...input,
        created_at: '2026-08-19T00:00:00Z',
        revoked_at: null,
        status: 'enrolled',
        completed_at: null,
      };
      participants.push(participant);
      return participant;
    },
    async findParticipant(devotionId, id) {
      return participants.find((participant) => participant.devotion_id === devotionId && participant.id === id) ?? null;
    },
    async updateParticipant(devotionId, id, updates) {
      const participant = participants.find((item) => item.devotion_id === devotionId && item.id === id);
      if (!participant) throw new Error('participant not found');
      Object.assign(participant, updates);
      return participant;
    },
    async bulkUpdateParticipants(devotionId, ids, updates) {
      const selected = participants.filter((item) => item.devotion_id === devotionId && ids.includes(item.id));
      selected.forEach((participant) => Object.assign(participant, updates));
      return selected;
    },
    async updateDevotion(id, updates) {
      const devotion = devotions.find((item) => item.id === id);
      Object.assign(devotion, updates);
      return devotion;
    },
    async createCampaign(input) {
      const devotion = devotionFixture({ ...input, id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' });
      devotions.push(devotion);
      const cohort = cohortFixture({
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        devotion_id: devotion.id,
        status: devotion.status,
        start_date: devotion.start_date,
        timezone: devotion.timezone,
      });
      cohorts.push(cohort);
      return { devotion, cohort };
    },
    async createCohort(input) {
      const cohort = cohortFixture({ ...input, id: input.id ?? 'ffffffff-ffff-4fff-8fff-ffffffffffff' });
      cohorts.push(cohort);
      return cohort;
    },
    async findCohort(devotionId, cohortId) {
      return cohorts.find((cohort) => cohort.devotion_id === devotionId && cohort.id === cohortId) ?? null;
    },
    async updateCohort(devotionId, cohortId, updates) {
      const cohort = cohorts.find((item) => item.devotion_id === devotionId && item.id === cohortId);
      Object.assign(cohort, updates);
      return cohort;
    },
  };
}

function devotionFixture(overrides = {}) {
  return {
    id: DEVOTION_ID,
    slug: 'holy-spirit-mens-ministry',
    name: '7-Day Night Prayer Devotion',
    organization_label: "Holy Spirit Men's Ministry",
    description: null,
    hour_key: 'compline',
    start_date: null,
    duration_days: 7,
    timezone: null,
    status: 'inactive',
    pre_survey_url: null,
    post_survey_url: null,
    published_at: null,
    archived_at: null,
    created_at: '2026-08-19T00:00:00Z',
    updated_at: '2026-08-19T00:00:00Z',
    ...overrides,
  };
}

function cohortFixture(overrides = {}) {
  return {
    id: COHORT_ID,
    devotion_id: DEVOTION_ID,
    slug: 'general',
    name: 'General',
    status: 'draft',
    start_date: null,
    timezone: null,
    archived_at: null,
    created_at: '2026-08-19T00:00:00Z',
    updated_at: '2026-08-19T00:00:00Z',
    ...overrides,
  };
}

function participantAction(action, body = {}) {
  return { action, devotionId: DEVOTION_ID, cohortId: COHORT_ID, ...body };
}

function adminHandler(repository) {
  return createAdminDevotionHandler({
    repository,
    authorize: async () => true,
    linkSecret: LINK_SECRET,
  });
}

function editorHandler(repository) {
  return createAdminDevotionHandler({
    repository,
    authorize: async () => ({ actorId: 'editor-1', email: 'editor@example.com', role: 'editor' }),
    linkSecret: LINK_SECRET,
  });
}

function request(body) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'http://127.0.0.1:8888' },
    body: JSON.stringify(body),
  };
}

function uuidFor(value) {
  const hex = value.toString(16).padStart(12, '0');
  return `${hex.slice(-8)}-1111-4111-8111-${hex}`;
}
