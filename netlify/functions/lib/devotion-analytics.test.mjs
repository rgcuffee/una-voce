import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateDevotionAnalytics,
  aggregateDurationEvidence,
  isSensitiveOrOpaqueValue,
} from './devotion-analytics.mjs';

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
  assert.equal(result.metrics.measuredMediaMinutes, 1);
  assert.equal(result.metrics.reportedPrayed, 1);
  assert.equal(result.participants[0].nights[0].openCount, 2);
  assert.equal(result.participants[0].nights[0].outcome, 'prayed');
  assert.deepEqual(result.participants[0].nights[0].resources, [
    {
      resourceId: 'resource', label: 'Divine Office', provider: 'spotify', mediaType: 'audio',
      count: 1, measuredMinutes: 1, measuredStatus: 'exact',
    },
    {
      resourceId: 'video-1', label: 'Sing the Hours — Night Prayer', provider: 'youtube', mediaType: 'video',
      count: 1, measuredMinutes: 0, measuredStatus: 'exact',
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
    count: 1, measuredMinutes: null, measuredStatus: 'unavailable',
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
    night: 1, opened: 1, engaged: 1, reported: 1,
    measuredMediaMinutes: 1, measuredMediaStatus: 'exact',
  });
  assert.equal(result.participants.some((participant) => participant.id === participants.at(-1).id), false);
  assert.ok(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 1_500_000);
});

test('activity evidence orders timelines, separates duration measures, and strips unsafe fields', () => {
  const sessionId = '11111111-1111-4111-8111-111111111111';
  const participantId = '22222222-2222-4222-8222-222222222222';
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 2 }),
    cohorts: [{ id: 'cohort-1', name: 'General' }],
    participants: [{ id: participantId, cohort_id: 'cohort-1', label: 'private@example.test', status: 'active', revoked_at: null, created_at: '2026-08-01' }],
    reports: [], surveyResponses: [],
    sessions: [{
      session_id: sessionId, devotion_participant_id: participantId, pilot_day: 1,
      prayer_date: '2026-08-10', started_at: '2026-08-10T01:00:00Z', ended_at: '2026-08-10T01:02:00Z',
      active_play_seconds: 30, panel_open_seconds: 100, highest_progress: 60,
      completed: false, opened_source: true, acquisition_source: 'qr', acquisition_surface: 'pwa',
      resource_id: 'night-audio', source_name: 'Night Prayer', provider: 'spotify', media_type: 'audio',
    }],
    events: [
      {
        session_id: sessionId, devotion_participant_id: participantId, pilot_day: 1,
        prayer_date: '2026-08-10', occurred_at: '2026-08-10T01:01:00Z',
        event_name: 'devotion_resource_opened', page_path: '/reset/token-secret?p=abcdefghijklmnopqrstuvwxyzABCDEFGH123456789',
        device_class: 'mobile', acquisition_source: 'qr', acquisition_surface: 'pwa',
        resource_id: 'https://evil.test/private@example.test?token=secret', provider: 'private@example.test',
        media_type: 'javascript', metadata: { token: 'never-project', resourceLabel: 'private@example.test' },
      },
      {
        session_id: sessionId, devotion_participant_id: participantId, pilot_day: 1,
        prayer_date: '2026-08-10', occurred_at: '2026-08-10T01:00:00Z',
        event_name: 'devotion_page_opened', page_path: '/devotions/test/night-prayer?p=secret',
        device_class: 'mobile', acquisition_source: 'qr', acquisition_surface: 'pwa', metadata: { bearer: 'secret' },
      },
    ],
  });

  const activity = result.activity;
  assert.equal(activity.status, 'exact');
  assert.equal(activity.sessions[0].durationMeasures.activePlaySeconds, 30);
  assert.equal(activity.sessions[0].durationMeasures.panelOpenSeconds, 100);
  assert.equal(activity.sessions[0].durationMeasures.elapsedSessionSeconds, 120);
  assert.equal(activity.sessions[0].durationMeasures.observedTimelineSpanSeconds, 60);
  assert.deepEqual(activity.sessions[0].timeline.map((item) => item.event), [
    'devotion_page_opened', 'devotion_resource_opened',
  ]);
  assert.equal(activity.sessions[0].timeline[0].route, '/devotions/test/night-prayer');
  assert.equal(activity.sessions[0].timeline[1].route, null);
  const serialized = JSON.stringify(activity);
  assert.equal(serialized.includes(sessionId), false);
  assert.equal(serialized.includes('private@example.test'), false);
  assert.equal(serialized.includes('never-project'), false);
  assert.equal(serialized.includes('token-secret'), false);
});

