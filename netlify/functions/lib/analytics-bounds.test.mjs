import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalyticsHandler, validateAnalyticsEvent } from '../analytics.mjs';

const valid = { sessionId: '11111111-1111-4111-8111-111111111111', eventName: 'page_viewed', startedAt: '2026-08-19T00:00:00.000Z', anonymousId: 'anonymous' };

test('analytics bounds reject oversized public strings with field errors', () => {
  assert.equal(validateAnalyticsEvent({ ...valid, pagePath: 'x'.repeat(2049) }), 'Invalid pagePath');
  assert.equal(validateAnalyticsEvent({ ...valid, communitySlug: 'x'.repeat(161) }), 'Invalid communitySlug');
  assert.equal(validateAnalyticsEvent({ ...valid, provider: 7 }), 'Invalid provider');
  assert.equal(validateAnalyticsEvent({ ...valid, anonymousId: 'x'.repeat(161) }), 'Invalid anonymousId');
  assert.equal(validateAnalyticsEvent({ ...valid, userId: 'not-a-uuid' }), 'Invalid userId');
  assert.equal(validateAnalyticsEvent({ ...valid, pagePath: 'x'.repeat(2048) }), null);
});

test('analytics handler rejects oversized sanitized metadata before storage', async () => {
  let inserted = false;
  const client = { from() { return { insert() { inserted = true; return Promise.resolve({ error: null }); } }; } };
  const handler = createAnalyticsHandler(client);
  const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ ...valid, metadata: { note: 'x'.repeat(17000) } }) });
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error, 'Analytics metadata too large');
  assert.equal(inserted, false);
});

test('analytics handler rejects a body above the byte limit before storage', async () => {
  const handler = createAnalyticsHandler({ from() { throw new Error('must not insert'); } });
  const result = await handler({ httpMethod: 'POST', body: 'x'.repeat(65537) });
  assert.equal(result.statusCode, 400);
  assert.equal(JSON.parse(result.body).error, 'Analytics payload too large');
});
