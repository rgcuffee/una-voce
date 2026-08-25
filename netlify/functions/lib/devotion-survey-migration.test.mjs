import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../../supabase/migrations/20260825000000_devotion_campaign_surveys.sql',
  import.meta.url,
);

test('campaign survey migration enforces linkage, one phase row, RLS, and service-only RPC access', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /unique \(devotion_id, participant_id, phase\)/i);
  assert.match(sql, /foreign key \(devotion_id, participant_id\)[\s\S]*references public\.devotion_participants\(devotion_id, id\)/i);
  assert.match(sql, /alter table public\.devotion_survey_responses enable row level security/i);
  assert.match(sql, /revoke all on function public\.upsert_devotion_survey_response[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.upsert_devotion_survey_response[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /create policy/i);
  assert.doesNotMatch(sql, /raw_token|token_hash|email|phone/i);
});

test('campaign survey RPC preserves completion and leaves identical retries unchanged', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /status = 'submitted' and excluded\.status = 'partial'/i);
  assert.match(sql, /answers is distinct from excluded\.answers/i);
  assert.match(sql, /coalesce\(devotion_survey_responses\.submitted_at, now\(\)\)/i);
  assert.match(sql, /if saved\.id is null then[\s\S]*select \* into strict saved/i);
});
