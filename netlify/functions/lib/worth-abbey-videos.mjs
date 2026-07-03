const WORTH_ABBEY_FEED_URLS = [
  'https://www.youtube.com/feeds/videos.xml?channel_id=UC6qobUSZqHUiFBLChENbExg',
  'https://www.youtube.com/feeds/videos.xml?playlist_id=PLKT-EuYiVIn8',
  'https://www.youtube.com/feeds/videos.xml?playlist_id=PLeuAWp_1Rbow',
  'https://www.youtube.com/feeds/videos.xml?playlist_id=PLeEBUcHTKRkM',
  'https://www.youtube.com/feeds/videos.xml?playlist_id=PLeezuYzAC08E',
  'https://www.youtube.com/feeds/videos.xml?playlist_id=PLZ51AsDFI65k',
];

const FETCH_TIMEOUT_MS = 12000;
const USER_AGENT = 'Una Voce Worth Abbey Card Fetch/1.0 (+https://unavoce.app)';

export async function worthAbbeyVideosResponse(date) {
  const selectedDate = validDateOrToday(date);
  const xmlResults = await Promise.allSettled(
    WORTH_ABBEY_FEED_URLS.map((url) => fetchFeed(url)),
  );
  const videos = oneVideoPerPrayerType(xmlResults
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => parseYouTubeAtom(result.value))
    .map((video) => normalizeWorthAbbeyVideo(video))
    .filter((video) => video.prayerDate === selectedDate)
    .filter((video) => video.prayerType !== null));
  const enrichedResults = await Promise.allSettled(
    videos.map((video) => enrichWorthAbbeyVideo(video)),
  );

  return {
    ok: true,
    date: selectedDate,
    videos: enrichedResults.map((result, index) =>
      result.status === 'fulfilled' ? result.value : videos[index],
    ),
    feedErrors: xmlResults.filter((result) => result.status === 'rejected').length,
    detailErrors: enrichedResults.filter((result) => result.status === 'rejected').length,
  };
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

