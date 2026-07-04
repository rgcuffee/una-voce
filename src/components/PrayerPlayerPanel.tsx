import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { dispatchPrayerAnalyticsEvent } from '../lib/prayerAnalytics';
import { PartnerBadge } from './PartnerBadge';
import type { PartnerBadgeStatus } from '../data/partnerCommunities';

export type PrayerPlayerSourceType = 'live' | 'recorded' | 'external';

export interface PrayerPlayerSession {
  sourceName: string;
  sourceType: PrayerPlayerSourceType;
  prayerType: string;
  prayerId?: string;
  ministryId?: string;
  hour?: string;
  locale?: string;
  provider: 'youtube' | 'vimeo' | 'external';
  videoId: string;
  title: string;
  statusLabel?: string;
  devotionalLine?: string;
  communityName?: string;
  communityPageUrl?: string;
  communityBadgeStatus?: PartnerBadgeStatus;
  pageContext: string;
  sourceUrl: string;
}

interface PrayerPlayerPanelProps {
  session: PrayerPlayerSession | null;
  onClose: () => void;
}

type PrayerPlayerCloseReason = 'close_button' | 'backdrop' | 'escape';

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

function trackPrayerPlayerAnalytics(
  eventName:
    | 'prayer_session_started'
    | 'prayer_session_ended'
    | 'source_opened',
  session: PrayerPlayerSession,
  extra: Record<string, unknown> = {},
) {
  const sessionId =
    typeof extra.sessionId === 'string' ? extra.sessionId : createAnalyticsId();
  const startedAt =
    typeof extra.startedAt === 'string'
      ? extra.startedAt
      : new Date().toISOString();
  const metadata = {
    prayerType: session.prayerType,
    sourceUrl: session.sourceUrl,
    ...(typeof extra.metadata === 'object' && extra.metadata
      ? extra.metadata
      : {}),
  };

  dispatchPrayerAnalyticsEvent({
    sessionId,
    eventName,
    startedAt,
    prayerId: session.prayerId,
    ministryId: session.ministryId,
    hour: session.hour,
    locale: session.locale,
    sourceName: session.sourceName,
    sourceType: session.sourceType,
    provider: session.provider,
    videoId: session.videoId,
    pageContext: session.pageContext,
    panelOpenSeconds:
      typeof extra.panelOpenSeconds === 'number'
        ? extra.panelOpenSeconds
        : undefined,
    metadata,
  });
}

function embedUrlFor(session: PrayerPlayerSession) {
  if (session.provider === 'youtube') {
    const origin =
      typeof window === 'undefined' ? '' : `&origin=${window.location.origin}`;
    return `https://www.youtube-nocookie.com/embed/${session.videoId}?rel=0&modestbranding=1&enablejsapi=1${origin}`;
  }

  return session.sourceUrl;
}

