import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAcquisitionHandoffQuery,
  extractAcquisitionParams,
  normalizeAcquisitionSource,
  sanitizedCampaignQueryParams,
  isRfc3339Timestamp,
  validateAnalyticsEventContract,
} from './analyticsContract.mjs';

test('canonical acquisition aliases are closed and never invent a source', () => {
  assert.equal(normalizeAcquisitionSource('Instagram'), 'instagram');
  assert.equal(normalizeAcquisitionSource('partner'), 'organization');
  assert.equal(normalizeAcquisitionSource('made-up-affiliate'), null);
  assert.equal(extractAcquisitionParams('utm_source=qr&surface=pwa').source, 'qr');
});

test('strict timestamps and per-event rules reject malformed campaign telemetry', () => {
  assert.equal(isRfc3339Timestamp('0'), false);
  assert.equal(isRfc3339Timestamp('2099-01-01T00:00:00Z'), false);
  const base = { eventName: 'devotion_report_submitted', devotionId: 'a', devotionParticipantId: 'b', pilotDay: 1, prayerDate: '2026-08-24', metadata: {} };
  assert.equal(validateAnalyticsEventContract(base), 'Invalid devotion report outcome');
  assert.equal(validateAnalyticsEventContract({ ...base, metadata: { outcome: 'prayed' } }), null);
  assert.equal(validateAnalyticsEventContract({ eventName: 'pwa_install_installed', acquisitionSurface: 'web' }), 'PWA events require pwa install surface');
  assert.equal(validateAnalyticsEventContract({ eventName: 'pwa_install_installed', acquisitionSurface: 'web', installSurface: 'pwa' }), null);
  assert.equal(isRfc3339Timestamp('2026-08-24T24:00:00Z'), false);
  assert.equal(isRfc3339Timestamp('2026-02-30T12:00:00Z'), false);
});

test('handoff retains campaign attribution while excluding tokens and unsafe aliases', () => {
  const incoming = new URLSearchParams('utm_source=sms&utm_campaign=august&p=opaque&token=secret&uv_source=instagram');
  const query = buildAcquisitionHandoffQuery({ source: 'instagram', surface: 'web', sessionId: '11111111-1111-4111-8111-111111111111', sessionStartedAt: new Date().toISOString(), handoffParams: sanitizedCampaignQueryParams(incoming) });
  assert.equal(query.get('uv_source'), 'instagram');
  assert.equal(query.get('utm_campaign'), 'august');
  assert.equal(query.has('p'), false);
  assert.equal(query.has('token'), false);
});

test('survey and campaign event shapes are discriminated at runtime', () => {
  const ids = { devotionId: 'a', devotionParticipantId: 'b' };
  assert.equal(validateAnalyticsEventContract({ eventName: 'devotion_survey_started', ...ids, resourceId: 'pre-survey', mediaType: 'survey_link', metadata: { surveyKind: 'pre' } }), null);
  assert.equal(validateAnalyticsEventContract({ eventName: 'devotion_survey_clicked', ...ids, resourceId: 'post-survey', mediaType: 'survey_link', metadata: {} }), 'Invalid devotion survey attribution');
  assert.equal(validateAnalyticsEventContract({ eventName: 'continuation_opened', pageContext: 'links_handoff', acquisitionSource: 'direct', acquisitionSurface: 'web' }), 'Invalid continuation attribution');
  assert.equal(validateAnalyticsEventContract({ eventName: 'continuation_opened', pageContext: 'links_handoff', acquisitionSource: 'links_page', acquisitionSurface: 'web' }), null);
});
