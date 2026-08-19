import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAnalyticsHandler,
  validateAnalyticsEvent,
} from '../analytics.mjs';

const valid = {
  sessionId: '11111111-1111-4111-8111-111111111111',
  eventName: 'devotion_resource_opened',
  startedAt: '2026-08-19T00:00:00.000Z',
  anonymousId: 'anonymous',
  devotionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  devotionParticipantId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  pilotDay: 3,
  prayerDate: '2026-08-18',
  resourceId: 'video-123',
  provider: 'youtube',
  mediaType: 'video',
};

test('devotion telemetry requires safe participant/night attribution', () => {
  assert.equal(validateAnalyticsEvent(valid), null);
  assert.equal(
    validateAnalyticsEvent({ ...valid, devotionParticipantId: undefined }),
    'Missing devotion attribution',
  );
  assert.equal(
    validateAnalyticsEvent({ ...valid, pilotDay: 8 }),
    'Invalid pilotDay',
  );
  assert.equal(
    validateAnalyticsEvent({
      ...valid,
      eventName: 'prayer_session_started',
      pilotDay: null,
      prayerDate: null,
    }),
    'Missing devotion night attribution',
  );
  assert.equal(
    validateAnalyticsEvent({ ...valid, resourceId: undefined }),
    'Missing devotion resource attribution',
  );
});

test('analytics rejects JSON primitives without throwing', async () => {
  const handler = createAnalyticsHandler(memoryAnalyticsClient());
  for (const body of ['null', '"analytics"', '[]']) {
    const result = await handler({ httpMethod: 'POST', body });
    assert.equal(result.statusCode, 400);
    assert.deepEqual(JSON.parse(result.body), {
      error: 'Invalid analytics payload',
    });
  }
});

test('analytics storage scrubs raw participant tokens from arbitrary values', async () => {
  const token = 'a'.repeat(43);
  const client = memoryAnalyticsClient();
  const handler = createAnalyticsHandler(client);
  const result = await handler(request({
    ...valid,
    metadata: {
      note: token,
      campaignLink: `https://unavoce.net/devotions/example?p=${token}&utm_source=sms`,
      nested: [token],
    },
  }));

  assert.equal(result.statusCode, 202);
  assert.deepEqual(client.rows.events[0].metadata.note, '[redacted-participant-token]');
  assert.equal(
    client.rows.events[0].metadata.campaignLink,
    'https://unavoce.net/devotions/example?utm_source=sms',
  );
  assert.equal(JSON.stringify(client.rows.events[0]).includes(token), false);
});

test('devotion prayer-player sessions persist structured media attribution', async () => {
  const client = memoryAnalyticsClient();
  const handler = createAnalyticsHandler(client);
  const started = {
    ...valid,
    eventName: 'prayer_session_started',
    provider: 'youtube',
    sourceName: 'Word on Fire',
    sourceType: 'recorded',
    pageContext: 'devotion_night_prayer',
  };

  const startResult = await handler(request(started));
  const endResult = await handler(request({
    ...started,
    eventName: 'prayer_session_ended',
    occurredAt: '2026-08-19T00:12:00.000Z',
    panelOpenSeconds: 720,
  }));

  assert.equal(startResult.statusCode, 202);
  assert.equal(endResult.statusCode, 202);
  assert.equal(client.rows.events[0].devotion_id, valid.devotionId);
  assert.deepEqual(client.rows.sessions.get(valid.sessionId), {
    session_id: valid.sessionId,
    started_at: valid.startedAt,
    ministry_id: undefined,
    prayer_id: undefined,
    hour: undefined,
    locale: 'en-US',
    user_id: null,
    anonymous_id: valid.anonymousId,
    source_name: 'Word on Fire',
    source_type: 'recorded',
    provider: 'youtube',
    video_id: undefined,
    page_context: 'devotion_night_prayer',
    devotion_id: valid.devotionId,
    devotion_participant_id: valid.devotionParticipantId,
    pilot_day: 3,
    prayer_date: '2026-08-18',
    resource_id: 'video-123',
    media_type: 'video',
    ended_at: '2026-08-19T00:12:00.000Z',
    panel_open_seconds: 720,
    active_play_seconds: 0,
  });
});

function request(body) {
  return { httpMethod: 'POST', body: JSON.stringify(body) };
}

function memoryAnalyticsClient() {
  const rows = { events: [], sessions: new Map() };
  return {
    rows,
    from(table) {
      if (table === 'analytics_events') {
        return {
          async insert(row) {
            rows.events.push(structuredClone(row));
            return { error: null };
          },
        };
      }
      if (table === 'analytics_sessions') {
        return {
          async upsert(row) {
            rows.sessions.set(row.session_id, structuredClone(row));
            return { error: null };
          },
          update(updates) {
            return {
              async eq(_column, sessionId) {
                rows.sessions.set(sessionId, {
                  ...rows.sessions.get(sessionId),
                  ...structuredClone(updates),
                });
                return { error: null };
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  };
}