export function PrayerPlayerPanel({
  session,
  onClose,
}: PrayerPlayerPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const openedAtRef = useRef<number | null>(null);
  const analyticsSessionIdRef = useRef<string | null>(null);
  const analyticsStartedAtRef = useRef<string | null>(null);
  const closeReasonRef = useRef<PrayerPlayerCloseReason | null>(null);
  const minimizedRef = useRef(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [iframeHasLoaded, setIframeHasLoaded] = useState(false);
  const embedUrl = useMemo(
    () => (session ? embedUrlFor(session) : ''),
    [session],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    analyticsSessionIdRef.current = createAnalyticsId();
    analyticsStartedAtRef.current = new Date().toISOString();
    closeReasonRef.current = null;
    minimizedRef.current = false;
    openedAtRef.current = Date.now();
    setIsMinimized(false);
    setIframeHasLoaded(true);
    trackPrayerPlayerAnalytics('prayer_session_started', session, {
      sessionId: analyticsSessionIdRef.current,
      startedAt: analyticsStartedAtRef.current,
    });

    window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    return () => {
      const openedAt = openedAtRef.current;
      const sessionId = analyticsSessionIdRef.current;
      const startedAt = analyticsStartedAtRef.current;

      if (openedAt && sessionId && startedAt) {
        trackPrayerPlayerAnalytics('prayer_session_ended', session, {
          sessionId,
          startedAt,
          panelOpenSeconds: Math.round((Date.now() - openedAt) / 1000),
          metadata: {
            closeReason: closeReasonRef.current ?? 'session_changed',
            wasMinimized: minimizedRef.current,
          },
        });
      }
      openedAtRef.current = null;
      analyticsSessionIdRef.current = null;
      analyticsStartedAtRef.current = null;
      closeReasonRef.current = null;
      restoreFocusRef.current?.focus();
    };
  }, [session]);

  useEffect(() => {
    if (!session || isMinimized) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeReasonRef.current = 'escape';
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }

      const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMinimized, onClose, session]);

  if (!session) {
    return null;
  }

  const statusLabel =
    session.statusLabel ??
    (session.sourceType === 'live' ? 'Live now' : 'Recorded prayer');

  const closePanel = () => {
    closeReasonRef.current = 'close_button';
    onClose();
  };

  const minimizePanel = () => {
    minimizedRef.current = true;
    setIsMinimized(true);
  };

  const openSource = () => {
    const sessionId = analyticsSessionIdRef.current;
    const startedAt = analyticsStartedAtRef.current;
    if (sessionId && startedAt) {
      trackPrayerPlayerAnalytics('source_opened', session, {
        sessionId,
        startedAt,
      });
    }
    window.open(session.sourceUrl, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div
      className={`prayer-player-shell${isMinimized ? ' minimized' : ''}`}
      role={isMinimized ? 'status' : 'dialog'}
      aria-modal={isMinimized ? undefined : 'true'}
      aria-label={`${session.title} prayer player`}
    >
      <div
        className='prayer-player-backdrop'
        onClick={() => {
          closeReasonRef.current = 'backdrop';
          onClose();
        }}
      />
      <section className='prayer-player-panel' ref={panelRef}>
        <header className='prayer-player-header'>
          <div>
            <div className='prayer-player-source'>{session.sourceName}</div>
            <h2 className='prayer-player-title'>{session.title}</h2>
            <div className='prayer-player-status'>
              <span className='prayer-player-status-dot' />
              {statusLabel} · {session.prayerType}
            </div>
          </div>
          <button
            type='button'
            className='prayer-player-icon-btn'
            aria-label='Close prayer space'
            onClick={closePanel}
            ref={closeButtonRef}
          >
            ×
          </button>
        </header>

        <div className='prayer-player-frame-wrap'>
          {iframeHasLoaded ? (
            <iframe
              className='prayer-player-frame'
              src={embedUrl}
              title={`${session.sourceName} ${session.title}`}
              allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
              allowFullScreen
            />
          ) : null}
        </div>

        <p className='prayer-player-devotional'>
          {session.devotionalLine ?? 'You are joining the Church at prayer.'}
        </p>

        {session.communityPageUrl ? (
          <div className='prayer-player-community'>
            <div>
              <span>Community</span>
              <strong>
                {session.communityName ?? session.sourceName}
                {session.communityBadgeStatus ? (
                  <PartnerBadge status={session.communityBadgeStatus} />
                ) : null}
              </strong>
            </div>
            <a href={session.communityPageUrl}>View page</a>
          </div>
        ) : null}

        <footer className='prayer-player-actions'>
          <button type='button' onClick={minimizePanel}>
            Minimize
          </button>
          <button type='button' onClick={openSource}>
            Open Source
          </button>
          <button type='button' onClick={closePanel}>
            Close
          </button>
        </footer>
      </section>
      <button
        type='button'
        className='prayer-player-minibar'
        onClick={() => {
          minimizedRef.current = false;
          setIsMinimized(false);
        }}
        aria-label={`Return to ${session.title}`}
      >
        <span>{session.sourceName}</span>
        <strong>{session.title}</strong>
      </button>
    </div>,
    document.body,
  );
}
