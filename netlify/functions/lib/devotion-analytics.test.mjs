import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateDevotionAnalytics } from './devotion-analytics.mjs';

test('analytics retains raw counts while deduping opened nights', () => {
  const result = aggregateDevotionAnalytics({
    devotion: {
      id: 'devotion-1',
      slug: 'holy-spirit-mens-ministry',
      name: '7-Day Night Prayer',
      organization_label: "Holy Spirit Men's Ministry",
      start_date: '2026-08-10',
      duration_days: 7,
      timezone: 'America/Los_Angeles',
      status: 'active',
      pre_survey_url: null,
      post_survey_url: null,
    },
    participants: [
      { id: 'participant-aaaa', label: 'John', revoked_at: null, created_at: '2026-08-01' },
      { id: 'participant-bbbb', label: 'John', revoked_at: '2026-08-12', created_at: '2026-08-01' },
    ],
    events: [
      event('participant-aaaa', 1, 'devotion_page_opened'),
      event('participant-aaaa', 1, 'devotion_page_opened'),
      event('participant-aaaa', 1, 'devotion_resource_opened', {
        resource_id: 'video-1', provider: 'youtube', media_type: 'video',
        metadata: { resourceLabel: 'Sing the Hours — Night Prayer' },
      }),
      event('participant-aaaa', 1, 'devotion_resource_opened', {
        resource_id: '1000783564617', provider: 'spotify', media_type: 'audio',
      }),
    ],
    reports: [
      { participant_id: 'participant-aaaa', pilot_day: 1, prayer_date: '2026-08-10', outcome: 'prayed' },
    ],
    sessions: [
      {
        devotion_participant_id: 'participant-aaaa', pilot_day: 1,
        resource_id: 'video-1', provider: 'youtube', media_type: 'video',
        active_play_seconds: 0, panel_open_seconds: 125,
      },
      {
        devotion_participant_id: 'participant-aaaa', pilot_day: 1,
        resource_id: '1000783564617', provider: 'spotify', media_type: 'audio',
        source_name: 'Divine Office',
        active_play_seconds: 60, panel_open_seconds: 45,
      },
    ],
  });

  assert.equal(result.metrics.participantsEnrolled, 2);
  assert.equal(result.metrics.nightsOpened, 1);
  assert.equal(result.metrics.resourceEngagements, 2);
  assert.equal(result.metrics.measuredMediaMinutes, 3.1);
  assert.equal(result.metrics.reportedPrayed, 1);
  assert.equal(result.participants[0].nights[0].openCount, 2);
  assert.equal(result.participants[0].nights[0].outcome, 'prayed');
  assert.deepEqual(result.participants[0].nights[0].resources, [
    {
      resourceId: 'video-1',
      label: 'Sing the Hours — Night Prayer',
      provider: 'youtube',
      mediaType: 'video',
      count: 1,
      measuredMinutes: 2.1,
    },
    {
      resourceId: 'resource',
      label: 'Divine Office',
      provider: 'spotify',
      mediaType: 'audio',
      count: 1,
      measuredMinutes: 1,
    },
  ]);
  assert.equal(result.participants[1].linkStatus, 'revoked');
});

test('devotion analytics projects untrusted resource attribution without PII or dangerous URLs', () => {
  const result = aggregateDevotionAnalytics({
    devotion: {
      id: 'devotion-1', slug: 'privacy-test', name: 'Privacy Test', organization_label: 'Test',
      start_date: '2026-08-10', duration_days: 1, timezone: 'UTC', status: 'active',
      pre_survey_url: null, post_survey_url: null,
    },
    participants: [{ id: 'participant-aaaa', label: 'Participant', revoked_at: null, created_at: '2026-08-01' }],
    reports: [], sessions: [],
    events: [event('participant-aaaa', 1, 'devotion_resource_opened', {
      resource_id: 'https://evil.example/reset/jane@example.com?token=secret',
      provider: 'jane@example.com', media_type: 'javascript',
      metadata: { resourceLabel: 'jane@example.com secret-token' },
    })],
  });
  const serialized = JSON.stringify(result.participants[0].nights[0].resources);

  assert.equal(serialized.includes('jane@example.com'), false);
  assert.equal(serialized.includes('https://'), false);
  assert.equal(serialized.includes('secret-token'), false);
  assert.deepEqual(result.participants[0].nights[0].resources[0], {
    resourceId: 'resource', label: 'Unknown unknown', provider: 'unknown', mediaType: 'unknown',
    count: 1, measuredMinutes: 0,
  });
});

test('participant detail stays response-bounded at the 40-night campaign maximum', () => {
  const participants = Array.from({ length: 2_000 }, (_, index) => ({
    id: `${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`,
    label: `Participant ${index + 1}`,
    cohort_id: 'cohort-1',
    status: 'enrolled',
    revoked_at: null,
    completed_at: null,
    created_at: '2026-08-01',
  }));
  const result = aggregateDevotionAnalytics({
    devotion: {
      id: 'devotion-1', slug: 'bounded', name: 'Bounded', organization_label: 'Test',
      start_date: null, duration_days: 40, timezone: null, status: 'draft',
      pre_survey_url: null, post_survey_url: null,
    },
    participants,
    detailParticipants: participants.slice(0, 100),
    reports: [{ participant_id: participants.at(-1).id, pilot_day: 1, prayer_date: '2026-08-10', outcome: 'prayed' }],
    events: [
      event(participants.at(-1).id, 1, 'devotion_page_opened'),
      event(participants.at(-1).id, 1, 'devotion_resource_opened'),
    ],
    sessions: [{ devotion_participant_id: participants.at(-1).id, pilot_day: 1, active_play_seconds: 60, panel_open_seconds: 0 }],
  });

  assert.equal(result.metrics.participantsEnrolled, 2_000);
  assert.equal(result.participants.length, 100);
  assert.equal(result.participants[0].nights.length, 40);
  assert.deepEqual(result.nightRollup[0], {
    night: 1, opened: 1, engaged: 1, reported: 1, measuredMediaMinutes: 1,
  });
  assert.equal(result.participants.some((participant) => participant.id === participants.at(-1).id), false);
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') < 1_000_000);
});

function event(participantId, pilotDay, eventName, extra = {}) {
  return {
    devotion_participant_id: participantId,
    pilot_day: pilotDay,
    prayer_date: '2026-08-10',
    event_name: eventName,
    ...extra,
  };
}
