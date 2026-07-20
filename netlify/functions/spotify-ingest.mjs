import { createClient } from '@supabase/supabase-js';

const JSON_HEADERS = {
  'content-type': 'application/json',
};

const USER_AGENT = 'Una Voce Spotify RSS Ingest/1.0 (+https://unavoce.app)';
const MAX_FEEDS_PER_RUN = 15;
const FETCH_TIMEOUT_MS = 12000;
const EXCLUDED_EPISODE_TITLE_PATTERNS = [
  /\babout today\b/i,
  /\binvitatory\b/i,
];

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
    return response(405, { error: 'Method not allowed' });
  }

  if (!supabase) {
    return response(500, { error: 'Spotify ingestion is not configured' });
  }

  if (!isAuthorized(event)) {
    return response(401, { error: 'Unauthorized' });
  }

  const summary = await runSpotifyIngest();
  return response(summary.ok ? 202 : 500, summary);
}

export async function runSpotifyIngest() {
  const dueFeedsResult = await getDueFeeds();
  if (dueFeedsResult.error) {
    logError('load_feeds_failed', { error: dueFeedsResult.error.message });
    return { ok: false, error: 'Unable to load Spotify feeds' };
  }

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
    episodesUpserted: results.reduce((total, result) => total + result.upserted, 0),
    results,
  };

  logInfo('finished', summary);
  return summary;
}

async function getDueFeeds() {
  const { data, error } = await supabase
    .from('partner_spotify_feeds')
    .select(
      [
        'id',
        'partner_id',
        'spotify_show_id',
        'show_url',
        'embed_url',
        'rss_url',
        'polling_interval_minutes',
        'import_from_date',
        'last_polled_at',
        'partners!inner(active)',
      ].join(','),
    )
    .eq('active', true)
    .eq('partners.active', true)
    .not('rss_url', 'is', null)
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
    const xml = await fetchFeed(feed.rss_url);
    const parsedEpisodes = parsePodcastRss(xml, feed);
    result.fetched = parsedEpisodes.length;
    const importableEpisodes = parsedEpisodes.filter((episode) =>
      isImportableEpisode(feed, episode),
    );
    const episodesWithArtwork = await enrichEpisodesWithSpotifyArtwork(
      importableEpisodes,
    );
    const existingClassifications = await getExistingClassifications(
      episodesWithArtwork.map((episode) => episode.guid),
    );
    const episodes = episodesWithArtwork.map((episode) =>
      normalizeEpisode(
        feed,
        episode,
        rulesByPartnerId.get(feed.partner_id) ?? [],
        existingClassifications.get(episode.guid),
      ),
    );
    result.skipped = parsedEpisodes.length - importableEpisodes.length;

    if (episodes.length > 0) {
      const { error } = await supabase
        .from('spotify_episodes')
        .upsert(episodes, { onConflict: 'guid' });

      if (error) {
        throw error;
      }
    }

    result.upserted = episodes.length;
    await markFeedPolled(feed.id);
    logInfo('feed_finished', result);
  } catch (error) {
    result.error = errorMessage(error);
    logError('feed_failed', result);
  }

  return result;
}

function isImportableEpisode(feed, episode) {
  if (isExcludedEpisode(episode)) {
    return false;
  }

  if (!feed.import_from_date) {
    return true;
  }

  return inferPrayerDate(episode) >= feed.import_from_date;
}

function isExcludedEpisode(episode) {
  return EXCLUDED_EPISODE_TITLE_PATTERNS.some((pattern) =>
    pattern.test(episode.title),
  );
}