test('nested funnel, survey completion, acquisition, and surface totals reconcile exactly', () => {
  const first = 'aaaaaaaa-1111-4111-8111-111111111111';
  const second = 'bbbbbbbb-2222-4222-8222-222222222222';
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 2 }),
    cohorts: [{ id: 'cohort-1', name: 'General' }],
    participants: [
      { id: first, cohort_id: 'cohort-1', label: 'First', status: 'completed', revoked_at: null, created_at: '2026-08-01' },
      { id: second, cohort_id: 'cohort-1', label: 'Second', status: 'completed', revoked_at: null, created_at: '2026-08-01' },
    ],
    reports: [{ participant_id: first, pilot_day: 1, prayer_date: '2026-08-10', outcome: 'prayed' }],
    sessions: [{ session_id: 'session-1', devotion_participant_id: first, pilot_day: 2, prayer_date: '2026-08-11', active_play_seconds: 60, panel_open_seconds: 180 }],
    events: [
      event(first, 1, 'devotion_page_opened', { session_id: 'session-1', occurred_at: '2026-08-10T01:00:00Z', acquisition_source: 'qr', acquisition_surface: 'web' }),
      event(first, 1, 'devotion_resource_opened', { session_id: 'session-1', occurred_at: '2026-08-10T01:01:00Z', acquisition_source: 'qr', acquisition_surface: 'web' }),
      event(first, 2, 'devotion_page_opened', { session_id: 'session-2', occurred_at: '2026-08-11T01:00:00Z', acquisition_source: 'sms', acquisition_surface: 'pwa' }),
      event(second, 1, 'devotion_survey_submitted', { session_id: 'session-3', occurred_at: '2026-08-10T01:00:00Z', acquisition_source: 'qr', acquisition_surface: 'web' }),
    ],
    surveyResponses: [
      { participant_id: first, phase: 'pre', status: 'submitted', answers: { hourConfidence: 2, continueLikelihood: 3 } },
      { participant_id: first, phase: 'post', status: 'submitted', answers: { hourConfidence: 4, continueLikelihood: 5, continuedAfterWindow: 'yes' } },
      { participant_id: second, phase: 'post', status: 'partial', answers: { hourConfidence: 5 } },
    ],
  });

  assert.deepEqual(result.research.funnel.stages.map((stage) => [stage.key, stage.count]), [
    ['enrolled', 2], ['opened', 1], ['engaged', 1], ['returned', 1], ['completed', 1], ['continued', 1],
  ]);
  assert.deepEqual(result.research.funnel.reconciliation, { countsMatchDrilldown: true, nested: true });
  assert.equal(result.research.funnel.rawEvidence.find((row) => row.key === 'explicitCompletedStatus').count, 2);
  assert.deepEqual(result.research.survey.pre, { partial: 0, submitted: 1 });
  assert.deepEqual(result.research.survey.post, { partial: 1, submitted: 1 });
  assert.deepEqual(result.research.survey.comparisons.hourConfidence, {
    status: 'exact', pairedParticipants: 1, preAverage: 2, postAverage: 4, change: 2,
  });
  assert.deepEqual(result.research.acquisition, [
    { value: 'qr', storedEventCount: 3, participants: 2 },
    { value: 'sms', storedEventCount: 1, participants: 1 },
  ]);
  assert.deepEqual(result.research.surfaces, [
    { value: 'web', storedEventCount: 3, participants: 2 },
    { value: 'pwa', storedEventCount: 1, participants: 1 },
  ]);
  assert.deepEqual(result.research.devices, [
    { value: 'unknown', storedEventCount: 4, participants: 2 },
  ]);
  assert.equal(result.research.nights[1].activePlayMinutes, 1);
  assert.equal(result.research.nights[1].panelOpenMinutes, 3);
});

