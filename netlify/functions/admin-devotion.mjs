import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { createAdminAuthenticator } from './lib/admin-auth.mjs';
import { aggregateDevotionAnalytics } from './lib/devotion-analytics.mjs';
import {
  DEVOTION_SLUG,
  deriveParticipantToken,
  hashParticipantToken,
  participantLink,
  resolvePilotDay,
} from './lib/devotion-pilot.mjs';

const JSON_HEADERS = {
  'access-control-allow-headers': 'content-type, authorization, x-admin-secret',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-origin': '*',
  'cache-control': 'no-store',
  'content-type': 'application/json',
};
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DEVOTION_STATUSES = new Set([
  'inactive',
  'draft',
  'scheduled',
  'active',
  'paused',
  'completed',
  'archived',
]);
const PARTICIPANT_STATUSES = new Set([
  'enrolled',
  'active',
  'completed',
  'withdrawn',
]);
const DEVOTION_READ_CAP = 10_000;
const DEVOTION_PARTICIPANT_CAP = 2_000;
const DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE = 100;
const DEVOTION_PAGE_SIZE = 1_000;
const ADMIN_BODY_BYTE_LIMIT = 64 * 1024;

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
const devotionEditorEmails = emailList(process.env.ADMIN_DEVOTION_EDITOR_EMAILS);
const devotionViewerEmails = emailList(process.env.ADMIN_DEVOTION_VIEWER_EMAILS);
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
    async listDevotions() {
      return readBoundedRows((from, to) => client.from('devotions')
        .select('*')
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to), 100);
    },

    async listCohorts(devotionId) {
      return readBoundedRows((from, to) => client.from('devotion_cohorts')
        .select('id,devotion_id,slug,name,status,start_date,timezone,created_at,updated_at,archived_at')
        .eq('devotion_id', devotionId)
        .order('created_at')
        .order('id')
        .range(from, to), 500);
    },

    async listParticipants(devotionId) {
      return readBoundedRows((from, to) => client
        .from('devotion_participants')
        .select('id,label,cohort_id,status,completed_at,created_at,revoked_at')
        .eq('devotion_id', devotionId)
        .order('created_at')
        .order('id')
        .range(from, to), DEVOTION_PARTICIPANT_CAP);
    },

    async listReports(devotionId) {
      return readBoundedRows((from, to) => client
        .from('devotion_daily_reports')
        .select('id,participant_id,pilot_day,prayer_date,outcome,first_reported_at,updated_at')
        .eq('devotion_id', devotionId)
        .order('participant_id')
        .order('pilot_day')
        .order('id')
        .range(from, to));
    },

    async listEvents(devotionId) {
      return readBoundedRows((from, to) => client
        .from('analytics_events')
        .select('id,event_name,devotion_participant_id,pilot_day,prayer_date,resource_id,provider,media_type,content_id,content_type,metadata,occurred_at')
        .eq('devotion_id', devotionId)
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to));
    },

    async listSessions(devotionId) {
      return readBoundedRows((from, to) => client
        .from('analytics_sessions')
        .select('session_id,devotion_participant_id,pilot_day,prayer_date,resource_id,provider,media_type,source_name,active_play_seconds,panel_open_seconds,started_at,ended_at')
        .eq('devotion_id', devotionId)
        .order('started_at', { ascending: false })
        .order('session_id', { ascending: false })
        .range(from, to));
    },

    async portfolioData(devotionIds) {
      if (devotionIds.length === 0) return emptyPortfolioSource();
      const [participants, reports, events, sessions] = await Promise.all([
        readBoundedRows((from, to) => client.from('devotion_participants')
          .select('id,devotion_id,status,revoked_at').in('devotion_id', devotionIds)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        readBoundedRows((from, to) => client.from('devotion_daily_reports')
          .select('id,devotion_id,participant_id,pilot_day,outcome').in('devotion_id', devotionIds)
          .order('updated_at', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        readBoundedRows((from, to) => client.from('analytics_events')
          .select('id,devotion_id,devotion_participant_id,pilot_day,event_name').in('devotion_id', devotionIds)
          .order('occurred_at', { ascending: false }).order('id', { ascending: false }).range(from, to)),
        readBoundedRows((from, to) => client.from('analytics_sessions')
          .select('session_id,devotion_id,active_play_seconds,panel_open_seconds').in('devotion_id', devotionIds)
          .order('started_at', { ascending: false }).order('session_id', { ascending: false }).range(from, to)),
      ]);
      return { participants, reports, events, sessions };
    },

    async listAudits(devotionId) {
      const { data, error } = await client.from('devotion_admin_audit')
        .select('id,actor_email,actor_role,action,devotion_id,cohort_id,participant_id,summary,created_at')
        .eq('devotion_id', devotionId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },

    async createAudit(entry) {
      const { data, error } = await client.from('devotion_admin_audit')
        .insert(entry)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },

    async createParticipant(participant) {
      const { data, error } = await client
        .from('devotion_participants')
        .insert(participant)
        .select('id,label,cohort_id,status,completed_at,created_at,revoked_at')
        .single();
      if (error) throw error;
      return data;
    },

    async findParticipant(devotionId, participantId) {
      const { data, error } = await client
        .from('devotion_participants')
        .select('id,label,token_hash,cohort_id,status,completed_at,created_at,revoked_at')
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
        .select('id,label,cohort_id,status,completed_at,created_at,revoked_at')
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

    async createCampaign(devotion) {
      const { data, error } = await client.rpc('create_devotion_campaign', {
        p_description: devotion.description,
        p_duration_days: devotion.duration_days,
        p_hour_key: devotion.hour_key,
        p_name: devotion.name,
        p_organization_label: devotion.organization_label,
        p_post_survey_url: devotion.post_survey_url,
        p_pre_survey_url: devotion.pre_survey_url,
        p_slug: devotion.slug,
        p_start_date: devotion.start_date,
        p_status: devotion.status,
        p_timezone: devotion.timezone,
      });
      if (error) throw error;
      if (!data?.devotion || !data?.cohort) {
        throw new Error('Campaign transaction returned an invalid result');
      }
      return data;
    },

    async createCohort(cohort) {
      const { data, error } = await client
        .from('devotion_cohorts')
        .insert(cohort)
        .select('id,devotion_id,slug,name,status,start_date,timezone,created_at,updated_at,archived_at')
        .single();
      if (error) throw error;
      return data;
    },

    async findCohort(devotionId, cohortId) {
      const { data, error } = await client
        .from('devotion_cohorts')
        .select('id,devotion_id,slug,name,status,start_date,timezone,created_at,updated_at,archived_at')
        .eq('devotion_id', devotionId)
        .eq('id', cohortId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    async updateCohort(devotionId, cohortId, updates) {
      const { data, error } = await client
        .from('devotion_cohorts')
        .update(updates)
        .eq('devotion_id', devotionId)
        .eq('id', cohortId)
        .select('id,devotion_id,slug,name,status,start_date,timezone,created_at,updated_at,archived_at')
        .single();
      if (error) throw error;
      return data;
    },

    async bulkUpdateParticipants(devotionId, participantIds, updates) {
      const { data, error } = await client
        .from('devotion_participants')
        .update(updates)
        .eq('devotion_id', devotionId)
        .in('id', participantIds)
        .select('id,label,cohort_id,status,completed_at,created_at,revoked_at');
      if (error) throw error;
      return data ?? [];
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
    const access = accessIdentity(await authorize(event));
    if (!access) {
      return response(401, { error: 'Unauthorized' });
    }

    try {
      const devotionRead = boundedRead(await repository.listDevotions());
      const devotions = devotionRead.rows;

      if (event.httpMethod === 'GET') {
        const devotion = selectedDevotion(
          devotions,
          event.queryStringParameters?.devotionId,
        );
        if (!devotion) {
          return response(200, emptyDashboard(devotions, access, devotionRead));
        }
        return response(200, await dashboard(repository, devotion, devotions, {
          access,
          devotionRead,
          includePortfolio: event.queryStringParameters?.portfolio === 'true',
          participantPage: boundedPositiveInteger(
            event.queryStringParameters?.participantPage,
            1,
            Math.ceil(DEVOTION_PARTICIPANT_CAP / DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE),
          ),
        }));
      }

      if (typeof event.body === 'string' && Buffer.byteLength(event.body, 'utf8') > ADMIN_BODY_BYTE_LIMIT) {
        return response(413, { error: 'Request body is too large' });
      }
      const parsed = parsePayload(event.body);
      if (!parsed.ok) return response(400, { error: parsed.error });
      requireActionAccess(access, parsed.value);
      if (parsed.value.action === 'createDevotion') {
        const result = await createDevotion(repository, parsed.value.devotion);
        const auditRecorded = await recordAudit(repository, access, parsed.value, result);
        return response(200, { ...result, auditRecorded });
      }
      const devotion = selectedDevotion(devotions, parsed.value.devotionId);
      if (!devotion) return response(404, { error: 'Devotion not found' });
      await requireExistingArchiveAccess(access, parsed.value, devotion, repository);
      const result = await handleAction({
        repository,
        devotion,
        payload: parsed.value,
        siteUrl: siteUrlFor(event),
        linkSecret,
      });
      const auditRecorded = await recordAudit(repository, access, parsed.value, result);
      return response(200, { ...result, auditRecorded });
    } catch (error) {
      if (error instanceof RequestError) {
        return response(error.statusCode, { error: error.message });
      }
      console.error('[admin-devotion] request failed', safeError(error));
      return response(500, {
        error: 'Admin devotion operation failed',
      });
    }
  };
}

async function dashboard(repository, devotion, devotions, {
  access,
  devotionRead,
  includePortfolio,
  participantPage,
}) {
  const [cohortRead, participantRead, reportRead, eventRead, sessionRead, auditHistory, portfolioSource] = await Promise.all([
    repository.listCohorts(devotion.id),
    repository.listParticipants(devotion.id),
    repository.listReports(devotion.id),
    repository.listEvents(devotion.id),
    repository.listSessions(devotion.id),
    repository.listAudits ? repository.listAudits(devotion.id) : [],
    includePortfolio && repository.portfolioData
      ? repository.portfolioData(devotions.map((item) => item.id))
      : null,
  ]);
  const cohorts = boundedRead(cohortRead);
  const participants = boundedRead(participantRead);
  const reports = boundedRead(reportRead);
  const events = boundedRead(eventRead);
  const sessions = boundedRead(sessionRead);
  const currentParticipantPage = Math.min(
    participantPage,
    Math.max(1, Math.ceil(participants.rows.length / DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE)),
  );
  const detailStart = (currentParticipantPage - 1) * DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE;
  const detailParticipants = participants.rows.slice(
    detailStart,
    detailStart + DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE,
  );
  const analytics = aggregateDevotionAnalytics({
    devotion,
    participants: participants.rows,
    detailParticipants,
    reports: reports.rows,
    events: events.rows,
    sessions: sessions.rows,
  });
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    access: safeAccess(access),
    campaigns: devotions.map(safeDevotion),
    cohorts: cohorts.rows.map(safeCohort),
    operationalAlerts: devotionAlerts({
      devotion,
      cohorts: cohorts.rows,
      participants: participants.rows,
      reports: reports.rows,
      events: events.rows,
      evidenceSampled: reports.truncated || events.truncated || sessions.truncated,
    }),
    sourceStatus: sourceStatus({ campaigns: devotionRead, cohorts, participants, reports, events, sessions }),
    participantDetail: {
      page: currentParticipantPage,
      pageSize: DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE,
      shown: detailParticipants.length,
      observedTotal: participants.rows.length,
      totalStatus: participants.truncated ? 'lower_bound' : 'exact',
      hasPrevious: currentParticipantPage > 1,
      hasNext: detailStart + detailParticipants.length < participants.rows.length,
    },
    auditHistory: auditHistory.map(safeAudit),
    portfolio: portfolioSource ? portfolioAnalytics(devotions, portfolioSource, devotionRead) : null,
    ...analytics,
  };
}

function emptyDashboard(devotions, access, devotionRead) {
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    access: safeAccess(access),
    campaigns: devotions.map(safeDevotion),
    cohorts: [],
    operationalAlerts: [{ severity: 'info', code: 'no_campaigns', message: 'Create a devotion campaign to begin.' }],
    sourceStatus: sourceStatus({ campaigns: devotionRead }),
    participantDetail: {
      page: 1,
      pageSize: DEVOTION_PARTICIPANT_DETAIL_PAGE_SIZE,
      shown: 0,
      observedTotal: 0,
      totalStatus: 'exact',
      hasPrevious: false,
      hasNext: false,
    },
    auditHistory: [],
    portfolio: null,
    devotion: null,
    metrics: null,
    nightRollup: [],
    participants: [],
  };
}

async function createDevotion(repository, draft) {
  const input = newDevotion(draft);
  const { devotion, cohort } = await repository.createCampaign(input);
  return { ok: true, devotion: safeDevotion(devotion), cohort: safeCohort(cohort) };
}

async function handleAction({
  repository,
  devotion,
  payload,
  siteUrl,
  linkSecret,
}) {
  if (payload.action === 'createCohort') {
    const cohort = await repository.createCohort({
      devotion_id: devotion.id,
      ...newCohort(payload.cohort),
    });
    return { ok: true, cohort: safeCohort(cohort) };
  }

  if (payload.action === 'updateCohort') {
    const cohortId = requiredId(payload.cohortId, 'cohort');
    const current = await repository.findCohort(devotion.id, cohortId);
    if (!current) throw new RequestError(404, 'Cohort not found');
    const cohort = await repository.updateCohort(
      devotion.id,
      cohortId,
      cohortUpdates(current, payload.cohort),
    );
    return { ok: true, cohort: safeCohort(cohort) };
  }

  if (payload.action === 'createParticipant') {
    const label = participantLabel(payload.label);
    const cohortId = requiredId(payload.cohortId, 'cohort');
    const cohort = await repository.findCohort(devotion.id, cohortId);
    if (!cohort || cohort.status === 'archived') {
      throw new RequestError(404, 'Cohort not found');
    }
    const id = randomUUID();
    const token = participantToken(id, linkSecret);
    const participant = await repository.createParticipant({
      id,
      devotion_id: devotion.id,
      cohort_id: cohort.id,
      label,
      token_hash: hashParticipantToken(token),
    });
    return {
      ok: true,
      participant: safeParticipant(participant),
      generatedLink: participantLink(token, siteUrl, devotion.slug),
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
      generatedLink: participantLink(token, siteUrl, devotion.slug),
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

  if (payload.action === 'restoreParticipant') {
    const participantId = requiredId(payload.participantId);
    const existing = await repository.findParticipant(devotion.id, participantId);
    if (!existing) throw new RequestError(404, 'Participant not found');
    const participant = await repository.updateParticipant(
      devotion.id,
      participantId,
      { revoked_at: null },
    );
    return { ok: true, participant: safeParticipant(participant) };
  }

  if (payload.action === 'bulkRevokeParticipants') {
    const participantIds = requiredIds(payload.participantIds);
    const participants = await repository.bulkUpdateParticipants(
      devotion.id,
      participantIds,
      { revoked_at: new Date().toISOString() },
    );
    return { ok: true, participants: participants.map(safeParticipant) };
  }

  if (payload.action === 'updateParticipantStatus') {
    const participantId = requiredId(payload.participantId);
    const status = participantStatus(payload.status);
    const participant = await repository.updateParticipant(
      devotion.id,
      participantId,
      {
        status,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      },
    );
    return { ok: true, participant: safeParticipant(participant) };
  }

  if (payload.action === 'updateDevotion') {
    const updates = devotionUpdates(devotion, payload.devotion);
    const updated = await repository.updateDevotion(devotion.id, updates);
    return { ok: true, devotion: safeDevotion(updated) };
  }

  throw new RequestError(400, 'Unsupported action');
}

function devotionUpdates(current, draft) {
  if (!draft || typeof draft !== 'object') throw new RequestError(400, 'Invalid devotion configuration');
  const status = draft.status ?? current.status;
  if (!DEVOTION_STATUSES.has(status)) throw new RequestError(400, 'Invalid devotion status');
  const startDate = hasOwn(draft, 'startDate') ? nullableDate(draft.startDate) : current.start_date;
  const timezone = hasOwn(draft, 'timezone') ? nullableTimezone(draft.timezone) : current.timezone;
  const preSurveyUrl = hasOwn(draft, 'preSurveyUrl') ? nullableHttpUrl(draft.preSurveyUrl, 'pre-survey URL') : current.pre_survey_url;
  const postSurveyUrl = hasOwn(draft, 'postSurveyUrl') ? nullableHttpUrl(draft.postSurveyUrl, 'post-survey URL') : current.post_survey_url;
  const durationDays = hasOwn(draft, 'durationDays') ? devotionDuration(draft.durationDays) : current.duration_days;

  requiresSchedule(status, startDate, timezone, 'devotion');

  return {
    name: hasOwn(draft, 'name') ? boundedText(draft.name, 'Devotion name', 160) : current.name,
    organization_label: hasOwn(draft, 'organizationLabel') ? boundedText(draft.organizationLabel, 'Organization label', 160) : current.organization_label,
    description: hasOwn(draft, 'description') ? nullableText(draft.description, 'Description', 2000) : current.description,
    start_date: startDate,
    duration_days: durationDays,
    timezone,
    status,
    pre_survey_url: preSurveyUrl,
    post_survey_url: postSurveyUrl,
    published_at: ['scheduled', 'active'].includes(status)
      ? current.published_at ?? new Date().toISOString()
      : current.published_at,
    archived_at: status === 'archived' ? current.archived_at ?? new Date().toISOString() : null,
  };
}

function newDevotion(draft) {
  if (!draft || typeof draft !== 'object') throw new RequestError(400, 'Invalid devotion configuration');
  const status = draft.status ?? 'draft';
  if (!DEVOTION_STATUSES.has(status)) throw new RequestError(400, 'Invalid devotion status');
  const startDate = nullableDate(draft.startDate);
  const timezone = nullableTimezone(draft.timezone);
  requiresSchedule(status, startDate, timezone, 'devotion');
  return {
    slug: requiredSlug(draft.slug, 'Devotion slug'),
    name: boundedText(draft.name, 'Devotion name', 160),
    organization_label: boundedText(draft.organizationLabel, 'Organization label', 160),
    description: nullableText(draft.description, 'Description', 2000),
    hour_key: 'compline',
    start_date: startDate,
    duration_days: devotionDuration(draft.durationDays ?? 7),
    timezone,
    status,
    pre_survey_url: nullableHttpUrl(draft.preSurveyUrl, 'pre-survey URL'),
    post_survey_url: nullableHttpUrl(draft.postSurveyUrl, 'post-survey URL'),
    published_at: ['scheduled', 'active'].includes(status) ? new Date().toISOString() : null,
    archived_at: status === 'archived' ? new Date().toISOString() : null,
  };
}

function newCohort(draft) {
  if (!draft || typeof draft !== 'object') throw new RequestError(400, 'Invalid cohort configuration');
  const status = draft.status ?? 'draft';
  if (!DEVOTION_STATUSES.has(status)) throw new RequestError(400, 'Invalid cohort status');
  const startDate = nullableDate(draft.startDate);
  const timezone = nullableTimezone(draft.timezone);
  requiresSchedule(status, startDate, timezone, 'cohort');
  return {
    slug: requiredSlug(draft.slug, 'Cohort slug'),
    name: boundedText(draft.name, 'Cohort name', 120),
    status,
    start_date: startDate,
    timezone,
    archived_at: status === 'archived' ? new Date().toISOString() : null,
  };
}

function cohortUpdates(current, draft) {
  if (!draft || typeof draft !== 'object') throw new RequestError(400, 'Invalid cohort configuration');
  const status = draft.status ?? current.status;
  if (!DEVOTION_STATUSES.has(status)) throw new RequestError(400, 'Invalid cohort status');
  const startDate = hasOwn(draft, 'startDate') ? nullableDate(draft.startDate) : current.start_date;
  const timezone = hasOwn(draft, 'timezone') ? nullableTimezone(draft.timezone) : current.timezone;
  requiresSchedule(status, startDate, timezone, 'cohort');
  return {
    name: hasOwn(draft, 'name') ? boundedText(draft.name, 'Cohort name', 120) : current.name,
    status,
    start_date: startDate,
    timezone,
    archived_at: status === 'archived' ? current.archived_at ?? new Date().toISOString() : null,
  };
}

function selectedDevotion(devotions, requestedId) {
  if (requestedId) {
    const id = requiredId(requestedId, 'devotion');
    return devotions.find((devotion) => devotion.id === id) ?? null;
  }
  const priority = ['active', 'scheduled', 'draft', 'inactive', 'paused', 'completed'];
  return [...devotions]
    .filter((devotion) => devotion.status !== 'archived')
    .sort((a, b) => {
      const status = priority.indexOf(a.status) - priority.indexOf(b.status);
      if (status !== 0) return status;
      if (a.slug === DEVOTION_SLUG) return -1;
      if (b.slug === DEVOTION_SLUG) return 1;
      return String(b.updated_at ?? '').localeCompare(String(a.updated_at ?? ''));
    })[0] ?? devotions[0] ?? null;
}

function devotionAlerts({ devotion, cohorts, participants, reports, events, evidenceSampled = false }) {
  const alerts = [];
  if (cohorts.length === 0) {
    alerts.push({ severity: 'warning', code: 'no_cohorts', message: 'Create a cohort before enrolling participants.' });
  }
  if (['draft', 'inactive', 'paused'].includes(devotion.status)) {
    alerts.push({ severity: 'info', code: 'campaign_not_live', message: `Campaign is ${devotion.status}; participant reporting is not currently live.` });
  }
  if (participants.length === 0) {
    alerts.push({ severity: 'info', code: 'no_participants', message: 'No participants are enrolled in this campaign.' });
  }
  const revoked = participants.filter((participant) => participant.revoked_at).length;
  if (revoked > 0) {
    alerts.push({ severity: 'info', code: 'revoked_links', message: `${revoked} participant link${revoked === 1 ? ' is' : 's are'} revoked.` });
  }
  if (evidenceSampled) {
    alerts.push({
      severity: 'info',
      code: 'attention_sampled',
      message: 'Participant follow-up alerts are unavailable because activity evidence reached its configured cap.',
    });
    return alerts;
  }
  const reportedCells = new Set(reports.map((report) => `${report.participant_id}:${report.pilot_day}`));
  const activeEventCells = new Set(events
    .filter((event) => ['devotion_page_opened', 'devotion_resource_opened'].includes(event.event_name))
    .map((event) => `${event.devotion_participant_id}:${event.pilot_day}`));
  for (const cohort of cohorts) {
    const timing = resolvePilotDay({
      ...devotion,
      status: cohort.status,
      start_date: cohort.start_date,
      timezone: cohort.timezone,
    });
    if (timing.phase !== 'active' || !timing.pilotDay) continue;
    const needsAttention = participants.filter((participant) => {
      if (participant.cohort_id !== cohort.id || !['enrolled', 'active'].includes(participant.status ?? 'enrolled') || participant.revoked_at) return false;
      const key = `${participant.id}:${timing.pilotDay}`;
      return !activeEventCells.has(key) && !reportedCells.has(key);
    }).length;
    if (needsAttention > 0) {
      alerts.push({ severity: 'warning', code: 'follow_up_ready', cohortId: cohort.id, message: `${needsAttention} participant${needsAttention === 1 ? '' : 's'} in ${cohort.name} have no activity for Night ${timing.pilotDay}.` });
    }
  }
  return alerts;
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

function requiredId(value, label = 'participant') {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new RequestError(400, `Invalid ${label} ID`);
  }
  return value;
}

function requiredIds(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new RequestError(400, 'Select 1-100 participants');
  }
  return [...new Set(value.map((id) => requiredId(id)))];
}

function participantStatus(value) {
  if (!PARTICIPANT_STATUSES.has(value)) throw new RequestError(400, 'Invalid participant status');
  return value;
}

function nullableDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !DATE_PATTERN.test(value) || !isCivilDate(value)) {
    throw new RequestError(400, 'Invalid start date');
  }
  return value;
}

function devotionDuration(value) {
  const duration = Number(value);
  if (!Number.isInteger(duration) || duration < 1 || duration > 40) {
    throw new RequestError(400, 'Duration must be 1-40 days');
  }
  return duration;
}

function requiredSlug(value, label) {
  const slug = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 63) {
    throw new RequestError(400, `${label} must use lowercase letters, numbers, and hyphens`);
  }
  return slug;
}

function boundedText(value, label, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > maxLength) throw new RequestError(400, `${label} must be 1-${maxLength} characters`);
  return text;
}

function nullableText(value, label, maxLength) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) throw new RequestError(400, `Invalid ${label.toLowerCase()}`);
  return value.trim() || null;
}

