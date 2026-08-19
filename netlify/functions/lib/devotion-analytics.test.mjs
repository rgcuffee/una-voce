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
      resourceId: '1000783564617',
      label: 'Divine Office',
      provider: 'spotify',
      mediaType: 'audio',
      count: 1,
      measuredMinutes: 1,
    },
  ]);
  assert.equal(result.participants[1].linkStatus, 'revoked');
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