test('activity projection and sampled sources disclose lower bounds without changing aggregate reconciliation', () => {
  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const sessions = Array.from({ length: 251 }, (_, index) => ({
    session_id: `session-${String(index).padStart(3, '0')}`,
    devotion_participant_id: participantId,
    pilot_day: 1,
    prayer_date: '2026-08-10',
    started_at: `2026-08-10T${String(Math.floor(index / 60)).padStart(2, '0')}:${String(index % 60).padStart(2, '0')}:00Z`,
    active_play_seconds: index,
    panel_open_seconds: index + 1,
  }));
  const events = sessions.map((session, index) => event(participantId, 1, 'devotion_page_opened', {
    session_id: session.session_id,
    occurred_at: session.started_at,
    acquisition_source: index % 2 ? 'qr' : 'invalid-secret',
    acquisition_surface: 'web',
  }));
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 1 }),
    participants: [{ id: participantId, cohort_id: 'cohort-1', label: 'Participant', status: 'active', revoked_at: null, created_at: '2026-08-01' }],
    detailParticipants: [], cohorts: [], reports: [], surveyResponses: [], sessions, events,
    sourceSampling: { events: true },
  });

  assert.equal(result.activity.status, 'sampled');
  assert.equal(result.activity.observedSessionCount, 251);
  assert.equal(result.activity.shownSessionCount, 40);
  assert.equal(result.activity.sessionCap, 40);
  assert.equal(result.research.funnel.status, 'sampled');
  assert.equal(result.metrics.nightsOpened, 1);
  assert.equal(result.research.acquisition.some((row) => row.value === 'invalid-secret'), false);
});

test('sampled survey completion counts and comparisons carry sampled status', () => {
  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const result = aggregateDevotionAnalytics({
    devotion: devotion(),
    participants: [{ id: participantId, label: 'Participant', status: 'active', revoked_at: null, created_at: '2026-08-01' }],
    detailParticipants: [], cohorts: [], reports: [], events: [], sessions: [],
    surveyResponses: [
      { participant_id: participantId, phase: 'pre', status: 'submitted', answers: { hourConfidence: 2, continueLikelihood: 3 } },
      { participant_id: participantId, phase: 'post', status: 'submitted', answers: { hourConfidence: 4, continueLikelihood: 5 } },
    ],
    sourceSampling: { surveys: true },
  });

  assert.equal(result.research.survey.status, 'sampled');
  assert.deepEqual(result.research.survey.pre, { partial: 0, submitted: 1 });
  assert.equal(result.research.survey.comparisons.hourConfidence.status, 'sampled');
  assert.equal(result.research.survey.comparisons.hourConfidence.change, 2);
});

test('privacy projection fails closed for opaque credentials, PII-like labels, and decoded routes', () => {
  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const opaqueToken = 'A'.repeat(43);
  const hexHash = 'a'.repeat(64);
  const uuid = '123e4567-e89b-42d3-a456-426614174000';
  const sensitiveValues = [
    opaqueToken,
    hexHash,
    uuid,
    '+1 (415) 555-1212',
    'Bearer private-value',
    'sk_live_privatevalue',
    'authorization secret',
    'https://example.test/reset?token=private',
    'jane@example.test',
    'Jane Smith',
    '42 Main Street',
    '192.0.2.10',
    'BearerProductionSecret',
    'AuthorizationBearer',
    'tokenABC123',
    'secretValue',
    'resetToken',
    'apiKey',
    'clientSecret',
    'secretvalue',
    'tokenabc123',
    'resettoken',
    'clientsecret',
    'privatekeyvalue',
    'accesskeyvalue',
    'bearerproductionsecret',
    'CLIENT-SECRET',
    'Private_Key_Value',
  ];
  for (const value of sensitiveValues) assert.equal(isSensitiveOrOpaqueValue(value), true, value);
  assert.equal(isSensitiveOrOpaqueValue('tokenization-reflection'), false);
  assert.equal(isSensitiveOrOpaqueValue('Secretariat Prayer'), false);
  assert.equal(isSensitiveOrOpaqueValue('Author Reflection'), false);
  assert.equal(isSensitiveOrOpaqueValue('Catholic Prayer'), false);

  const events = sensitiveValues.map((value, index) => event(participantId, 1, 'devotion_resource_opened', {
    session_id: `privacy-session-${index}`,
    occurred_at: `2026-08-10T01:${String(index).padStart(2, '0')}:00Z`,
    page_path: `/devotions/${encodeURIComponent(value)}/night-prayer`,
    resource_id: value,
    provider: 'vimeo',
    media_type: 'survey_link',
    source_name: value,
    metadata: { resourceLabel: value },
  }));
  const result = aggregateDevotionAnalytics({
    devotion: devotion(),
    participants: [{ id: participantId, label: 'Participant', status: 'active', revoked_at: null, created_at: '2026-08-01' }],
    detailParticipants: [], cohorts: [], reports: [], sessions: [], surveyResponses: [], events,
  });
  const serialized = JSON.stringify(result);

  for (const value of sensitiveValues) assert.equal(serialized.includes(value), false, value);
  for (const item of result.activity.sessions.flatMap((session) => session.timeline)) {
    assert.equal(item.route, null);
    assert.equal(item.resource.resourceId, 'resource');
    assert.equal(item.resource.provider, 'vimeo');
    assert.equal(item.resource.mediaType, 'survey_link');
  }

  const doubleEncoded = aggregateDevotionAnalytics({
    devotion: devotion(),
    participants: [{ id: participantId, label: 'Participant', status: 'active', revoked_at: null, created_at: '2026-08-01' }],
    detailParticipants: [], cohorts: [], reports: [], sessions: [], surveyResponses: [],
    events: [event(participantId, 1, 'devotion_page_opened', {
      session_id: 'double-encoded-route',
      occurred_at: '2026-08-10T02:00:00Z',
      page_path: '/devotions/Jane%2520Smith/night-prayer',
    })],
  });
  assert.equal(doubleEncoded.activity.sessions[0].timeline[0].route, null);
  assert.equal(JSON.stringify(doubleEncoded).includes('%20'), false);
});

