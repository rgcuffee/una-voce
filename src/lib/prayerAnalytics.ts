import {
  sanitizeAnalyticsMetadata,
  sanitizeAnalyticsPagePath,
  sanitizeAnalyticsReferrer,
} from './analyticsPrivacy.mjs';
import {
  ANALYTICS_EVENT_NAMES,
  CANONICAL_ACQUISITION_SOURCES,
  CANONICAL_SURFACES,
  canonicalAcquisitionDefaults,
  extractAcquisitionParams,
  isRfc3339Timestamp,
  normalizeAcquisitionSurface,
  normalizeAcquisitionSource,
} from './analyticsContract.mjs';

const ANALYTICS_EVENT_NAME = 'una-voce:prayer-analytics';
const ANONYMOUS_ID_KEY = 'una-voce-anonymous-id';
const SESSION_ID_KEY = 'una-voce-session-id';
const SESSION_STARTED_AT_KEY = 'una-voce-session-started-at';
const SESSION_RETURN_KEY = 'una-voce-session-last-id';
const SESSION_RETURN_STARTED_AT_KEY = 'una-voce-session-last-started-at';
const ANALYTICS_ENDPOINT = '/api/analytics';

export type PrayerAnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface PrayerAnalyticsEventDetail {
  sessionId: string;
  eventName: PrayerAnalyticsEventName;
  startedAt: string;
  occurredAt?: string;
  eventId?: string;
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
  acquisitionSource?: string | null;
  acquisitionSurface?: string | null;
  acquisitionMedium?: string | null;
  acquisitionCampaign?: string | null;
  acquisitionContent?: string | null;
  acquisitionTerm?: string | null;
  installSurface?: 'pwa';
  deviceClass?: string;
  partnerId?: string | null;
  communitySlug?: string;
  contentId?: string;
  contentType?: string;
  sourceUrl?: string;
  devotionId?: string;
  devotionParticipantId?: string;
  pilotDay?: number | null;
  prayerDate?: string | null;
  resourceId?: string;
  mediaType?: string;
  metadata?: Record<string, unknown>;
}

type DevotionNightInput = Partial<PrayerAnalyticsEventDetail> & Pick<PrayerAnalyticsEventDetail, 'devotionId' | 'devotionParticipantId' | 'pilotDay' | 'prayerDate'>;
type SurveyInput = Partial<PrayerAnalyticsEventDetail> & Pick<PrayerAnalyticsEventDetail, 'devotionId' | 'devotionParticipantId' | 'resourceId' | 'mediaType'> & { mediaType: 'survey_link'; metadata: { surveyKind: 'pre' | 'post' } };
type PwaInstallInput = Partial<PrayerAnalyticsEventDetail> & { installSurface: 'pwa' };
type CampaignEvent = 'links_page_viewed' | 'current_hour_cta_viewed' | 'current_hour_cta_clicked' | 'session_started' | 'session_returned' | 'utm_landing_recorded' | 'continuation_opened';
type CampaignInput = Partial<PrayerAnalyticsEventDetail> & { acquisitionSource: 'website' | 'links_page' | 'qr' | 'sms' | 'social' | 'instagram' | 'organization' | 'devotion' | 'direct' | 'unknown'; acquisitionSurface: 'web' | 'pwa' };
type ContinuationInput = CampaignInput & { acquisitionSource: 'links_page'; pageContext: 'links_handoff' };
type ReservedStrictEvent = 'devotion_report_submitted' | 'devotion_survey_clicked' | 'devotion_survey_started' | 'devotion_survey_submitted' | 'pwa_install_eligible' | 'pwa_install_prompted' | 'pwa_install_installed' | CampaignEvent;

interface SessionContext {
  sessionId: string;
  sessionStartedAt: string;
  isSessionReturn: boolean;
  attribution: AcquisitionContext;
}

interface AcquisitionContext {
  source: string;
  surface: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  term: string | null;
  sessionId: string | null;
  sessionStartedAt: string | null;
  eventHint: string | null;
  handoffAction: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
}

