import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAnalyticsHandler, validateAnalyticsEvent } from '../analytics.mjs';

const payload = Object.freeze({
  eventId: 'event-retry-1', sessionId: '11111111-1111-4111-8111-111111111111',
  eventName: 'current_hour_cta_clicked', startedAt: new Date().toISOString(),
  anonymousId: 'anonymous', acquisitionSource: 'qr', acquisitionSurface: 'web',
});

test('campaign events require canonical acquisition values', () => {
  assert.equal(validateAnalyticsEvent(payload), null);
  assert.equal(validateAnalyticsEvent({ ...payload, acquisitionSource: 'newsletter' }), 'Invalid acquisitionSource');
  assert.equal(validateAnalyticsEvent({ ...payload, acquisitionSurface: 'native' }), 'Invalid acquisitionSurface');
});

test('same event ID is idempotent while separate equal interactions remain distinct', async () => {
  const rows = new Map(); let sessionWrites = 0;
  const client = { from(table) {
    if (table === 'analytics_events') return {
      async insert(row) { if (rows.has(row.event_id)) return { error: { code: '23505', message: 'duplicate key' } }; rows.set(row.event_id, structuredClone(row)); return { error: null }; },
      select() { return { eq(_name, eventId) { return { async maybeSingle() { const row = rows.get(eventId); return { data: row ? { session_id: row.session_id, payload_fingerprint: row.payload_fingerprint } : null, error: null }; } }; } }; },
    };
    return { async upsert() { sessionWrites += 1; return { error: null }; }, update() { return { async eq() { sessionWrites += 1; return { error: null }; } }; } };
  } };
  const handler = createAnalyticsHandler(client);
  await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  const exactDuplicate = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  assert.equal(exactDuplicate.statusCode, 202); assert.deepEqual(JSON.parse(exactDuplicate.body), { ok: true, duplicate: true });
  await handler({ httpMethod: 'POST', body: JSON.stringify({ ...payload, eventId: 'event-retry-2' }) });
  assert.equal(rows.size, 2);
  assert.equal(rows.get('event-retry-1').acquisition_source, 'qr');
  const sessionEvent = { ...payload, eventName: 'prayer_session_started', eventId: 'session-retry-1' };
  await handler({ httpMethod: 'POST', body: JSON.stringify(sessionEvent) });
  await handler({ httpMethod: 'POST', body: JSON.stringify(sessionEvent) });
  assert.equal(sessionWrites, 2);
  const conflict = await handler({ httpMethod: 'POST', body: JSON.stringify({ ...sessionEvent, sessionId: '22222222-2222-4222-8222-222222222222' }) });
  assert.equal(conflict.statusCode, 500);
});

test('a non-atomic exact retry repairs a stored event whose session mutation failed', async () => {
  const events = new Map(); const sessions = new Map(); let failSessionWrite = true;
  const client = { from(table) {
    if (table === 'analytics_events') return {
      async insert(row) {
        if (events.has(row.event_id)) return { error: { code: '23505', message: 'duplicate key' } };
        events.set(row.event_id, structuredClone(row));
        return { error: null };
      },
      select() { return { eq(_name, eventId) { return { async maybeSingle() { const row = events.get(eventId); return { data: row ? { session_id: row.session_id, payload_fingerprint: row.payload_fingerprint } : null, error: null }; } }; } }; },
    };
    return {
      async upsert(row) {
        if (failSessionWrite) { failSessionWrite = false; return { error: new Error('injected session failure') }; }
        sessions.set(row.session_id, structuredClone(row));
        return { error: null };
      },
    };
  } };
  const event = { ...payload, eventId: 'repair-after-failure', eventName: 'prayer_session_started' };
  const handler = createAnalyticsHandler(client);
  const first = await handler({ httpMethod: 'POST', body: JSON.stringify(event) });
  assert.equal(first.statusCode, 500); assert.equal(events.size, 1); assert.equal(sessions.size, 0);
  const retry = await handler({ httpMethod: 'POST', body: JSON.stringify(event) });
  assert.equal(retry.statusCode, 202); assert.deepEqual(JSON.parse(retry.body), { ok: true, duplicate: true });
  assert.equal(events.size, 1); assert.equal(sessions.size, 1);
});

test('migrated RPC accepts only exact retries and rolls back a failed session mutation', async () => {
  const saved = new Map(); let sessionMutations = 0; let failNext = true;
  const client = {
    async rpc(name, { p_event }) {
      assert.equal(name, 'record_campaign_analytics_event');
      const prior = saved.get(p_event.event_id);
      if (prior) {
        if (prior.session_id === p_event.session_id && prior.payload_fingerprint === p_event.payload_fingerprint) return { data: { status: 'duplicate' }, error: null };
        return { data: null, error: { code: '23505', message: 'Conflicting analytics event ID' } };
      }
      if (failNext) { failNext = false; return { data: null, error: { code: 'P0001', message: 'session mutation failed; transaction rolled back' } }; }
      saved.set(p_event.event_id, p_event); sessionMutations += 1; return { data: { status: 'inserted' }, error: null };
    },
  };
  const handler = createAnalyticsHandler(client);
  const first = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  assert.equal(first.statusCode, 500); assert.equal(saved.size, 0);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify(payload) })).statusCode, 202);
  const duplicate = await handler({ httpMethod: 'POST', body: JSON.stringify(payload) });
  assert.equal(duplicate.statusCode, 202); assert.deepEqual(JSON.parse(duplicate.body), { ok: true, duplicate: true });
  assert.equal(sessionMutations, 1);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...payload, pageContext: 'different' }) })).statusCode, 500);
  assert.equal((await handler({ httpMethod: 'POST', body: JSON.stringify({ ...payload, sessionId: '22222222-2222-4222-8222-222222222222' }) })).statusCode, 500);
});

test('atomic RPC is service-role-only, uses text prayer identifiers, and rejects missing rollups', async () => {
  const sql = await readFile(new URL('../../../supabase/migrations/20260824000000_campaign_analytics_contract.sql', import.meta.url), 'utf8');
  assert.match(sql, /security invoker set search_path = public, pg_temp/i);
  assert.match(sql, /revoke execute .* from public, anon, authenticated/i);
  assert.match(sql, /grant execute .* to service_role/i);
  assert.doesNotMatch(sql, /prayer_id',''\)::uuid|ministry_id',''\)::uuid/i);
  assert.match(sql, /if event_name = 'prayer_session_started'/);
  assert.doesNotMatch(sql, /event_name in \('prayer_session_started', 'session_started'\)/);
  assert.match(sql, /get diagnostics affected_rows = row_count; if affected_rows = 0 then raise exception 'Missing prayer analytics session for rollup'/i);
});
