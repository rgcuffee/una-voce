import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import {
  sanitizeAnalyticsMetadata,
  sanitizeAnalyticsPagePath,
  sanitizeAnalyticsReferrer,
} from '../../src/lib/analyticsPrivacy.mjs';
import {
  ANALYTICS_EVENT_NAMES,
  isRfc3339Timestamp,
  isCanonicalAcquisitionSource,
  isCanonicalAcquisitionSurface,
  validateAnalyticsEventContract,
} from '../../src/lib/analyticsContract.mjs';

const EVENT_NAMES = new Set(ANALYTICS_EVENT_NAMES);

const JSON_HEADERS = {
  'content-type': 'application/json',
};
const UNSUPPORTED_EVENT_WITHOUT_MIGRATION = Symbol('unsupported_event_without_migration');

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

export function createAnalyticsHandler(client) {
  return async function analyticsHandler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (event.httpMethod !== 'POST') {
    return response(405, { error: 'Method not allowed' });
  }

  if (!client) {
    return response(500, { error: 'Analytics is not configured' });
  }

  if (typeof event.body === 'string' && Buffer.byteLength(event.body, 'utf8') > 64 * 1024) return response(400, { error: 'Analytics payload too large' });
  const payload = parsePayload(event.body);
  if (!payload.ok) {
    return response(400, { error: payload.error });
  }

  const detail = sanitizeAnalyticsMetadata(payload.value);
  detail.pagePath = sanitizeAnalyticsPagePath(detail.pagePath) || undefined;
  detail.referrer = sanitizeAnalyticsReferrer(detail.referrer) || undefined;
  detail.sourceUrl = sanitizeAnalyticsReferrer(detail.sourceUrl) || undefined;
  const validationError = validateAnalyticsEvent(detail);
  if (validationError) {
    return response(400, { error: validationError });
  }

  const anonymousId = detail.anonymousId;
  const occurredAt = detail.occurredAt ?? new Date().toISOString();
  const locale = detail.locale ?? 'en-US';
  const metadata = compactMetadata({
    ...detail.metadata,
    sourceName: detail.sourceName,
    sourceType: detail.sourceType,
    provider: detail.provider,
    videoId: detail.videoId,
    pageContext: detail.pageContext,
    pagePath: detail.pagePath,
    referrer: detail.referrer,
    utmSource: detail.utmSource,
    utmMedium: detail.utmMedium,
    utmCampaign: detail.utmCampaign,
    utmContent: detail.utmContent,
    deviceClass: detail.deviceClass,
    partnerId: detail.partnerId,
    communitySlug: detail.communitySlug,
    contentId: detail.contentId,
    contentType: detail.contentType,
    sourceUrl: detail.sourceUrl,
    devotionId: detail.devotionId,
    devotionParticipantId: detail.devotionParticipantId,
    pilotDay: detail.pilotDay,
    prayerDate: detail.prayerDate,
    resourceId: detail.resourceId,
    mediaType: detail.mediaType,
    acquisitionSource: detail.acquisitionSource,
    acquisitionSurface: detail.acquisitionSurface,
    acquisitionMedium: detail.acquisitionMedium,
    acquisitionCampaign: detail.acquisitionCampaign,
    acquisitionContent: detail.acquisitionContent,
    acquisitionTerm: detail.acquisitionTerm,
    installSurface: detail.installSurface,
  });
  if (Buffer.byteLength(JSON.stringify(metadata), 'utf8') > 16 * 1024) return response(400, { error: 'Analytics metadata too large' });

  const eventRow = {
    event_id: detail.eventId,
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
    page_path: detail.pagePath,
    page_context: detail.pageContext,
    referrer: detail.referrer,
    utm_source: detail.utmSource,
    utm_medium: detail.utmMedium,
    utm_campaign: detail.utmCampaign,
    utm_content: detail.utmContent,
    device_class: detail.deviceClass,
    partner_id: detail.partnerId ?? null,
    community_slug: detail.communitySlug,
    content_id: detail.contentId,
    content_type: detail.contentType,
    provider: detail.provider,
    source_url: detail.sourceUrl,
    metadata,
    devotion_id: detail.devotionId ?? null,
    devotion_participant_id: detail.devotionParticipantId ?? null,
    pilot_day: detail.pilotDay ?? null,
    prayer_date: detail.prayerDate ?? null,
    resource_id: detail.resourceId ?? null,
    media_type: detail.mediaType ?? null,
    acquisition_source: detail.acquisitionSource ?? null,
    acquisition_surface: detail.acquisitionSurface ?? null,
    acquisition_medium: detail.acquisitionMedium ?? null,
    acquisition_campaign: detail.acquisitionCampaign ?? null,
    acquisition_content: detail.acquisitionContent ?? null,
    acquisition_term: detail.acquisitionTerm ?? null,
  };
  eventRow.payload_fingerprint = analyticsPayloadFingerprint(detail);

  // New schemas use one database transaction for the event and its rollup.
  // A two-step fallback is deliberately used only before that RPC exists.
  const sessionDetail = {
    ...detail,
    anonymousId,
    locale,
    occurredAt,
  };
  const atomic = await recordAnalyticsAtomically(client, eventRow, sessionDetail);
  if (atomic?.error) return response(500, { error: 'Unable to record analytics event' });
  if (atomic?.duplicate) return response(202, { ok: true, duplicate: true });
  if (atomic?.inserted) return response(202, { ok: true });

  const inserted = await insertAnalyticsEvent(client, eventRow);

  if (inserted === UNSUPPORTED_EVENT_WITHOUT_MIGRATION) {
    return response(202, {
      ok: true,
      skipped: true,
      reason: 'Analytics schema migration is required for this event.',
    });
  }

  if (inserted?.error) {
    return response(500, { error: 'Unable to record analytics event' });
  }
  if (inserted?.duplicate) {
    // A non-atomic insert may have committed while its session mutation
    // failed. Always run the idempotent session mutation before acknowledging
    // an exact retry (it is a no-op for events without a session rollup).
    const repairError = await updateAnalyticsSession(client, sessionDetail);
    if (repairError) return response(500, { error: 'Unable to update analytics session' });
    return response(202, { ok: true, duplicate: true });
  }

  const sessionError = await updateAnalyticsSession(client, sessionDetail);

  if (sessionError) {
    return response(500, { error: 'Unable to update analytics session' });
  }

  return response(202, { ok: true });
  };
}

