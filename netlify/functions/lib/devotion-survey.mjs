import { createHash } from 'node:crypto';

export const DEVOTION_SURVEY_PHASES = ['pre', 'post'];
export const DEVOTION_SURVEY_STATUSES = ['partial', 'submitted'];

const CHOICES = {
  liturgyFamiliarity: new Set(['not_familiar', 'a_little', 'somewhat', 'very']),
  massFrequency: new Set(['rarely', 'few_times_year', 'monthly', 'weekly_or_more']),
  prayerFrequency: new Set(['rarely', 'few_times_month', 'few_times_week', 'daily']),
  friction: new Set(['none', 'finding_time', 'knowing_how', 'technology', 'content_length', 'other']),
  continuedAfterWindow: new Set(['yes', 'no', 'not_sure', 'not_applicable']),
};

const PHASE_FIELDS = {
  pre: [
    'liturgyFamiliarity',
    'massFrequency',
    'prayerFrequency',
    'hourConfidence',
    'friction',
    'continueLikelihood',
  ],
  post: [
    'hourConfidence',
    'friction',
    'continueLikelihood',
    'experienceRating',
    'continuedAfterWindow',
  ],
};

const REQUIRED_FIELDS = {
  pre: PHASE_FIELDS.pre,
  post: PHASE_FIELDS.post.filter((field) => field !== 'continuedAfterWindow'),
};

export function validateSurveyAnswers(phase, candidate, { complete = false } = {}) {
  if (!DEVOTION_SURVEY_PHASES.includes(phase)) {
    return { ok: false, error: 'Invalid survey phase' };
  }
  if (!isPlainObject(candidate)) {
    return { ok: false, error: 'Survey answers must be an object' };
  }

  const allowed = new Set(PHASE_FIELDS[phase]);
  if (Object.keys(candidate).some((field) => !allowed.has(field))) {
    return { ok: false, error: 'Survey answers contain unsupported fields' };
  }

  const answers = {};
  for (const field of PHASE_FIELDS[phase]) {
    if (!Object.prototype.hasOwnProperty.call(candidate, field)) continue;
    const value = candidate[field];
    if (['hourConfidence', 'continueLikelihood', 'experienceRating'].includes(field)) {
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        return { ok: false, error: `${field} must be a whole number from 1 to 5` };
      }
      answers[field] = value;
      continue;
    }
    if (field === 'friction') {
      if (!Array.isArray(value) || value.length > CHOICES.friction.size) {
        return { ok: false, error: 'Invalid survey friction selection' };
      }
      const unique = [...new Set(value)];
      if (unique.length !== value.length || unique.some((item) => !CHOICES.friction.has(item))) {
        return { ok: false, error: 'Invalid survey friction selection' };
      }
      if (unique.includes('none') && unique.length > 1) {
        return { ok: false, error: 'No difficulty cannot be combined with another selection' };
      }
      answers[field] = unique;
      continue;
    }
    if (!CHOICES[field]?.has(value)) {
      return { ok: false, error: `Invalid ${field} selection` };
    }
    answers[field] = value;
  }

  if (complete) {
    const missing = REQUIRED_FIELDS[phase].find((field) =>
      !Object.prototype.hasOwnProperty.call(answers, field) ||
      (field === 'friction' && answers.friction.length === 0));
    if (missing) return { ok: false, error: 'Please answer every required survey question' };
  }

  return { ok: true, answers };
}

export function sameSurveyAnswers(left, right) {
  return JSON.stringify(left ?? {}) === JSON.stringify(right ?? {});
}

export function surveyPhaseForTiming(timing) {
  if (timing?.phase === 'completed') return 'post';
  if (timing?.phase === 'not_started' || timing?.phase === 'active') return 'pre';
  return null;
}

export function safeSurveyResponse(response) {
  if (!response) return null;
  return {
    phase: response.phase,
    status: response.status,
    answers: isPlainObject(response.answers) ? response.answers : {},
    startedAt: response.started_at,
    submittedAt: response.submitted_at ?? null,
    updatedAt: response.updated_at,
  };
}

export function safeAdminSurveyResponse(response) {
  const validated = validateSurveyAnswers(response.phase, response.answers);
  return {
    devotionSafeId: safeId('devotion', response.devotion_id),
    participantSafeId: safeId('participant', response.participant_id),
    phase: response.phase,
    status: response.status,
    answers: validated.ok ? validated.answers : {},
    startedAt: response.started_at,
    submittedAt: response.submitted_at ?? null,
    updatedAt: response.updated_at,
  };
}

export function isSurveySchemaUnavailable(error) {
  return ['42P01', '42883', 'PGRST202', 'PGRST205'].includes(error?.code);
}

function safeId(kind, value) {
  return typeof value === 'string'
    ? `${kind}-${createHash('sha256').update(value).digest('hex').slice(0, 10)}`
    : '';
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
