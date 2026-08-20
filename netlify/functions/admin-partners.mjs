import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createAdminAuthorizer } from './lib/admin-auth.mjs';

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
const LITURGICAL_SEASONS = [
  'advent',
  'christmas',
  'ordinary_time',
  'lent',
  'triduum',
  'easter',
];
const REVIEW_STATUS_PRIORITY = {
  approved: 0,
  hidden: 1,
  expired: 2,
  pending: 3,
};

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminSharedSecret =
  process.env.ADMIN_SHARED_SECRET ?? process.env.INGEST_SHARED_SECRET;
const adminAllowedEmails = new Set(
  (process.env.ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;
const isAuthorized = createAdminAuthorizer({
  supabase,
  sharedSecret: adminSharedSecret,
  allowedEmails: adminAllowedEmails,
});

export function optionalExactCount(result) {
  if (!result || result.error) return null;
  return result.count ?? 0;
}

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

  if (!(await isAuthorized(event))) {
    return response(401, { error: 'Unauthorized' });
  }

  try {
    if (event.httpMethod === 'GET') {
      return response(200, await dashboardResponse(requestSearchParams(event)));
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

export function requestSearchParams(event = {}) {
  if (event.rawUrl) return new URL(event.rawUrl, 'http://localhost').searchParams;
  return new URLSearchParams(Object.entries(event.queryStringParameters ?? {}).filter(([, value]) => value !== undefined && value !== null));
}

async function dashboardResponse(searchParams = new URLSearchParams()) {
  const today = new Date().toISOString().slice(0, 10);
  const [
    partnersResult,
    feedsResult,
    spotifyFeedsResult,
    applePodcastFeedsResult,
    rulesResult,
    videosResult,
    spotifyEpisodesResult,
    applePodcastEpisodesResult,
    activeDevotionsResult,
    openCalendarReviewsResult,
  ] =
    await Promise.all([
      supabase.from('partners').select('*').order('name'),
      supabase
        .from('partner_youtube_feeds')
        .select('*')
        .order('active', { ascending: false })
        .order('last_polled_at', { ascending: false }),
      supabase
        .from('partner_spotify_feeds')
        .select('*')
        .order('active', { ascending: false })
        .order('last_polled_at', { ascending: false }),
      supabase
        .from('partner_apple_podcast_feeds')
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
        .limit(1000),
      supabase
        .from('spotify_episodes')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(1000),
      supabase
        .from('apple_podcast_episodes')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(1000),
      supabase
        .from('devotions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('calendar_review_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
    ]);

  throwIfError(partnersResult.error);
  throwIfError(feedsResult.error);
  throwIfError(spotifyFeedsResult.error);
  throwIfError(applePodcastFeedsResult.error);
  throwIfError(rulesResult.error);
  throwIfError(videosResult.error);
  throwIfError(spotifyEpisodesResult.error);
  throwIfError(applePodcastEpisodesResult.error);

  const partners = partnersResult.data ?? [];
  const feeds = feedsResult.data ?? [];
  const spotifyFeeds = spotifyFeedsResult.data ?? [];
  const applePodcastFeeds = applePodcastFeedsResult.data ?? [];
  const rules = rulesResult.data ?? [];
  const videos = dedupeReviewItems(filterCurrentReviewItems(videosResult.data ?? [], today));
  const episodes = dedupeReviewItems(filterCurrentReviewItems([
    ...(spotifyEpisodesResult.data ?? []).map((episode) => ({
      ...episode,
      provider: 'spotify',
    })),
    ...(applePodcastEpisodesResult.data ?? []).map((episode) => ({
      ...episode,
      provider: 'apple-podcast',
    })),
  ], today)).sort((left, right) => Date.parse(right.published_at) - Date.parse(left.published_at));
  const summaries = partners.map((partner) =>
    partnerSummary(partner.id, feeds, spotifyFeeds, applePodcastFeeds, rules, videos, episodes, today),
  );
  const analytics = await analyticsSummary(partners, analyticsRequest(searchParams));

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    today,
    partners,
    feeds,
    spotifyFeeds,
    applePodcastFeeds,
    rules,
    videos,
    episodes,
    summaries,
    analytics,
    homeSignals: {
      activeDevotions: optionalExactCount(activeDevotionsResult),
      openCalendarReviews: optionalExactCount(openCalendarReviewsResult),
    },
    totals: {
      partners: partners.length,
      activePartners: partners.filter(
        (partner) => partner.active && partner.onboarding_status === 'active',
      ).length,
      pendingVideos: videos.filter((video) => video.display_status === 'pending')
        .length,
      pendingEpisodes: episodes.filter((episode) => episode.display_status === 'pending')
        .length,
      approvedToday: videos.filter(
        (video) =>
          video.display_status === 'approved' && video.prayer_date === today,
      ).length + episodes.filter(
        (episode) =>
          episode.display_status === 'approved' && episode.prayer_date === today,
      ).length,
      staleFeeds: [...feeds, ...spotifyFeeds, ...applePodcastFeeds].filter((feed) => isStaleFeed(feed)).length,
    },
  };
}

function filterCurrentReviewItems(items, today) {
  return items.filter((item) => {
    const date = reviewItemDate(item);
    return date && date >= today;
  });
}

function dedupeReviewItems(items) {
  const selectedByKey = new Map();
  const keysByItemId = new Map();
  const duplicateIds = new Set();

  for (const item of items) {
    const keys = reviewIdentityKeys(item);

    if (keys.length === 0) {
      continue;
    }

    const existing = keys.map((key) => selectedByKey.get(key)).find(Boolean);

    if (!existing) {
      keysByItemId.set(item.id, keys);
      for (const key of keys) {
        selectedByKey.set(key, item);
      }
      continue;
    }

    const winner = preferredReviewItem(existing, item);
    const loser = winner.id === existing.id ? item : existing;
    const winnerKeys = new Set([
      ...(keysByItemId.get(winner.id) ?? []),
      ...(keysByItemId.get(loser.id) ?? []),
      ...keys,
    ]);

    duplicateIds.add(loser.id);
    duplicateIds.delete(winner.id);
    keysByItemId.set(winner.id, [...winnerKeys]);
    keysByItemId.set(loser.id, []);

    for (const key of winnerKeys) {
      selectedByKey.set(key, winner);
    }
  }

  return items.filter((item) => !duplicateIds.has(item.id));
}

function reviewIdentityKeys(item) {
  return [
    reviewSourceKey(item),
    reviewTitleDateKey(item),
  ].filter(Boolean);
}

function reviewSourceKey(item) {
  const source = normalizeReviewUrl(item.canonical_url);

  if (!source) {
    return null;
  }

  return `${item.partner_id}|source|${source}`;
}

function reviewTitleDateKey(item) {
  const title = normalizeReviewTitle(item.title);
  const date = reviewItemDate(item);

  if (!title || !date) {
    return null;
  }

  return `${item.partner_id}|title|${date}|${item.prayer_type ?? 'unclassified'}|${title}`;
}

function normalizeReviewUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (isTrackingParameter(key)) {
        url.searchParams.delete(key);
      }
    }
    const params = [...url.searchParams.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
    const query = params.length > 0
      ? `?${new URLSearchParams(params).toString()}`
      : '';

    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, '')}${query}`;
  } catch {
    return String(value).trim().toLowerCase().replace(/#.*$/, '').replace(/\/+$/, '');
  }
}

function isTrackingParameter(key) {
  return (
    key.toLowerCase().startsWith('utm_') ||
    ['at', 'ct', 'fbclid', 'gclid', 'igshid', 'mc_cid', 'mc_eid', 'si'].includes(
      key.toLowerCase(),
    )
  );
}

function normalizeReviewTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(apple podcasts?|spotify|episode|audio|video|official)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function reviewItemDate(item) {
  return item.prayer_date ?? item.published_at?.slice(0, 10) ?? null;
}

function preferredReviewItem(left, right) {
  const statusDifference =
    (REVIEW_STATUS_PRIORITY[left.display_status] ?? 99) -
    (REVIEW_STATUS_PRIORITY[right.display_status] ?? 99);

  if (statusDifference !== 0) {
    return statusDifference < 0 ? left : right;
  }

  const leftUpdatedAt = Date.parse(left.updated_at ?? left.created_at ?? left.published_at);
  const rightUpdatedAt = Date.parse(right.updated_at ?? right.created_at ?? right.published_at);

  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt > rightUpdatedAt ? left : right;
  }

  return Date.parse(left.published_at) >= Date.parse(right.published_at) ? left : right;
}

export function analyticsRequest(params) {
  const range = ['today', '7d', 'custom'].includes(params.get('range')) ? params.get('range') : '30d';
  const days = range === 'today' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 366;
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return null;
    const [year, month, day] = value.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? value : null;
  };
  const today = new Date().toISOString().slice(0, 10);
  const end = (validDate(params.get('end')) ?? today) > today ? today : (validDate(params.get('end')) ?? today);
  const requestedStart = range === 'custom' ? validDate(params.get('start')) : null;
  const start = requestedStart ?? new Date(Date.parse(`${end}T00:00:00Z`) - (days - 1) * 86400000).toISOString().slice(0, 10);
  const normalizedStart = start <= end ? (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`) > 365 * 86400000 ? new Date(Date.parse(`${end}T00:00:00Z`) - 365 * 86400000).toISOString().slice(0, 10) : start) : end;
  const text = (key) => String(params.get(key) ?? '').slice(0, 160);
  return { range, grain: ['daily', 'weekly', 'monthly'].includes(params.get('grain')) ? params.get('grain') : 'daily', start: normalizedStart, end, pageNumber: Math.min(100, Math.max(1, Number.parseInt(params.get('pageNumber') ?? '1', 10) || 1)), filters: Object.fromEntries(['device', 'event', 'page', 'community', 'partner', 'session'].map((key) => [key, text(key)])) };
}

