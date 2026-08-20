import assert from 'node:assert/strict';
import test from 'node:test';

import { analyticsExplorer, aggregateAnalytics, analyticsFilterScope, analyticsRequest, communityAnalytics, communityDetailAnalytics, displayIdentifier, optionalExactCount, readAnalyticsWindow, requestSearchParams, safeAnalyticsDimension, safeCampaignSource, safeContentLabel, safeAnalyticsScalar, safeAnalyticsUrl } from '../admin-partners.mjs';

test('optional dashboard counts preserve values and isolate missing optional tables', () => {
  assert.equal(optionalExactCount({ count: 7, error: null }), 7);
  assert.equal(optionalExactCount({ count: 0, error: null }), 0);
  assert.equal(optionalExactCount({ count: null, error: null }), 0);
  assert.equal(optionalExactCount({ count: null, error: { code: '42P01' } }), null);
  assert.equal(optionalExactCount(undefined), null);
});

test('event dimensions never claim unfiltered session metrics', () => {
  assert.deepEqual(analyticsFilterScope({ device: 'mobile', event: '', page: '', community: '', partner: '', session: '' }), { sessionMetricsAvailable: false, sessionOnly: false });
  assert.deepEqual(analyticsFilterScope({ device: '', event: '', page: '', community: '', partner: '', session: 'session-1' }), { sessionMetricsAvailable: true, sessionOnly: true });
});

test('analytics query parsing supports the local middleware contract', () => {
  assert.equal(requestSearchParams({ queryStringParameters: { range: '7d', device: 'mobile' } }).get('device'), 'mobile');
  assert.equal(requestSearchParams({ rawUrl: 'https://example.test/api?range=30d' }).get('range'), '30d');
});

test('admin analytics identifiers and URLs are safe projections', () => {
  assert.match(displayIdentifier('session', 'secret-session'), /^session-[a-f0-9]{10}$/);
  assert.equal(safeAnalyticsUrl('https://example.test/path?token=secret#x'), 'https://example.test');
  assert.equal(safeAnalyticsUrl('javascript:alert(1)'), null);
  assert.equal(safeAnalyticsUrl('/account/jane@example.com?secret=x'), null);
  assert.equal(safeAnalyticsUrl('/pray?date=2026-08-20'), '/pray');
  assert.equal(safeAnalyticsUrl('https://www.youtube.com/watch?v=abc'), 'https://www.youtube.com/watch');
  assert.equal(safeAnalyticsUrl('https://youtu.be/AbC123xYz90?q=x'), 'https://youtu.be/AbC123xYz90');
  assert.equal(safeAnalyticsUrl('https://example.test/private/path'), 'https://example.test');
  assert.equal(safeAnalyticsUrl('/admin/john-smith'), null);
  assert.equal(safeAnalyticsUrl('/community/jane-doe'), null);
  assert.equal(safeAnalyticsUrl('/community/known', new Map([['known', {}]])), '/community/known');
  assert.equal(safeAnalyticsUrl('/admin/analytics/activity'), '/admin/analytics/activity');
  assert.equal(safeAnalyticsUrl('/devotions/holy-spirit-mens-ministry/night-prayer'), '/devotions/holy-spirit-mens-ministry/night-prayer');
  assert.equal(safeAnalyticsScalar('email@example.test'), null);
  assert.equal(safeAnalyticsScalar('\n=HYPERLINK("bad")'), null);
});

test('explorer projects malicious fields through known attribution only', () => {
  const event = { occurred_at: '2026-08-20T01:00:00Z', session_id: 'session', anonymous_id: 'visitor', page_path: '/join?invite=opaque-123', event_name: 'page_viewed', content_id: 'email@example.test', partner_id: 'uuid-secret', community_slug: 'unknown', source_url: null, device_class: 'mobile', utm_source: 'token-very-long-secret' };
  const result = analyticsExplorer([event], { pageNumber: 1 }, { partnerById: new Map([['uuid-secret', { name: 'Known partner' }]]), communityPartners: new Map() });
  assert.equal(result.rows[0].route, null);
  assert.equal(result.rows[0].content, null);
  assert.equal(result.rows[0].partner, 'Known partner');
  assert.equal(result.rows[0].community, null);
  assert.equal(result.rows[0].acquisition, null);
  assert.doesNotMatch(JSON.stringify(result), /opaque-123|uuid-secret|email@example/);
});

