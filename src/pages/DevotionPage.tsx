import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  DevotionNightPrayerResources,
  type DevotionResourceAttribution,
} from '../components/PrayerOfficeMockup';
import {
  DevotionApiError,
  resolveDevotionParticipant,
  saveDevotionSurvey,
  startDevotionSurvey,
  submitDevotionReport,
  submitDevotionSurvey,
  type DevotionParticipantState,
  type DevotionReportOutcome,
  type DevotionSurveyAnswers,
  type DevotionSurveyPhase,
  type DevotionSurveyResponse,
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
  const { devotionSlug = '' } = useParams<{ devotionSlug: string }>();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('p') ?? '',
    [location.search],
  );
  const [pageState, setPageState] = useState<PageState>({ status: 'loading' });
  const [selectedOutcome, setSelectedOutcome] = useState<DevotionReportOutcome | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const trackedOpenRef = useRef<string | null>(null);
  const readyDevotion = pageState.status === 'ready' ? pageState.data.devotion : null;

  useEffect(() => {
    const originalTitle = document.title;
    document.title = readyDevotion
      ? `${readyDevotion.name} | ${readyDevotion.organizationLabel} | Una Voce`
      : 'Night Prayer Devotion | Una Voce';
    const description = ensureMeta('description');
    const ogTitle = ensureMeta('og:title', true);
    const ogDescription = ensureMeta('og:description', true);
    const summary = readyDevotion?.description ?? 'Pray Night Prayer with Una Voce and record your response.';
    description.element.setAttribute('content', summary);
    ogTitle.element.setAttribute('content', readyDevotion ? `${readyDevotion.organizationLabel}: ${readyDevotion.name}` : 'Night Prayer Devotion');
    ogDescription.element.setAttribute('content', summary);
    return () => {
      document.title = originalTitle;
      [description, ogTitle, ogDescription].forEach(restoreMeta);
    };
  }, [readyDevotion?.description, readyDevotion?.name, readyDevotion?.organizationLabel]);

  useEffect(() => {
    const controller = new AbortController();
    setPageState({ status: 'loading' });
    setSaveState('idle');
    setSaveError(null);

    if (!token || !devotionSlug) {
      setPageState({
        status: 'error',
        message: 'This participant link is invalid or unavailable.',
      });
      return () => controller.abort();
    }

    resolveDevotionParticipant(token, devotionSlug, controller.signal)
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
  }, [devotionSlug, token]);

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
      const saved = await submitDevotionReport(token, devotionSlug, selectedOutcome);
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

  function updateSurvey(response: DevotionSurveyResponse) {
    setPageState((current) => {
      if (current.status !== 'ready') return current;
      return {
        status: 'ready',
        data: {
          ...current.data,
          survey: {
            ...current.data.survey,
            responses: {
              ...current.data.survey.responses,
              [response.phase]: response,
            },
          },
        },
      };
    });
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
          <StateCard eyebrow="Night Prayer Devotion" title="Preparing tonight’s prayer…">
            <p>Please wait a moment.</p>
          </StateCard>
        ) : null}
        {pageState.status === 'error' ? (
          <StateCard eyebrow="Night Prayer Devotion" title="This link isn’t available" error>
            <p>{pageState.message}</p>
            <p>Ask the campaign organizer to reissue your participant link.</p>
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
            token={token}
            devotionSlug={devotionSlug}
            onSurveyUpdate={updateSurvey}
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
  token,
  devotionSlug,
  onSurveyUpdate,
}: {
  data: DevotionParticipantState;
  selectedOutcome: DevotionReportOutcome | null;
  onOutcomeChange: (outcome: DevotionReportOutcome) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  saveError: string | null;
  token: string;
  devotionSlug: string;
  onSurveyUpdate: (response: DevotionSurveyResponse) => void;
}) {
  const { devotion, timing } = data;

  if (timing.phase !== 'active' || !timing.pilotDay || !timing.prayerDate) {
    const completed = timing.phase === 'completed' || devotion.status === 'completed';
    return (
      <StateCard
        eyebrow={devotion.organizationLabel}
        title={completed ? 'This devotion is complete' : 'This devotion has not begun'}
      >
        <p>
          {completed
            ? 'Thank you for making room for Night Prayer.'
            : devotion.startDate
              ? `Night 1 begins ${formatPrayerDate(devotion.startDate)}.`
              : 'The ministry organizer is still preparing the start date.'}
        </p>
        <SurveyPanel
          data={data}
          token={token}
          devotionSlug={devotionSlug}
          onUpdate={onSurveyUpdate}
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
        <p>{devotion.description ?? 'Settle in, let the day grow quiet, and choose the Night Prayer resource that will help you pray tonight.'}</p>
      </section>

      <SurveyPanel
        data={data}
        token={token}
        devotionSlug={devotionSlug}
        onUpdate={onSurveyUpdate}
      />

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

function SurveyPanel({
  data,
  token,
  devotionSlug,
  onUpdate,
}: {
  data: DevotionParticipantState;
  token: string;
  devotionSlug: string;
  onUpdate: (response: DevotionSurveyResponse) => void;
}) {
  const phase = data.survey.availablePhase;
  const response = phase ? data.survey.responses[phase] : null;
  const [open, setOpen] = useState(false);
  const [begun, setBegun] = useState(Boolean(response));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'submitted' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setOpen(false);
    setBegun(Boolean(response));
    setStatus('idle');
    setMessage(null);
  }, [phase]);

  if (!phase || !data.survey.schemaReady) return null;
  const activePhase: DevotionSurveyPhase = phase;

  const eventDetail = {
    ...data.attribution,
    resourceId: `${activePhase}-survey`,
    mediaType: 'survey_link' as const,
    pageContext: `devotion_${activePhase}_survey`,
    metadata: { surveyKind: activePhase },
  };

  function viewSurvey() {
    setOpen(true);
    setBegun(Boolean(response));
    setStatus('idle');
    setMessage(null);
    trackAnalyticsEvent('devotion_survey_clicked', eventDetail);
  }

  async function beginSurvey() {
    setStatus('saving');
    setMessage(null);
    try {
      const saved = await startDevotionSurvey(token, devotionSlug, activePhase);
      onUpdate(saved.survey);
      setBegun(true);
      setStatus('idle');
      trackAnalyticsEvent('devotion_survey_started', eventDetail);
    } catch (error) {
      setStatus('error');
      setMessage(surveyError(error));
    }
  }

  async function saveSurvey(form: HTMLFormElement, complete: boolean) {
    setStatus('saving');
    setMessage(null);
    try {
      const answers = surveyAnswersFromForm(form, activePhase);
      const saved = complete
        ? await submitDevotionSurvey(token, devotionSlug, activePhase, answers)
        : await saveDevotionSurvey(token, devotionSlug, activePhase, answers);
      onUpdate(saved.survey);
      setStatus(complete ? 'submitted' : 'saved');
      setMessage(complete ? 'Your completed survey is saved.' : 'Your progress is saved. It is not counted as complete yet.');
      if (complete) trackAnalyticsEvent('devotion_survey_submitted', eventDetail);
    } catch (error) {
      setStatus('error');
      setMessage(surveyError(error));
    }
  }

  if (!open) {
    return (
      <section className="devotion-survey" aria-label={`${phase === 'pre' ? 'Pre-devotion' : 'Post-devotion'} survey`}>
        <div>
          <span>{phase === 'pre' ? 'Before the devotion' : 'After the devotion'}</span>
          <h2>{response?.status === 'submitted' ? 'Survey complete' : 'A short reflection'}</h2>
          <p>{response?.status === 'partial' ? 'Your saved progress is waiting.' : response?.status === 'submitted' ? 'You may review and update your completed answers.' : 'This takes about two minutes.'}</p>
        </div>
        <button type="button" className="devotion-survey-link" onClick={viewSurvey}>
          {response?.status === 'submitted' ? 'Review survey' : response ? 'Continue survey' : 'View survey'}
        </button>
      </section>
    );
  }

  return (
    <section className="devotion-survey open" aria-label={`${phase === 'pre' ? 'Pre-devotion' : 'Post-devotion'} survey`}>
      <div className="devotion-section-heading">
        <span>{phase === 'pre' ? 'Pre-devotion survey' : 'Post-devotion survey'}</span>
        <h2>{phase === 'pre' ? 'Before you begin' : 'Looking back'}</h2>
        <p>Participation is optional. Your responses are pseudonymously linked to your devotion participation and activity; they are not anonymous. Campaign operators may review and export them for pilot research.</p>
      </div>
      {!begun ? (
        <div className="devotion-survey-consent">
          <p>Choosing Begin records that you started the survey. You can save an incomplete response and return later.</p>
          <button type="button" className="devotion-save" disabled={status === 'saving'} onClick={() => void beginSurvey()}>{status === 'saving' ? 'Starting…' : 'Begin survey'}</button>
          <button type="button" className="devotion-survey-secondary" onClick={() => setOpen(false)}>Not now</button>
        </div>
      ) : (
        <form
          className="devotion-survey-form"
          key={`${phase}:${response?.updatedAt ?? 'new'}`}
          onSubmit={(event) => {
            event.preventDefault();
            void saveSurvey(event.currentTarget, true);
          }}
        >
          <SurveyQuestions phase={phase} answers={response?.answers ?? {}} />
          <div className="devotion-survey-actions">
            {response?.status !== 'submitted' ? <button type="button" className="devotion-survey-secondary" disabled={status === 'saving'} onClick={(event) => event.currentTarget.form && void saveSurvey(event.currentTarget.form, false)}>Save progress</button> : null}
            <button type="submit" className="devotion-save" disabled={status === 'saving'}>{status === 'saving' ? 'Saving…' : response?.status === 'submitted' ? 'Update completed survey' : 'Complete survey'}</button>
            <button type="button" className="devotion-survey-secondary" onClick={() => setOpen(false)}>Close</button>
          </div>
          {message ? <p className={status === 'error' ? 'devotion-save-error' : 'devotion-save-success'} role={status === 'error' ? 'alert' : 'status'}>{message}</p> : null}
        </form>
      )}
      {!begun && message ? <p className="devotion-save-error" role="alert">{message}</p> : null}
    </section>
  );
}

function SurveyQuestions({ phase, answers }: { phase: DevotionSurveyPhase; answers: DevotionSurveyAnswers }) {
  return <>
    {phase === 'pre' ? <>
      <SurveySelect name="liturgyFamiliarity" label="How familiar are you with the Liturgy of the Hours?" value={answers.liturgyFamiliarity} options={[['not_familiar', 'Not familiar'], ['a_little', 'A little familiar'], ['somewhat', 'Somewhat familiar'], ['very', 'Very familiar']]} />
      <SurveySelect name="massFrequency" label="How often do you attend Mass?" value={answers.massFrequency} options={[['rarely', 'Rarely'], ['few_times_year', 'A few times a year'], ['monthly', 'About monthly'], ['weekly_or_more', 'Weekly or more']]} />
      <SurveySelect name="prayerFrequency" label="How often do you pray outside Mass?" value={answers.prayerFrequency} options={[['rarely', 'Rarely'], ['few_times_month', 'A few times a month'], ['few_times_week', 'A few times a week'], ['daily', 'Daily']]} />
    </> : <SurveySelect name="experienceRating" label="How would you rate your overall devotion experience?" value={answers.experienceRating} options={RATING_OPTIONS} />}
    <SurveySelect name="hourConfidence" label="How confident are you that you know how and when to pray this Hour?" value={answers.hourConfidence} options={CONFIDENCE_OPTIONS} />
    <fieldset className="devotion-survey-checkboxes">
      <legend>What made praying difficult? Select all that apply.</legend>
      {FRICTION_OPTIONS.map(([value, label]) => <label key={value}><input type="checkbox" name="friction" value={value} defaultChecked={answers.friction?.includes(value as NonNullable<DevotionSurveyAnswers['friction']>[number])} /><span>{label}</span></label>)}
    </fieldset>
    <SurveySelect name="continueLikelihood" label={phase === 'pre' ? 'How likely are you to continue praying this Hour?' : 'How likely are you to continue after this devotion?'} value={answers.continueLikelihood} options={LIKELIHOOD_OPTIONS} />
    {phase === 'post' ? <SurveySelect name="continuedAfterWindow" label="If the devotion window has passed, have you continued on your own? (Optional)" value={answers.continuedAfterWindow} required={false} options={[['yes', 'Yes'], ['no', 'No'], ['not_sure', 'Not sure'], ['not_applicable', 'Not applicable yet']]} /> : null}
  </>;
}

function SurveySelect({ name, label, value, options, required = true }: { name: string; label: string; value: string | number | undefined; options: ReadonlyArray<readonly [string, string]>; required?: boolean }) {
  return <label className="devotion-survey-question"><span>{label}</span><select name={name} defaultValue={value === undefined ? '' : String(value)} required={required}><option value="">Select an answer</option>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select></label>;
}

function surveyAnswersFromForm(form: HTMLFormElement, phase: DevotionSurveyPhase): DevotionSurveyAnswers {
  const fields = new FormData(form);
  const answers: DevotionSurveyAnswers = {};
  const setChoice = (name: keyof DevotionSurveyAnswers) => {
    const value = fields.get(name)?.toString();
    if (value) Object.assign(answers, { [name]: value });
  };
  const setRating = (name: 'hourConfidence' | 'continueLikelihood' | 'experienceRating') => {
    const value = fields.get(name)?.toString();
    if (value) answers[name] = Number(value);
  };
  if (phase === 'pre') {
    setChoice('liturgyFamiliarity');
    setChoice('massFrequency');
    setChoice('prayerFrequency');
  } else {
    setRating('experienceRating');
    setChoice('continuedAfterWindow');
  }
  setRating('hourConfidence');
  setRating('continueLikelihood');
  const friction = fields.getAll('friction').map(String) as NonNullable<DevotionSurveyAnswers['friction']>;
  if (friction.length) answers.friction = friction;
  return answers;
}

function surveyError(error: unknown) {
  return error instanceof DevotionApiError ? error.message : 'Your survey response was not saved. Please try again.';
}

const RATING_OPTIONS = [['1', '1 — Very poor'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 — Excellent']] as const;
const CONFIDENCE_OPTIONS = [['1', '1 — Not confident'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 — Very confident']] as const;
const LIKELIHOOD_OPTIONS = [['1', '1 — Very unlikely'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 — Very likely']] as const;
const FRICTION_OPTIONS = [['none', 'No difficulty'], ['finding_time', 'Finding time'], ['knowing_how', 'Knowing what to do'], ['technology', 'Technology'], ['content_length', 'Length of the prayer'], ['other', 'Something else']] as const;

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