export const handler = createAnalyticsHandler(supabase);

async function insertAnalyticsEvent(client, row) {
  const table = client.from('analytics_events');
  // The unique event_id constraint makes the first insert authoritative. A
  // duplicate is looked up only to distinguish a retry from cross-session ID
  // reuse; an exact retry repairs its idempotent session rollup in the caller.
  const { error } = await table.insert(row);

  if (!error) {
    return { inserted: true };
  }

  if (isDuplicateEventIdError(error) && row.event_id && typeof table.select === 'function') {
    const existing = await table.select('session_id, payload_fingerprint').eq('event_id', row.event_id).maybeSingle();
    if (!existing?.error && existing?.data?.session_id === row.session_id && existing?.data?.payload_fingerprint === row.payload_fingerprint) return { duplicate: true };
    return { error: new Error('Conflicting analytics event ID') };
  }

  if (isUnsupportedEventNameError(error)) {
    return UNSUPPORTED_EVENT_WITHOUT_MIGRATION;
  }

  if (!isMissingAnalyticsMigrationError(error)) {
    return { error };
  }

  const legacyRow = {
    occurred_at: row.occurred_at,
    session_id: row.session_id,
    event_name: row.event_name,
    prayer_id: row.prayer_id,
    ministry_id: row.ministry_id,
    hour: row.hour,
    locale: row.locale,
    user_id: row.user_id,
    anonymous_id: row.anonymous_id,
    progress_percent: row.progress_percent,
    playback_seconds: row.playback_seconds,
    metadata: { ...row.metadata, _analyticsEventId: row.event_id, _analyticsPayloadFingerprint: row.payload_fingerprint },
  };
  const priorLegacy = await findLegacyEvent(client, row.event_id);
  if (priorLegacy) {
    const priorFingerprint = priorLegacy.metadata?._analyticsPayloadFingerprint;
    if (priorLegacy.session_id === row.session_id && priorFingerprint === row.payload_fingerprint) return { duplicate: true, legacy: true };
    return { error: new Error('Conflicting analytics event ID') };
  }
  const { error: legacyError } = await client.from('analytics_events').insert(legacyRow);

  if (!legacyError) {
    return { inserted: true, legacy: true };
  }

  if (isUnsupportedEventNameError(legacyError)) {
    return UNSUPPORTED_EVENT_WITHOUT_MIGRATION;
  }

  return { error: legacyError };
}