export function analyticsFilterScope(filters) {
  const sessionOnly = Boolean(filters.session) && !filters.device && !filters.event && !filters.page && !filters.community && !filters.partner;
  return { sessionMetricsAvailable: !filters.device && !filters.event && !filters.page && !filters.community && !filters.partner, sessionOnly };
}

export async function readAnalyticsWindow(queryPage, { cap = 10000, batchSize = 1000 } = {}) {
  const rows = [];
  for (let offset = 0; offset <= cap; offset += batchSize) {
    const size = Math.min(batchSize, cap + 1 - offset);
    const result = await queryPage({ from: offset, to: offset + size - 1 });
    if (result?.error) return { rows: [], truncated: false, error: result.error };
    const page = result?.data ?? [];
    rows.push(...page);
    if (rows.length > cap) return { rows: rows.slice(0, cap), truncated: true, error: null };
    if (page.length < size) return { rows, truncated: false, error: null };
  }
  return { rows, truncated: rows.length >= cap, error: null };
}

async function analyticsSummary(partners, request) {
  const windowDays = Math.max(1, Math.round((Date.parse(`${request.end}T00:00:00Z`) - Date.parse(`${request.start}T00:00:00Z`)) / 86400000) + 1);
  const since = `${request.start}T00:00:00.000Z`;
  const until = `${request.end}T23:59:59.999Z`;
  const priorEnd = new Date(Date.parse(since) - 1).toISOString();
  const priorStart = new Date(Date.parse(since) - windowDays * 86400000).toISOString();
  const eventFields = 'occurred_at,session_id,event_name,anonymous_id,page_path,referrer,utm_source,device_class,partner_id,community_slug,content_id,content_type,provider,source_url';
  const sessionFields = 'started_at,session_id,anonymous_id,completed,opened_source,panel_open_seconds,highest_progress,provider,hour,ministry_id,source_type,page_context';
  const eventWindow = (start, end, fields = eventFields) => readAnalyticsWindow(({ from, to }) => supabase.from('analytics_events').select(fields).gte('occurred_at', start).lte('occurred_at', end).order('occurred_at', { ascending: false }).order('id', { ascending: false }).range(from, to));
  const sessionWindow = (start, end, fields = sessionFields) => readAnalyticsWindow(({ from, to }) => supabase.from('analytics_sessions').select(fields).gte('started_at', start).lte('started_at', end).order('started_at', { ascending: false }).order('session_id', { ascending: false }).range(from, to));
  const [eventsResult, sessionsResult, priorEventsResult, priorSessionsResult] = await Promise.all([
    eventWindow(since, until), sessionWindow(since, until), eventWindow(priorStart, priorEnd, 'anonymous_id,session_id,event_name,page_path,device_class,partner_id,community_slug'), sessionWindow(priorStart, priorEnd, 'anonymous_id,session_id'),
  ]);

  throwIfError(sessionsResult.error);

  if (eventsResult.error) {
    console.warn('[admin-partners] analytics_events_extended_query_failed', {
      code: eventsResult.error.code,
      message: eventsResult.error.message,
    });
    return legacyAnalyticsSummary(windowDays, sessionsResult.rows ?? [], eventsResult.error);
  }

  const communityPartners = new Map();
  for (const partner of partners) {
    communityPartners.set(partner.slug, partner);
    if (partner.community_page_slug) communityPartners.set(partner.community_page_slug, partner);
  }
  const scope = analyticsFilterScope(request.filters);
  const sourceCap = 10000;
  const sourceTruncated = eventsResult.truncated || sessionsResult.truncated;
  const events = [...eventsResult.rows].reverse().filter((event) => matchesAnalyticsFilters(event, request.filters, communityPartners));
  const rawSessions = [...sessionsResult.rows].reverse();
  const sessions = request.filters.session ? rawSessions.filter((session) => displayIdentifier('session', session.session_id) === request.filters.session) : rawSessions;
  const sessionMetrics = scope.sessionMetricsAvailable ? sessions : [];
  const priorEvents = priorEventsResult.rows.filter((event) => matchesAnalyticsFilters(event, request.filters, communityPartners));
  const priorSessions = request.filters.session ? priorSessionsResult.rows.filter((session) => displayIdentifier('session', session.session_id) === request.filters.session) : priorSessionsResult.rows;
  const pageViews = events.filter((event) => event.event_name === 'page_viewed');
  const communityPageViews = events.filter((event) => event.event_name === 'community_page_viewed');
  const outboundClicks = events.filter((event) => event.event_name === 'community_outbound_clicked');
  const contentCardClicks = events.filter((event) => event.event_name === 'content_card_clicked');
  const platformOpens = events.filter((event) =>
    event.event_name === 'platform_opened' || event.event_name === 'source_opened',
  );
  const activeUsers = new Set(
    [...events, ...(scope.sessionMetricsAvailable ? sessions : [])].map((item) => item.anonymous_id).filter(Boolean),
  );

  return {
    windowDays,
    generatedAt: new Date().toISOString(),
    totals: {
      events: events.length,
      prayerSessions: scope.sessionMetricsAvailable ? sessions.length : null,
      activeUsers: activeUsers.size,
      pageViews: pageViews.length,
      communityPageViews: communityPageViews.length,
      outboundClicks: outboundClicks.length,
      contentCardClicks: contentCardClicks.length,
      platformOpens: platformOpens.length,
      sourceOpens: scope.sessionMetricsAvailable ? sessions.filter((session) => session.opened_source).length : null,
      completions: scope.sessionMetricsAvailable ? sessions.filter((session) => session.completed).length : null,
      averagePanelOpenSeconds: average(
        sessionMetrics.map((session) => session.panel_open_seconds),
      ),
      averageHighestProgress: average(
        sessionMetrics.map((session) => session.highest_progress),
      ),
    },
    sessionMetricsAvailable: scope.sessionMetricsAvailable,
    rangeBounds: { start: request.start, end: request.end, timezone: 'UTC' },
    daily: aggregateAnalyticsFromEvents(events, sessionMetrics, request.grain),
    sourceCap, sourceTruncated,
    totalsStatus: sourceTruncated ? 'sampled' : 'exact',
    facets: analyticsFacets(eventsResult.rows, partners, communityPartners),
    prior: {
      start: priorStart.slice(0, 10), end: priorEnd.slice(0, 10),
      totals: priorEventsResult.error || priorSessionsResult.error || priorEventsResult.truncated || priorSessionsResult.truncated || sourceTruncated ? null : {
        events: priorEvents.length,
        activeUsers: new Set([...priorEvents, ...(scope.sessionMetricsAvailable ? priorSessions : [])].map((item) => item.anonymous_id).filter(Boolean)).size,
      },
    },
    explorer: analyticsExplorer(events, request, { partnerById: new Map(partners.map((partner) => [partner.id, partner])), communityPartners }),
    topPages: topCounts(pageViews, (event) => safeAnalyticsUrl(event.page_path, communityPartners) || 'Unavailable', 8),
    acquisitionSources: topCounts(events, (event) => safeCampaignSource(event.utm_source) || 'Unavailable', 8),
    deviceClasses: topCounts(events, (event) => safeAnalyticsDimension('device', event.device_class), 8),
    prayerByProvider: scope.sessionMetricsAvailable ? topCounts(sessions, (session) => safeAnalyticsDimension('provider', session.provider), 8) : [],
    prayerByHour: scope.sessionMetricsAvailable ? topCounts(sessions, (session) => safeAnalyticsDimension('hour', session.hour), 8) : [],
    platformOpensByProvider: topCounts(platformOpens, (event) => safeAnalyticsDimension('provider', event.provider), 8),
    outboundByDestination: topCounts(
      outboundClicks,
      (event) => safeAnalyticsDimension('contentType', event.content_type) || destinationType(event.source_url),
      8,
    ),
    communityPerformance: communityAnalytics(
      communityPageViews,
      outboundClicks,
      contentCardClicks,
      communityPartners,
    ),
    communityDetails: communityDetailAnalytics(events, communityPartners),
  };
}

