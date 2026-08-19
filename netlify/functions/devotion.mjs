import { createClient } from '@supabase/supabase-js';
import {
  REPORT_OUTCOMES,
  hashParticipantToken,
  isParticipantToken,
  resolvePilotDay,
  safeParticipantId,
} from './lib/devotion-pilot.mjs';

const JSON_HEADERS = {
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'cache-control': 'no-store',
  'content-type': 'application/json',
};

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function createDevotionRepository(client) {
  return {
    async findParticipant(tokenHash) {
      const { data, error } = await client
        .from('devotion_participants')
        .select([
          'id',
          'label',
          'devotion_id',
          'revoked_at',
          'devotions!inner(id,slug,name,organization_label,hour_key,start_date,duration_days,timezone,status,pre_survey_url,post_survey_url)',
        ].join(','))
        .eq('token_hash', tokenHash)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async findReport({ devotionId, participantId, pilotDay }) {
      const { data, error } = await client
        .from('devotion_daily_reports')
        .select('id,outcome,first_reported_at,updated_at,prayer_date,pilot_day')
        .eq('devotion_id', devotionId)
        .eq('participant_id', participantId)
        .eq('pilot_day', pilotDay)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async upsertReport(report) {
      const { data, error } = await client
        .from('devotion_daily_reports')
        .upsert(report, {
          onConflict: 'devotion_id,participant_id,pilot_day',
        })
        .select('id,outcome,first_reported_at,updated_at,prayer_date,pilot_day')
        .single();
      if (error) throw error;
      return data;
    },
  };
}

export function createDevotionHandler({ repository, now = () => new Date() }) {
  return async function devotionHandler(event) {
    if (event.httpMethod === 'OPTIONS') return response(204);
    if (event.httpMethod !== 'POST') {
      return response(405, { error: 'Method not allowed' });
    }
    if (!repository) {
      return response(500, { error: 'Devotion API is not configured' });
    }

    const parsed = parsePayload(event.body);
    if (!parsed.ok) return response(400, { error: parsed.error });
    const { action, token } = parsed.value;
    if (!isParticipantToken(token)) {
      return response(404, { error: 'This participant link is invalid or unavailable.' });
    }

    try {
      const participant = await repository.findParticipant(
        hashParticipantToken(token),
      );
      if (!participant || participant.revoked_at) {
        return response(404, { error: 'This participant link is invalid or unavailable.' });
      }

      const devotion = relatedDevotion(participant.devotions);
      if (!devotion) {
        return response(404, { error: 'This devotion is unavailable.' });
      }
      const timing = resolvePilotDay(devotion, now());

      if (action === 'resolve') {
        const report =
          timing.phase === 'active'
            ? await repository.findReport({
                devotionId: devotion.id,
                participantId: participant.id,
                pilotDay: timing.pilotDay,
              })
            : null;
        return response(200, participantState(participant, devotion, timing, report));
      }

      if (action === 'report') {
        if (timing.phase !== 'active') {
          return response(409, { error: 'Reporting is not available for this devotion night.' });
        }
        if (!REPORT_OUTCOMES.has(parsed.value.outcome)) {
          return response(400, { error: 'Invalid report outcome' });
        }

        const report = await repository.upsertReport({
          devotion_id: devotion.id,
          participant_id: participant.id,
          pilot_day: timing.pilotDay,
          prayer_date: timing.prayerDate,
          outcome: parsed.value.outcome,
        });
        return response(200, {
          ok: true,
          report: safeReport(report),
          attribution: attribution(participant, devotion, timing),
        });
      }

      return response(400, { error: 'Unsupported action' });
    } catch (error) {
      console.error('[devotion] request failed', safeError(error));
      return response(500, { error: 'Unable to load the devotion right now.' });
    }
  };
}

function participantState(participant, devotion, timing, report) {
  return {
    ok: true,
    participant: {
      id: participant.id,
      safeId: safeParticipantId(participant.id),
      label: participant.label,
    },
    devotion: {
      id: devotion.id,
      slug: devotion.slug,
      name: devotion.name,
      organizationLabel: devotion.organization_label,
      hourKey: devotion.hour_key,
      startDate: devotion.start_date,
      durationDays: devotion.duration_days,
      timezone: devotion.timezone,
      status: devotion.status,
      preSurveyUrl: devotion.pre_survey_url,
      postSurveyUrl: devotion.post_survey_url,
    },
    timing,
    report: safeReport(report),
    attribution: attribution(participant, devotion, timing),
  };
}

function attribution(participant, devotion, timing) {
  return {
    devotionId: devotion.id,
    devotionParticipantId: participant.id,
    pilotDay: timing.pilotDay,
    prayerDate: timing.prayerDate,
  };
}

function safeReport(report) {
  if (!report) return null;
  return {
    outcome: report.outcome,
    pilotDay: report.pilot_day,
    prayerDate: report.prayer_date,
    firstReportedAt: report.first_reported_at,
    updatedAt: report.updated_at,
  };
}

function relatedDevotion(value) {
  return Array.isArray(value) ? value[0] : value;
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

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}

export const handler = createDevotionHandler({
  repository: supabase ? createDevotionRepository(supabase) : null,
});
