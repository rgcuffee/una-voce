import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

loadLocalEnv();

const JSON_HEADERS = {
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-origin': '*',
  'content-type': 'application/json',
};

const PRAYER_TYPES = [
  'office_of_readings',
  'lauds',
  'midday_prayer',
  'vespers',
  'compline',
];

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
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (event.httpMethod !== 'GET') {
    return response(405, { error: 'Method not allowed' });
  }

  if (process.env.NETLIFY_DEV !== 'true') {
    return response(404, { error: 'Preview content is only available locally' });
  }

  if (!supabase) {
    return response(500, { error: 'Preview content API is not configured' });
  }

  const params = new URLSearchParams(event.rawQuery ?? '');
  const date = params.get('date');
  const season = params.get('season');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return response(400, { error: 'A YYYY-MM-DD date is required' });
  }

  if (season && !LITURGICAL_SEASONS.includes(season)) {
    return response(400, { error: 'Invalid liturgical season' });
  }

  const selectedWeekday = weekdayForDate(date);
  const videoSelect = [
    'title',
    'description',
    'youtube_video_id',
    'thumbnail_url',
    'canonical_url',
    'embed_url',
    'published_at',
    'scheduled_start_at',
    'prayer_date',
    'prayer_type',
    'available_weekdays',
    'partners!inner(slug,name,active,onboarding_status)',
  ].join(',');
  const baseVideoQuery = () =>
    supabase
      .from('youtube_videos')
      .select(videoSelect)
      .in('display_status', ['approved', 'pending'])
      .eq('partners.active', true)
      .in('partners.onboarding_status', ['active', 'pending'])
      .eq('video_kind', 'video')
      .in('prayer_type', PRAYER_TYPES)
      .order('published_at', { ascending: false });

  const [
    datedVideosResult,
    seasonalVideosResult,
    spotifyAudioResult,
    appleAudioResult,
  ] = await Promise.all([
    baseVideoQuery().eq('prayer_date', date),
    season
      ? baseVideoQuery()
          .eq('partners.slug', 'word-on-fire')
          .is('prayer_date', null)
          .contains('available_liturgical_seasons', [season])
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('spotify_episodes')
      .select(
        [
          'title',
          'description',
          'spotify_episode_id',
          'image_url',
          'canonical_url',
          'embed_url',
          'published_at',
          'prayer_date',
          'prayer_type',
          'duration_seconds',
          'partners!inner(slug,name,active,onboarding_status)',
        ].join(','),
      )
      .in('display_status', ['approved', 'pending'])
      .eq('partners.active', true)
      .in('partners.onboarding_status', ['active', 'pending'])
      .eq('prayer_date', date)
      .in('prayer_type', PRAYER_TYPES)
      .order('published_at', { ascending: false }),
    supabase
      .from('apple_podcast_episodes')
      .select(
        [
          'title',
          'description',
          'apple_episode_id',
          'image_url',
          'canonical_url',
          'embed_url',
          'audio_url',
          'published_at',
          'prayer_date',
          'prayer_type',
          'duration_seconds',
          'partners!inner(slug,name,active,onboarding_status)',
        ].join(','),
      )
      .in('display_status', ['approved', 'pending'])
      .eq('partners.active', true)
      .in('partners.onboarding_status', ['active', 'pending'])
      .eq('prayer_date', date)
      .in('prayer_type', PRAYER_TYPES)
      .order('published_at', { ascending: false }),
  ]);

  if (datedVideosResult.error) {
    return response(500, { error: datedVideosResult.error.message });
  }

  if (seasonalVideosResult.error) {
    return response(500, { error: seasonalVideosResult.error.message });
  }

  if (spotifyAudioResult.error) {
    return response(500, { error: spotifyAudioResult.error.message });
  }

  if (appleAudioResult.error) {
    return response(500, { error: appleAudioResult.error.message });
  }

  return response(200, {
    ok: true,
    date,
    videos: mergeByCanonicalUrl([
      ...(datedVideosResult.data ?? []),
      ...filterVideosForWeekday(
        seasonalVideosResult.data ?? [],
        selectedWeekday,
      ),
    ]),
    audio: [
      ...(spotifyAudioResult.data ?? []).map((episode) => ({
        ...episode,
        provider: 'spotify',
      })),
      ...(appleAudioResult.data ?? []).map((episode) => ({
        ...episode,
        provider: 'apple-podcast',
      })),
    ],
  });
}

function mergeByCanonicalUrl(rows) {
  return [...new Map(rows.map((row) => [row.canonical_url, row])).values()];
}

function filterVideosForWeekday(rows, selectedWeekday) {
  return rows.filter((row) =>
    isAvailableForWeekday(row.available_weekdays, selectedWeekday),
  );
}

function isAvailableForWeekday(availableWeekdays, selectedWeekday) {
  if (!Array.isArray(availableWeekdays) || availableWeekdays.length === 0) {
    return true;
  }

  return availableWeekdays.map(Number).includes(selectedWeekday);
}

function weekdayForDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
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

function response(statusCode, body = null) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body === null ? '' : JSON.stringify(body),
  };
}