function requiresSchedule(status, startDate, timezone, label) {
  if (['active', 'scheduled'].includes(status) && (!startDate || !timezone)) {
    throw new RequestError(400, `${titleCase(label)} requires a start date and timezone when ${status}`);
  }
}

function isCivilDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function titleCase(value) {
  return `${value[0]?.toUpperCase() ?? ''}${value.slice(1)}`;
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
    cohortId: participant.cohort_id,
    status: participant.status ?? 'enrolled',
    linkStatus: participant.revoked_at ? 'revoked' : 'active',
    completedAt: participant.completed_at ?? null,
    createdAt: participant.created_at,
  };
}

function safeDevotion(devotion) {
  return {
    id: devotion.id,
    slug: devotion.slug,
    name: devotion.name,
    organizationLabel: devotion.organization_label,
    description: devotion.description ?? null,
    startDate: devotion.start_date,
    durationDays: devotion.duration_days,
    timezone: devotion.timezone,
    status: devotion.status,
    preSurveyUrl: devotion.pre_survey_url,
    postSurveyUrl: devotion.post_survey_url,
    publishedAt: devotion.published_at ?? null,
    archivedAt: devotion.archived_at ?? null,
    updatedAt: devotion.updated_at ?? null,
  };
}

function safeCohort(cohort) {
  return {
    id: cohort.id,
    devotionId: cohort.devotion_id,
    slug: cohort.slug,
    name: cohort.name,
    status: cohort.status,
    startDate: cohort.start_date,
    timezone: cohort.timezone,
    archivedAt: cohort.archived_at ?? null,
    createdAt: cohort.created_at,
    updatedAt: cohort.updated_at,
  };
}

