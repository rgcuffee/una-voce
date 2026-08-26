import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./sessionStories.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
}).outputText;
const stories = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const event = (overrides = {}) => ({
  timestamp: '2026-08-25T20:00:00.000Z',
  sessionId: 'session-one',
  anonymousId: 'visitor-one',
  route: '/pray',
  event: 'page_viewed',
  content: null,
  partner: null,
  community: null,
  destination: null,
  device: 'mobile',
  acquisition: 'links_page',
  ...overrides,
});

test('product stories group people into chronological sessions and sort by newest activity', () => {
  const output = stories.buildProductPeople([
    event({ timestamp: '2026-08-25T20:05:00.000Z', event: 'source_opened' }),
    event({ timestamp: '2026-08-25T20:00:00.000Z' }),
    event({ timestamp: '2026-08-24T10:00:00.000Z', sessionId: 'session-two' }),
    event({ timestamp: '2026-08-26T10:00:00.000Z', sessionId: 'session-three', anonymousId: 'visitor-two' }),
  ]);

  assert.deepEqual(output.map((person) => person.id), ['visitor-two', 'visitor-one']);
  assert.equal(output[1].sessionCount, 2);
  assert.equal(output[1].actionCount, 3);
  assert.deepEqual(output[1].sessions.map((session) => session.id), ['session-one', 'session-two']);
  assert.deepEqual(output[1].sessions[0].events.map((row) => row.event), ['page_viewed', 'source_opened']);
});

test('product stories keep session-only evidence bounded and label derived spans honestly', () => {
  const output = stories.buildProductPeople([event({ anonymousId: null, sessionId: 'session-safe' })]);
  assert.equal(output[0].id, 'unattributed');
  assert.equal(stories.observedSpanSeconds('2026-08-25T20:00:00Z', '2026-08-25T20:02:30Z'), 150);
  assert.equal(stories.observedSpanSeconds(null, '2026-08-25T20:02:30Z'), null);
  assert.equal(stories.analyticsEventLabel('current_hour_cta_clicked'), 'Current Hour Cta Clicked');
});

test('devotion stories reconcile participants with safe sessions, surveys, and explicit night evidence', () => {
  const participant = {
    id: 'participant-safe', safeId: 'participant-safe', label: 'participant-safe', cohortId: 'cohort-safe',
    status: 'completed', linkStatus: 'active', completedAt: '2026-08-25T21:00:00Z', createdAt: '2026-08-20T12:00:00Z',
    nights: [
      { pilotDay: 7, opened: false, resourceEngaged: false, outcome: null, measuredMediaMinutes: null },
      { pilotDay: 1, opened: true, resourceEngaged: true, outcome: 'prayed', measuredMediaMinutes: 12 },
    ],
  };
  const session = {
    sessionSafeId: 'session-safe', participantSafeId: 'participant-safe', startedAt: '2026-08-25T20:00:00Z', endedAt: null,
    pilotDay: 2, eventCountDerived: 2, timeline: [{ timestamp: '2026-08-25T20:05:00Z' }],
  };
  const survey = { participantSafeId: 'participant-safe', phase: 'post', status: 'submitted', startedAt: '2026-08-25T20:30:00Z', submittedAt: '2026-08-25T20:45:00Z', updatedAt: '2026-08-25T20:45:00Z' };
  const output = stories.buildDevotionParticipantStories({ participants: [participant], activity: { sessions: [session] }, surveyResponses: [survey] });

  assert.equal(output[0].participant.safeId, 'participant-safe');
  assert.equal(output[0].nightsWithEvidence, 1);
  assert.equal(output[0].actionCount, 4);
  assert.equal(output[0].lastActivityAt, '2026-08-25T21:00:00Z');
  assert.equal(output[0].sessions[0].sessionSafeId, 'session-safe');
  assert.equal(output[0].surveys[0].status, 'submitted');
  assert.deepEqual(stories.devotionStoryNightNumbers(output[0]), [2, 1]);
});
