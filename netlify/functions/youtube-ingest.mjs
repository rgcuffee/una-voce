import { createClient } from '@supabase/supabase-js';

const JSON_HEADERS = {
  'content-type': 'application/json',
};

const USER_AGENT = 'Una Voce RSS Ingest/1.0 (+https://unavoce.app)';
const MAX_FEEDS_PER_RUN = 15;
const FETCH_TIMEOUT_MS = 12000;
const STRICT_IMPORT_KEYWORDS_BY_PARTNER_SLUG = new Map([
  [
    'padre-ruben-dario-garcia',
    [
      'lauds',
      'morning',
      'laudes',
      'manana',
      'compline',
      'night',
      'completas',
      'noche',
    ],
  ],
]);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ingestSharedSecret = process.env.INGEST_SHARED_SECRET;

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
  logInfo('started', {
    method: event.httpMethod,
    scheduled: false,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
  });

  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (!['GET', 'POST'].includes(event.httpMethod)) {
    logWarn('method_not_allowed', { method: event.httpMethod });
    return response(405, { error: 'Method not allowed' });
  }

  if (!supabase) {
    logError('missing_supabase_config', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(supabaseServiceRoleKey),
    });
    return response(500, { error: 'YouTube ingestion is not configured' });
  }

  if (!isAuthorized(event)) {
    logWarn('unauthorized');
    return response(401, { error: 'Unauthorized' });
  }

  const summary = await runYoutubeIngest();

  return response(summary.ok ? 202 : 500, summary);
}

export async function runYoutubeIngest() {
  const dueFeedsResult = await getDueFeeds();
  if (dueFeedsResult.error) {
    logError('load_feeds_failed', { error: dueFeedsResult.error.message });
    return { ok: false, error: 'Unable to load YouTube feeds' };
  }

  logInfo('feeds_loaded', {
    activeFeeds: dueFeedsResult.totalActiveFeeds,
    dueFeeds: dueFeedsResult.feeds.length,
  });

  const rulesResult = await getRulesForFeeds(dueFeedsResult.feeds);
  if (rulesResult.error) {
    logError('load_rules_failed', { error: rulesResult.error.message });
    return { ok: false, error: 'Unable to load classification rules' };
  }

  const results = [];
  for (const feed of dueFeedsResult.feeds) {
    results.push(await ingestFeed(feed, rulesResult.rulesByPartnerId));
  }

  const summary = {
    ok: true,
    feedsChecked: results.length,
    videosUpserted: results.reduce((total, result) => total + result.upserted, 0),
    results,
  };

  logInfo('finished', summary);

  return summary;
}

async function getDueFeeds() {
  const { data, error } = await supabase
    .from('partner_youtube_feeds')
    .select(
      [
        'id',
        'partner_id',
        'rss_url',
        'expected_content_mode',
        'polling_interval_minutes',
        'import_from_date',
        'poll_once',
        'default_available_liturgical_seasons',
        'last_polled_at',
        'partners!inner(active,slug)',
      ].join(','),
    )
    .eq('active', true)
    .eq('partners.active', true)
    .limit(250);

  if (error) {
    return { error };
  }

  const now = Date.now();
  const feeds = (data ?? [])
    .filter((feed) => isDueForPolling(feed, now))
    .slice(0, MAX_FEEDS_PER_RUN);

  return { feeds, totalActiveFeeds: data?.length ?? 0 };
}

async function getRulesForFeeds(feeds) {
  const partnerIds = [...new Set(feeds.map((feed) => feed.partner_id))];
  if (partnerIds.length === 0) {
    return { rulesByPartnerId: new Map() };
  }

  const { data, error } = await supabase
    .from('partner_classification_rules')
    .select(
      [
        'id',
        'partner_id',
        'include_keywords',
        'exclude_keywords',
        'prayer_type',
        'preferred_language',
        'priority',
        'default_display_status',
        'default_available_liturgical_seasons',
      ].join(','),
    )
    .in('partner_id', partnerIds)
    .eq('active', true)
    .order('priority', { ascending: false });

  if (error) {
    return { error };
  }

  const rulesByPartnerId = new Map();
  for (const rule of data ?? []) {
    const partnerRules = rulesByPartnerId.get(rule.partner_id) ?? [];
    partnerRules.push(rule);
    rulesByPartnerId.set(rule.partner_id, partnerRules);
  }

  return { rulesByPartnerId };
}

