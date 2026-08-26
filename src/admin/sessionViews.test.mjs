import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const root = new URL('../../', import.meta.url);

test('product and devotion session routes coexist with the current analytics views', async () => {
  const [app, routes, dashboard] = await Promise.all([
    readFile(new URL('src/App.tsx', root), 'utf8'),
    readFile(new URL('src/admin/adminRoutes.ts', root), 'utf8'),
    readFile(new URL('src/admin/AdminDashboardPage.tsx', root), 'utf8'),
  ]);

  assert.match(app, /path=['"]\/admin\/analytics\/sessions['"]/);
  assert.match(app, /path=['"]\/admin\/devotions\/sessions['"]/);
  assert.match(routes, /sessions: '\/admin\/analytics\/sessions'/);
  assert.match(routes, /'devotion-sessions': '\/admin\/devotions\/sessions'/);
  assert.match(dashboard, /AnalyticsSessionsSection/);
  assert.match(dashboard, />Sessions<\/Link>/);
  assert.match(dashboard, /mode=\{section === 'devotions' \? 'operations' : section === 'devotion-sessions' \? 'sessions' : 'analytics'\}/);
});

test('session views retain privacy, evidence, cap, and external-time boundaries', async () => {
  const [product, devotion, styles] = await Promise.all([
    readFile(new URL('src/admin/AnalyticsSessionsSection.tsx', root), 'utf8'),
    readFile(new URL('src/admin/DevotionSessionsSection.tsx', root), 'utf8'),
    readFile(new URL('src/styles/index.css', root), 'utf8'),
  ]);

  assert.match(product, /privacy-safe identity/i);
  assert.match(product, /bounded to the newest/i);
  assert.match(product, /External clicks show the destination but never claim time spent/i);
  assert.match(devotion, /Safe IDs only/i);
  assert.match(devotion, /absence is not definitive when a source is sampled/i);
  assert.match(devotion, /Stored events, reports, survey responses, player measures, and campaign status remain separate evidence/i);
  assert.match(devotion, /External clicks never imply prayer completion or time on another site/i);
  assert.match(styles, /\.admin-session-person\[aria-pressed="true"\][^{]*\{[^}]*#bd654d/s);
  assert.match(styles, /@media \(max-width: 900px\)[\s\S]*\.admin-session-workspace \{ grid-template-columns: 1fr; \}/);
});