export function analyticsFacets(events, partners, communityPartners) {
  const values = (items) => [...new Set(items.filter(Boolean))].sort().slice(0, 50);
  const partnerById = new Map(partners.map((partner) => [partner.id, partner]));
  return {
    devices: values(events.map((item) => safeAnalyticsDimension('device', item.device_class))),
    events: values(events.map((item) => safeAnalyticsDimension('event', item.event_name))),
    routes: values(events.map((item) => safeAnalyticsUrl(item.page_path, communityPartners))),
    communities: values(events.map((item) => item.community_slug && communityPartners.has(item.community_slug) ? item.community_slug : null)).map((value) => ({ value, label: communityPartners.get(value).name })),
    partners: values(events.map((item) => item.partner_id && partnerById.has(item.partner_id) ? item.partner_id : null)).map((value) => ({ value, label: partnerById.get(value).name })),
    sessions: values(events.map((item) => displayIdentifier('session', item.session_id))),
  };
}

export function communityDetailAnalytics(events, communityPartners = new Map()) {
  const rows = new Map();
  for (const event of events.filter((item) => item.community_slug && communityPartners.has(item.community_slug))) {
    const row = rows.get(event.community_slug) ?? { topContent: new Map(), destinations: new Map(), daily: new Map() };
    const content = safeContentLabel(event.content_id); if (content) row.topContent.set(content, (row.topContent.get(content) ?? 0) + 1);
    const destination = safeAnalyticsUrl(event.source_url, communityPartners);
    if (destination) row.destinations.set(destination, (row.destinations.get(destination) ?? 0) + 1);
    const date = event.occurred_at.slice(0, 10); row.daily.set(date, (row.daily.get(date) ?? 0) + 1);
    rows.set(event.community_slug, row);
  }
  const counts = (map) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  return Object.fromEntries([...rows.entries()].map(([slug, row]) => [slug, { topContent: counts(row.topContent), destinations: counts(row.destinations), daily: [...row.daily.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value })) }]));
}