let cachedSessionContext: SessionContext | null = null;

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

  const context = getSessionContext();

  window.setTimeout(() => {
    const base = {
      pageContext: 'app',
      acquisitionSource: context.attribution.source,
      acquisitionSurface: context.attribution.surface,
      acquisitionMedium: context.attribution.medium,
      acquisitionCampaign: context.attribution.campaign,
      acquisitionContent: context.attribution.content,
      acquisitionTerm: context.attribution.term,
      sessionId: context.sessionId,
      startedAt: context.sessionStartedAt,
    };

    trackAnalyticsEventUnsafe(context.isSessionReturn ? 'session_returned' : 'session_started', base);
    trackAnalyticsEventUnsafe('app_opened', base);
    if (
      context.attribution.eventHint === 'links_page_viewed' ||
      context.attribution.source === CANONICAL_ACQUISITION_SOURCES.LINKS_PAGE
    ) {
      trackAnalyticsEventUnsafe('links_page_viewed', {
        ...base,
        pageContext: 'links_handoff',
      });
    }

    if (
      context.attribution.eventHint === 'current_hour_cta_viewed' ||
      context.attribution.handoffAction === 'current-hour-cta'
    ) {
      trackAnalyticsEventUnsafe('current_hour_cta_viewed', {
        ...base,
        pageContext: 'links_handoff',
      });
      trackAnalyticsEventUnsafe('current_hour_cta_clicked', {
        ...base,
        pageContext: 'links_handoff',
      });
    }

    if (context.attribution.handoffAction === 'continuation' && context.attribution.source === CANONICAL_ACQUISITION_SOURCES.LINKS_PAGE) {
      trackAnalyticsEventUnsafe('continuation_opened', { ...base, pageContext: 'links_handoff' });
    }

    if (
      context.attribution.utmSource ||
      context.attribution.utmMedium ||
      context.attribution.utmCampaign ||
      context.attribution.utmContent
    ) {
      trackAnalyticsEventUnsafe('utm_landing_recorded', {
        ...base,
        pageContext: 'app',
      });
    }
  }, 0);

  const handlePrayerAnalytics = (event: Event) => {
    const detail = (event as CustomEvent<PrayerAnalyticsEventDetail>).detail;
    trackAnalyticsEventUnsafe(detail.eventName, detail);
  };

  window.addEventListener(ANALYTICS_EVENT_NAME, handlePrayerAnalytics);
  // These browser events occur in the current browser session (often web),
  // while their target is an installed PWA. Keep those concepts distinct.
  const onInstallEligible = () => trackAnalyticsEventUnsafe('pwa_install_eligible', { pageContext: 'pwa', installSurface: 'pwa' });
  const onInstalled = () => trackAnalyticsEventUnsafe('pwa_install_installed', { pageContext: 'pwa', installSurface: 'pwa' });
  window.addEventListener('beforeinstallprompt', onInstallEligible);
  window.addEventListener('appinstalled', onInstalled);
  return () => {
    window.removeEventListener(ANALYTICS_EVENT_NAME, handlePrayerAnalytics);
    window.removeEventListener('beforeinstallprompt', onInstallEligible);
    window.removeEventListener('appinstalled', onInstalled);
  };
}

export function trackAnalyticsEvent(eventName: 'devotion_report_submitted', detail: DevotionNightInput & { metadata: { outcome: 'prayed' | 'started_not_finished' | 'not_tonight' } }): void;
export function trackAnalyticsEvent(eventName: 'devotion_survey_clicked' | 'devotion_survey_started' | 'devotion_survey_submitted', detail: SurveyInput): void;
export function trackAnalyticsEvent(eventName: 'pwa_install_eligible' | 'pwa_install_prompted' | 'pwa_install_installed', detail: PwaInstallInput): void;
export function trackAnalyticsEvent(eventName: 'continuation_opened', detail: ContinuationInput): void;
export function trackAnalyticsEvent(eventName: Exclude<CampaignEvent, 'continuation_opened'>, detail: CampaignInput): void;
export function trackAnalyticsEvent(eventName: Exclude<PrayerAnalyticsEventName, ReservedStrictEvent>, detail?: Partial<PrayerAnalyticsEventDetail>): void;
export function trackAnalyticsEvent(eventName: PrayerAnalyticsEventName, detail: Partial<PrayerAnalyticsEventDetail> = {}) {
  trackAnalyticsEventUnsafe(eventName, detail);
}

function trackAnalyticsEventUnsafe(
  eventName: PrayerAnalyticsEventName,
  detail: Partial<PrayerAnalyticsEventDetail> = {},
) {
  if (typeof window === 'undefined') {
    return;
  }

  void recordPrayerAnalyticsEvent(enrichPrayerAnalyticsEvent(eventName, detail));
}