test('nullable numeric evidence remains unavailable and the first valid chronological context wins', () => {
  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 2 }),
    participants: [{ id: participantId, label: 'Participant', status: 'active', revoked_at: null, created_at: '2026-08-01' }],
    detailParticipants: [], cohorts: [], reports: [], surveyResponses: [],
    sessions: [{
      session_id: 'context-session', devotion_participant_id: participantId,
      pilot_day: null, prayer_date: null, started_at: null, ended_at: null,
      active_play_seconds: null, panel_open_seconds: ' ', highest_progress: null,
      provider: 'vimeo', media_type: 'survey_link', resource_id: 'post-survey',
    }],
    events: [
      event(participantId, 1, 'devotion_survey_started', {
        session_id: 'context-session', occurred_at: 'malformed', prayer_date: '2026-08-10',
        playback_seconds: null, progress_percent: '',
      }),
      event(participantId, null, 'devotion_survey_started', {
        session_id: 'context-session', occurred_at: '2026-08-10T01:00:00Z', prayer_date: null,
        playback_seconds: null, progress_percent: null,
      }),
      event(participantId, 2, 'devotion_page_opened', {
        session_id: 'context-session', occurred_at: '2026-08-11T01:00:00Z', prayer_date: '2026-08-11',
        playback_seconds: '', progress_percent: undefined,
      }),
    ],
  });
  const session = result.activity.sessions[0];

  assert.equal(session.pilotDay, 2);
  assert.equal(session.prayerDate, '2026-08-11');
  assert.equal(session.startedAt, '2026-08-10T01:00:00Z');
  assert.equal(session.durationMeasures.activePlaySeconds, null);
  assert.equal(session.durationMeasures.panelOpenSeconds, null);
  assert.equal(session.highestProgressStored, null);
  assert.deepEqual(session.timeline.map((item) => item.timestamp), [
    '2026-08-10T01:00:00Z', '2026-08-11T01:00:00Z', null,
  ]);
  assert.equal(session.timeline.every((item) => item.playbackSecondsStored === null), true);
  assert.equal(session.timeline.every((item) => item.progressPercentStored === null), true);
  assert.deepEqual(session.resource, {
    resourceId: 'post-survey', label: 'Post Survey', provider: 'vimeo', mediaType: 'survey_link',
  });
});

