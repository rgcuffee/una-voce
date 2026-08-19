import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminDevotionHandler } from '../admin-devotion.mjs';

const LINK_SECRET = 'stable-admin-devotion-test-secret';

test('admin participant creation returns a stable opaque link and allows duplicate labels', async () => {
  const repository = memoryRepository();
  const handler = createAdminDevotionHandler({
    repository,
    authorize: async () => true,
    linkSecret: LINK_SECRET,
  });

  const first = await handler(request({ action: 'createParticipant', label: 'John' }));
  const second = await handler(request({ action: 'createParticipant', label: 'John' }));
  const firstBody = JSON.parse(first.body);
  const secondBody = JSON.parse(second.body);

  assert.equal(first.statusCode, 200);
  assert.equal(repository.participants.length, 2);
  assert.notEqual(firstBody.generatedLink, secondBody.generatedLink);
  assert.match(firstBody.generatedLink, /\?p=[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(repository.participants).includes('?p='), false);
  assert.match(repository.participants[0].token_hash, /^[a-f0-9]{64}$/);
  assert.equal(firstBody.linkChanged, false);
});

test('show link reconstructs the same token and revoke prevents disclosure', async () => {
  const repository = memoryRepository();
  const handler = createAdminDevotionHandler({
    repository,
    authorize: async () => true,
    linkSecret: LINK_SECRET,
  });
  const created = JSON.parse((await handler(request({ action: 'createParticipant', label: 'Peter' }))).body);
  const beforeHash = repository.participants[0].token_hash;
  const shown = JSON.parse((await handler(request({
    action: 'showParticipantLink', participantId: created.participant.id,
  }))).body);

  assert.equal(repository.participants[0].token_hash, beforeHash);
  assert.equal(shown.generatedLink, created.generatedLink);
  assert.equal(shown.linkChanged, false);

  const revoked = JSON.parse((await handler(request({
    action: 'revokeParticipant', participantId: created.participant.id,
  }))).body);
  assert.equal(revoked.participant.linkStatus, 'revoked');
  const blocked = await handler(request({
    action: 'showParticipantLink', participantId: created.participant.id,
  }));
  assert.equal(blocked.statusCode, 409);
  assert.equal(JSON.stringify(blocked).includes(created.generatedLink), false);
});

test('show link upgrades a legacy random token once and then remains stable', async () => {
  const repository = memoryRepository();
  const handler = createAdminDevotionHandler({
    repository,
    authorize: async () => true,
    linkSecret: LINK_SECRET,
  });
  const created = JSON.parse((await handler(request({
    action: 'createParticipant', label: 'Legacy participant',
  }))).body);
  repository.participants[0].token_hash = 'a'.repeat(64);

  const upgraded = JSON.parse((await handler(request({
    action: 'showParticipantLink', participantId: created.participant.id,
  }))).body);
  const shownAgain = JSON.parse((await handler(request({
    action: 'showParticipantLink', participantId: created.participant.id,
  }))).body);

  assert.equal(upgraded.linkChanged, true);
  assert.equal(shownAgain.linkChanged, false);
  assert.equal(upgraded.generatedLink, shownAgain.generatedLink);
});

test('admin endpoint enforces authorization and active configuration requirements', async () => {
  const repository = memoryRepository();
  const denied = createAdminDevotionHandler({
    repository,
    authorize: async () => false,
    linkSecret: LINK_SECRET,
  });
  assert.equal((await denied({ httpMethod: 'GET', headers: {} })).statusCode, 401);

  const allowed = createAdminDevotionHandler({
    repository,
    authorize: async () => true,
    linkSecret: LINK_SECRET,
  });
  const invalid = await allowed(request({
    action: 'updateDevotion',
    devotion: { status: 'active', startDate: '', timezone: '' },
  }));
  assert.equal(invalid.statusCode, 400);
  assert.match(JSON.parse(invalid.body).error, /requires a start date and timezone/);
});

function memoryRepository() {
  const devotion = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'holy-spirit-mens-ministry',
    name: '7-Day Night Prayer Devotion',
    organization_label: "Holy Spirit Men's Ministry",
    hour_key: 'compline',
    start_date: null,
    duration_days: 7,
    timezone: null,
    status: 'inactive',
    pre_survey_url: null,
    post_survey_url: null,
  };
  const participants = [];
  return {
    participants,
    async loadDevotion() { return devotion; },
    async listParticipants() { return participants; },
    async listReports() { return []; },
    async listEvents() { return []; },
    async listSessions() { return []; },
    async createParticipant(input) {
      const participant = {
        id: `${String(participants.length + 1).padStart(8, '0')}-0000-4000-8000-000000000000`,
        ...input,
        created_at: '2026-08-19T00:00:00Z',
        revoked_at: null,
      };
      participants.push(participant);
      return participant;
    },
    async findParticipant(_devotionId, id) {
      return participants.find((participant) => participant.id === id) ?? null;
    },
    async updateParticipant(_devotionId, id, updates) {
      const participant = participants.find((item) => item.id === id);
      Object.assign(participant, updates);
      return participant;
    },
    async updateDevotion(_id, updates) {
      Object.assign(devotion, updates);
      return devotion;
    },
  };
}

function request(body) {
  return {
    httpMethod: 'POST',
    headers: { origin: 'http://127.0.0.1:8888' },
    body: JSON.stringify(body),
  };
}
