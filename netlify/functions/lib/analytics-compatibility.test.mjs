import assert from 'node:assert/strict';
import test from 'node:test';
import { createAnalyticsHandler } from '../analytics.mjs';

const base = { eventId: 'retry-1', sessionId: '11111111-1111-4111-8111-111111111111', eventName: 'page_viewed', startedAt: new Date().toISOString(), anonymousId: 'a' };
test('legacy schema error falls back to a legacy insert instead of failing all writes', async () => {
  const rows = []; let calls = 0;
  const client = { from() { return { async insert(row) { calls += 1; if (calls === 1) return { error: { code: '42703', message: 'column event_id does not exist' } }; rows.push(row); return { error: null }; } }; } };
  const result = await createAnalyticsHandler(client)({ httpMethod: 'POST', body: JSON.stringify(base) });
  assert.equal(result.statusCode, 202); assert.equal(calls, 2); assert.equal(rows[0].event_id, undefined);
});

test('real handler fails closed for malformed credential URLs', async () => {
  const rows = [];
  const client = { from() { return { async insert(row) { rows.push(row); return { error: null }; } }; } };
  const result = await createAnalyticsHandler(client)({ httpMethod: 'POST', body: JSON.stringify({ ...base, eventId: 'privacy-2', pagePath: '?token=secret', referrer: '?authorization=secret', sourceUrl: '?p=secret', metadata: { nested: { clientSecret: 'x', link: '?token=secret' } } }) });
  assert.equal(result.statusCode, 202);
  assert.equal(rows[0].page_path, '/'); assert.equal(rows[0].referrer, undefined); assert.equal(rows[0].source_url, undefined);
  assert.deepEqual(rows[0].metadata.nested, { link: '/' });
});

test('real handler removes URL fragments and credential-bearing URLs recursively', async () => {
  const rows = []; const client = { from() { return { async insert(row) { rows.push(row); return { error: null }; } }; } };
  const result = await createAnalyticsHandler(client)({ httpMethod: 'POST', body: JSON.stringify({ ...base, eventId: 'privacy-3', pagePath: '/pray?utm_source=sms#private', referrer: 'https://user:pass@unavoce.net/pray#secret', sourceUrl: 'https://example.test/resource#token', metadata: { nested: { url: 'https://user:pass@example.test/x#secret' } } }) });
  assert.equal(result.statusCode, 202); assert.equal(rows[0].page_path, '/pray?utm_source=sms'); assert.equal(rows[0].referrer, undefined); assert.equal(rows[0].source_url, 'https://example.test/resource'); assert.deepEqual(rows[0].metadata.nested, { url: '' });
});

test('pre-migration session retries dedupe legacy events and use legacy session rows', async () => {
  const events = []; const sessions = []; let sessionWrites = 0;
  const client = { from(table) {
    if (table === 'analytics_events') return {
      async insert(row) { if (row.event_id) return { error: { code: '42703', message: 'column event_id does not exist' } }; events.push(row); return { error: null }; },
      select() { return { contains(_field, needle) { return { limit() { return { async maybeSingle() { const row = events.find((item) => item.metadata?._analyticsEventId === needle._analyticsEventId); return { data: row ?? null }; } }; } }; } }; },
    };
    return { async upsert(row) { if (row.acquisition_source !== undefined) return { error: { code: '42703', message: 'column acquisition_source does not exist' } }; sessions.push(row); sessionWrites += 1; return { error: null }; }, update() { return { async eq() { sessionWrites += 1; return { error: null }; } }; } };
  } };
  const handler = createAnalyticsHandler(client);
  const start = { ...base, eventId: 'legacy-session-start', eventName: 'prayer_session_started' };
  const ended = { ...base, eventId: 'legacy-session-ended', eventName: 'prayer_session_ended' };
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(start) })).statusCode, 202);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(start) })).statusCode, 202);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(ended) })).statusCode, 202);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(ended) })).statusCode, 202);
  assert.equal(events.length, 2); assert.equal(new Set(sessions.map((row) => row.session_id)).size, 1); assert.equal(sessionWrites, 4);
});

test('42P10 fails closed at both RPC and direct-insert boundaries', async () => {
  let fallbackWrites = 0;
  const rpcFallback = {
    rpc: async () => ({ error: { code: '42P10', message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification for event_id' } }),
    from() {
      return {
        async insert(row) {
          fallbackWrites += 1;
          return { error: null };
        },
      };
    },
  };
  const rpcResult = await createAnalyticsHandler(rpcFallback)({ httpMethod: 'POST', body: JSON.stringify(base) });
  assert.equal(rpcResult.statusCode, 500); assert.equal(fallbackWrites, 0);
  let writes = 0;
  const directFailure = { from() { return { async insert() { writes += 1; return { error: { code: '42P10', message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification for event_id' } }; } }; } };
  assert.equal((await createAnalyticsHandler(directFailure)({ httpMethod: 'POST', body: JSON.stringify(base) })).statusCode, 500); assert.equal(writes, 1);
});

test('real handler rejects non-http schemes, bare fragments, and protocol-relative credentials recursively', async () => {
  const rows = []; const client = { from() { return { async insert(row) { rows.push(row); return { error: null }; } }; } };
  const result = await createAnalyticsHandler(client)({ httpMethod: 'POST', body: JSON.stringify({ ...base, eventId: 'privacy-schemes', pagePath: '/pray#token=secret', sourceUrl: ' ftp://user:pass@example.test/file', metadata: { ftp: 'ftp://user:pass@example.test/file', relative: '//user:pass@example.test/path', javascript: ' javascript:token', data: 'data:text/plain,token', fragment: '#authorization=secret', relativeFragment: '/pray#token=secret' } }) });
  assert.equal(result.statusCode, 202); assert.equal(rows[0].page_path, '/pray'); assert.equal(rows[0].source_url, undefined); assert.deepEqual(rows[0].metadata, { ftp: '', relative: '', javascript: '', data: '', fragment: '', relativeFragment: '/pray', pagePath: '/pray' });
});