export function matchesAnalyticsFilters(event, filters, communityPartners = new Map()) {
  return (!filters.device || event.device_class === filters.device)
    && (!filters.event || event.event_name === filters.event)
    && (!filters.page || safeAnalyticsUrl(event.page_path, communityPartners) === filters.page)
    && (!filters.community || event.community_slug === filters.community)
    && (!filters.partner || event.partner_id === filters.partner)
    && (!filters.session || displayIdentifier('session', event.session_id) === filters.session);
}

export function displayIdentifier(kind, value) {
  return value ? `${kind}-${createHash('sha256').update(String(value)).digest('hex').slice(0, 10)}` : null;
}

export function safeAnalyticsUrl(value, knownCommunities = new Map()) {
  if (!value) return null;
  try {
    const url = new URL(value, 'https://una-voce.invalid');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const path = decodeURIComponent(url.pathname);
    if (/[\u0000-\u001f\u007f@]/.test(path) || /(?:token|secret|password|passcode|apikey|authorization|reset|invite)/i.test(path) || /(?:^|\/)[A-Za-z0-9_-]{43}(?:\/|$)/.test(path)) return null;
    const local = safeLocalAnalyticsPath(path.toLowerCase(), knownCommunities);
    if (url.origin === 'https://una-voce.invalid') return local;
    if (['unavoce.net', 'www.unavoce.net'].includes(url.hostname)) return local ? `${url.origin}${local}` : null;
    if (['youtube.com','www.youtube.com','youtu.be','podcasts.apple.com','open.spotify.com','divineoffice.org','www.divineoffice.org','universalis.com','www.universalis.com'].includes(url.hostname)) return `${url.origin}${path}`;
    return url.origin;
  } catch { return null; }
}