async function findLegacyEvent(client, eventId) {
  if (!eventId) return null;
  try {
    const table = client.from('analytics_events');
    if (typeof table.select !== 'function') return null;
    const query = table.select('session_id, metadata');
    if (typeof query.contains !== 'function') return null;
    const result = await query.contains('metadata', { _analyticsEventId: eventId }).limit(1).maybeSingle();
    return result?.data ?? null;
  } catch { return null; }
}

async function recordAnalyticsAtomically(client, eventRow, sessionDetail) {
  if (typeof client.rpc !== 'function') return null;
  const { data, error } = await client.rpc('record_campaign_analytics_event', {
    p_event: eventRow,
    p_session: sessionDetail,
  });
  if (error && isMissingAnalyticsRpcError(error)) return null;
  if (error) return { error };
  const result = Array.isArray(data) ? data[0] : data;
  if (result?.status === 'duplicate') return { duplicate: true };
  if (result?.status === 'inserted') return { inserted: true };
  return { error: new Error('Unexpected analytics RPC response') };
}

function analyticsPayloadFingerprint(detail) {
  return createHash('sha256').update(stableJson(detail)).digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function parsePayload(body) {
  if (!body) {
    return { ok: false, error: 'Missing request body' };
  }

  try {
    const value = JSON.parse(body);
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, error: 'Invalid analytics payload' };
    }
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
}

