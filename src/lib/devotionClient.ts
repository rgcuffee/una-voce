export type DevotionReportOutcome =
  | 'prayed'
  | 'started_not_finished'
  | 'not_tonight';

export type DevotionTiming = {
  phase: 'inactive' | 'not_started' | 'active' | 'completed';
  pilotDay: number | null;
  prayerDate: string | null;
};

export type DevotionAttribution = {
  devotionId: string;
  devotionParticipantId: string;
  pilotDay: number | null;
  prayerDate: string | null;
};

export type DevotionSurveyPhase = 'pre' | 'post';
export type DevotionSurveyStatus = 'partial' | 'submitted';
export type DevotionSurveyAnswers = {
  liturgyFamiliarity?: 'not_familiar' | 'a_little' | 'somewhat' | 'very';
  massFrequency?: 'rarely' | 'few_times_year' | 'monthly' | 'weekly_or_more';
  prayerFrequency?: 'rarely' | 'few_times_month' | 'few_times_week' | 'daily';
  hourConfidence?: number;
  friction?: Array<'none' | 'finding_time' | 'knowing_how' | 'technology' | 'content_length' | 'other'>;
  continueLikelihood?: number;
  experienceRating?: number;
  continuedAfterWindow?: 'yes' | 'no' | 'not_sure' | 'not_applicable';
};

export type DevotionSurveyResponse = {
  phase: DevotionSurveyPhase;
  status: DevotionSurveyStatus;
  answers: DevotionSurveyAnswers;
  startedAt: string;
  submittedAt: string | null;
  updatedAt: string;
};

export type DevotionParticipantState = {
  ok: true;
  participant: {
    id: string;
    safeId: string;
    label: string;
    status: 'enrolled' | 'active' | 'completed' | 'withdrawn';
  };
  devotion: {
    id: string;
    slug: string;
    name: string;
    organizationLabel: string;
    description: string | null;
    hourKey: 'compline';
    startDate: string | null;
    durationDays: number;
    timezone: string | null;
    status: 'inactive' | 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
    preSurveyUrl: string | null;
    postSurveyUrl: string | null;
    publishedAt: string | null;
    archivedAt: string | null;
  };
  cohort: {
    id: string;
    safeId: string;
    slug: string;
    name: string;
    status: 'inactive' | 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';
    startDate: string | null;
    timezone: string | null;
  };
  timing: DevotionTiming;
  report: {
    outcome: DevotionReportOutcome;
    pilotDay: number;
    prayerDate: string;
    firstReportedAt: string;
    updatedAt: string;
  } | null;
  survey: {
    schemaReady: boolean;
    availablePhase: DevotionSurveyPhase | null;
    responses: Record<DevotionSurveyPhase, DevotionSurveyResponse | null>;
  };
  attribution: DevotionAttribution;
};

export async function resolveDevotionParticipant(
  token: string,
  devotionSlug: string,
  signal?: AbortSignal,
) {
  return devotionRequest<DevotionParticipantState>(
    { action: 'resolve', token, devotionSlug },
    signal,
  );
}

export async function submitDevotionReport(
  token: string,
  devotionSlug: string,
  outcome: DevotionReportOutcome,
) {
  return devotionRequest<{
    ok: true;
    report: NonNullable<DevotionParticipantState['report']>;
    attribution: DevotionAttribution;
  }>({ action: 'report', token, devotionSlug, outcome });
}

export function startDevotionSurvey(
  token: string,
  devotionSlug: string,
  phase: DevotionSurveyPhase,
) {
  return devotionRequest<DevotionSurveyMutation>({
    action: 'surveyStart', token, devotionSlug, phase,
  });
}

export function saveDevotionSurvey(
  token: string,
  devotionSlug: string,
  phase: DevotionSurveyPhase,
  answers: DevotionSurveyAnswers,
) {
  return devotionRequest<DevotionSurveyMutation>({
    action: 'surveySave', token, devotionSlug, phase, answers,
  });
}

export function submitDevotionSurvey(
  token: string,
  devotionSlug: string,
  phase: DevotionSurveyPhase,
  answers: DevotionSurveyAnswers,
) {
  return devotionRequest<DevotionSurveyMutation>({
    action: 'surveySubmit', token, devotionSlug, phase, answers,
  });
}

type DevotionSurveyMutation = {
  ok: true;
  survey: DevotionSurveyResponse;
  attribution: DevotionAttribution;
};

async function devotionRequest<T>(body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch('/api/devotion', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | { error?: string }
    | null;

  if (!response.ok || !payload) {
    throw new DevotionApiError(
      response.status,
      payload?.error ?? 'Unable to load the devotion right now.',
    );
  }

  return payload as T;
}

export class DevotionApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
