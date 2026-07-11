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
const LITURGICAL_SEASONS = [
  'advent',
  'christmas',
  'ordinary_time',
  'lent',
  'triduum',
  'easter',
];

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
  const [
    partnersResult,
    feedsResult,
    spotifyFeedsResult,
    applePodcastFeedsResult,
    rulesResult,
    videosResult,
    spotifyEpisodesResult,
    applePodcastEpisodesResult,
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
        .limit(250),
      supabase
        .from('spotify_episodes')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(250),
      supabase
        .from('apple_podcast_episodes')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(250),
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
  const videos = videosResult.data ?? [];
  const episodes = [
    ...(spotifyEpisodesResult.data ?? []).map((episode) => ({
      ...episode,
      provider: 'spotify',
    })),
    ...(applePodcastEpisodesResult.data ?? []).map((episode) => ({
      ...episode,
      provider: 'apple-podcast',
    })),
  ].sort((left, right) => Date.parse(right.published_at) - Date.parse(left.published_at));
  const summaries = partners.map((partner) =>
    partnerSummary(partner.id, feeds, spotifyFeeds, applePodcastFeeds, rules, videos, episodes, today),
  );
  const analytics = await analyticsSummary(partners);

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

async function analyticsSummary(partners) {
  const windowDays = 30;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const [eventsResult, sessionsResult] = await Promise.all([
    supabase
      .from('analytics_events')
      .select(
        [
          'occurred_at',
          'event_name',
          'anonymous_id',
          'page_path',
          'page_context',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'device_class',
          'partner_id',
          'community_slug',
          'content_id',
          'content_type',
          'provider',
          'source_url',
          'ministry_id',
          'hour',
        ].join(','),
      )
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: true })
      .limit(10000),
    supabase
      .from('analytics_sessions')
      .select(
        [
          'started_at',
          'anonymous_id',
          'completed',
          'opened_source',
          'panel_open_seconds',
          'highest_progress',
          'provider',
          'hour',
          'ministry_id',
          'source_type',
          'page_context',
        ].join(','),
      )
      .gte('started_at', since)
      .order('started_at', { ascending: true })
      .limit(10000),
  ]);

  throwIfError(sessionsResult.error);

  if (eventsResult.error) {
    console.warn('[admin-partners] analytics_events_extended_query_failed', {
      code: eventsResult.error.code,
      message: eventsResult.error.message,
    });
    return legacyAnalyticsSummary(windowDays, sessionsResult.data ?? [], eventsResult.error);
  }

  const events = eventsResult.data ?? [];
  const sessions = sessionsResult.data ?? [];
  const communityPartners = new Map();

  for (const partner of partners) {
    communityPartners.set(partner.slug, partner);
    if (partner.community_page_slug) {
      communityPartners.set(partner.community_page_slug, partner);
    }
  }

  const pageViews = events.filter((event) => event.event_name === 'page_viewed');
  const communityPageViews = events.filter((event) => event.event_name === 'community_page_viewed');
  const outboundClicks = events.filter((event) => event.event_name === 'community_outbound_clicked');
  const contentCardClicks = events.filter((event) => event.event_name === 'content_card_clicked');
  const activeUsers = new Set(
    [...events, ...sessions].map((item) => item.anonymous_id).filter(Boolean),
  );

  return {
    windowDays,
    generatedAt: new Date().toISOString(),
    totals: {
      events: events.length,
      prayerSessions: sessions.length,
      activeUsers: activeUsers.size,
      pageViews: pageViews.length,
      communityPageViews: communityPageViews.length,
      outboundClicks: outboundClicks.length,
      contentCardClicks: contentCardClicks.length,
      sourceOpens: sessions.filter((session) => session.opened_source).length,
      completions: sessions.filter((session) => session.completed).length,
      averagePanelOpenSeconds: average(
        sessions.map((session) => session.panel_open_seconds),
      ),
      averageHighestProgress: average(
        sessions.map((session) => session.highest_progress),
      ),
    },
    daily: dailyAnalytics(events, sessions),
    topPages: topCounts(pageViews, (event) => event.page_path || 'unknown', 8),
    acquisitionSources: topCounts(events, (event) => event.utm_source || 'direct', 8),
    deviceClasses: topCounts(events, (event) => event.device_class || 'unknown', 8),
    prayerByProvider: topCounts(sessions, (session) => session.provider || 'unknown', 8),
    prayerByHour: topCounts(sessions, (session) => session.hour || 'unknown', 8),
    outboundByDestination: topCounts(
      outboundClicks,
      (event) => event.content_type || destinationType(event.source_url),
      8,
    ),
    communityPerformance: communityAnalytics(
      communityPageViews,
      outboundClicks,
      contentCardClicks,
      communityPartners,
    ),
  };
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
    topPages: [],
    acquisitionSources: [],
    deviceClasses: [],
    prayerByProvider: topCounts(sessions, (session) => session.provider || 'unknown', 8),
    prayerByHour: topCounts(sessions, (session) => session.hour || 'unknown', 8),
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
      prayerSessions: 0,
    });
  }

  return days.get(date);
}

function communityAnalytics(pageViews, outboundClicks, contentCardClicks, communityPartners) {
  const rows = new Map();

  for (const event of [...pageViews, ...outboundClicks, ...contentCardClicks]) {
    const slug = event.community_slug || 'unknown';
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
    .slice(0, 12)
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
    const key = keyForItem(item);
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

async function isAuthorized(event) {
  const secretHeader = event.headers?.['x-admin-secret'];
  const authorization = event.headers?.authorization ?? '';

  if (
    adminSharedSecret &&
    (secretHeader === adminSharedSecret ||
      authorization === `Bearer ${adminSharedSecret}`)
  ) {
    return true;
  }

  const token = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : '';

  if (!token || adminAllowedEmails.size === 0) {
    return false;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email) {
    return false;
  }

  return adminAllowedEmails.has(data.user.email.toLowerCase());
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}