function normalizeWorthAbbeyVideo(video) {
  const prayerType = classifyPrayerType(video.title, video.description);
  const prayerDate = inferDateFromTitle(video.title);

  return {
    partnerName: 'Worth Abbey',
    prayerType,
    prayerDate,
    title: video.title,
    displayTitle: displayWorthAbbeyTitle(video.title),
    description: video.description,
    youtubeVideoId: video.youtubeVideoId,
    thumbnailUrl: video.thumbnailUrl,
    canonicalUrl: video.canonicalUrl,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`,
    publishedAt: video.publishedAt,
    scheduledStartAt: video.scheduledStartAt,
    liveStartAt: null,
    liveEndAt: null,
    isLiveNow: false,
  };
}

async function enrichWorthAbbeyVideo(video) {
  const html = await fetchWatchPage(video.youtubeVideoId);
  const liveDetails = extractLiveBroadcastDetails(html);

  return {
    ...video,
    liveStartAt: liveDetails.startTimestamp,
    liveEndAt: liveDetails.endTimestamp,
    isLiveNow: liveDetails.isLiveNow,
  };
}

async function fetchWatchPage(youtubeVideoId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${youtubeVideoId}`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Watch page returned ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractLiveBroadcastDetails(html) {
  const liveDetailsMatch = html.match(
    /"liveBroadcastDetails":\{([\s\S]*?)\}(?=,"uploadDate"|,"isShortsEligible"|,"externalVideoId")/,
  );
  const liveDetails = liveDetailsMatch?.[1] ?? '';
  const metaStartDate = metaItempropContent(html, 'startDate');
  const metaEndDate = metaItempropContent(html, 'endDate');

  return {
    startTimestamp:
      parseDate(jsonStringField(liveDetails, 'startTimestamp')) ?? metaStartDate,
    endTimestamp:
      parseDate(jsonStringField(liveDetails, 'endTimestamp')) ?? metaEndDate,
    isLiveNow: jsonBooleanField(liveDetails, 'isLiveNow') ?? false,
  };
}

function jsonStringField(jsonFragment, fieldName) {
  const match = jsonFragment.match(
    new RegExp(`"${escapeRegExp(fieldName)}"\\s*:\\s*"([^"]+)"`),
  );

  return match?.[1] ? decodeJsonString(match[1]) : null;
}

function jsonBooleanField(jsonFragment, fieldName) {
  const match = jsonFragment.match(
    new RegExp(`"${escapeRegExp(fieldName)}"\\s*:\\s*(true|false)`),
  );

  return match ? match[1] === 'true' : null;
}

function metaItempropContent(html, itemprop) {
  const match = html.match(
    new RegExp(
      `<meta\\s+itemprop=["']${escapeRegExp(itemprop)}["']\\s+content=["']([^"']+)["']`,
      'i',
    ),
  );

  return match?.[1] ? parseDate(decodeXml(match[1])) : null;
}

function classifyPrayerType(title, description) {
  const searchableText = `${title}\n${description ?? ''}`.toLowerCase();

  if (searchableText.includes('mass')) {
    return null;
  }

  if (
    searchableText.includes('office of readings') ||
    searchableText.includes('matins') ||
    searchableText.includes('vigils')
  ) {
    return 'office_of_readings';
  }

  if (searchableText.includes('lauds') || searchableText.includes('morning prayer')) {
    return 'lauds';
  }

  if (searchableText.includes('midday prayer')) {
    return 'midday_prayer';
  }

  if (searchableText.includes('vespers') || searchableText.includes('evening prayer')) {
    return 'vespers';
  }

  if (searchableText.includes('compline') || searchableText.includes('night prayer')) {
    return 'compline';
  }

  return null;
}

function oneVideoPerPrayerType(videos) {
  const videosById = new Map(videos.map((video) => [video.youtubeVideoId, video]));
  const sortedVideos = [...videosById.values()].sort((left, right) => {
    const leftTime = Date.parse(left.scheduledStartAt ?? left.publishedAt);
    const rightTime = Date.parse(right.scheduledStartAt ?? right.publishedAt);
    return leftTime - rightTime;
  });
  const videosByPrayerType = new Map();

  for (const video of sortedVideos) {
    if (!videosByPrayerType.has(video.prayerType)) {
      videosByPrayerType.set(video.prayerType, video);
    }
  }

  return [...videosByPrayerType.values()];
}

function displayWorthAbbeyTitle(title) {
  const cleanTitle = title
    .replace(/\s*\|\s*Worth Abbey\s*$/i, '')
    .replace(/\s*-\s*Worth Abbey\s*$/i, '')
    .trim();
  const parts = cleanTitle
    .split(/\s+[–—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const datePartIndex = parts.findIndex((part) => inferDateFromTitle(part));

  if (datePartIndex < 0) {
    return cleanTitle.replace(/\s+[–—]\s+/g, ' - ');
  }

  const officeParts = parts.slice(0, datePartIndex);
  const officeTitle =
    officeParts.length > 1 && isStandaloneWeekday(officeParts[0])
      ? officeParts.slice(1).join(' - ')
      : officeParts.join(' - ');
  const descriptionParts = parts
    .slice(datePartIndex + 1)
    .map((part, index) => (index === 0 ? stripLeadingWeekdayMarker(part) : part))
    .filter((part, index) => part && (index > 0 || !isStandaloneWeekday(part)));
  const description = descriptionParts.join(' - ');

  return description ? `${officeTitle} - ${description}` : officeTitle;
}

function isStandaloneWeekday(value) {
  return /^(?:\(?\s*)?(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\.?(?:\s*\)?)?$/i.test(
    value.trim(),
  );
}

function stripLeadingWeekdayMarker(value) {
  return value
    .replace(
      /^\s*\(?\s*(?:mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\.?\s*\)?\s+/i,
      '',
    )
    .trim();
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

function validDateOrToday(date) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return new Date().toISOString().slice(0, 10);
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

function decodeXml(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodeJsonString(value) {
  return value
    .replace(/\\u0026/g, '&')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