function safeAccess(access) {
  return { role: access.role, email: access.email ?? null };
}

function safeAudit(entry) {
  return {
    id: entry.id,
    actorEmail: entry.actor_email ?? null,
    actorRole: entry.actor_role,
    action: entry.action,
    devotionId: entry.devotion_id,
    cohortId: entry.cohort_id ?? null,
    participantId: entry.participant_id ?? null,
    summary: entry.summary && typeof entry.summary === 'object' ? entry.summary : {},
    createdAt: entry.created_at,
  };
}

function accessIdentity(result) {
  if (result === true) {
    return { actorId: 'test-authorizer', email: null, role: 'owner', method: 'custom' };
  }
  if (!result || typeof result !== 'object') return null;
  if (!['owner', 'editor', 'viewer'].includes(result.role)) return null;
  return result;
}

function requireActionAccess(access, payload) {
  if (access.role === 'viewer') {
    throw new RequestError(403, 'Viewer access is read-only');
  }
  const ownerOnly = payload.action === 'createDevotion' ||
    (payload.action === 'updateDevotion' && payload.devotion?.status === 'archived') ||
    (['createCohort', 'updateCohort'].includes(payload.action) && payload.cohort?.status === 'archived');
  if (ownerOnly && access.role !== 'owner') {
    throw new RequestError(403, 'Owner access is required for this operation');
  }
}

