import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import {
  DevotionNightPrayerResources,
  type DevotionResourceAttribution,
} from '../components/PrayerOfficeMockup';
import {
  DevotionApiError,
  resolveDevotionParticipant,
  submitDevotionReport,
  type DevotionParticipantState,
  type DevotionReportOutcome,
} from '../lib/devotionClient';
import { trackAnalyticsEvent } from '../lib/prayerAnalytics';

const REPORT_OPTIONS: Array<{
  value: DevotionReportOutcome;
  label: string;
  description: string;
}> = [
  { value: 'prayed', label: 'Prayed', description: 'I prayed Night Prayer tonight.' },
  {
    value: 'started_not_finished',
    label: "Started but didn't finish",
    description: 'I began and stopped before the end.',
  },
  { value: 'not_tonight', label: 'Not tonight', description: 'I did not pray tonight.' },
];

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: DevotionParticipantState };

export function DevotionPage() {
  const location = useLocation();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('p') ?? '',
    [location.search],
  );
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [selectedOutcome, setSelectedOutcome] = useState<DevotionReportOutcome | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const trackedOpenRef = useRef<string | null>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = "7-Day Night Prayer | Holy Spirit Men's Ministry | Una Voce";
    const description = ensureMeta('description');
    const ogTitle = ensureMeta('og:title', true);
    const ogDescription = ensureMeta('og:description', true);
    description.element.setAttribute('content', 'A seven-night invitation to pray Night Prayer with Una Voce.');
    ogTitle.element.setAttribute('content', "Holy Spirit Men's Ministry: 7-Day Night Prayer");
    ogDescription.element.setAttribute('content', 'Open tonight’s Night Prayer resources and record your response.');
    return () => {
      document.title = originalTitle;
      [description, ogTitle, ogDescription].forEach(restoreMeta);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setPageState({ status: 'loading' });
    setSaveState('idle');
    setSaveError(null);

    if (!token) {
      setPageState({
        status: 'error',
        message: 'This participant link is invalid or unavailable.',
      });
      return () => controller.abort();
    }

    resolveDevotionParticipant(token, controller.signal)
      .then((data) => {
        setPageState({ status: 'ready', data });
        setSelectedOutcome(data.report?.outcome ?? null);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPageState({
          status: 'error',
          message:
            error instanceof DevotionApiError
              ? error.message
              : 'Unable to load the devotion right now.',
        });
      });

    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (pageState.status !== 'ready' || pageState.data.timing.phase !== 'active') return;
    const { attribution } = pageState.data;
    const key = `${attribution.devotionParticipantId}:${attribution.pilotDay}`;
    if (trackedOpenRef.current === key) return;
    trackedOpenRef.current = key;
    trackAnalyticsEvent('devotion_page_opened', {
      ...attribution,
      pageContext: 'devotion_night_prayer',
      hour: 'night-prayer',
    });
  }, [pageState]);

  async function saveReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOutcome || pageState.status !== 'ready') return;
    setSaveState('saving');
    setSaveError(null);
    try {
      const saved = await submitDevotionReport(token, selectedOutcome);
      setPageState({
        status: 'ready',
        data: { ...pageState.data, report: saved.report },
      });
      setSaveState('saved');
      trackAnalyticsEvent('devotion_report_submitted', {
        ...saved.attribution,
        pageContext: 'devotion_nightly_report',
        hour: 'night-prayer',
        metadata: { outcome: saved.report.outcome },
      });
    } catch (error) {
      setSaveState('error');
      setSaveError(
        error instanceof DevotionApiError
          ? error.message
          : 'Your response was not saved. Please try again.',
      );
    }
  }

  return (
    <div className="devotion-page">
      <header className="devotion-header">
        <a className="devotion-logo" href="/" aria-label="Una Voce home">
          UNA <span>VOCE</span>
        </a>
        <span>Night Prayer</span>
      </header>
      <main className="devotion-main">
        {pageState.status === 'loading' ? (
          <StateCard eyebrow="7-Day Night Prayer" title="Preparing tonight’s prayer…">
            <p>Please wait a moment.</p>
          </StateCard>
        ) : null}
        {pageState.status === 'error' ? (
          <StateCard eyebrow="Holy Spirit Men's Ministry" title="This link isn’t available" error>
            <p>{pageState.message}</p>
            <p>Ask the ministry organizer to reissue your participant link.</p>
          </StateCard>
        ) : null}
        {pageState.status === 'ready' ? (
          <DevotionContent
            data={pageState.data}
            selectedOutcome={selectedOutcome}
            onOutcomeChange={(outcome) => {
              setSelectedOutcome(outcome);
              setSaveState('idle');
              setSaveError(null);
            }}
            onSave={saveReport}
            saveState={saveState}
            saveError={saveError}
          />
        ) : null}
      </main>
    </div>
  );
}