async function ingestFeed(feed, rulesByPartnerId) {
  const result = {
    feedId: feed.id,
    partnerId: feed.partner_id,
    fetched: 0,
    skipped: 0,
    upserted: 0,
    error: null,
  };

  try {
    logInfo('feed_started', {
      feedId: feed.id,
      partnerId: feed.partner_id,
      feedRef: feedRef(feed),
      importFromDate: feed.import_from_date,
    });

    const xml = await fetchFeed(feed.rss_url);
    const parsedVideos = parseYouTubeAtom(xml);
    const importableVideos = parsedVideos.filter((video) =>
      isImportableVideo(feed, video),
    );
    const existingClassifications = await getExistingClassifications(
      importableVideos.map((video) => video.youtubeVideoId),
    );
    const videos = importableVideos.map((video) =>
      normalizeVideo(
        feed,
        video,
        rulesByPartnerId.get(feed.partner_id) ?? [],
        existingClassifications.get(video.youtubeVideoId),
      ),
    );

    result.fetched = parsedVideos.length;
    result.skipped = parsedVideos.length - importableVideos.length;

    if (videos.length > 0) {
      const { error } = await supabase
        .from('youtube_videos')
        .upsert(videos, { onConflict: 'youtube_video_id' });

      if (error) {
        throw error;
      }
    }

    result.upserted = videos.length;
    await markFeedPolled(feed.id);
    logInfo('feed_finished', result);
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    logError('feed_failed', result);
  }

  return result;
}

function isImportableVideo(feed, video) {
  if (!matchesStrictImportFilter(feed, video)) {
    return false;
  }

  if (!feed.import_from_date) {
    return true;
  }

  return inferPrayerDate(video) >= feed.import_from_date;
}

function matchesStrictImportFilter(feed, video) {
  const partner = Array.isArray(feed.partners) ? feed.partners[0] : feed.partners;
  const keywords = STRICT_IMPORT_KEYWORDS_BY_PARTNER_SLUG.get(partner?.slug);

  if (!keywords) {
    return true;
  }

  return hasKeyword(normalizeKeywordText(video.title), keywords);
}

