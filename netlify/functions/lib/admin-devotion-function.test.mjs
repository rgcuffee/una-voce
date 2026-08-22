import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAdminDevotionHandler,
  firstNonEmpty,
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

function memoryRepository({ includeSecondCampaign = false } = {}) {
  const devotions = [devotionFixture()];
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
  return {
    participants,
    audits,
    async listDevotions() { return devotions; },
    async listCohorts(devotionId) { return cohorts.filter((cohort) => cohort.devotion_id === devotionId); },
    async listParticipants(devotionId) { return participants.filter((participant) => participant.devotion_id === devotionId); },
    async listReports() { return []; },
    async listEvents() { return []; },
    async listSessions() { return []; },
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