export function enrichPrayerAnalyticsEvent(
  eventName: PrayerAnalyticsEventName,
  detail: Partial<PrayerAnalyticsEventDetail> = {},
): PrayerAnalyticsEventDetail {
  const context = getSessionContext();
  const pagePath = sanitizeAnalyticsPagePath(detail.pagePath ?? `${window.location.pathname}${window.location.search}`);
  return {
    sessionId: detail.sessionId ?? context.sessionId,
    eventName,
    startedAt: detail.startedAt ?? context.sessionStartedAt,
    occurredAt: detail.occurredAt,
    // A transport retry retains this ID; each new interaction receives a new
    // ID, so equal-looking repeated clicks remain distinct events.
    eventId: detail.eventId ?? createAnalyticsId(),
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
    referrer: sanitizeAnalyticsReferrer(
      detail.referrer ?? (document.referrer || undefined) ?? '',
    ) || undefined,
    utmSource:
      detail.utmSource ??
      context.attribution.utmSource ??
      context.attribution.source,
    utmMedium:
      detail.utmMedium ??
      context.attribution.medium ??
      context.attribution.utmMedium ?? undefined,
    utmCampaign:
      detail.utmCampaign ??
      context.attribution.campaign ??
      context.attribution.utmCampaign ?? undefined,
    utmContent:
      detail.utmContent ??
      context.attribution.content ??
      context.attribution.utmContent ?? undefined,
    acquisitionSource:
      normalizeAcquisitionSource(detail.acquisitionSource) ?? normalizeAcquisitionSource(context.attribution.source),
    acquisitionSurface:
      normalizeAcquisitionSurface(detail.acquisitionSurface) ?? normalizeAcquisitionSurface(context.attribution.surface) ?? CANONICAL_SURFACES.WEB,
    acquisitionMedium: detail.acquisitionMedium ?? context.attribution.medium,
    acquisitionCampaign: detail.acquisitionCampaign ?? context.attribution.campaign,
    acquisitionContent: detail.acquisitionContent ?? context.attribution.content,
    acquisitionTerm: detail.acquisitionTerm ?? context.attribution.term,
    installSurface: detail.installSurface,
    deviceClass: detail.deviceClass ?? deviceClass(),
    partnerId: detail.partnerId,
    communitySlug: detail.communitySlug,
    contentId: detail.contentId,
    contentType: detail.contentType,
    sourceUrl: detail.sourceUrl,
    devotionId: detail.devotionId,
    devotionParticipantId: detail.devotionParticipantId,
    pilotDay: detail.pilotDay,
    prayerDate: detail.prayerDate,
    resourceId: detail.resourceId,
    mediaType: detail.mediaType,
    metadata: sanitizeAnalyticsMetadata(detail.metadata ?? {}),
  };
}

function getSessionContext() {
  if (cachedSessionContext && isRfc3339Timestamp(cachedSessionContext.sessionStartedAt)) {
    return cachedSessionContext;
  }
  cachedSessionContext = null;

  const acquisition = currentAcquisition();
  const requestedSessionId = normalizeUuid(acquisition.sessionId);
  const requestedStartedAt = acquisition.sessionStartedAt && isRfc3339Timestamp(acquisition.sessionStartedAt)
    ? acquisition.sessionStartedAt
    : null;
  const storedSessionId = normalizeUuid(window.sessionStorage.getItem(SESSION_ID_KEY));
  const storedStartedAt = window.sessionStorage.getItem(SESSION_STARTED_AT_KEY);
  let { sessionId, startedAt } = resolveAnalyticsSessionPair(
    { sessionId: requestedSessionId, startedAt: requestedStartedAt },
    { sessionId: storedSessionId, startedAt: storedStartedAt },
  );

  const lastSessionId = localStorage.getItem(SESSION_RETURN_KEY);
  const lastSessionStartedAt = localStorage.getItem(SESSION_RETURN_STARTED_AT_KEY);
  const fresh = isRfc3339Timestamp(startedAt);
  if (!fresh) { sessionId = createAnalyticsId(); startedAt = new Date().toISOString(); }
  const lastTime = Number(lastSessionStartedAt);
  const startedAtTime = Date.parse(startedAt);
  const now = Date.now();
  const isSessionReturn =
    lastSessionId === sessionId &&
    Number.isFinite(lastTime) &&
    lastTime === startedAtTime &&
    lastTime >= now - 4 * 24 * 60 * 60 * 1000 &&
    lastTime <= now;

  localStorage.setItem(SESSION_RETURN_KEY, sessionId);
  localStorage.setItem(SESSION_RETURN_STARTED_AT_KEY, String(Date.parse(startedAt)));
  window.sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, startedAt);

  cachedSessionContext = {
    sessionId,
    sessionStartedAt: startedAt,
    isSessionReturn,
    attribution: acquisition,
  };
  return cachedSessionContext;
}