function safeLocalAnalyticsPath(path, knownCommunities) {
  const routes = new Set(['/','/about','/contact','/discover','/parishes','/pray','/review','/start','/admin','/admin/partners','/admin/partners/review','/admin/partners/sources','/admin/partners/rules','/admin/analytics/activity','/admin/analytics/communities','/admin/devotions','/admin/analytics/devotions','/admin/calendar-engine','/devotions/holy-spirit-mens-ministry/night-prayer']);
  if (routes.has(path)) return path;
  const community = path.match(/^\/community\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (community && knownCommunities?.has(community[1])) return path;
  return null;
}

export function safeAnalyticsScalar(value) {
  const text = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160);
  if (!text || /@|\b(?:bearer|token|secret|password|apikey|authorization)\b/i.test(text) || /^[=+\-@]/.test(text)) return null;
  return text;
}

export function safeCampaignSource(value) {
  const text = String(value ?? '').trim().toLowerCase();
  return new Set(['direct','organic','google','bing','facebook','instagram','ig','x','twitter','youtube','tiktok','linkedin','newsletter','email','sms','qr','partner','parish','community','referral']).has(text) ? text : null;
}

export function safeAnalyticsDimension(kind, value) {
  const text = String(value ?? '').trim().toLowerCase();
  const values = {
    device: ['desktop','mobile','tablet','unknown'],
    provider: ['youtube','spotify','apple-podcast','apple','divine-office','universalis','unknown'],
    hour: ['office-of-readings','morning-prayer','daytime-prayer','midmorning-prayer','midday-prayer','midafternoon-prayer','evening-prayer','night-prayer'],
    event: ['app_opened','page_viewed','navigation_clicked','community_page_viewed','community_outbound_clicked','content_card_viewed','content_card_clicked','prayer_session_started','prayer_play_started','prayer_play_paused','prayer_play_resumed','prayer_progress','prayer_completed','prayer_session_ended','source_opened','platform_opened','share_clicked','search_performed','filter_changed','utm_landing_recorded','devotion_page_opened','devotion_resource_opened','devotion_report_submitted','devotion_survey_clicked'],
    contentType: ['video','audio','podcast','text','article','link','website','resource','prayer','community'],
  };
  return values[kind]?.includes(text) ? text : null;
}

export function safeContentLabel(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (['divine_office','universalis','youtube','spotify','apple-podcast'].includes(text)) return text;
  return null;
}

export function analyticsExplorer(events, request, context = { partnerById: new Map(), communityPartners: new Map() }) {
  const pageSize = 100;
  const sorted = [...events].sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
  const start = (request.pageNumber - 1) * pageSize;
  const safeEvent = (event) => ({ timestamp: event.occurred_at, sessionId: displayIdentifier('session', event.session_id), anonymousId: displayIdentifier('visitor', event.anonymous_id), route: safeAnalyticsUrl(event.page_path, context.communityPartners), event: safeAnalyticsDimension('event', event.event_name), content: safeContentLabel(event.content_id), partner: context.partnerById.get(event.partner_id)?.name ?? null, community: context.communityPartners.get(event.community_slug)?.name ?? null, destination: safeAnalyticsUrl(event.source_url, context.communityPartners), device: safeAnalyticsDimension('device', event.device_class), acquisition: safeCampaignSource(event.utm_source) || safeAnalyticsUrl(event.referrer, context.communityPartners) || null });
  const pageRows = sorted.slice(start, start + pageSize);
  const exportCap = 1000;
  return { page: request.pageNumber, pageSize, total: sorted.length, exportCap, exportTruncated: sorted.length > exportCap, rows: pageRows.map(safeEvent), exportRows: sorted.slice(0, exportCap).map(safeEvent), sessions: sessionSequencesForPage(pageRows, sorted, context.communityPartners) };
}

function sessionSequencesForPage(pageRows, allEvents, communityPartners = new Map()) {
  const ids = new Set(pageRows.map((item) => item.session_id).filter(Boolean));
  const output = {};
  for (const id of ids) output[displayIdentifier('session', id)] = allEvents.filter((item) => item.session_id === id).sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at)).slice(0, 100).map((item) => ({ timestamp: item.occurred_at, event: safeAnalyticsDimension('event', item.event_name) ?? 'Unavailable', route: safeAnalyticsUrl(item.page_path, communityPartners) }));
  return output;
}

