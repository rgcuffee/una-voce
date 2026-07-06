import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadLocalEnv();

const JSON_HEADERS = {
  'access-control-allow-headers': 'content-type, authorization, x-admin-secret',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-origin': '*',
  'content-type': 'application/json',
};

const PRAYER_HOURS = [
  'office_of_readings',
  'lauds',
  'midday_prayer',
  'vespers',
  'compline',
];

const PARTNER_RELATIONSHIP_STATUSES = ['curated', 'verified', 'partner'];

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSharedSecret =
  process.env.ADMIN_SHARED_SECRET ?? process.env.INGEST_SHARED_SECRET;

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env.local');

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (!['GET', 'POST'].includes(event.httpMethod)) {
    return response(405, { error: 'Method not allowed' });
  }

  if (!supabase) {
    return response(500, { error: 'Admin partners API is not configured' });
  }

  if (!isAuthorized(event)) {
    return response(401, { error: 'Unauthorized' });
  }

  try {
    if (event.httpMethod === 'GET') {
      return response(200, await dashboardResponse());
    }

    const payload = parsePayload(event.body);
    if (!payload.ok) {
      return response(400, { error: payload.error });
    }

    return response(200, await handleAction(payload.value));
  } catch (error) {
    console.error('[admin-partners] failed', error);
    return response(500, {
      error: error instanceof Error ? error.message : 'Admin operation failed',
    });
  }
}

async function dashboardResponse() {
  const today = new Date().toISOString().slice(0, 10);
  const [partnersResult, feedsResult, rulesResult, videosResult] =
    await Promise.all([
      supabase.from('partners').select('*').order('name'),
      supabase
        .from('partner_youtube_feeds')
        .select('*')
        .order('active', { ascending: false })
        .order('last_polled_at', { ascending: false }),
      supabase
        .from('partner_classification_rules')
        .select('*')
        .order('priority', { ascending: false }),
      supabase
        .from('youtube_videos')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(250),
    ]);

  throwIfError(partnersResult.error);
  throwIfError(feedsResult.error);
  throwIfError(rulesResult.error);
  throwIfError(videosResult.error);

  const partners = partnersResult.data ?? [];
  const feeds = feedsResult.data ?? [];
  const rules = rulesResult.data ?? [];
  const videos = videosResult.data ?? [];
  const summaries = partners.map((partner) =>
    partnerSummary(partner.id, feeds, rules, videos, today),
  );

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    today,
    partners,
    feeds,
    rules,
    videos,
    summaries,
    totals: {
      partners: partners.length,
      activePartners: partners.filter(
        (partner) => partner.active && partner.onboarding_status === 'active',
      ).length,
      pendingVideos: videos.filter((video) => video.display_status === 'pending')
        .length,
      approvedToday: videos.filter(
        (video) =>
          video.display_status === 'approved' && video.prayer_date === today,
      ).length,
      staleFeeds: feeds.filter((feed) => isStaleFeed(feed)).length,
    },
  };
}

function partnerSummary(partnerId, feeds, rules, videos, today) {
  const partnerFeeds = feeds.filter((feed) => feed.partner_id === partnerId);
  const partnerRules = rules.filter((rule) => rule.partner_id === partnerId);
  const partnerVideos = videos.filter((video) => video.partner_id === partnerId);
  const approvedTodayHours = new Set(
    partnerVideos
      .filter(
        (video) =>
          video.display_status === 'approved' && video.prayer_date === today,
      )
      .map((video) => video.prayer_type)
      .filter(Boolean),
  );

  return {
    partnerId,
    feedCount: partnerFeeds.length,
    activeFeedCount: partnerFeeds.filter((feed) => feed.active).length,
    ruleCount: partnerRules.length,
    videoCount: partnerVideos.length,
    pendingVideoCount: partnerVideos.filter(
      (video) => video.display_status === 'pending',
    ).length,
    approvedTodayCount: partnerVideos.filter(
      (video) =>
        video.display_status === 'approved' && video.prayer_date === today,
    ).length,
    hiddenVideoCount: partnerVideos.filter(
      (video) => video.display_status === 'hidden',
    ).length,
    lastPolledAt: latestDate(partnerFeeds.map((feed) => feed.last_polled_at)),
    latestVideoAt: latestDate(partnerVideos.map((video) => video.published_at)),
    missingTodayHours: PRAYER_HOURS.filter((hour) => !approvedTodayHours.has(hour)),
  };
}

async function handleAction(payload) {
  switch (payload.action) {
    case 'upsertPartner':
      return upsertPartner(payload.partner);
    case 'upsertFeed':
      return upsertFeed(payload.feed);
    case 'upsertRule':
      return upsertRule(payload.rule);
    case 'updateVideo':
      return updateVideo(payload.video);
    default:
      return { ok: false, error: 'Unsupported action' };
  }
}

