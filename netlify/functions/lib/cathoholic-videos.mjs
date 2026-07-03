const CATHOHOLIC_CHANNEL_ID = 'UCP5XkSkU2UDKWL4CFNMDQEA';
const CATHOHOLIC_FEED_URL = `https://www.youtube.com/feeds/videos.xml?channel_id=${CATHOHOLIC_CHANNEL_ID}`;
const FETCH_TIMEOUT_MS = 12000;
const USER_AGENT = 'Una Voce Cathoholic Card Fetch/1.0 (+https://unavoce.app)';

export async function cathoholicVideosResponse(date) {
  const selectedDate = validDateOrToday(date);
  const xml = await fetchFeed(CATHOHOLIC_FEED_URL);
  const videos = parseYouTubeAtom(xml)
    .map((video) => normalizeCathoholicVideo(video))
    .filter((video) => video.prayerDate === selectedDate)
    .filter((video) => video.prayerType === 'lauds' || video.prayerType === 'vespers');

  return {
    ok: true,
    date: selectedDate,
    videos,
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

function normalizeCathoholicVideo(video) {
  const prayerType = classifyPrayerType(video.title);
  const prayerDate = inferPrayerDate(video);

  return {
    partnerName: 'Cathoholic Music',
    prayerType,
    prayerDate,
    title: video.title,
    displayTitle: displayCathoholicTitle(video.title),
    description: video.description,
    youtubeVideoId: video.youtubeVideoId,
    thumbnailUrl: video.thumbnailUrl,
    canonicalUrl: video.canonicalUrl,
    embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}`,
    publishedAt: video.publishedAt,
    scheduledStartAt: video.scheduledStartAt,
  };
}

function classifyPrayerType(title) {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes('morning prayer') || normalizedTitle.includes('lauds')) {
    return 'lauds';
  }

  if (normalizedTitle.includes('evening prayer') || normalizedTitle.includes('vespers')) {
    return 'vespers';
  }

  return null;
}

function displayCathoholicTitle(title) {
  const parts = title
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts[parts.length - 1] ?? title;
}

function inferPrayerDate(video) {
  const titleDate = inferDateFromTitle(video.title);
  if (titleDate) {
    return titleDate;
  }

  const sourceDate = video.scheduledStartAt ?? video.publishedAt;
  return new Date(sourceDate).toISOString().slice(0, 10);
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
