import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('./GettingStartedPage.tsx', import.meta.url),
  'utf8',
);

test('Start Here preserves the beginner flow in the requested order', () => {
  const headings = [
    'What is the Liturgy of the Hours?',
    'Do I need to pray all of them?',
    'What does praying an Hour actually look like?',
    'Where should I begin?',
    'A word of encouragement',
  ];

  let previousIndex = -1;
  for (const heading of headings) {
    const index = source.indexOf(heading);
    assert.ok(index > previousIndex, `Expected heading in order: ${heading}`);
    previousIndex = index;
  }
});

test('Start Here keeps the two prayer CTAs on their canonical Today segments', () => {
  assert.match(
    source,
    /title: 'Night Prayer',[\s\S]*?view: 'today',[\s\S]*?segmentId: 'segment-night'/,
  );
  assert.match(
    source,
    /title: 'Morning Prayer',[\s\S]*?view: 'today',[\s\S]*?segmentId: 'segment-morning'/,
  );
});

test('Start Here includes the practical reassurance for a first Hour', () => {
  assert.match(source, /Most Hours take about 5–15 minutes\./);
  assert.match(source, /You do not need a prayer book/);
  assert.match(source, /Start small\. Choose one Hour\. Come pray with her\./);
});