export function validateAnalyticsEvent(detail) {
  if (!detail || typeof detail !== 'object') {
    return 'Invalid analytics payload';
  }

  if (!isUuid(detail.sessionId)) {
    return 'Invalid sessionId';
  }

  if (!EVENT_NAMES.has(detail.eventName)) {
    return 'Invalid eventName';
  }

  if (detail.eventId !== undefined && !isBoundedString(detail.eventId, 160)) {
    return 'Invalid eventId';
  }

  if (!isRfc3339Timestamp(detail.startedAt)) {
    return 'Invalid startedAt';
  }

  if (detail.occurredAt !== undefined && !isRfc3339Timestamp(detail.occurredAt)) {
    return 'Invalid occurredAt';
  }

  if (!isNonEmptyString(detail.anonymousId)) {
    return 'Invalid anonymousId';
  }

  for (const [field, limit] of Object.entries({ anonymousId: 160, locale: 35, prayerId: 160, ministryId: 160, hour: 80, sourceName: 200, sourceType: 120, provider: 120, videoId: 120, pageContext: 120, pagePath: 2048, referrer: 2048, sourceUrl: 2048, utmSource: 160, utmMedium: 160, utmCampaign: 160, utmContent: 160, deviceClass: 32, communitySlug: 160, contentId: 500, contentType: 80 })) {
    if (detail[field] !== undefined && !isBoundedString(detail[field], limit)) return `Invalid ${field}`;
  }

  if (detail.acquisitionSource !== undefined && !isCanonicalAcquisitionSource(detail.acquisitionSource)) return 'Invalid acquisitionSource';
  if (detail.acquisitionSurface !== undefined && !isCanonicalAcquisitionSurface(detail.acquisitionSurface)) return 'Invalid acquisitionSurface';
  for (const field of ['acquisitionMedium', 'acquisitionCampaign', 'acquisitionContent', 'acquisitionTerm']) {
    if (detail[field] !== undefined && detail[field] !== null && !isBoundedString(detail[field], 120)) return `Invalid ${field}`;
  }

  if (detail.partnerId !== undefined && detail.partnerId !== null && !isUuid(detail.partnerId)) {
    return 'Invalid partnerId';
  }

  if (detail.userId !== undefined && detail.userId !== null && !isUuid(detail.userId)) {
    return 'Invalid userId';
  }

  if (detail.devotionId !== undefined && !isUuid(detail.devotionId)) {
    return 'Invalid devotionId';
  }

  if (
    detail.devotionParticipantId !== undefined &&
    !isUuid(detail.devotionParticipantId)
  ) {
    return 'Invalid devotionParticipantId';
  }

  if (
    detail.pilotDay !== undefined &&
    detail.pilotDay !== null &&
    !isIntegerBetween(detail.pilotDay, 1, 40)
  ) {
    return 'Invalid pilotDay';
  }

  if (
    detail.prayerDate !== undefined &&
    detail.prayerDate !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(detail.prayerDate)
  ) {
    return 'Invalid prayerDate';
  }

  if (detail.resourceId !== undefined && !isBoundedString(detail.resourceId, 500)) {
    return 'Invalid resourceId';
  }

  if (detail.mediaType !== undefined && !isBoundedString(detail.mediaType, 80)) {
    return 'Invalid mediaType';
  }

  const contractError = validateAnalyticsEventContract(detail);
  if (contractError) return contractError;

  if (detail.devotionId || detail.devotionParticipantId || detail.eventName.startsWith('devotion_')) {
    if (!detail.devotionId || !detail.devotionParticipantId) {
      return 'Missing devotion attribution';
    }
    if (
      !['devotion_survey_clicked', 'devotion_survey_started', 'devotion_survey_submitted'].includes(detail.eventName) &&
      (!detail.pilotDay || !detail.prayerDate)
    ) {
      return 'Missing devotion night attribution';
    }
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

async function updateAnalyticsSession(client, detail) {
  if (detail.eventName === 'prayer_session_started') {
    const { error } = await client.from('analytics_sessions').upsert(
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
        devotion_id: detail.devotionId ?? null,
        devotion_participant_id: detail.devotionParticipantId ?? null,
        pilot_day: detail.pilotDay ?? null,
        prayer_date: detail.prayerDate ?? null,
        resource_id: detail.resourceId ?? null,
        media_type: detail.mediaType ?? null,
        ...(detail.acquisitionSource !== undefined ? {
          acquisition_source: detail.acquisitionSource,
          acquisition_surface: detail.acquisitionSurface,
          acquisition_medium: detail.acquisitionMedium,
          acquisition_campaign: detail.acquisitionCampaign,
          acquisition_content: detail.acquisitionContent,
          acquisition_term: detail.acquisitionTerm,
        } : {}),
      },
      { onConflict: 'session_id' },
    );

    if (!error || !isMissingAnalyticsMigrationError(error)) return error;
    return legacySessionUpsert(client, detail);
  }

  const updates = sessionUpdatesFor(detail);
  if (Object.keys(updates).length === 0) {
    return null;
  }

  const query = client
    .from('analytics_sessions')
    .update(updates)
    .eq('session_id', detail.sessionId);
  const result = typeof query.select === 'function'
    ? await query.select('session_id').maybeSingle()
    : await query;

  if (result.error) return result.error;
  if ('data' in result && !result.data) return new Error('Missing prayer analytics session for rollup');
  return null;
}

async function legacySessionUpsert(client, detail) {
  const { error } = await client.from('analytics_sessions').upsert(
    {
      session_id: detail.sessionId,
      started_at: detail.startedAt,
      ministry_id: detail.ministryId,
      prayer_id: detail.prayerId,
      hour: detail.hour,
      locale: detail.locale,
      user_id: detail.userId ?? null,
      anonymous_id: detail.anonymousId,
    },
    { onConflict: 'session_id' },
  );
  return error;
}

function sessionUpdatesFor(detail) {
  const updates = {};

  if (detail.eventName === 'prayer_session_ended') {
    updates.ended_at = detail.occurredAt ?? new Date().toISOString();
    updates.panel_open_seconds = detail.panelOpenSeconds;
    updates.active_play_seconds = detail.activePlaySeconds ?? 0;
  }

  if (detail.eventName === 'source_opened' || detail.eventName === 'platform_opened') {
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

function isMissingAnalyticsMigrationError(error) {
  return (
    error?.code === '42703' ||
    error?.code === 'PGRST204' ||
    /column .* does not exist/i.test(error?.message ?? '') ||
    /could not find the .* column/i.test(error?.message ?? '')
  );
}

function isMissingAnalyticsRpcError(error) {
  const message = error?.message ?? '';
  return (error?.code === 'PGRST202' || error?.code === '42883') &&
    /record_campaign_analytics_event/i.test(message) &&
    /function|schema cache|does not exist|could not find/i.test(message);
}


function isUnsupportedEventNameError(error) {
  return (
    error?.code === '22P02' ||
    /invalid input value for enum/i.test(error?.message ?? '')
  );
}

function isDuplicateEventIdError(error) {
  return error?.code === '23505' || /duplicate key|unique constraint/i.test(error?.message ?? '');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function isBoundedString(value, maximum) {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

function isIntegerBetween(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}