test('pilot days are canonical campaign-bounded integers for returned and participant-day evidence', () => {
  const invalidOnly = 'aaaaaaaa-1111-4111-8111-111111111111';
  const validReturn = 'bbbbbbbb-2222-4222-8222-222222222222';
  const participants = [invalidOnly, validReturn].map((id) => ({
    id, label: 'Participant', status: 'completed', revoked_at: null, created_at: '2026-08-01',
  }));
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 2 }), participants, detailParticipants: participants,
    cohorts: [], surveyResponses: [],
    events: [
      event(invalidOnly, '1', 'devotion_page_opened'),
      event(invalidOnly, 1, 'devotion_resource_opened'),
      event(invalidOnly, -1, 'devotion_page_opened'),
      event(invalidOnly, 40, 'devotion_page_opened'),
      event(validReturn, '1', 'devotion_page_opened'),
      event(validReturn, 1, 'devotion_resource_opened'),
    ],
    reports: [
      { participant_id: invalidOnly, pilot_day: '01', prayer_date: '2026-08-10', outcome: 'prayed' },
      { participant_id: validReturn, pilot_day: '2', prayer_date: '2026-08-11', outcome: 'prayed' },
    ],
    sessions: [
      { devotion_participant_id: invalidOnly, pilot_day: -1, active_play_seconds: 60 },
      { devotion_participant_id: invalidOnly, pilot_day: 40, active_play_seconds: 60 },
    ],
  });
  const returned = result.research.funnel.stages.find((stage) => stage.key === 'returned');
  const completed = result.research.funnel.stages.find((stage) => stage.key === 'completed');
  const rawCompleted = result.research.funnel.rawEvidence.find((row) => row.key === 'explicitCompletedStatus');

  assert.equal(returned.count, 1);
  assert.equal(completed.count, 1);
  assert.equal(rawCompleted.count, 2);
  assert.equal(rawCompleted.participantSafeIds.some((id) => id.includes(invalidOnly)), false);
  assert.deepEqual(result.research.participantDays.map((row) => [row.participantSafeId, row.pilotDay]), [
    [result.participants[0].safeId, 1],
    [result.participants[1].safeId, 1],
    [result.participants[1].safeId, 2],
  ]);
  assert.equal(result.metrics.measuredMediaMinutes, null);
  assert.equal(result.metrics.measuredMediaStatus, 'unavailable');
});

test('out-of-range stored evidence advances opened and engaged but never day views or returned', () => {
  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const participant = {
    id: participantId, label: 'Participant', status: 'completed',
    revoked_at: null, created_at: '2026-08-01',
  };
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 2 }),
    participants: [participant], detailParticipants: [participant], cohorts: [], surveyResponses: [],
    events: [
      event(participantId, 40, 'devotion_page_opened'),
      event(participantId, 40, 'devotion_resource_opened'),
    ],
    reports: [{
      participant_id: participantId, pilot_day: 40,
      prayer_date: '2026-09-18', outcome: 'prayed',
    }],
    sessions: [{
      session_id: 'out-of-range-session', devotion_participant_id: participantId,
      pilot_day: 40, prayer_date: '2026-09-18', active_play_seconds: 120,
    }],
  });
  const stages = Object.fromEntries(result.research.funnel.stages.map((stage) => [stage.key, stage]));

  assert.equal(stages.opened.count, 1);
  assert.equal(stages.engaged.count, 1);
  assert.equal(stages.returned.count, 0);
  assert.equal(stages.completed.count, 0);
  assert.deepEqual(result.research.participantDays, []);
  assert.equal(result.nightRollup.every((night) => night.opened === 0 && night.engaged === 0 && night.reported === 0), true);
  assert.equal(result.metrics.nightsOpened, 0);
  assert.equal(result.metrics.reportedPrayed, 0);
  assert.equal(result.metrics.measuredMediaMinutes, null);
});

test('missing survey and acquisition schemas render unavailable without erasing independent evidence', () => {
  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const result = aggregateDevotionAnalytics({
    devotion: devotion(),
    participants: [{ id: participantId, label: 'Participant', status: 'completed', revoked_at: null, created_at: '2026-08-01' }],
    detailParticipants: [], cohorts: [], reports: [], sessions: [], surveyResponses: [],
    events: [event(participantId, 1, 'devotion_page_opened', {
      session_id: 'readiness-session', occurred_at: '2026-08-10T01:00:00Z',
      acquisition_source: 'qr', acquisition_surface: 'pwa', device_class: 'mobile',
    })],
    sourceReadiness: { survey: false, acquisition: false },
  });
  const continued = result.research.funnel.stages.find((stage) => stage.key === 'continued');

  assert.equal(result.research.funnel.stages.find((stage) => stage.key === 'opened').status, 'exact');
  assert.equal(result.research.funnel.status, 'unavailable');
  assert.equal(continued.status, 'unavailable');
  assert.equal(continued.count, null);
  assert.equal(result.research.survey.status, 'unavailable');
  assert.equal(result.research.survey.pre, null);
  assert.equal(result.research.survey.comparisons.hourConfidence.status, 'unavailable');
  assert.equal(result.research.acquisitionStatus, 'unavailable');
  assert.deepEqual(result.research.acquisition, []);
  assert.equal(result.research.surfaceStatus, 'unavailable');
  assert.deepEqual(result.research.surfaces, []);
  assert.equal(result.activity.attributionStatus, 'unavailable');
  assert.deepEqual(result.research.devices, [
    { value: 'mobile', storedEventCount: 1, participants: 1 },
  ]);
});