async function getExistingClassifications(youtubeVideoIds) {
  if (youtubeVideoIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('youtube_videos')
    .select(
      'youtube_video_id,prayer_type,display_status,available_liturgical_seasons,available_weekdays',
    )
    .in('youtube_video_id', youtubeVideoIds);

  if (error) {
    throw error;
  }

  return new Map(
    (data ?? []).map((video) => [
      video.youtube_video_id,
      {
        prayerType: video.prayer_type,
        displayStatus: video.display_status,
        availableLiturgicalSeasons: normalizeSeasons(
          video.available_liturgical_seasons,
        ),
        availableWeekdays: normalizeWeekdays(video.available_weekdays),
      },
    ]),
  );
}

async function fetchFeed(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'application/atom+xml, application/rss+xml, text/xml;q=0.9',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Feed returned ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseYouTubeAtom(xml) {
  return splitXmlElements(xml, 'entry').flatMap((entryXml) => {
    const youtubeVideoId =
      textContent(entryXml, 'yt:videoId') ??
      textContent(entryXml, 'videoId') ??
      stripPrefix(textContent(entryXml, 'id'), 'yt:video:');

    if (!youtubeVideoId) {
      return [];
    }

    const mediaGroup = textContentWithMarkup(entryXml, 'media:group') ?? '';
    const canonicalUrl =
      attribute(entryXml, 'link', 'href') ??
      `https://www.youtube.com/watch?v=${youtubeVideoId}`;

    return [
      {
        youtubeVideoId,
        title:
          textContent(entryXml, 'title') ??
          textContent(mediaGroup, 'media:title') ??
          'Untitled YouTube video',
        description:
          textContent(mediaGroup, 'media:description') ??
          textContent(entryXml, 'summary') ??
          null,
        publishedAt:
          parseDate(textContent(entryXml, 'published')) ??
          parseDate(textContent(entryXml, 'updated')) ??
          new Date().toISOString(),
        scheduledStartAt:
          parseDate(textContent(entryXml, 'yt:scheduledStartTime')) ??
          parseDate(textContent(entryXml, 'scheduledStartTime')),
        thumbnailUrl:
          attribute(mediaGroup, 'media:thumbnail', 'url') ??
          `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`,
        canonicalUrl,
      },
    ];
  });
}

function normalizeVideo(feed, parsedVideo, rules, existingClassification) {
  const classification =
    existingClassification ?? classifyVideo(parsedVideo, rules);
  const videoKind = inferVideoKind(feed.expected_content_mode, parsedVideo);
  const usesSeasonalAvailability = isSeasonalAvailabilityFeed(feed);
  const availableLiturgicalSeasons =
    usesSeasonalAvailability
      ? classification.availableLiturgicalSeasons?.length > 0
        ? classification.availableLiturgicalSeasons
        : normalizeSeasons(feed.default_available_liturgical_seasons)
      : [];
  const inferredWeekdays =
    availableLiturgicalSeasons.length > 0
      ? inferWeekdaysFromTitle(parsedVideo.title)
      : [];
  const availableWeekdays =
    classification.availableWeekdays?.length > 0
      ? classification.availableWeekdays
      : inferredWeekdays;

  return {
    partner_id: feed.partner_id,
    feed_id: feed.id,
    youtube_video_id: parsedVideo.youtubeVideoId,
    title: parsedVideo.title,
    description: parsedVideo.description,
    published_at: parsedVideo.publishedAt,
    prayer_date:
      availableLiturgicalSeasons.length > 0 ? null : inferPrayerDate(parsedVideo),
    scheduled_start_at: parsedVideo.scheduledStartAt,
    thumbnail_url: parsedVideo.thumbnailUrl,
    canonical_url: parsedVideo.canonicalUrl,
    embed_url: `https://www.youtube-nocookie.com/embed/${parsedVideo.youtubeVideoId}`,
    prayer_type: classification.prayerType,
    video_kind: videoKind,
    display_status: classification.displayStatus,
    available_liturgical_seasons: availableLiturgicalSeasons,
    available_weekdays: availableWeekdays,
  };
}

function isSeasonalAvailabilityFeed(feed) {
  const partner = Array.isArray(feed.partners) ? feed.partners[0] : feed.partners;
  return partner?.slug === 'word-on-fire';
}

function classifyVideo(video, rules) {
  const searchableText = normalizeKeywordText(
    `${video.title}\n${video.description ?? ''}`,
  );

  for (const rule of rules) {
    if (hasKeyword(searchableText, rule.exclude_keywords)) {
      return {
        prayerType: null,
        displayStatus: 'hidden',
        availableLiturgicalSeasons: [],
        availableWeekdays: [],
      };
    }
  }

  for (const rule of rules) {
    if (!hasRequiredKeywords(searchableText, rule.include_keywords)) {
      continue;
    }

    return {
      prayerType: rule.prayer_type,
      displayStatus: rule.default_display_status,
      availableLiturgicalSeasons: normalizeSeasons(
        rule.default_available_liturgical_seasons,
      ),
      availableWeekdays: [],
    };
  }

  return {
    prayerType: null,
    displayStatus: 'pending',
    availableLiturgicalSeasons: [],
    availableWeekdays: [],
  };
}

function inferVideoKind(expectedContentMode, video) {
  if (video.scheduledStartAt) {
    return 'scheduled_live';
  }

  if (expectedContentMode === 'live') {
    return 'live';
  }

  if (expectedContentMode === 'scheduled_live') {
    return 'scheduled_live';
  }

  if (expectedContentMode === 'pre_recorded') {
    return 'video';
  }

  return 'unknown';
}

async function markFeedPolled(feedId) {
  const { data } = await supabase
    .from('partner_youtube_feeds')
    .select('poll_once')
    .eq('id', feedId)
    .maybeSingle();

  await supabase
    .from('partner_youtube_feeds')
    .update({
      last_polled_at: new Date().toISOString(),
      ...(data?.poll_once ? { active: false } : {}),
    })
    .eq('id', feedId);
}

function isDueForPolling(feed, now) {
  if (feed.poll_once && feed.last_polled_at) {
    return false;
  }

  if (!feed.last_polled_at) {
    return true;
  }

  const lastPolledAt = Date.parse(feed.last_polled_at);
  if (Number.isNaN(lastPolledAt)) {
    return true;
  }

  return now - lastPolledAt >= feed.polling_interval_minutes * 60 * 1000;
}

function hasRequiredKeywords(searchableText, keywords) {
  const normalizedKeywords = normalizeKeywords(keywords);
  if (normalizedKeywords.length === 0) {
    return false;
  }

  return normalizedKeywords.some((keyword) => searchableText.includes(keyword));
}

function hasKeyword(searchableText, keywords) {
  return normalizeKeywords(keywords).some((keyword) =>
    searchableText.includes(keyword),
  );
}

function normalizeKeywords(keywords) {
  return (keywords ?? [])
    .map((keyword) => normalizeKeywordText(String(keyword).trim()))
    .filter(Boolean);
}

function normalizeKeywordText(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeSeasons(seasons) {
  return (seasons ?? [])
    .map((season) => String(season).trim())
    .filter(Boolean);
}

function normalizeWeekdays(weekdays) {
  return (weekdays ?? [])
    .map((weekday) => Number(weekday))
    .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6);
}

function inferWeekdaysFromTitle(title) {
  const normalizedTitle = title.toLowerCase();
  const weekdays = [
    ['sunday', 0],
    ['monday', 1],
    ['tuesday', 2],
    ['wednesday', 3],
    ['thursday', 4],
    ['friday', 5],
    ['saturday', 6],
  ];

  return weekdays
    .filter(([weekdayName]) =>
      new RegExp(`\\b${weekdayName}\\b`, 'i').test(normalizedTitle),
    )
    .map(([, weekday]) => weekday);
}

function splitXmlElements(xml, tagName) {
  const expression = new RegExp(`<${escapeRegExp(tagName)}\\b[\\s\\S]*?<\\/${escapeRegExp(tagName)}>`, 'gi');
  return xml.match(expression) ?? [];
}

function textContent(xml, tagName) {
  const content = textContentWithMarkup(xml, tagName);
  return content ? decodeXml(content.replace(/<[^>]*>/g, '').trim()) : null;
}

function textContentWithMarkup(xml, tagName) {
  const match = xml.match(
    new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*>([\\s\\S]*?)<\\/${escapeRegExp(tagName)}>`, 'i'),
  );

  return match?.[1] ?? null;
}

function attribute(xml, tagName, attributeName) {
  const element = xml.match(
    new RegExp(`<${escapeRegExp(tagName)}\\b[^>]*\\s${escapeRegExp(attributeName)}=["']([^"']+)["'][^>]*\\/?>`, 'i'),
  );

  return element?.[1] ? decodeXml(element[1]) : null;
}

function stripPrefix(value, prefix) {
  if (!value?.startsWith(prefix)) {
    return value ?? null;
  }

  return value.slice(prefix.length);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function inferDateFromTitle(title) {
  const months = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };
  const matches = [
    ...title.matchAll(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(\d{4}))?\b/gi,
    ),
    ...title.matchAll(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi,
    ),
  ];

  if (matches.length === 0) {
    return null;
  }

  const match = matches[matches.length - 1];
  const monthFirst = Number.isNaN(Number(match[1]));
  const monthName = monthFirst ? match[1] : match[2];
  const day = monthFirst ? match[2] : match[1];
  const titleYear = match[3];
  const year = titleYear ?? new Date().getUTCFullYear();
  return `${year}-${months[monthName.toLowerCase()]}-${day.padStart(2, '0')}`;
}

function inferPrayerDate(video) {
  const titleDate = inferDateFromTitle(video.title);
  if (titleDate) {
    return titleDate;
  }

  const sourceDate = video.scheduledStartAt ?? video.publishedAt;
  return new Date(sourceDate).toISOString().slice(0, 10);
}

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAuthorized(event) {
  if (!ingestSharedSecret) {
    return true;
  }

  const secretHeader = event.headers?.['x-ingest-secret'];
  const authorization = event.headers?.authorization ?? '';
  return (
    secretHeader === ingestSharedSecret ||
    authorization === `Bearer ${ingestSharedSecret}`
  );
}

function feedRef(feed) {
  if (feed.youtube_playlist_id) {
    return `playlist:${feed.youtube_playlist_id}`;
  }

  if (feed.youtube_channel_id) {
    return `channel:${feed.youtube_channel_id}`;
  }

  return 'unknown';
}

function logInfo(message, detail = {}) {
  console.info(`[youtube-ingest] ${message}`, JSON.stringify(detail));
}

function logWarn(message, detail = {}) {
  console.warn(`[youtube-ingest] ${message}`, JSON.stringify(detail));
}

function logError(message, detail = {}) {
  console.error(`[youtube-ingest] ${message}`, JSON.stringify(detail));
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}