async function requireExistingArchiveAccess(access, payload, devotion, repository) {
  if (access.role === 'owner') return;
  if (devotion.status === 'archived') {
    throw new RequestError(403, 'Owner access is required to change an archived campaign');
  }
  if (payload.action !== 'updateCohort') return;
  const cohortId = requiredId(payload.cohortId, 'cohort');
  const cohort = await repository.findCohort(devotion.id, cohortId);
  if (cohort?.status === 'archived') {
    throw new RequestError(403, 'Owner access is required to change an archived cohort');
  }
}

async function recordAudit(repository, access, payload, result) {
  if (!repository.createAudit) return false;
  const devotionId = result.devotion?.id ?? payload.devotionId ?? null;
  const cohortId = result.cohort?.id ?? payload.cohortId ?? null;
  const participantId = result.participant?.id ?? payload.participantId ?? null;
  try {
    await repository.createAudit({
      actor_id: String(access.actorId ?? 'unknown').slice(0, 160),
      actor_email: access.email ?? null,
      actor_role: access.role,
      action: String(payload.action).slice(0, 80),
      devotion_id: devotionId,
      cohort_id: cohortId,
      participant_id: participantId,
      summary: auditSummary(payload, result),
    });
    return true;
  } catch (error) {
    console.error('[admin-devotion] audit write failed', safeError(error));
    return false;
  }
}

