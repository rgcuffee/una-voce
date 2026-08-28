import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('./PrayerOfficeMockup.tsx', import.meta.url),
  'utf8',
);

test('bare Pray navigation uses the local Hour while explicit hashes win', () => {
  assert.match(
    source,
    /return segmentIdFromHash\(hash\) \?\? suggestedPrayerSegment\(\);/,
  );
  assert.doesNotMatch(source, /DEFAULT_TODAY_SEGMENT_ID/);
  assert.ok(
    source.match(/preferredTodaySegmentId\(location\.hash\)/g)?.length >= 4,
    'Expected initialization, responsive layout, and navigation to share the preference',
  );
});

test('Today shows read and partner resources together without a format switch', () => {
  assert.doesNotMatch(source, /selectedFormats|setFormat\(|const FORMATS/);
  assert.match(source, /Everything for this Hour, in one place/);
  assert.match(source, /<h4>Read<\/h4>/);
  assert.doesNotMatch(source, /<h4>Listen &amp; pray along<\/h4>/);
  assert.match(source, /<h5>Watch<\/h5>/);
  assert.match(source, /<h5>Listen<\/h5>/);
  assert.match(source, /<h5>Live &amp; recent<\/h5>/);

  const textIndex = source.indexOf('textProviders.map');
  const videoIndex = source.indexOf('videoOptions.map', textIndex);
  const audioIndex = source.indexOf('audioOptions.map', videoIndex);
  const liveIndex = source.indexOf('liveGroups.flatMap', audioIndex);

  assert.ok(textIndex >= 0, 'Expected text resources to render');
  assert.ok(videoIndex > textIndex, 'Expected video resources after text');
  assert.ok(audioIndex > videoIndex, 'Expected audio resources after video');
  assert.ok(liveIndex > audioIndex, 'Expected live resources after audio');
});

test('recorded media uses distinct video and audio treatments', () => {
  assert.match(source, /format-option-video/);
  assert.match(source, /Watch &amp; pray/);
  assert.match(source, /format-option-audio/);
  assert.match(source, /Listen now/);
  assert.match(source, /format-option-live/);
});

test('combined partner cards retain their player analytics contexts', () => {
  assert.match(source, /pageContext: 'today_watch_card'/);
  assert.match(source, /pageContext: 'today_listen_card'/);
  assert.match(source, /pageContext: 'today_live_card'/);
});