test('explorer and community detail retain only trusted community routes', () => {
  const communities = new Map([['known', { name: 'Known' }]]);
  const event = { occurred_at: '2026-08-20T01:00:00Z', session_id: 'session', anonymous_id: 'visitor', page_path: '/community/known', event_name: 'page_viewed', source_url: 'https://unavoce.net/community/known?x=1' };
  const result = analyticsExplorer([event], { pageNumber: 1 }, { partnerById: new Map(), communityPartners: communities });
  assert.equal(result.rows[0].route, '/community/known');
  assert.equal(result.sessions[result.rows[0].sessionId][0].route, '/community/known');
  const details = communityDetailAnalytics([{ ...event, community_slug: 'known' }], communities);
  assert.equal(details.known.destinations[0].label, 'https://unavoce.net/community/known');
});

test('community details exclude unknown communities and keep daily trend chronological', () => {
  const events = [{ community_slug: 'known', occurred_at: '2026-08-02T00:00:00Z', content_id: 'AbC123dEf45', source_url: null }, { community_slug: 'known', occurred_at: '2026-08-01T00:00:00Z', content_id: 'secret-token-very-long-value-123456789', source_url: null }, { community_slug: 'unknown', occurred_at: '2026-08-03T00:00:00Z', content_id: 'raw', source_url: null }];
  const details = communityDetailAnalytics(events, new Map([['known', { name: 'Known' }]]));
  assert.deepEqual(Object.keys(details), ['known']);
  assert.deepEqual(details.known.daily.map((item) => item.label), ['2026-08-01', '2026-08-02']);
  assert.deepEqual(details.known.topContent, []);
});

test('bounded analytics reader pages through the configured Supabase row limit', async () => {
  const all = Array.from({ length: 1500 }, (_, index) => ({ id: index })); const calls = [];
  const result = await readAnalyticsWindow(async ({ from, to }) => { calls.push([from, to]); return { data: all.slice(from, to + 1), error: null }; });
  assert.equal(result.rows.length, 1500); assert.equal(result.truncated, false); assert.deepEqual(calls, [[0, 999], [1000, 1999]]);
});

test('bounded analytics reader retains cap and marks the 10001st row truncated', async () => {
  const result = await readAnalyticsWindow(async ({ from, to }) => ({ data: Array.from({ length: Math.max(0, Math.min(to + 1, 10001) - from) }, (_, index) => ({ id: from + index })), error: null }));
  assert.equal(result.rows.length, 10000); assert.equal(result.truncated, true);
  const failed = await readAnalyticsWindow(async () => ({ data: null, error: { message: 'failed' } }));
  assert.equal(failed.error.message, 'failed');
});

test('analytics dimension allowlists reject arbitrary public strings', () => {
  assert.equal(safeAnalyticsDimension('device', 'mobile'), 'mobile');
  assert.equal(safeAnalyticsDimension('event', 'page_viewed'), 'page_viewed');
  assert.equal(safeAnalyticsDimension('event', 'john.smith'), null);
  assert.equal(safeCampaignSource('google'), 'google');
  assert.equal(safeCampaignSource('campaign-john-smith'), null);
  assert.equal(safeContentLabel('AbC123dEf45'), null);
  assert.equal(safeContentLabel('5551234567'), null);
});

test('community performance includes only known community attribution', () => {
  const events = [{ community_slug: 'known', event_name: 'community_page_viewed', anonymous_id: 'a' }, { community_slug: 'unknown', event_name: 'community_page_viewed', anonymous_id: 'b' }, { community_slug: '<script>', event_name: 'community_page_viewed', anonymous_id: 'c' }];
  const rows = communityAnalytics(events, [], [], new Map([['known', { id: 'p', name: 'Known' }]]));
  assert.deepEqual(rows.map((row) => row.communitySlug), ['known']);
});

test('analytics request rejects impossible dates and bounds range/page', () => {
  const request = analyticsRequest(new URLSearchParams('range=custom&start=2020-01-01&end=2026-02-30&pageNumber=999999'));
  assert.equal(request.pageNumber, 100);
  assert.notEqual(request.end, '2026-02-30');
  assert.match(request.end, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(aggregateAnalytics([{ date: '2026-08-03', events: 1, activeUsers: 1, pageViews: 1, communityPageViews: 0, outboundClicks: 0, contentCardClicks: 0, platformOpens: 0, prayerSessions: 0 }], 'weekly')[0].date, '2026-08-03');
});

test('analytics request bounds custom ranges and limits filter values', () => {
  const request = analyticsRequest(new URLSearchParams(`range=custom&start=2026-08-01&end=2026-08-20&pageNumber=2&session=${'x'.repeat(300)}`));
  assert.equal(request.start, '2026-08-01');
  assert.equal(request.end, '2026-08-20');
  assert.equal(request.pageNumber, 2);
  assert.equal(request.filters.session.length, 160);
  assert.equal(analyticsRequest(new URLSearchParams('range=custom&start=nope&end=nope')).range, 'custom');
});
