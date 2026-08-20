import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('./analyticsWorkflow.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const workflow = await import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);

test('analytics URL state is bounded and refresh-safe', () => {
  const result = workflow.analyticsFiltersFromSearch('?range=custom&start=2026-08-01&end=2026-08-20&device=mobile&pageNumber=3');
  assert.equal(result.range, 'custom');
  assert.equal(result.pageNumber, 3);
  assert.match(workflow.analyticsSearch(result), /range=custom/);
  assert.equal(workflow.analyticsFiltersFromSearch('?start=bad&session=' + 'x'.repeat(400)).start, '');
  assert.equal(workflow.analyticsFiltersFromSearch('?session=' + 'x'.repeat(400)).session.length, 160);
});

test('analytics data search ignores client-only community UI state', () => {
  assert.equal(workflow.analyticsDataSearch('?range=7d&communitySort=views&selectedCommunity=x'), 'range=7d');
  assert.match(workflow.analyticsDataSearch('?device=mobile&session=session-abcd'), /device=mobile/);
});

test('analytics exports quote fields and comparisons do not invent a baseline', () => {
  assert.equal(workflow.comparison(4, 0).change, null);
  assert.match(workflow.csv([{ route: '/a, b', event: '"opened"' }], ['route', 'event']), /"\/a, b","""opened"""/);
  assert.match(workflow.csv([{ route: '=HYPERLINK("https://bad")', event: '\t@DDE' }], ['route', 'event']), /"'=HYPERLINK/);
  assert.equal(workflow.spreadsheetSafe(' -1'), "' -1");
});