function auditSummary(payload, result) {
  const summary = {};
  if (payload.action === 'bulkRevokeParticipants') {
    summary.participantCount = result.participants?.length ?? 0;
  }
  const status = payload.devotion?.status ?? payload.cohort?.status ?? payload.status;
  if (typeof status === 'string') summary.status = status;
  if (payload.action === 'updateDevotion' && payload.devotion && typeof payload.devotion === 'object') {
    summary.fields = Object.keys(payload.devotion).filter((key) => /^[a-zA-Z]{1,40}$/.test(key)).slice(0, 20);
  }
  return summary;
}

function boundedRead(value) {
  if (Array.isArray(value)) return { rows: value, truncated: false, cap: null };
  return value && Array.isArray(value.rows)
    ? { rows: value.rows, truncated: Boolean(value.truncated), cap: Number(value.cap) || null }
    : { rows: [], truncated: false, cap: null };
}

export async function readBoundedRows(queryPage, cap = DEVOTION_READ_CAP) {
  const rows = [];
  let offset = 0;
  while (rows.length <= cap) {
    const remaining = cap + 1 - rows.length;
    const size = Math.min(DEVOTION_PAGE_SIZE, remaining);
    const { data, error } = await queryPage(offset, offset + size - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < size) break;
    offset += page.length;
  }
  return { rows: rows.slice(0, cap), truncated: rows.length > cap, cap };
}

