import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrations = new URL('../../../supabase/migrations/', import.meta.url);
const adminFunction = new URL('../admin-devotion.mjs', import.meta.url);

test('devotion operations migration adds lifecycle states in a committed predecessor', async () => {
  const statusSql = await readFile(
    new URL('20260822000000_devotion_operations_statuses.sql', migrations),
    'utf8',
  );

  for (const status of ['draft', 'scheduled', 'paused', 'archived']) {
    assert.match(statusSql, new RegExp(`add value if not exists '${status}'`));
  }
  assert.match(statusSql, /create type public\.devotion_participant_status as enum/);
  assert.doesNotMatch(statusSql, /email|phone|contact|reminder/i);
});

test('devotion operations migration safely backfills cohort membership and keeps private tables private', async () => {
  const engineSql = await readFile(
    new URL('20260822010000_devotion_operations_engine.sql', migrations),
    'utf8',
  );

  assert.match(engineSql, /create table public\.devotion_cohorts/);
  assert.match(engineSql, /alter table public\.devotion_cohorts enable row level security/);
  assert.doesNotMatch(engineSql, /create policy[\s\S]*devotion_cohorts/i);
  assert.match(engineSql, /insert into public\.devotion_cohorts[\s\S]*'general'[\s\S]*on conflict \(devotion_id, slug\) do nothing/);
  assert.match(engineSql, /update public\.devotion_participants participant[\s\S]*participant\.cohort_id is null/);
  assert.match(engineSql, /alter column cohort_id set not null/);
  assert.match(engineSql, /foreign key \(devotion_id, cohort_id\)[\s\S]*references public\.devotion_cohorts\(devotion_id, id\)/);
  assert.match(engineSql, /duration_days between 1 and 40/);
  assert.match(engineSql, /pilot_day between 1 and 40/g);
  assert.match(engineSql, /create or replace function public\.create_devotion_campaign/);
  assert.match(engineSql, /insert into public\.devotions[\s\S]*insert into public\.devotion_cohorts/);
  assert.match(engineSql, /security invoker\s+set search_path = public, pg_temp/);
  assert.match(engineSql, /created_devotion public\.devotions%rowtype/);
  assert.match(engineSql, /created_cohort public\.devotion_cohorts%rowtype/);
  assert.match(engineSql, /revoke all on function public\.create_devotion_campaign[\s\S]*from public, anon, authenticated/);
  assert.match(engineSql, /grant execute on function public\.create_devotion_campaign[\s\S]*to service_role/);
  assert.doesNotMatch(engineSql, /email|phone|contact|send_reminder/i);
});

test('admin devotion session reads use the analytics_sessions primary key', async () => {
  const source = await readFile(adminFunction, 'utf8');
  const sessionReads = source.match(/\.from\('analytics_sessions'\)[\s\S]{0,500}?\.range\(from, to\)/g) ?? [];

  assert.equal(sessionReads.length, 2);
  for (const read of sessionReads) {
    assert.match(read, /session_id/);
    assert.match(read, /\.order\('session_id'/);
    assert.doesNotMatch(read, /\.select\('id,/);
    assert.doesNotMatch(read, /\.order\('id'/);
  }
});

test('devotion audit history is service-role only and excludes credentials by design', async () => {
  const auditSql = await readFile(
    new URL('20260822020000_devotion_operations_audit.sql', migrations),
    'utf8',
  );

  assert.match(auditSql, /create table public\.devotion_admin_audit/);
  assert.match(auditSql, /actor_role text not null check \(actor_role in \('owner', 'editor', 'viewer'\)\)/);
  assert.match(auditSql, /alter table public\.devotion_admin_audit enable row level security/);
  assert.doesNotMatch(auditSql, /create policy/i);
  assert.doesNotMatch(auditSql, /token_hash|participant_token|secret\s+text|credential\s+text/i);
});