test('duration aggregates distinguish unavailable, partial known-only sums, and explicit zero', () => {
  assert.deepEqual(aggregateDurationEvidence([null, undefined, ' ']), {
    seconds: null, status: 'unavailable', observedValues: 3, knownValues: 0,
  });
  assert.deepEqual(aggregateDurationEvidence([null, 60]), {
    seconds: 60, status: 'partial', observedValues: 2, knownValues: 1,
  });
  assert.deepEqual(aggregateDurationEvidence([0]), {
    seconds: 0, status: 'exact', observedValues: 1, knownValues: 1,
  });
  assert.deepEqual(aggregateDurationEvidence([60], { sampled: true }), {
    seconds: 60, status: 'partial', observedValues: 1, knownValues: 1,
  });

  const participantId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const participant = {
    id: participantId, label: 'Participant', status: 'active', revoked_at: null, created_at: '2026-08-01',
  };
  const sessions = [
    durationSession(participantId, 1, 'all-null', null, undefined),
    durationSession(participantId, 2, 'mixed', null, null),
    durationSession(participantId, 2, 'mixed', 60, 30),
    durationSession(participantId, 3, 'explicit-zero', 0, 0),
  ];
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 3 }), participants: [participant], detailParticipants: [participant],
    cohorts: [], reports: [], events: [], surveyResponses: [], sessions,
  });

  assert.deepEqual(
    result.participants[0].nights.map((night) => [night.measuredMediaMinutes, night.measuredMediaStatus]),
    [[null, 'unavailable'], [1, 'partial'], [0, 'exact']],
  );
  assert.deepEqual(
    result.nightRollup.map((night) => [night.measuredMediaMinutes, night.measuredMediaStatus]),
    [[null, 'unavailable'], [1, 'partial'], [0, 'exact']],
  );
  assert.deepEqual(
    result.research.nights.map((night) => [night.activePlayMinutes, night.activePlayStatus, night.panelOpenMinutes, night.panelOpenStatus]),
    [[null, 'unavailable', null, 'unavailable'], [1, 'partial', 0.5, 'partial'], [0, 'exact', 0, 'exact']],
  );
  assert.deepEqual(
    result.research.participantDays.map((day) => [day.activePlaySecondsStored, day.activePlayStatus, day.panelOpenSecondsStored, day.panelOpenStatus]),
    [[null, 'unavailable', null, 'unavailable'], [60, 'partial', 30, 'partial'], [0, 'exact', 0, 'exact']],
  );
  assert.deepEqual(
    result.research.nights.map((night) => night.resources[0]).map((resource) => [
      resource.activePlayMinutes,
      resource.activePlayStatus,
      resource.panelOpenMinutes,
      resource.panelOpenStatus,
    ]),
    [[null, 'unavailable', null, 'unavailable'], [1, 'partial', 0.5, 'partial'], [0, 'exact', 0, 'exact']],
  );
  assert.deepEqual(
    result.participants[0].nights.map((night) => night.resources[0]).map((resource) => [
      resource.measuredMinutes,
      resource.measuredStatus,
    ]),
    [[null, 'unavailable'], [1, 'partial'], [0, 'exact']],
  );
  assert.equal(result.metrics.measuredMediaMinutes, 1);
  assert.equal(result.metrics.measuredMediaStatus, 'partial');
});