function sourceStatus(sources) {
  const truncated = Object.entries(sources)
    .filter(([, source]) => source.truncated)
    .map(([name]) => name);
  return {
    status: truncated.length ? 'sampled' : 'exact',
    cap: Math.max(...Object.values(sources).map((source) => source.cap ?? 0), DEVOTION_READ_CAP),
    caps: Object.fromEntries(Object.entries(sources).map(([name, source]) => [name, source.cap])),
    truncatedSources: truncated,
  };
}

function emptyPortfolioSource() {
  const empty = { rows: [], truncated: false, cap: DEVOTION_READ_CAP };
  return { participants: empty, reports: empty, events: empty, sessions: empty };
}

function portfolioAnalytics(devotions, rawSource, devotionRead) {
  const participants = boundedRead(rawSource.participants);
  const reports = boundedRead(rawSource.reports);
  const events = boundedRead(rawSource.events);
  const sessions = boundedRead(rawSource.sessions);
  const status = sourceStatus({ campaigns: devotionRead, participants, reports, events, sessions });
  return {
    ...status,
    campaigns: devotions.map((devotion) => {
      const campaignParticipants = participants.rows.filter((row) => row.devotion_id === devotion.id);
      const campaignReports = reports.rows.filter((row) => row.devotion_id === devotion.id);
      const campaignEvents = events.rows.filter((row) => row.devotion_id === devotion.id);
      const campaignSessions = sessions.rows.filter((row) => row.devotion_id === devotion.id);
      const openedNights = new Set(campaignEvents
        .filter((event) => event.event_name === 'devotion_page_opened')
        .map((event) => `${event.devotion_participant_id ?? ''}:${event.pilot_day ?? ''}`));
      return {
        devotion: safeDevotion(devotion),
        participants: campaignParticipants.length,
        activeParticipants: campaignParticipants.filter((participant) =>
          ['enrolled', 'active'].includes(participant.status ?? 'enrolled') && !participant.revoked_at).length,
        completedParticipants: campaignParticipants.filter((participant) => participant.status === 'completed').length,
        nightsOpened: openedNights.size,
        reports: campaignReports.length,
        prayedReports: campaignReports.filter((report) => report.outcome === 'prayed').length,
        resourceEngagements: campaignEvents.filter((event) => event.event_name === 'devotion_resource_opened').length,
        measuredMediaMinutes: Math.round(campaignSessions.reduce((sum, session) =>
          sum + Math.max(Number(session.active_play_seconds ?? 0), Number(session.panel_open_seconds ?? 0), 0), 0) / 6) / 10,
      };
    }),
  };
}

function emailList(value) {
  return String(value ?? '').split(',').map((email) => email.trim()).filter(Boolean);
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
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const code = typeof error.code === 'string' ? error.code.slice(0, 40) : '';
    const message = typeof error.message === 'string' ? error.message.slice(0, 240) : '';
    if (code || message) return [code, message].filter(Boolean).join(': ');
  }
  return 'Unknown server error';
}

function boundedPositiveInteger(value, fallback, maximum) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, maximum)
    : fallback;
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
const authorize = createAdminAuthenticator({
  supabase,
  sharedSecret: adminSharedSecret,
  allowedEmails: adminAllowedEmails,
  editorEmails: devotionEditorEmails,
  viewerEmails: devotionViewerEmails,
});

export const handler = createAdminDevotionHandler({
  repository,
  authorize,
  linkSecret: participantTokenSecret,
});
