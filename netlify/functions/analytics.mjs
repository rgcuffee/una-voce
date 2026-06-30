import { createClient } from '@supabase/supabase-js';

const EVENT_NAMES = new Set([
  'prayer_session_started',
  'prayer_play_started',
  'prayer_play_paused',
  'prayer_play_resumed',
  'prayer_progress',
  'prayer_completed',
  'prayer_session_ended',
  'source_opened',
]);

const JSON_HEADERS = {
  'content-type': 'application/json',
};

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  if (!supabase) {
    return response(500, { error: 'Analytics is not configured' });
  }

  const payload = parsePayload(event.body);
  if (!payload.ok) {
    return response(400, { error: payload.error });
  }

  const detail = payload.value;
  const validationError = validateAnalyticsEvent(detail);
  if (validationError) {
    return response(400, { error: validationError });
  }

  const anonymousId = detail.anonymousId;
  const occurredAt = detail.occurredAt ?? new Date().toISOString();
  const locale = detail.locale ?? 'en-US';
  const metadata = compactMetadata({
    sourceName: detail.sourceName,
    sourceType: detail.sourceType,
    provider: detail.provider,
    videoId: detail.videoId,
    pageContext: detail.pageContext,
    ...detail.metadata,
  });

  const { error: eventError } = await supabase.from('analytics_events').insert({
    occurred_at: occurredAt,
    session_id: detail.sessionId,
    event_name: detail.eventName,
    prayer_id: detail.prayerId,
    ministry_id: detail.ministryId,
    hour: detail.hour,
    locale,
    user_id: detail.userId ?? null,
    anonymous_id: anonymousId,
    progress_percent: detail.progressPercent,
    playback_seconds: detail.playbackSeconds,
    metadata,
  });

  if (eventError) {
    return response(500, { error: 'Unable to record analytics event' });
  }

  const sessionError = await updateAnalyticsSession({
    ...detail,
    anonymousId,
    locale,
    occurredAt,
  });

  if (sessionError) {
    return response(500, { error: 'Unable to update analytics session' });
  }

  return response(202, { ok: true });
}

function parsePayload(body) {
  if (!body) {
    return { ok: false, error: 'Missing request body' };
  }

  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
}

function validateAnalyticsEvent(detail) {
  if (!detail || typeof detail !== 'object') {
    return 'Invalid analytics payload';
  }

  if (!isUuid(detail.sessionId)) {
    return 'Invalid sessionId';
  }

  if (!EVENT_NAMES.has(detail.eventName)) {
    return 'Invalid eventName';
  }

  if (!isIsoDate(detail.startedAt)) {
    return 'Invalid startedAt';
  }

  if (detail.occurredAt !== undefined && !isIsoDate(detail.occurredAt)) {
    return 'Invalid occurredAt';
  }

  if (!isNonEmptyString(detail.anonymousId)) {
    return 'Invalid anonymousId';
  }

  if (
    detail.progressPercent !== undefined &&
    !isIntegerBetween(detail.progressPercent, 0, 100)
  ) {
    return 'Invalid progressPercent';
  }

  if (
    detail.playbackSeconds !== undefined &&
    !isNonNegativeInteger(detail.playbackSeconds)
  ) {
    return 'Invalid playbackSeconds';
  }

  if (
    detail.activePlaySeconds !== undefined &&
    !isNonNegativeInteger(detail.activePlaySeconds)
  ) {
    return 'Invalid activePlaySeconds';
  }

  if (
    detail.panelOpenSeconds !== undefined &&
    !isNonNegativeInteger(detail.panelOpenSeconds)
  ) {
    return 'Invalid panelOpenSeconds';
  }

  return null;
}

async function updateAnalyticsSession(detail) {
  if (detail.eventName === 'prayer_session_started') {
    const { error } = await supabase.from('analytics_sessions').upsert(
      {
        session_id: detail.sessionId,
        started_at: detail.startedAt,
        ministry_id: detail.ministryId,
        prayer_id: detail.prayerId,
        hour: detail.hour,
        locale: detail.locale,
        user_id: detail.userId ?? null,
        anonymous_id: detail.anonymousId,
        source_name: detail.sourceName,
        source_type: detail.sourceType,
        provider: detail.provider,
        video_id: detail.videoId,
        page_context: detail.pageContext,
      },
      { onConflict: 'session_id' },
    );

    return error;
  }

  const updates = sessionUpdatesFor(detail);
  if (Object.keys(updates).length === 0) {
    return null;
  }

  const { error } = await supabase
    .from('analytics_sessions')
    .update(updates)
    .eq('session_id', detail.sessionId);

  return error;
}

function sessionUpdatesFor(detail) {
  const updates = {};

  if (detail.eventName === 'prayer_session_ended') {
    updates.ended_at = detail.occurredAt ?? new Date().toISOString();
    updates.panel_open_seconds = detail.panelOpenSeconds;
    updates.active_play_seconds = detail.activePlaySeconds ?? 0;
  }

  if (detail.eventName === 'source_opened') {
    updates.opened_source = true;
  }

  if (detail.eventName === 'prayer_completed') {
    updates.completed = true;
    updates.highest_progress = 100;
  }

  if (
    detail.eventName === 'prayer_progress' &&
    typeof detail.progressPercent === 'number'
  ) {
    updates.highest_progress = detail.progressPercent;
  }

  if (typeof detail.activePlaySeconds === 'number') {
    updates.active_play_seconds = detail.activePlaySeconds;
  }

  return updates;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}

function compactMetadata(metadata) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}

function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isIntegerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}