async function getExistingClassifications(guids) {
  if (guids.length === 0) {
    return new Map();
  }

  const rows = [];
  for (const batch of chunks(guids, 100)) {
    const { data, error } = await supabase
      .from('spotify_episodes')
      .select('guid,prayer_type,display_status')
      .in('guid', batch);

    if (error) {
      throw error;
    }

    rows.push(...(data ?? []));
  }

  return new Map(
    rows.map((episode) => [
      episode.guid,
      {
        prayerType: episode.prayer_type,
        displayStatus: episode.display_status,
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
        accept: 'application/rss+xml, application/xml, text/xml;q=0.9',
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

function parsePodcastRss(xml, feed) {
  const channelXml = textContentWithMarkup(xml, 'channel') ?? '';
  const channelImageXml = textContentWithMarkup(channelXml, 'image') ?? '';
  const channelImage =
    attribute(channelXml, 'itunes:image', 'href') ??
    textContent(channelImageXml, 'url') ??
    textContent(channelXml, 'url') ??
    null;

  return splitXmlElements(xml, 'item').flatMap((itemXml) => {
    const guid =
      textContent(itemXml, 'guid') ??
      textContent(itemXml, 'id') ??
      attribute(itemXml, 'enclosure', 'url') ??
      attribute(itemXml, 'link', 'href');

    if (!guid) {
      return [];
    }

    const canonicalUrl =
      spotifyEpisodeUrl(itemXml, feed) ??
      textContent(itemXml, 'link') ??
      feed.show_url;
    const spotifyEpisodeId = spotifyEpisodeIdFromUrl(canonicalUrl);

    return [
      {
        guid,
        spotifyEpisodeId,
        title: textContent(itemXml, 'title') ?? 'Untitled Spotify episode',
        description:
          textContent(itemXml, 'description') ??
          textContent(itemXml, 'itunes:summary') ??
          null,
        publishedAt:
          parseDate(textContent(itemXml, 'pubDate')) ??
          parseDate(textContent(itemXml, 'published')) ??
          new Date().toISOString(),
        durationSeconds: parseDuration(textContent(itemXml, 'itunes:duration')),
        imageUrl:
          attribute(itemXml, 'itunes:image', 'href') ??
          attribute(itemXml, 'image', 'href') ??
          channelImage,
        audioUrl: attribute(itemXml, 'enclosure', 'url'),
        canonicalUrl,
      },
    ];
  });
}

async function enrichEpisodesWithSpotifyArtwork(episodes) {
  return Promise.all(
    episodes.map(async (episode) => {
      if (episode.imageUrl || !episode.canonicalUrl.includes('open.spotify.com/episode/')) {
        return episode;
      }

      const thumbnailUrl = await fetchSpotifyOembedThumbnail(episode.canonicalUrl);
      return thumbnailUrl ? { ...episode, imageUrl: thumbnailUrl } : episode;
    }),
  );
}

async function fetchSpotifyOembedThumbnail(canonicalUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalUrl)}`,
      {
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/json',
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeEpisode(feed, parsedEpisode, rules, existingClassification) {
  const classification =
    existingClassification && existingClassification.displayStatus !== 'pending'
      ? existingClassification
      : classifyEpisode(parsedEpisode, rules);
  const spotifyEpisodeId = parsedEpisode.spotifyEpisodeId;

  return {
    partner_id: feed.partner_id,
    feed_id: feed.id,
    spotify_episode_id: spotifyEpisodeId,
    guid: parsedEpisode.guid,
    title: parsedEpisode.title,
    description: parsedEpisode.description,
    published_at: parsedEpisode.publishedAt,
    prayer_date: inferPrayerDate(parsedEpisode),
    duration_seconds: parsedEpisode.durationSeconds,
    image_url: parsedEpisode.imageUrl,
    audio_url: parsedEpisode.audioUrl,
    canonical_url: parsedEpisode.canonicalUrl,
    embed_url: spotifyEpisodeId
      ? `https://open.spotify.com/embed/episode/${spotifyEpisodeId}`
      : feed.embed_url,
    prayer_type: classification.prayerType,
    display_status: classification.displayStatus,
  };
}

function classifyEpisode(episode, rules) {
  const titleText = episode.title.toLowerCase();
  const searchableText = `${episode.title}\n${episode.description ?? ''}`.toLowerCase();

  for (const rule of rules) {
    if (hasKeyword(searchableText, rule.exclude_keywords)) {
      return {
        prayerType: null,
        displayStatus: 'hidden',
      };
    }
  }

  for (const rule of rules) {
    if (!hasRequiredKeywords(titleText, rule.include_keywords)) {
      continue;
    }

    return {
      prayerType: rule.prayer_type,
      displayStatus: rule.default_display_status,
    };
  }

  return {
    prayerType: null,
    displayStatus: 'pending',
  };
}

async function markFeedPolled(feedId) {
  await supabase
    .from('partner_spotify_feeds')
    .update({ last_polled_at: new Date().toISOString() })
    .eq('id', feedId);
}

function isDueForPolling(feed, now) {
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

  return normalizedKeywords.some((keyword) =>
    containsWholeKeyword(searchableText, keyword),
  );
}

function hasKeyword(searchableText, keywords) {
  return normalizeKeywords(keywords).some((keyword) =>
    containsWholeKeyword(searchableText, keyword),
  );
}

function containsWholeKeyword(searchableText, keyword) {
  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${escapeRegExp(keyword)}(?=$|[^\\p{L}\\p{N}])`,
    'iu',
  ).test(searchableText);
}

function normalizeKeywords(keywords) {
  return (keywords ?? [])
    .map((keyword) => String(keyword).trim().toLowerCase())
    .filter(Boolean);
}

function splitXmlElements(xml, tagName) {
  const expression = new RegExp(`<${escapeRegExp(tagName)}\\b[\\s\\S]*?<\\/${escapeRegExp(tagName)}>`, 'gi');
  return xml.match(expression) ?? [];
}

function textContent(xml, tagName) {
  const content = textContentWithMarkup(xml, tagName);
  return content ? decodeXml(content).replace(/<[^>]*>/g, '').trim() : null;
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

function spotifyEpisodeUrl(itemXml, feed) {
  const rawLinks = [
    textContent(itemXml, 'link'),
    attribute(itemXml, 'link', 'href'),
    textContent(itemXml, 'guid'),
  ].filter(Boolean);

  return rawLinks.find((value) => value.includes('open.spotify.com/episode/')) ?? null;
}

function spotifyEpisodeIdFromUrl(value) {
  const match = value?.match(/open\.spotify\.com\/episode\/([A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

function parseDuration(value) {
  if (!value) {
    return null;
  }

  const parts = value.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) {
    const seconds = Number(value);
    return Number.isFinite(seconds) ? seconds : null;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function inferDateFromTitle(title) {
  return inferDateFromTitleWithYear(title, new Date().getUTCFullYear());
}

function inferDateFromTitleWithYear(title, fallbackYear) {
  const numericDateMatch = title.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (numericDateMatch) {
    const [, month, day, year] = numericDateMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const months = {
    enero: '01',
    febrero: '02',
    marzo: '03',
    abril: '04',
    mayo: '05',
    junio: '06',
    julio: '07',
    agosto: '08',
    septiembre: '09',
    setiembre: '09',
    octubre: '10',
    noviembre: '11',
    diciembre: '12',
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
      /\b(\d{1,2})(?:st|nd|rd|th|º|ª)?\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|january|february|march|april|may|june|july|august|september|october|november|december)(?:\s+(?:de\s+)?(\d{4}))?\b/gi,
    ),
  ];

  if (matches.length === 0) {
    return null;
  }

  const [, day, monthName, titleYear] = matches[matches.length - 1];
  const year = titleYear ?? fallbackYear;
  return `${year}-${months[monthName.toLowerCase()]}-${day.padStart(2, '0')}`;
}

function inferPrayerDate(episode) {
  const urlDate = inferDateFromUrl(episode.guid) ?? inferDateFromUrl(episode.audioUrl);
  if (urlDate) {
    return urlDate;
  }

  const publishedYear = new Date(episode.publishedAt).getUTCFullYear();
  const titleDate = inferDateFromTitleWithYear(episode.title, publishedYear);
  if (titleDate) {
    return titleDate;
  }

  return new Date(episode.publishedAt).toISOString().slice(0, 10);
}

function inferDateFromUrl(value) {
  const match = value?.match(/[?&]date=(\d{4})(\d{2})(\d{2})(?:&|$)/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
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

function chunks(values, size) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function errorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    return JSON.stringify(error);
  }

  return String(error ?? 'Unknown error');
}

function logInfo(message, detail = {}) {
  console.info(`[spotify-ingest] ${message}`, JSON.stringify(detail));
}

function logError(message, detail = {}) {
  console.error(`[spotify-ingest] ${message}`, JSON.stringify(detail));
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}