export function resolveAnalyticsSessionPair(
  inbound: { sessionId: string | null; startedAt: string | null },
  stored: { sessionId: string | null; startedAt: string | null },
  makeId = createAnalyticsId,
  now = () => new Date().toISOString(),
) {
  const valid = (pair: { sessionId: string | null; startedAt: string | null }) =>
    Boolean(pair.sessionId && isUuid(pair.sessionId) && pair.startedAt && isRfc3339Timestamp(pair.startedAt));
  if (valid(inbound)) return { sessionId: inbound.sessionId!, startedAt: inbound.startedAt! };
  if (valid(stored)) return { sessionId: stored.sessionId!, startedAt: stored.startedAt! };
  return { sessionId: makeId(), startedAt: now() };
}

function normalizeAcquisitionForDefaults(context: AcquisitionContext) {
  return {
    ...canonicalAcquisitionDefaults(),
    ...context,
    source: normalizeAcquisitionSource(context.source) ?? CANONICAL_ACQUISITION_SOURCES.DIRECT,
    surface:
      normalizeAcquisitionSurface(context.surface) ?? CANONICAL_SURFACES.WEB,
  };
}

function currentAcquisition() {
  if (typeof window === 'undefined') {
    return {
      ...canonicalAcquisitionDefaults(),
      sessionId: null,
      sessionStartedAt: null,
      eventHint: null,
      handoffAction: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
    } as never;
  }

  const raw = extractAcquisitionParams(new URLSearchParams(window.location.search));
  const sourceFromReferrer = inferAcquisitionSourceFromReferrer();
  const normalized = normalizeAcquisitionForDefaults({
    source: raw.source || sourceFromReferrer,
    surface: installedSurface(),
    medium: raw.medium,
    campaign: raw.campaign,
    content: raw.content,
    term: raw.term,
    sessionId: raw.sessionId,
    sessionStartedAt: raw.sessionStartedAt,
    eventHint: raw.eventHint,
    handoffAction: raw.handoffAction,
    utmSource: raw.rawUtmSource,
    utmMedium: raw.rawUtmMedium,
    utmCampaign: raw.rawUtmCampaign,
    utmContent: raw.rawUtmContent,
  } as AcquisitionContext);

  return {
    ...normalized,
    utmSource:
      raw.rawUtmSource ?? normalized.source,
    utmMedium: raw.rawUtmMedium,
    utmCampaign: raw.rawUtmCampaign,
    utmContent: raw.rawUtmContent,
  };
}

function inferAcquisitionSourceFromReferrer() {
  try {
    const referrer = document.referrer;
    if (!referrer) {
      return CANONICAL_ACQUISITION_SOURCES.DIRECT;
    }
    const { hostname } = new URL(referrer);
    if (hostname === 'links.unavoce.net' || hostname.endsWith('.links.unavoce.net')) {
      return CANONICAL_ACQUISITION_SOURCES.LINKS_PAGE;
    }
    if (hostname === 'unavoce.net' || hostname.endsWith('.unavoce.net')) {
      return CANONICAL_ACQUISITION_SOURCES.WEBSITE;
    }
  } catch {
    return CANONICAL_ACQUISITION_SOURCES.UNKNOWN;
  }

  return CANONICAL_ACQUISITION_SOURCES.UNKNOWN;
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
      Number(char) ^ (Math.random() * 16) >> (Number(char) / 4)
    ).toString(16),
  );
}

function normalizeUuid(value: string | null) {
  if (!value) {
    return null;
  }
  return isUuid(value) ? value : null;
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
        metadata: compactMetadata(sanitizeAnalyticsMetadata(detail.metadata ?? {})),
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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function installedSurface() {
  return window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone
    ? CANONICAL_SURFACES.PWA : CANONICAL_SURFACES.WEB;
}
