import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { createAdminAuthorizer } from './lib/admin-auth.mjs';
import { aggregateDevotionAnalytics } from './lib/devotion-analytics.mjs';
import {
  DEVOTION_SLUG,
  deriveParticipantToken,
  hashParticipantToken,
  participantLink,
} from './lib/devotion-pilot.mjs';

const JSON_HEADERS = {
  'access-control-allow-headers': 'content-type, authorization, x-admin-secret',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
  'content-type': 'application/json',
};
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEVOTION_STATUSES = new Set(['inactive', 'active', 'completed']);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSharedSecret = firstNonEmpty(
  process.env.ADMIN_SHARED_SECRET,
  process.env.INGEST_SHARED_SECRET,
);
const participantTokenSecret = firstNonEmpty(
  process.env.DEVOTION_LINK_SECRET,
  adminSharedSecret,
);
const adminAllowedEmails = (process.env.ADMIN_ALLOWED_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim())
  .filter(Boolean);
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function firstNonEmpty(...values) {
  return values.find((value) => typeof value === 'string' && value.trim())?.trim();
}

export function createAdminDevotionRepository(client) {
  return {
    async loadDevotion() {
      const { data, error } = await client
        .from('devotions')
        .select('*')
        .eq('slug', DEVOTION_SLUG)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async listParticipants(devotionId) {
      const { data, error } = await client
        .from('devotion_participants')
        .select('id,label,created_at,revoked_at')
        .eq('devotion_id', devotionId)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },

    async listReports(devotionId) {
      const { data, error } = await client
        .from('devotion_daily_reports')
        .select('participant_id,pilot_day,prayer_date,outcome,first_reported_at,updated_at')
        .eq('devotion_id', devotionId);
      if (error) throw error;
      return data ?? [];
    },

    async listEvents(devotionId) {
      const { data, error } = await client
        .from('analytics_events')
        .select('event_name,devotion_participant_id,pilot_day,prayer_date,resource_id,provider,media_type,content_id,content_type,metadata,occurred_at')
        .eq('devotion_id', devotionId)
        .order('occurred_at');
      if (error) throw error;
      return data ?? [];
    },

    async listSessions(devotionId) {
      const { data, error } = await client
        .from('analytics_sessions')
        .select('session_id,devotion_participant_id,pilot_day,prayer_date,resource_id,provider,media_type,source_name,active_play_seconds,panel_open_seconds,started_at,ended_at')
        .eq('devotion_id', devotionId)
        .order('started_at');
      if (error) throw error;
      return data ?? [];
    },

    async createParticipant(participant) {
      const { data, error } = await client
        .from('devotion_participants')
        .insert(participant)
        .select('id,label,created_at,revoked_at')
        .single();
      if (error) throw error;
      return data;
    },

    async findParticipant(devotionId, participantId) {
      const { data, error } = await client
        .from('devotion_participants')
        .select('id,label,token_hash,created_at,revoked_at')
        .eq('devotion_id', devotionId)
        .eq('id', participantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async updateParticipant(devotionId, participantId, updates) {
      const { data, error } = await client
        .from('devotion_participants')
        .update(updates)
        .eq('devotion_id', devotionId)
        .eq('id', participantId)
        .select('id,label,created_at,revoked_at')
        .single();
      if (error) throw error;
      return data;
    },

    async updateDevotion(devotionId, updates) {
      const { data, error } = await client
        .from('devotions')
        .update(updates)
        .eq('id', devotionId)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  };
}

export function createAdminDevotionHandler({
  repository,
  authorize,
  linkSecret = participantTokenSecret,
}) {
  return async function adminDevotionHandler(event) {
    if (event.httpMethod === 'OPTIONS') return response(204);
    if (!['GET', 'POST'].includes(event.httpMethod)) {
      return response(405, { error: 'Method not allowed' });
    }
    if (!repository) {
      return response(500, { error: 'Admin devotion API is not configured' });
    }
    if (!(await authorize(event))) {
      return response(401, { error: 'Unauthorized' });
    }

    try {
      const devotion = await repository.loadDevotion();
      if (!devotion) return response(404, { error: 'Devotion not found' });

      if (event.httpMethod === 'GET') {
        return response(200, await dashboard(repository, devotion));
      }

      const parsed = parsePayload(event.body);
      if (!parsed.ok) return response(400, { error: parsed.error });
      const result = await handleAction({
        repository,
        devotion,
        payload: parsed.value,
        siteUrl: siteUrlFor(event),
        linkSecret,
      });
      return response(200, result);
    } catch (error) {
      if (error instanceof RequestError) {
        return response(error.statusCode, { error: error.message });
      }
      console.error('[admin-devotion] request failed', safeError(error));
      return response(500, {
        error: error instanceof Error ? error.message : 'Admin devotion operation failed',
      });
    }
  };
}

async function dashboard(repository, devotion) {
  const [participants, reports, events, sessions] = await Promise.all([
    repository.listParticipants(devotion.id),
    repository.listReports(devotion.id),
    repository.listEvents(devotion.id),
    repository.listSessions(devotion.id),
  ]);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    ...aggregateDevotionAnalytics({
      devotion,
      participants,
      reports,
      events,
      sessions,
    }),
  };
}

async function handleAction({
  repository,
  devotion,
  payload,
  siteUrl,
  linkSecret,
}) {
  if (payload.action === 'createParticipant') {
    const label = participantLabel(payload.label);
    const id = randomUUID();
    const token = participantToken(id, linkSecret);
    const participant = await repository.createParticipant({
      id,
      devotion_id: devotion.id,
      label,
      token_hash: hashParticipantToken(token),
    });
    return {
      ok: true,
      participant: safeParticipant(participant),
      generatedLink: participantLink(token, siteUrl),
      linkChanged: false,
    };
  }

  if (payload.action === 'showParticipantLink') {
    const participantId = requiredId(payload.participantId);
    let existing = await repository.findParticipant(devotion.id, participantId);
    if (!existing) throw new RequestError(404, 'Participant not found');
    if (existing.revoked_at) {
      throw new RequestError(409, 'Revoked participant links cannot be shown');
    }
    const token = participantToken(participantId, linkSecret);
    const tokenHash = hashParticipantToken(token);
    const linkChanged = existing.token_hash !== tokenHash;
    if (linkChanged) {
      existing = await repository.updateParticipant(
        devotion.id,
        participantId,
        { token_hash: tokenHash },
      );
    }
    return {
      ok: true,
      participant: safeParticipant(existing),
      generatedLink: participantLink(token, siteUrl),
      linkChanged,
    };
  }

  if (payload.action === 'revokeParticipant') {
    const participantId = requiredId(payload.participantId);
    const participant = await repository.updateParticipant(
      devotion.id,
      participantId,
      { revoked_at: new Date().toISOString() },
    );
    return { ok: true, participant: safeParticipant(participant) };
  }

  if (payload.action === 'updateDevotion') {
    const updates = devotionUpdates(devotion, payload.devotion);
    const updated = await repository.updateDevotion(devotion.id, updates);
    return { ok: true, devotion: updated };
  }

  throw new RequestError(400, 'Unsupported action');
}

function devotionUpdates(current, draft) {
  if (!draft || typeof draft !== 'object') throw new RequestError(400, 'Invalid devotion configuration');
  const status = draft.status ?? current.status;
  if (!DEVOTION_STATUSES.has(status)) throw new RequestError(400, 'Invalid devotion status');
  const startDate = nullableDate(draft.startDate);
  const timezone = nullableTimezone(draft.timezone);
  const preSurveyUrl = nullableHttpUrl(draft.preSurveyUrl, 'pre-survey URL');
  const postSurveyUrl = nullableHttpUrl(draft.postSurveyUrl, 'post-survey URL');

  if (status === 'active' && (!startDate || !timezone)) {
    throw new RequestError(400, 'Active devotion requires a start date and timezone');
  }

  return {
    start_date: startDate,
    timezone,
    status,
    pre_survey_url: preSurveyUrl,
    post_survey_url: postSurveyUrl,
  };
}

function participantLabel(value) {
  const label = typeof value === 'string' ? value.trim() : '';
  if (!label || label.length > 120) throw new RequestError(400, 'Participant label must be 1-120 characters');
  return label;
}

function participantToken(participantId, linkSecret) {
  try {
    return deriveParticipantToken(participantId, linkSecret);
  } catch (error) {
    throw new RequestError(
      500,
      error instanceof Error
        ? error.message
        : 'Participant link secret is not configured',
    );
  }
}

function requiredId(value) {
  if (typeof value !== 'string' || !/^[0-9a-f-]{36}$/i.test(value)) {
    throw new RequestError(400, 'Invalid participant ID');
  }
  return value;
}

function nullableDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
    throw new RequestError(400, 'Invalid start date');
  }
  return value;
}

function nullableTimezone(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 100) throw new RequestError(400, 'Invalid timezone');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
  } catch {
    throw new RequestError(400, 'Invalid timezone');
  }
  return value;
}