export function aggregateAnalytics(rows, grain) {
  if (grain === 'daily') return rows;
  const grouped = new Map();
  for (const row of rows) {
    const date = new Date(`${row.date}T00:00:00Z`);
    const key = grain === 'monthly' ? row.date.slice(0, 7) : new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
    const item = grouped.get(key) ?? { date: key, events: 0, activeUsers: 0, pageViews: 0, communityPageViews: 0, outboundClicks: 0, contentCardClicks: 0, platformOpens: 0, prayerSessions: 0 };
    for (const field of ['events', 'pageViews', 'communityPageViews', 'outboundClicks', 'contentCardClicks', 'platformOpens', 'prayerSessions']) item[field] += row[field];
    item.activeUsers += row.activeUsers;
    grouped.set(key, item);
  }
  return [...grouped.values()];
}

function aggregateAnalyticsFromEvents(events, sessions, grain) {
  if (grain === 'daily') return dailyAnalytics(events, sessions);
  const buckets = new Map();
  const add = (item, date, isSession) => {
    const input = new Date(`${date}T00:00:00Z`); const key = grain === 'monthly' ? date.slice(0, 7) : new Date(input.getTime() - ((input.getUTCDay() + 6) % 7) * 86400000).toISOString().slice(0, 10);
    const row = buckets.get(key) ?? { date: key, events: 0, users: new Set(), pageViews: 0, communityPageViews: 0, outboundClicks: 0, contentCardClicks: 0, platformOpens: 0, prayerSessions: 0 };
    if (isSession) row.prayerSessions += 1; else { row.events += 1; if (item.event_name === 'page_viewed') row.pageViews += 1; if (item.event_name === 'community_page_viewed') row.communityPageViews += 1; if (item.event_name === 'community_outbound_clicked') row.outboundClicks += 1; if (item.event_name === 'content_card_clicked') row.contentCardClicks += 1; if (item.event_name === 'platform_opened' || item.event_name === 'source_opened') row.platformOpens += 1; }
    if (item.anonymous_id) row.users.add(item.anonymous_id); buckets.set(key, row);
  };
  events.forEach((item) => add(item, item.occurred_at.slice(0, 10), false)); sessions.forEach((item) => add(item, item.started_at.slice(0, 10), true));
  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)).map(({ users, ...row }) => ({ ...row, activeUsers: users.size }));
}

function legacyAnalyticsSummary(windowDays, sessions, eventsError) {
  const activeUsers = new Set(sessions.map((session) => session.anonymous_id).filter(Boolean));

  return {
    windowDays,
    generatedAt: new Date().toISOString(),
    schemaStatus: 'migration_required',
    schemaMessage: eventsError?.message ?? 'Analytics event columns are not available yet.',
    totals: {
      events: 0,
      prayerSessions: sessions.length,
      activeUsers: activeUsers.size,
      pageViews: 0,
      communityPageViews: 0,
      outboundClicks: 0,
      contentCardClicks: 0,
      platformOpens: 0,
      sourceOpens: sessions.filter((session) => session.opened_source).length,
      completions: sessions.filter((session) => session.completed).length,
      averagePanelOpenSeconds: average(
        sessions.map((session) => session.panel_open_seconds),
      ),
      averageHighestProgress: average(
        sessions.map((session) => session.highest_progress),
      ),
    },
    daily: dailyAnalytics([], sessions),
    prior: { start: null, end: null, totals: null },
    explorer: { page: 1, pageSize: 100, total: 0, exportCap: 1000, exportTruncated: false, rows: [], exportRows: [], sessions: {} },
    topPages: [],
    acquisitionSources: [],
    deviceClasses: [],
    prayerByProvider: topCounts(sessions, (session) => session.provider || 'unknown', 8),
    prayerByHour: topCounts(sessions, (session) => session.hour || 'unknown', 8),
    platformOpensByProvider: [],
    outboundByDestination: [],
    communityPerformance: [],
  };
}

