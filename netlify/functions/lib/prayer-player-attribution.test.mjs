import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const playerUrl = new URL(
  '../../../src/components/PrayerPlayerPanel.tsx',
  import.meta.url,
);

test('prayer player sessions send devotion attribution in analytics columns', async () => {
  const source = await readFile(playerUrl, 'utf8');
  const dispatch = source.match(
    /dispatchPrayerAnalyticsEvent\(\{([\s\S]*?)\n\s*\}\);/,
  )?.[1] ?? '';

  assert.match(dispatch, /devotionId: session\.devotionId/);
  assert.match(dispatch, /devotionParticipantId: session\.devotionParticipantId/);
  assert.match(dispatch, /pilotDay: session\.pilotDay/);
  assert.match(dispatch, /prayerDate: session\.prayerDate/);
  assert.match(dispatch, /resourceId: session\.resourceId/);
  assert.match(dispatch, /mediaType: session\.mediaType/);
  assert.match(source, /referrerPolicy='no-referrer'/);
});
