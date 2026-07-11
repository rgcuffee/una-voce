const ANALYTICS_EVENT_NAME = 'una-voce:prayer-analytics';
const ANONYMOUS_ID_KEY = 'una-voce-anonymous-id';
const SESSION_ID_KEY = 'una-voce-session-id';
const SESSION_STARTED_AT_KEY = 'una-voce-session-started-at';
const ANALYTICS_ENDPOINT = '/api/analytics';

export type PrayerAnalyticsEventName =
  | 'app_opened'
  | 'page_viewed'
  | 'navigation_clicked'
  | 'community_page_viewed'
  | 'community_outbound_clicked'
  | 'content_card_viewed'
  | 'content_card_clicked'
  | 'prayer_session_started'
  | 'prayer_play_started'
  | 'prayer_play_paused'
  | 'prayer_play_resumed'
  | 'prayer_progress'
  | 'prayer_completed'
  | 'prayer_session_ended'
  | 'source_opened'
  | 'platform_opened'
  | 'share_clicked'
  | 'search_performed'
  | 'filter_changed'
  | 'utm_landing_recorded';

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
  pagePath?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  deviceClass?: string;
  partnerId?: string | null;
  communitySlug?: string;
  contentId?: string;
  contentType?: string;
  sourceUrl?: string;
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

  window.setTimeout(() => {
    trackAnalyticsEvent('app_opened', { pageContext: 'app' });
    const attribution = currentAttribution();
    if (
      attribution.utmSource ||
      attribution.utmMedium ||
      attribution.utmCampaign ||
      attribution.utmContent
    ) {
      trackAnalyticsEvent('utm_landing_recorded', {
        pageContext: 'app',
        ...attribution,
      });
    }
  }, 0);

  const handlePrayerAnalytics = (event: Event) => {
    const detail = (event as CustomEvent<PrayerAnalyticsEventDetail>).detail;
    void recordPrayerAnalyticsEvent(detail);
  };

  window.addEventListener(ANALYTICS_EVENT_NAME, handlePrayerAnalytics);
  return () => {
    window.removeEventListener(ANALYTICS_EVENT_NAME, handlePrayerAnalytics);
  };
}

export function trackAnalyticsEvent(
  eventName: PrayerAnalyticsEventName,
  detail: Partial<PrayerAnalyticsEventDetail> = {},
) {
  if (typeof window === 'undefined') {
    return;
  }

  const attribution = currentAttribution();
  const pagePath = detail.pagePath ?? `${window.location.pathname}${window.location.search}`;

  void recordPrayerAnalyticsEvent({
    sessionId: detail.sessionId ?? getClientSessionId(),
    eventName,
    startedAt: detail.startedAt ?? getClientSessionStartedAt(),
    occurredAt: detail.occurredAt,
    prayerId: detail.prayerId,
    ministryId: detail.ministryId,
    hour: detail.hour,
    locale: detail.locale,
    userId: detail.userId,
    anonymousId: detail.anonymousId,
    progressPercent: detail.progressPercent,
    playbackSeconds: detail.playbackSeconds,
    activePlaySeconds: detail.activePlaySeconds,
    panelOpenSeconds: detail.panelOpenSeconds,
    sourceName: detail.sourceName,
    sourceType: detail.sourceType,
    provider: detail.provider,
    videoId: detail.videoId,
    pageContext: detail.pageContext,
    pagePath,
    referrer: detail.referrer ?? (document.referrer || undefined),
    utmSource: detail.utmSource ?? attribution.utmSource,
    utmMedium: detail.utmMedium ?? attribution.utmMedium,
    utmCampaign: detail.utmCampaign ?? attribution.utmCampaign,
    utmContent: detail.utmContent ?? attribution.utmContent,
    deviceClass: detail.deviceClass ?? deviceClass(),
    partnerId: detail.partnerId,
    communitySlug: detail.communitySlug,
    contentId: detail.contentId,
    contentType: detail.contentType,
    sourceUrl: detail.sourceUrl,
    metadata: detail.metadata,
  });
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

function getClientSessionId() {
  const storedId = window.sessionStorage.getItem(SESSION_ID_KEY);
  if (storedId) {
    return storedId;
  }

  const sessionId = createAnalyticsId();
  window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  return sessionId;
}

function getClientSessionStartedAt() {
  const storedStartedAt = window.sessionStorage.getItem(SESSION_STARTED_AT_KEY);
  if (storedStartedAt) {
    return storedStartedAt;
  }

  const startedAt = new Date().toISOString();
  window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, startedAt);
  return startedAt;
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

function currentAttribution() {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
    utmContent: params.get('utm_content') ?? undefined,
  };
}

function deviceClass() {
  const width = window.innerWidth;
  if (width < 700) {
    return 'mobile';
  }
  if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
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
