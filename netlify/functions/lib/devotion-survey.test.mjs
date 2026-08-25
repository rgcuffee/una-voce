import assert from 'node:assert/strict';
import test from 'node:test';
import {
  safeAdminSurveyResponse,
  sameSurveyAnswers,
  surveyPhaseForTiming,
  validateSurveyAnswers,
} from './devotion-survey.mjs';

const completePre = {
  liturgyFamiliarity: 'a_little',
  massFrequency: 'weekly_or_more',
  prayerFrequency: 'few_times_week',
  hourConfidence: 3,
  friction: ['finding_time'],
  continueLikelihood: 4,
};

test('survey validation separates partial saves from phase-complete submissions', () => {
  assert.deepEqual(validateSurveyAnswers('pre', { hourConfidence: 2 }), {
    ok: true,
    answers: { hourConfidence: 2 },
  });
  assert.equal(validateSurveyAnswers('pre', { hourConfidence: 2 }, { complete: true }).ok, false);
  assert.deepEqual(validateSurveyAnswers('pre', completePre, { complete: true }), {
    ok: true,
    answers: completePre,
  });
  assert.equal(validateSurveyAnswers('post', completePre, { complete: true }).ok, false);
});

test('survey validation rejects unknown fields, malformed ratings, and contradictory friction', () => {
  for (const answers of [
    { secret: 'token' },
    { hourConfidence: 2.5 },
    { friction: ['none', 'technology'] },
    { friction: ['technology', 'technology'] },
    { friction: ['unapproved'] },
  ]) {
    assert.equal(validateSurveyAnswers('pre', answers).ok, false);
  }
});

test('survey phase and equality rules are deterministic', () => {
  assert.equal(surveyPhaseForTiming({ phase: 'not_started' }), 'pre');
  assert.equal(surveyPhaseForTiming({ phase: 'active' }), 'pre');
  assert.equal(surveyPhaseForTiming({ phase: 'completed' }), 'post');
  assert.equal(surveyPhaseForTiming({ phase: 'inactive' }), null);
  assert.equal(sameSurveyAnswers(completePre, { ...completePre }), true);
  assert.equal(sameSurveyAnswers(completePre, { ...completePre, hourConfidence: 4 }), false);
});

test('admin survey projection exposes only one-way linkage identifiers', () => {
  const projected = safeAdminSurveyResponse({
    devotion_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    participant_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    phase: 'pre',
    status: 'partial',
    answers: { hourConfidence: 2 },
    started_at: '2026-08-25T00:00:00Z',
    submitted_at: null,
    updated_at: '2026-08-25T00:00:00Z',
    token_hash: 'should-not-project',
  });
  assert.equal(projected.devotionSafeId, 'devotion-303617b973');
  assert.equal(projected.participantSafeId, 'participant-00f765af1c');
  assert.equal(JSON.stringify(projected).includes('token'), false);
});
