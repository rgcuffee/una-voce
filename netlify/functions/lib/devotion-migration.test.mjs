import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../../../supabase/migrations/20260819000000_mens_ministry_devotion_alpha.sql',
  import.meta.url,
);

test('devotion migration locks report identity and public-write boundaries', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /unique \(devotion_id, participant_id, pilot_day\)/i);
  assert.match(
    sql,
    /foreign key \(devotion_id, participant_id\)[\s\S]*references public\.devotion_participants\(devotion_id, id\)/i,
  );
  assert.match(
    sql,
    /analytics_events_devotion_participant_membership[\s\S]*foreign key \(devotion_id, devotion_participant_id\)[\s\S]*references public\.devotion_participants\(devotion_id, id\)/i,
  );
  assert.match(sql, /pilot_day integer not null check \(pilot_day between 1 and 7\)/i);
  assert.match(sql, /alter table public\.devotion_participants enable row level security/i);
  assert.match(sql, /alter table public\.devotion_daily_reports enable row level security/i);
  assert.doesNotMatch(sql, /create policy/i);
  assert.doesNotMatch(sql, /raw_token|phone|email/i);
});

test('alpha seed is inactive and does not invent operator configuration', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  const seed = sql.slice(sql.indexOf('insert into public.devotions'));

  assert.match(seed, /'holy-spirit-mens-ministry'/);
  assert.match(seed, /'compline'/);
  assert.match(seed, /null,\s*7,\s*null,\s*'inactive'/s);
});