function nullableHttpUrl(value, label) {
  if (value === null || value === undefined || value === '') return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('protocol');
    return url.toString();
  } catch {
    throw new RequestError(400, `Invalid ${label}`);
  }
}

function safeParticipant(participant) {
  return {
    id: participant.id,
    safeId: participant.id.slice(0, 8),
    label: participant.label,
    linkStatus: participant.revoked_at ? 'revoked' : 'active',
    createdAt: participant.created_at,
  };
}

function siteUrlFor(event) {
  const candidate =
    process.env.PUBLIC_SITE_URL ??
    process.env.URL ??
    event.headers?.origin ??
    event.headers?.Origin ??
    'https://unavoce.net';
  try {
    const url = new URL(candidate);
    return ['http:', 'https:'].includes(url.protocol)
      ? url.origin
      : 'https://unavoce.net';
  } catch {
    return 'https://unavoce.net';
  }
}

function parsePayload(body) {
  if (!body) return { ok: false, error: 'Missing request body' };
  try {
    const value = JSON.parse(body);
    if (!value || typeof value !== 'object') throw new Error('invalid');
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
}

function safeError(error) {
  return error instanceof Error ? error.message : 'Unknown server error';
}

class RequestError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}

const repository = supabase ? createAdminDevotionRepository(supabase) : null;
const authorize = createAdminAuthorizer({
  supabase,
  sharedSecret: adminSharedSecret,
  allowedEmails: adminAllowedEmails,
});

export const handler = createAdminDevotionHandler({
  repository,
  authorize,
  linkSecret: participantTokenSecret,
});
