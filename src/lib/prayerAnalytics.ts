import { isSupabaseConfigured, supabase } from './supabase';
import type { Json, Updates } from './database.types';

const ANALYTICS_EVENT_NAME = 'una-voce:prayer-analytics';
const ANONYMOUS_ID_KEY = 'una-voce-anonymous-id';

export type PrayerAnalyticsEventName =
  | 'prayer_session_started'
  | 'prayer_play_started'
  | 'prayer_play_paused'
  | 'prayer_play_resumed'
  | 'prayer_progress'
  | 'prayer_completed'
  | 'prayer_session_ended'
  | 'source_opened';

export interface PrayerAnalyticsEventDetail {
  sessionId: string;
  eventName: PrayerAnalyticsEventName;
  startedAt: string;
  occurredAt?: string;
  prayerId?: string;
  ministryId?: string;
  hour?: string;
  locale?: string;
  userId?: string | null;
  anonymousId?: string;
  progressPercent?: number;
  playbackSeconds?: number;
  activePlaySeconds?: number;
  panelOpenSeconds?: number;
  sourceName?: string;
  sourceType?: string;
  provider?: string;
  videoId?: string;
  pageContext?: string;
  metadata?: Record<string, unknown>;
}

export function dispatchPrayerAnalyticsEvent(
  detail: PrayerAnalyticsEventDetail,
) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<PrayerAnalyticsEventDetail>(ANALYTICS_EVENT_NAME, {
      detail,
    }),
  );
}

export function installPrayerAnalytics() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handlePrayerAnalytics = (event: Event) => {
    const detail = (event as CustomEvent<PrayerAnalyticsEventDetail>).detail;
    void recordPrayerAnalyticsEvent(detail);
  };

  window.addEventListener(ANALYTICS_EVENT_NAME, handlePrayerAnalytics);
  return () => {
    window.removeEventListener(ANALYTICS_EVENT_NAME, handlePrayerAnalytics);
  };
}

function getAnonymousId() {
  if (typeof window === 'undefined') {
    return createAnalyticsId();
  }

  const storedId = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (storedId) {
    return storedId;
  }

  const anonymousId = createAnalyticsId();
  window.localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  return anonymousId;
}

function createAnalyticsId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
}

async function recordPrayerAnalyticsEvent(detail: PrayerAnalyticsEventDetail) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const anonymousId = detail.anonymousId ?? getAnonymousId();
  const occurredAt = detail.occurredAt ?? new Date().toISOString();
  const locale = detail.locale ?? navigator.language ?? 'en-US';
  const metadata = compactMetadata({
    sourceName: detail.sourceName,
    sourceType: detail.sourceType,
    provider: detail.provider,
    videoId: detail.videoId,
    pageContext: detail.pageContext,
    ...detail.metadata,
  });

  const { error: eventError } = await supabase.from('analytics_events').insert({
    occurred_at: occurredAt,
    session_id: detail.sessionId,
    event_name: detail.eventName,
    prayer_id: detail.prayerId,
    ministry_id: detail.ministryId,
    hour: detail.hour,
    locale,
    user_id: detail.userId ?? null,
    anonymous_id: anonymousId,
    progress_percent: detail.progressPercent,
    playback_seconds: detail.playbackSeconds,
    metadata,
  });

  if (eventError) {
    console.warn('Unable to record prayer analytics event', eventError);
    return;
  }

  await updateAnalyticsSession({
    ...detail,
    anonymousId,
    locale,
    occurredAt,
  });
}

async function updateAnalyticsSession(detail: PrayerAnalyticsEventDetail) {
  if (!supabase) {
    return;
  }

  if (detail.eventName === 'prayer_session_started') {
    const { error } = await supabase.from('analytics_sessions').upsert(
      {
        session_id: detail.sessionId,
        started_at: detail.startedAt,
        ministry_id: detail.ministryId,
        prayer_id: detail.prayerId,
        hour: detail.hour,
        locale: detail.locale ?? 'en-US',
        user_id: detail.userId ?? null,
        anonymous_id: detail.anonymousId ?? getAnonymousId(),
        source_name: detail.sourceName,
        source_type: detail.sourceType,
        provider: detail.provider,
        video_id: detail.videoId,
        page_context: detail.pageContext,
      },
      { onConflict: 'session_id' },
    );

    if (error) {
      console.warn('Unable to start prayer analytics session', error);
    }
    return;
  }

  const updates = sessionUpdatesFor(detail);
  if (Object.keys(updates).length === 0) {
    return;
  }

  const { error } = await supabase
    .from('analytics_sessions')
    .update(updates)
    .eq('session_id', detail.sessionId);

  if (error) {
    console.warn('Unable to update prayer analytics session', error);
  }
}

function sessionUpdatesFor(
  detail: PrayerAnalyticsEventDetail,
): Updates<'analytics_sessions'> {
  const updates: Updates<'analytics_sessions'> = {};

  if (detail.eventName === 'prayer_session_ended') {
    updates.ended_at = detail.occurredAt ?? new Date().toISOString();
    updates.panel_open_seconds = detail.panelOpenSeconds;
    updates.active_play_seconds = detail.activePlaySeconds ?? 0;
  }

  if (detail.eventName === 'source_opened') {
    updates.opened_source = true;
  }

  if (detail.eventName === 'prayer_completed') {
    updates.completed = true;
    updates.highest_progress = 100;
  }

  if (
    detail.eventName === 'prayer_progress' &&
    typeof detail.progressPercent === 'number'
  ) {
    updates.highest_progress = detail.progressPercent;
  }

  if (typeof detail.activePlaySeconds === 'number') {
    updates.active_play_seconds = detail.activePlaySeconds;
  }

  return updates;
}

function compactMetadata(metadata: Record<string, unknown>): Json {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  ) as Json;
}