async function upsertPartner(partner) {
  const clean = compact({
    id: partner.id,
    slug: requiredString(partner.slug, 'slug').toLowerCase(),
    name: requiredString(partner.name, 'name'),
    description: nullableString(partner.description),
    website: nullableString(partner.website),
    logo_url: nullableString(partner.logo_url),
    country: nullableString(partner.country),
    timezone: requiredString(partner.timezone || 'UTC', 'timezone'),
    active: Boolean(partner.active),
    onboarding_status: enumValue(
      partner.onboarding_status,
      ['pending', 'active', 'archived'],
      'onboarding_status',
    ),
    relationship_status: enumValue(
      partner.relationship_status ?? 'curated',
      PARTNER_RELATIONSHIP_STATUSES,
      'relationship_status',
    ),
    verified_at: nullableString(partner.verified_at),
    partnered_at: nullableString(partner.partnered_at),
    consent_notes: nullableString(partner.consent_notes),
    consent_source: nullableString(partner.consent_source),
    badge_enabled: partner.badge_enabled !== false,
    community_page_enabled: Boolean(partner.community_page_enabled),
    community_page_slug: nullableSlug(partner.community_page_slug, 'community_page_slug'),
  });

  const { data, error } = await supabase
    .from('partners')
    .upsert(clean, { onConflict: 'slug' })
    .select('*')
    .single();

  throwIfError(error);
  return { ok: true, partner: data };
}

async function upsertFeed(feed) {
  const type = enumValue(feed.type, ['channel', 'playlist'], 'type');
  const clean = compact({
    id: feed.id,
    partner_id: requiredString(feed.partner_id, 'partner_id'),
    type,
    youtube_channel_id:
      type === 'channel' ? requiredString(feed.youtube_channel_id, 'youtube_channel_id') : null,
    youtube_playlist_id:
      type === 'playlist' ? requiredString(feed.youtube_playlist_id, 'youtube_playlist_id') : null,
    rss_url: requiredString(feed.rss_url, 'rss_url'),
    expected_content_mode: enumValue(
      feed.expected_content_mode,
      ['live', 'scheduled_live', 'pre_recorded', 'mixed'],
      'expected_content_mode',
    ),
    polling_interval_minutes: positiveInteger(
      feed.polling_interval_minutes,
      'polling_interval_minutes',
    ),
    import_from_date: nullableString(feed.import_from_date),
    active: Boolean(feed.active),
  });

  const { data, error } = await supabase
    .from('partner_youtube_feeds')
    .upsert(clean, { onConflict: 'rss_url' })
    .select('*')
    .single();

  throwIfError(error);
  return { ok: true, feed: data };
}

async function upsertRule(rule) {
  const clean = compact({
    id: rule.id,
    partner_id: requiredString(rule.partner_id, 'partner_id'),
    name: requiredString(rule.name, 'name'),
    include_keywords: textArray(rule.include_keywords),
    exclude_keywords: textArray(rule.exclude_keywords),
    prayer_type: nullableEnumValue(
      rule.prayer_type,
      PRAYER_HOURS,
      'prayer_type',
    ),
    preferred_language: nullableString(rule.preferred_language),
    priority: integer(rule.priority, 'priority'),
    default_display_status: enumValue(
      rule.default_display_status,
      ['pending', 'approved', 'hidden', 'expired'],
      'default_display_status',
    ),
    active: Boolean(rule.active),
  });

  const { data, error } = await supabase
    .from('partner_classification_rules')
    .upsert(clean, { onConflict: 'partner_id,name' })
    .select('*')
    .single();

  throwIfError(error);
  return { ok: true, rule: data };
}

async function updateVideo(video) {
  const id = requiredString(video.id, 'id');
  const updates = compact({
    prayer_type: nullableEnumValue(video.prayer_type, PRAYER_HOURS, 'prayer_type'),
    prayer_date: nullableString(video.prayer_date),
    display_status: enumValue(
      video.display_status,
      ['pending', 'approved', 'hidden', 'expired'],
      'display_status',
    ),
  });

  const { data, error } = await supabase
    .from('youtube_videos')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  throwIfError(error);
  return { ok: true, video: data };
}

function isStaleFeed(feed) {
  if (!feed.active) return false;
  if (!feed.last_polled_at) return true;
  const lastPolled = Date.parse(feed.last_polled_at);
  if (Number.isNaN(lastPolled)) return true;
  return Date.now() - lastPolled > feed.polling_interval_minutes * 60 * 1000;
}

function latestDate(values) {
  const latest = values
    .filter(Boolean)
    .map((value) => Date.parse(value))
    .filter((value) => !Number.isNaN(value))
    .sort((left, right) => right - left)[0];
  return latest ? new Date(latest).toISOString() : null;
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

function requiredString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing ${field}`);
  }
  return value.trim();
}

function nullableString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function nullableSlug(value, field) {
  const slug = nullableString(value);
  if (!slug) return null;
  const normalized = slug.toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(`Invalid ${field}`);
  }
  return normalized;
}

function enumValue(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${field}`);
  }
  return value;
}

function nullableEnumValue(value, allowed, field) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return enumValue(value, allowed, field);
}

function positiveInteger(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${field}`);
  }
  return parsed;
}

function integer(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${field}`);
  }
  return parsed;
}

function textArray(value) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function throwIfError(error) {
  if (error) {
    throw error;
  }
}

function isAuthorized(event) {
  if (!adminSharedSecret) {
    return true;
  }

  const secretHeader = event.headers?.['x-admin-secret'];
  const authorization = event.headers?.authorization ?? '';
  return (
    secretHeader === adminSharedSecret ||
    authorization === `Bearer ${adminSharedSecret}`
  );
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}
