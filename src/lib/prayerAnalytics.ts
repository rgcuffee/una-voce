const ANALYTICS_EVENT_NAME = 'una-voce:prayer-analytics';
const ANONYMOUS_ID_KEY = 'una-voce-anonymous-id';
const ANALYTICS_ENDPOINT = '/api/analytics';

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
  const anonymousId = detail.anonymousId ?? getAnonymousId();
  const occurredAt = detail.occurredAt ?? new Date().toISOString();
  const locale = detail.locale ?? navigator.language ?? 'en-US';

  const response = await fetch(ANALYTICS_ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    keepalive: detail.eventName === 'prayer_session_ended',
    body: JSON.stringify(
      compactPayload({
        ...detail,
        anonymousId,
        occurredAt,
        locale,
        metadata: compactMetadata(detail.metadata ?? {}),
      }),
    ),
  }).catch((error: unknown) => {
    console.warn('Unable to record prayer analytics event', error);
    return null;
  });

  if (response && !response.ok) {
    console.warn('Unable to record prayer analytics event', response.status);
  }
}

function compactPayload(
  payload: PrayerAnalyticsEventDetail & {
    anonymousId: string;
    occurredAt: string;
    locale: string;
  },
) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function compactMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}