test('all response evidence arrays honor projection caps and the full payload stays buffered-safe', () => {
  const participants = Array.from({ length: 2_000 }, (_, index) => ({
    id: `${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`,
    label: `Participant ${index + 1}`,
    cohort_id: 'cohort-1',
    status: 'enrolled',
    revoked_at: null,
    created_at: '2026-08-01',
  }));
  const participantId = participants[0].id;
  const sessions = Array.from({ length: 60 }, (_, sessionIndex) => ({
    session_id: `bounded-session-${sessionIndex}`,
    devotion_participant_id: participantId,
    pilot_day: sessionIndex % 2 + 1,
    prayer_date: sessionIndex % 2 ? '2026-08-11' : '2026-08-10',
    started_at: `2026-08-${sessionIndex % 2 ? '11' : '10'}T01:${String(sessionIndex).padStart(2, '0')}:00Z`,
    active_play_seconds: 60,
    panel_open_seconds: 120,
  }));
  const events = sessions.flatMap((session, sessionIndex) => Array.from({ length: 40 }, (_, eventIndex) => event(
    participantId,
    session.pilot_day,
    eventIndex === 0 ? 'devotion_page_opened' : 'devotion_resource_opened',
    {
      session_id: session.session_id,
      prayer_date: session.prayer_date,
      occurred_at: session.started_at.replace(':00Z', `:${String(eventIndex).padStart(2, '0')}Z`),
      resource_id: `item-${sessionIndex}-${eventIndex}-media`,
      provider: 'vimeo',
      media_type: 'video',
      metadata: { resourceLabel: `Night prayer item ${sessionIndex} ${eventIndex}` },
    },
  )));
  const surveyResponses = Array.from({ length: 300 }, (_, index) => ({
    participant_id: participantId,
    phase: index % 2 ? 'pre' : 'post',
    status: 'submitted',
    answers: { hourConfidence: 3, continueLikelihood: 4, continuedAfterWindow: 'yes' },
  }));
  const result = aggregateDevotionAnalytics({
    devotion: devotion({ duration_days: 40 }), participants, detailParticipants: participants.slice(0, 100),
    cohorts: [{ id: 'cohort-1', name: 'General' }], reports: [], surveyResponses, sessions, events,
  });
  const projectedSurveyResponses = Array.from({ length: 250 }, (_, index) => ({
    devotionSafeId: 'devotion-303617b973',
    participantSafeId: 'participant-1234567890',
    phase: index % 2 ? 'pre' : 'post',
    status: 'submitted',
    answers: { hourConfidence: 3, continueLikelihood: 4, continuedAfterWindow: 'yes' },
    startedAt: '2026-08-25T02:00:00Z',
    submittedAt: '2026-08-25T02:01:00Z',
    updatedAt: '2026-08-25T02:01:00Z',
  }));
  const fullResponse = {
    ...result,
    surveyResponses: projectedSurveyResponses,
    surveyResponseDetail: { status: 'sampled', observed: 300, shown: 250, cap: 250 },
  };
  const bytes = Buffer.byteLength(JSON.stringify(fullResponse), 'utf8');

  assert.equal(result.activity.sessionCap, 40);
  assert.equal(result.activity.timelineCap, 20);
  assert.equal(result.activity.sessions.length, 40);
  assert.equal(result.activity.sessions.every((session) => session.timeline.length === 20), true);
  assert.equal(result.participants.length, 100);
  assert.equal(result.participants.every((participant) => participant.nights.length === 40), true);
  assert.equal(result.participants[0].nights.every((night) => night.resources.length <= 25), true);
  assert.equal(result.research.nights.every((night) => night.resources.length <= 50), true);
  assert.equal(result.participants[0].nights.slice(0, 2).every((night) => night.resourceEvidenceStatus === 'sampled'), true);
  assert.equal(result.research.nights.slice(0, 2).every((night) => night.resourceEvidenceStatus === 'sampled'), true);
  assert.equal(projectedSurveyResponses.length, 250);
  assert.ok(bytes <= 1_500_000, `serialized payload was ${bytes} bytes`);
});

function devotion(overrides = {}) {
  return {
    id: 'devotion-1', slug: 'test', name: 'Test', organization_label: 'Test',
    start_date: '2026-08-10', duration_days: 1, timezone: 'UTC', status: 'active',
    pre_survey_url: null, post_survey_url: null, ...overrides,
  };
}

function event(participantId, pilotDay, eventName, extra = {}) {
  return {
    devotion_participant_id: participantId,
    pilot_day: pilotDay,
    prayer_date: '2026-08-10',
    event_name: eventName,
    ...extra,
  };
}

function durationSession(participantId, pilotDay, resourceId, active, panel) {
  return {
    session_id: `duration-session-${pilotDay}-${resourceId}`,
    devotion_participant_id: participantId,
    pilot_day: pilotDay,
    prayer_date: `2026-08-${String(9 + pilotDay).padStart(2, '0')}`,
    resource_id: resourceId,
    provider: 'vimeo',
    media_type: 'video',
    active_play_seconds: active,
    panel_open_seconds: panel,
  };
}
