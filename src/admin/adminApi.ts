import type {
  LiturgicalHour,
  PartnerOnboardingStatus,
  PartnerRelationshipStatus,
  PartnerYoutubeContentMode,
  PartnerYoutubeFeedType,
  PrayerVideoKind,
  YoutubeVideoDisplayStatus,
} from '../lib/database.types';
import { supabase } from '../lib/supabase';

const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_BASE_URL ?? '';
const ADMIN_SECRET_KEY = 'una-voce-admin-secret';

export type AdminPartner = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  timezone: string;
  active: boolean;
  onboarding_status: PartnerOnboardingStatus;
  relationship_status: PartnerRelationshipStatus;
  relationship_status_updated_at: string;
  verified_at: string | null;
  partnered_at: string | null;
  consent_notes: string | null;
  consent_source: string | null;
  badge_enabled: boolean;
  community_page_enabled: boolean;
  community_page_slug: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminPartnerFeed = {
  id: string;
  partner_id: string;
  type: PartnerYoutubeFeedType;
  youtube_channel_id: string | null;
  youtube_playlist_id: string | null;
  rss_url: string;
  expected_content_mode: PartnerYoutubeContentMode;
  polling_interval_minutes: number;
  import_from_date: string | null;
  active: boolean;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminSpotifyFeed = {
  id: string;
  partner_id: string;
  spotify_show_id: string;
  show_url: string;
  embed_url: string;
  rss_url: string | null;
  polling_interval_minutes: number;
  import_from_date: string | null;
  active: boolean;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminApplePodcastFeed = {
  id: string;
  partner_id: string;
  apple_podcast_id: string;
  show_url: string;
  embed_url: string;
  rss_url: string | null;
  polling_interval_minutes: number;
  import_from_date: string | null;
  active: boolean;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminClassificationRule = {
  id: string;
  partner_id: string;
  name: string;
  include_keywords: string[];
  exclude_keywords: string[];
  prayer_type: LiturgicalHour | null;
  preferred_language: string | null;
  priority: number;
  default_display_status: YoutubeVideoDisplayStatus;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminYoutubeVideo = {
  id: string;
  partner_id: string;
  feed_id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  published_at: string;
  prayer_date: string | null;
  scheduled_start_at: string | null;
  thumbnail_url: string | null;
  canonical_url: string;
  embed_url: string;
  prayer_type: LiturgicalHour | null;
  video_kind: PrayerVideoKind;
  display_status: YoutubeVideoDisplayStatus;
  created_at: string;
  updated_at: string;
};

export type AdminAudioEpisode = {
  id: string;
  partner_id: string;
  feed_id: string;
  provider: 'spotify' | 'apple-podcast';
  spotify_episode_id?: string | null;
  apple_episode_id?: string | null;
  guid: string;
  title: string;
  description: string | null;
  published_at: string;
  prayer_date: string | null;
  duration_seconds: number | null;
  image_url: string | null;
  audio_url: string | null;
  canonical_url: string;
  embed_url: string;
  prayer_type: LiturgicalHour | null;
  display_status: YoutubeVideoDisplayStatus;
  created_at: string;
  updated_at: string;
};

export type PartnerSummary = {
  partnerId: string;
  feedCount: number;
  activeFeedCount: number;
  spotifyFeedCount: number;
  activeSpotifyFeedCount: number;
  applePodcastFeedCount: number;
  activeApplePodcastFeedCount: number;
  ruleCount: number;
  videoCount: number;
  episodeCount: number;
  pendingVideoCount: number;
  pendingEpisodeCount: number;
  approvedTodayCount: number;
  hiddenVideoCount: number;
  hiddenEpisodeCount: number;
  lastPolledAt: string | null;
  latestVideoAt: string | null;
  latestEpisodeAt: string | null;
  missingTodayHours: LiturgicalHour[];
};

export type AdminDashboardData = {
  ok: true;
  generatedAt: string;
  today: string;
  partners: AdminPartner[];
  feeds: AdminPartnerFeed[];
  spotifyFeeds: AdminSpotifyFeed[];
  applePodcastFeeds: AdminApplePodcastFeed[];
  rules: AdminClassificationRule[];
  videos: AdminYoutubeVideo[];
  episodes: AdminAudioEpisode[];
  summaries: PartnerSummary[];
  totals: {
    partners: number;
    activePartners: number;
    pendingVideos: number;
    pendingEpisodes: number;
    approvedToday: number;
    staleFeeds: number;
  };
};

export type PartnerDraft = {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  website?: string | null;
  logo_url?: string | null;
  country?: string | null;
  timezone: string;
  active: boolean;
  onboarding_status: PartnerOnboardingStatus;
  relationship_status: PartnerRelationshipStatus;
  verified_at?: string | null;
  partnered_at?: string | null;
  consent_notes?: string | null;
  consent_source?: string | null;
  badge_enabled: boolean;
  community_page_enabled: boolean;
  community_page_slug?: string | null;
};

export type FeedDraft = {
  id?: string;
  partner_id: string;
  type: PartnerYoutubeFeedType;
  youtube_channel_id?: string | null;
  youtube_playlist_id?: string | null;
  rss_url: string;
  expected_content_mode: PartnerYoutubeContentMode;
  polling_interval_minutes: number;
  import_from_date?: string | null;
  active: boolean;
};

export type SpotifyFeedDraft = {
  id?: string;
  partner_id: string;
  spotify_show_id: string;
  show_url: string;
  embed_url: string;
  rss_url?: string | null;
  polling_interval_minutes: number;
  import_from_date?: string | null;
  active: boolean;
};

export type ApplePodcastFeedDraft = {
  id?: string;
  partner_id: string;
  apple_podcast_id: string;
  show_url: string;
  embed_url: string;
  rss_url?: string | null;
  polling_interval_minutes: number;
  import_from_date?: string | null;
  active: boolean;
};

export type RuleDraft = {
  id?: string;
  partner_id: string;
  name: string;
  include_keywords: string[];
  exclude_keywords: string[];
  prayer_type?: LiturgicalHour | null;
  preferred_language?: string | null;
  priority: number;
  default_display_status: YoutubeVideoDisplayStatus;
  active: boolean;
};

export type VideoUpdate = {
  id: string;
  prayer_type?: LiturgicalHour | null;
  prayer_date?: string | null;
  display_status?: YoutubeVideoDisplayStatus;
};

export type EpisodeUpdate = {
  id: string;
  provider?: 'spotify' | 'apple-podcast';
  prayer_type?: LiturgicalHour | null;
  prayer_date?: string | null;
  display_status?: YoutubeVideoDisplayStatus;
};

function adminSecret() {
  return window.localStorage.getItem(ADMIN_SECRET_KEY) ?? '';
}

export function getStoredAdminSecret() {
  return adminSecret();
}

export function storeAdminSecret(secret: string) {
  if (secret.trim()) {
    window.localStorage.setItem(ADMIN_SECRET_KEY, secret.trim());
  } else {
    window.localStorage.removeItem(ADMIN_SECRET_KEY);
  }
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const secret = adminSecret();
  const headers = new Headers(options.headers);
  headers.set('accept', 'application/json');

  if (!(options.body instanceof FormData)) {
    headers.set('content-type', 'application/json');
  }

  if (secret) {
    headers.set('x-admin-secret', secret);
  } else if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(adminApiUrl(path), {
    ...options,
    headers,
  });
  const body = await response.json().catch(() => null);

  if (!body) {
    throw new Error('Admin API returned an invalid JSON response.');
  }

  if (!response.ok) {
    throw new Error(body?.error ?? `Admin request failed with ${response.status}`);
  }

  return body as T;
}

function adminApiUrl(path: string) {
  const base = localAdminApiBase();

  if (!base) {
    return path;
  }

  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function localAdminApiBase() {
  if (import.meta.env.DEV && window.location.hostname === 'localhost' && window.location.port === '5173') {
    return '';
  }

  if (!ADMIN_API_BASE) {
    return '';
  }

  if (import.meta.env.DEV) {
    try {
      const configuredUrl = new URL(ADMIN_API_BASE, window.location.origin);
      if (configuredUrl.hostname === 'localhost' && configuredUrl.port === '5173') {
        configuredUrl.port = '8888';
        return configuredUrl.origin;
      }
    } catch {
      return ADMIN_API_BASE;
    }
  }

  return ADMIN_API_BASE;
}

export function loadAdminDashboard() {
  return adminFetch<AdminDashboardData>('/api/admin/partners');
}

export function upsertPartner(partner: PartnerDraft) {
  return adminFetch<{ ok: true; partner: AdminPartner }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertPartner', partner }),
  });
}

export function upsertFeed(feed: FeedDraft) {
  return adminFetch<{ ok: true; feed: AdminPartnerFeed }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertFeed', feed }),
  });
}

export function upsertSpotifyFeed(feed: SpotifyFeedDraft) {
  return adminFetch<{ ok: true; feed: AdminSpotifyFeed }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertSpotifyFeed', feed }),
  });
}

export function upsertApplePodcastFeed(feed: ApplePodcastFeedDraft) {
  return adminFetch<{ ok: true; feed: AdminApplePodcastFeed }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertApplePodcastFeed', feed }),
  });
}

export function upsertRule(rule: RuleDraft) {
  return adminFetch<{ ok: true; rule: AdminClassificationRule }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'upsertRule', rule }),
  });
}

export function updateVideo(video: VideoUpdate) {
  return adminFetch<{ ok: true; video: AdminYoutubeVideo }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateVideo', video }),
  });
}

export function updateEpisode(episode: EpisodeUpdate) {
  return adminFetch<{ ok: true; episode: AdminAudioEpisode }>('/api/admin/partners', {
    method: 'POST',
    body: JSON.stringify({ action: 'updateEpisode', episode }),
  });
}