function dailyAnalytics(events, sessions) {
  const days = new Map();

  for (const event of events) {
    const day = event.occurred_at.slice(0, 10);
    const row = dailyRow(days, day);
    row.events += 1;
    if (event.event_name === 'page_viewed') row.pageViews += 1;
    if (event.event_name === 'community_page_viewed') row.communityPageViews += 1;
    if (event.event_name === 'community_outbound_clicked') row.outboundClicks += 1;
    if (event.event_name === 'content_card_clicked') row.contentCardClicks += 1;
    if (event.event_name === 'platform_opened' || event.event_name === 'source_opened') row.platformOpens += 1;
    if (event.anonymous_id) row.activeUsers.add(event.anonymous_id);
  }

  for (const session of sessions) {
    const day = session.started_at.slice(0, 10);
    const row = dailyRow(days, day);
    row.prayerSessions += 1;
    if (session.anonymous_id) row.activeUsers.add(session.anonymous_id);
  }

  return [...days.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((row) => ({
      ...row,
      activeUsers: row.activeUsers.size,
    }));
}

function dailyRow(days, date) {
  if (!days.has(date)) {
    days.set(date, {
      date,
      events: 0,
      activeUsers: new Set(),
      pageViews: 0,
      communityPageViews: 0,
      outboundClicks: 0,
      contentCardClicks: 0,
      platformOpens: 0,
      prayerSessions: 0,
    });
  }

  return days.get(date);
}

export function communityAnalytics(pageViews, outboundClicks, contentCardClicks, communityPartners) {
  const rows = new Map();

  for (const event of [...pageViews, ...outboundClicks, ...contentCardClicks]) {
    const slug = event.community_slug;
    if (!slug || !communityPartners.has(slug)) continue;
    const row = communityRow(rows, slug, communityPartners.get(slug));

    if (event.event_name === 'community_page_viewed') row.pageViews += 1;
    if (event.event_name === 'community_outbound_clicked') row.outboundClicks += 1;
    if (event.event_name === 'content_card_clicked') row.contentClicks += 1;
    if (event.anonymous_id) row.activeUsers.add(event.anonymous_id);
  }

  return [...rows.values()]
    .sort((left, right) => {
      const rightScore = right.pageViews + right.outboundClicks + right.contentClicks;
      const leftScore = left.pageViews + left.outboundClicks + left.contentClicks;
      return rightScore - leftScore;
    })
    .map((row) => ({
      ...row,
      activeUsers: row.activeUsers.size,
    }));
}

function communityRow(rows, slug, partner) {
  if (!rows.has(slug)) {
    rows.set(slug, {
      communitySlug: slug,
      partnerId: partner?.id ?? null,
      partnerName: partner?.name ?? slug,
      activeUsers: new Set(),
      pageViews: 0,
      outboundClicks: 0,
      contentClicks: 0,
    });
  }

  return rows.get(slug);
}

function topCounts(items, keyForItem, limit) {
  const counts = new Map();

  for (const item of items) {
    const key = safeAnalyticsScalar(keyForItem(item));
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function average(values) {
  const numbers = values.filter((value) => Number.isFinite(value));

  if (numbers.length === 0) {
    return 0;
  }

  return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
}

function destinationType(url) {
  const value = (url ?? '').toLowerCase();

  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  if (value.includes('spotify.com')) return 'spotify';
  if (value.includes('podcasts.apple.com')) return 'apple_podcast';
  if (value.includes('rss')) return 'rss';
  return 'official_site';
}

function partnerSummary(partnerId, feeds, spotifyFeeds, applePodcastFeeds, rules, videos, episodes, today) {
  const partnerFeeds = feeds.filter((feed) => feed.partner_id === partnerId);
  const partnerSpotifyFeeds = spotifyFeeds.filter((feed) => feed.partner_id === partnerId);
  const partnerApplePodcastFeeds = applePodcastFeeds.filter((feed) => feed.partner_id === partnerId);
  const partnerRules = rules.filter((rule) => rule.partner_id === partnerId);
  const partnerVideos = videos.filter((video) => video.partner_id === partnerId);
  const partnerEpisodes = episodes.filter((episode) => episode.partner_id === partnerId);
  const approvedTodayHours = new Set(
    [...partnerVideos, ...partnerEpisodes]
      .filter(
        (item) =>
          item.display_status === 'approved' && item.prayer_date === today,
      )
      .map((item) => item.prayer_type)
      .filter(Boolean),
  );

  return {
    partnerId,
    feedCount: partnerFeeds.length,
    activeFeedCount: partnerFeeds.filter((feed) => feed.active).length,
    spotifyFeedCount: partnerSpotifyFeeds.length,
    activeSpotifyFeedCount: partnerSpotifyFeeds.filter((feed) => feed.active).length,
    applePodcastFeedCount: partnerApplePodcastFeeds.length,
    activeApplePodcastFeedCount: partnerApplePodcastFeeds.filter((feed) => feed.active).length,
    ruleCount: partnerRules.length,
    videoCount: partnerVideos.length,
    episodeCount: partnerEpisodes.length,
    pendingVideoCount: partnerVideos.filter(
      (video) => video.display_status === 'pending',
    ).length,
    pendingEpisodeCount: partnerEpisodes.filter(
      (episode) => episode.display_status === 'pending',
    ).length,
    approvedTodayCount: [...partnerVideos, ...partnerEpisodes].filter(
      (item) =>
        item.display_status === 'approved' && item.prayer_date === today,
    ).length,
    hiddenVideoCount: partnerVideos.filter(
      (video) => video.display_status === 'hidden',
    ).length,
    hiddenEpisodeCount: partnerEpisodes.filter(
      (episode) => episode.display_status === 'hidden',
    ).length,
    lastPolledAt: latestDate(
      [...partnerFeeds, ...partnerSpotifyFeeds, ...partnerApplePodcastFeeds].map((feed) => feed.last_polled_at),
    ),
    latestVideoAt: latestDate(partnerVideos.map((video) => video.published_at)),
    latestEpisodeAt: latestDate(partnerEpisodes.map((episode) => episode.published_at)),
    missingTodayHours: PRAYER_HOURS.filter((hour) => !approvedTodayHours.has(hour)),
  };
}

async function handleAction(payload) {
  switch (payload.action) {
    case 'upsertPartner':
      return upsertPartner(payload.partner);
    case 'upsertFeed':
      return upsertFeed(payload.feed);
    case 'upsertSpotifyFeed':
      return upsertSpotifyFeed(payload.feed);
    case 'upsertApplePodcastFeed':
      return upsertApplePodcastFeed(payload.feed);
    case 'upsertRule':
      return upsertRule(payload.rule);
    case 'updateVideo':
      return updateVideo(payload.video);
    case 'updateVideos':
      return updateVideos(payload.video);
    case 'updateEpisode':
      return updateEpisode(payload.episode);
    case 'updateEpisodes':
      return updateEpisodes(payload.episode);
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
    poll_once: Boolean(feed.poll_once),
    default_available_liturgical_seasons: enumArray(
      feed.default_available_liturgical_seasons,
      LITURGICAL_SEASONS,
      'default_available_liturgical_seasons',
    ),
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

async function upsertSpotifyFeed(feed) {
  const clean = compact({
    id: feed.id,
    partner_id: requiredString(feed.partner_id, 'partner_id'),
    spotify_show_id: requiredString(feed.spotify_show_id, 'spotify_show_id'),
    show_url: requiredString(feed.show_url, 'show_url'),
    embed_url: requiredString(feed.embed_url, 'embed_url'),
    rss_url: nullableString(feed.rss_url),
    polling_interval_minutes: positiveInteger(
      feed.polling_interval_minutes,
      'polling_interval_minutes',
    ),
    import_from_date: nullableString(feed.import_from_date),
    active: Boolean(feed.active),
  });

  const { data, error } = await supabase
    .from('partner_spotify_feeds')
    .upsert(clean, { onConflict: 'spotify_show_id' })
    .select('*')
    .single();

  throwIfError(error);
  return { ok: true, feed: data };
}

async function upsertApplePodcastFeed(feed) {
  const clean = compact({
    id: feed.id,
    partner_id: requiredString(feed.partner_id, 'partner_id'),
    apple_podcast_id: requiredString(feed.apple_podcast_id, 'apple_podcast_id'),
    show_url: requiredString(feed.show_url, 'show_url'),
    embed_url: requiredString(feed.embed_url, 'embed_url'),
    rss_url: nullableString(feed.rss_url),
    polling_interval_minutes: positiveInteger(
      feed.polling_interval_minutes,
      'polling_interval_minutes',
    ),
    import_from_date: nullableString(feed.import_from_date),
    active: Boolean(feed.active),
  });

  const { data, error } = await supabase
    .from('partner_apple_podcast_feeds')
    .upsert(clean, { onConflict: 'apple_podcast_id' })
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
    available_liturgical_seasons: enumArray(
      video.available_liturgical_seasons,
      LITURGICAL_SEASONS,
      'available_liturgical_seasons',
    ),
    available_weekdays: weekdayArray(video.available_weekdays),
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

async function updateVideos(video) {
  const ids = idArray(video.ids, 'ids');
  const displayStatus = enumValue(
    video.display_status,
    ['pending', 'approved', 'hidden', 'expired'],
    'display_status',
  );

  const { error, count } = await supabase
    .from('youtube_videos')
    .update({ display_status: displayStatus }, { count: 'exact' })
    .in('id', ids);

  throwIfError(error);
  return { ok: true, count: count ?? ids.length };
}

async function updateEpisode(episode) {
  const id = requiredString(episode.id, 'id');
  const provider = episode.provider === 'apple-podcast' ? 'apple-podcast' : 'spotify';
  const updates = compact({
    prayer_type: nullableEnumValue(episode.prayer_type, PRAYER_HOURS, 'prayer_type'),
    prayer_date: nullableString(episode.prayer_date),
    display_status: enumValue(
      episode.display_status,
      ['pending', 'approved', 'hidden', 'expired'],
      'display_status',
    ),
  });

  const { data, error } = await supabase
    .from(provider === 'apple-podcast' ? 'apple_podcast_episodes' : 'spotify_episodes')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  throwIfError(error);
  return { ok: true, episode: data };
}

async function updateEpisodes(episode) {
  const episodes = Array.isArray(episode.episodes) ? episode.episodes : [];
  const displayStatus = enumValue(
    episode.display_status,
    ['pending', 'approved', 'hidden', 'expired'],
    'display_status',
  );
  const spotifyIds = idArray(
    episodes
      .filter((item) => item.provider !== 'apple-podcast')
      .map((item) => item.id),
    'spotify episode ids',
    true,
  );
  const applePodcastIds = idArray(
    episodes
      .filter((item) => item.provider === 'apple-podcast')
      .map((item) => item.id),
    'apple podcast episode ids',
    true,
  );

  if (spotifyIds.length + applePodcastIds.length === 0) {
    throw new Error('Missing episode ids');
  }

  let updatedCount = 0;

  if (spotifyIds.length > 0) {
    const { error, count } = await supabase
      .from('spotify_episodes')
      .update({ display_status: displayStatus }, { count: 'exact' })
      .in('id', spotifyIds);

    throwIfError(error);
    updatedCount += count ?? spotifyIds.length;
  }

  if (applePodcastIds.length > 0) {
    const { error, count } = await supabase
      .from('apple_podcast_episodes')
      .update({ display_status: displayStatus }, { count: 'exact' })
      .in('id', applePodcastIds);

    throwIfError(error);
    updatedCount += count ?? applePodcastIds.length;
  }

  return { ok: true, count: updatedCount };
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

function idArray(values, field, allowEmpty = false) {
  if (!Array.isArray(values)) {
    throw new Error(`Invalid ${field}`);
  }

  const ids = [...new Set(values.map((value) => requiredString(value, field)))];

  if (!allowEmpty && ids.length === 0) {
    throw new Error(`Missing ${field}`);
  }

  return ids;
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

function enumArray(value, allowed, field) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => enumValue(item, allowed, field));
}

function weekdayArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const weekday = Number(item);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      throw new Error('Invalid available_weekdays');
    }

    return weekday;
  });
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

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}