function DevotionContent({
  data,
  selectedOutcome,
  onOutcomeChange,
  onSave,
  saveState,
  saveError,
}: {
  data: DevotionParticipantState;
  selectedOutcome: DevotionReportOutcome | null;
  onOutcomeChange: (outcome: DevotionReportOutcome) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
}) {
  const { devotion, timing } = data;

  if (timing.phase !== 'active' || !timing.pilotDay || !timing.prayerDate) {
    const completed = timing.phase === 'completed' || devotion.status === 'completed';
    return (
      <StateCard
        eyebrow={devotion.organizationLabel}
        title={completed ? 'The seven-night devotion is complete' : 'This devotion has not begun'}
      >
        <p>
          {completed
            ? 'Thank you for making room for Night Prayer.'
            : devotion.startDate
              ? `Night 1 begins ${formatPrayerDate(devotion.startDate)}.`
              : 'The ministry organizer is still preparing the start date.'}
        </p>
        <SurveyLink
          data={data}
          url={completed ? devotion.postSurveyUrl : devotion.preSurveyUrl}
          kind={completed ? 'post' : 'pre'}
        />
      </StateCard>
    );
  }

  const attribution = data.attribution as DevotionResourceAttribution;
  return (
    <>
      <section className="devotion-hero">
        <p className="devotion-eyebrow">{devotion.organizationLabel}</p>
        <h1>{devotion.name}</h1>
        <div className="devotion-night-line">
          <strong>Night {timing.pilotDay} of {devotion.durationDays}</strong>
          <span>{formatPrayerDate(timing.prayerDate)}</span>
        </div>
        <div className="devotion-progress" aria-label={`Night ${timing.pilotDay} of ${devotion.durationDays}`}>
          {Array.from({ length: devotion.durationDays }, (_, index) => (
            <span key={index} className={index < timing.pilotDay! ? 'complete' : ''} aria-hidden="true" />
          ))}
        </div>
        <p>Settle in, let the day grow quiet, and choose the Night Prayer resource that will help you pray tonight.</p>
      </section>

      <DevotionNightPrayerResources
        selectedDate={timing.prayerDate}
        attribution={attribution}
      />

      <form className="devotion-report" onSubmit={onSave}>
        <div className="devotion-section-heading">
          <span>Before you leave</span>
          <h2>How did tonight go?</h2>
          <p>Your latest response is the one the ministry organizer will see.</p>
        </div>
        <fieldset disabled={saveState === 'saving'}>
          <legend className="sr-only">Nightly prayer outcome</legend>
          {REPORT_OPTIONS.map((option) => (
            <label key={option.value} className={selectedOutcome === option.value ? 'selected' : ''}>
              <input
                type="radio"
                name="outcome"
                value={option.value}
                checked={selectedOutcome === option.value}
                onChange={() => onOutcomeChange(option.value)}
              />
              <span><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>
          ))}
        </fieldset>
        <button className="devotion-save" type="submit" disabled={!selectedOutcome || saveState === 'saving'}>
          {saveState === 'saving' ? 'Saving…' : data.report ? 'Update response' : 'Save response'}
        </button>
        {saveState === 'saved' ? <p className="devotion-save-success" role="status">Your response is saved.</p> : null}
        {saveState === 'error' && saveError ? <p className="devotion-save-error" role="alert">{saveError}</p> : null}
      </form>
    </>
  );
}

function SurveyLink({
  data,
  url,
  kind,
}: {
  data: DevotionParticipantState;
  url: string | null;
  kind: 'pre' | 'post';
}) {
  if (!url) return null;
  return (
    <a
      className="devotion-survey-link"
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={() =>
        trackAnalyticsEvent('devotion_survey_clicked', {
          ...data.attribution,
          resourceId: `${kind}-survey`,
          mediaType: 'survey_link',
          sourceUrl: url,
          pageContext: `devotion_${kind}_survey`,
        })
      }
    >
      Open the {kind === 'pre' ? 'pre-devotion' : 'post-devotion'} survey
    </a>
  );
}

function StateCard({
  eyebrow,
  title,
  error = false,
  children,
}: {
  eyebrow: string;
  title: string;
  error?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`devotion-state-card${error ? ' error' : ''}`}
      role={error ? 'alert' : undefined}
      aria-live={error ? 'assertive' : undefined}
    >
      <p className="devotion-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </section>
  );
}

function formatPrayerDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
}

function ensureMeta(name: string, property = false) {
  const attribute = property ? 'property' : 'name';
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (existing) {
    return {
      element: existing,
      created: false,
      originalContent: existing.getAttribute('content'),
    };
  }
  const meta = document.createElement('meta');
  meta.setAttribute(attribute, name);
  document.head.appendChild(meta);
  return { element: meta, created: true, originalContent: null };
}

function restoreMeta(handle: ReturnType<typeof ensureMeta>) {
  if (handle.created) {
    handle.element.remove();
  } else if (handle.originalContent === null) {
    handle.element.removeAttribute('content');
  } else {
    handle.element.setAttribute('content', handle.originalContent);
  }
}
