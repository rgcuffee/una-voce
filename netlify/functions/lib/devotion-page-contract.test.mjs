import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../../', import.meta.url);
const devotionDocumentUrl = new URL(
  'devotions/holy-spirit-mens-ministry/night-prayer/index.html',
  root,
);

test('the devotion route builds a crawler-visible campaign document', async () => {
  const [document, viteConfig, netlifyConfig] = await Promise.all([
    readFile(devotionDocumentUrl, 'utf8'),
    readFile(new URL('vite.config.ts', root), 'utf8'),
    readFile(new URL('netlify.toml', root), 'utf8'),
  ]);

  assert.match(document, /<title>7-Day Night Prayer \| Holy Spirit Men's Ministry \| Una Voce<\/title>/);
  assert.match(document, /property="og:title" content="Holy Spirit Men's Ministry: 7-Day Night Prayer"/);
  assert.match(document, /property="og:url" content="https:\/\/unavoce\.net\/devotions\/holy-spirit-mens-ministry\/night-prayer"/);
  assert.doesNotMatch(document, /[?&]p=/);
  assert.match(
    document,
    /<meta name="referrer" content="strict-origin-when-cross-origin" \/>/,
  );
  assert.match(
    viteConfig,
    /devotions\/holy-spirit-mens-ministry\/night-prayer\/index\.html/,
  );
  assert.match(
    viteConfig,
    /navigateFallbackDenylist:\s*\[\/\^\\\/devotions\\\/\//,
  );
  assert.match(viteConfig, /server\.middlewares\.use\(\s*'\/api\/devotion'/);
  assert.match(
    netlifyConfig,
    /from = "\/devotions\/holy-spirit-mens-ministry\/night-prayer"[\s\S]*to = "\/devotions\/holy-spirit-mens-ministry\/night-prayer\/index\.html"[\s\S]*force = true/,
  );
  assert.match(
    netlifyConfig,
    /for = "\/devotions\/\*"[\s\S]*Referrer-Policy = "strict-origin-when-cross-origin"/,
  );
});

test('invalid-link and focus styles expose accessible state', async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL('src/pages/DevotionPage.tsx', root), 'utf8'),
    readFile(new URL('src/styles/index.css', root), 'utf8'),
  ]);

  assert.match(page, /role=\{error \? 'alert' : undefined\}/);
  assert.match(page, /aria-live=\{error \? 'assertive' : undefined\}/);
  assert.match(styles, /\.devotion-page :is\(a, button, input, select, textarea\):focus-visible \{[\s\S]*outline: 3px solid #4f6745/);
  assert.match(styles, /\.devotion-eyebrow,[\s\S]*color: #5f6f53/);
});

test('devotion admin uses a timezone picker and readable resource results', async () => {
  const [admin, app] = await Promise.all([
    readFile(new URL('src/admin/DevotionAnalyticsSection.tsx', root), 'utf8'),
    readFile(new URL('src/App.tsx', root), 'utf8'),
  ]);

  assert.match(admin, /<TimezoneField name="timezone"/);
  assert.match(admin, /America\/Los_Angeles/);
  assert.match(admin, />Show link<\/button>/);
  assert.match(admin, /resource\.label/);
  assert.match(admin, /resource\.measuredMinutes/);
  assert.match(app, /path=['"]\/devotions\/:devotionSlug\/night-prayer['"]/);
});

test('first-party survey UI states pseudonymous linkage and keeps view, start, and submit distinct', async () => {
  const page = await readFile(new URL('src/pages/DevotionPage.tsx', root), 'utf8');
  assert.match(page, /pseudonymously linked to your devotion participation and activity; they are not anonymous/i);
  assert.match(page, /Choosing Begin records that you started the survey/i);
  assert.match(page, /progress is saved\. It is not counted as complete yet/i);
  assert.match(page, /trackAnalyticsEvent\('devotion_survey_clicked'[\s\S]*function beginSurvey/i);
  assert.match(page, /await startDevotionSurvey[\s\S]*trackAnalyticsEvent\('devotion_survey_started'/i);
  assert.match(page, /await submitDevotionSurvey[\s\S]*trackAnalyticsEvent\('devotion_survey_submitted'/i);
  assert.doesNotMatch(page, /target="_blank"[\s\S]{0,300}survey/i);
});

test('survey admin export uses one-way identifiers and spreadsheet sanitization', async () => {
  const admin = await readFile(new URL('src/admin/DevotionAnalyticsSection.tsx', root), 'utf8');
  assert.match(admin, /devotion_safe_id.*participant_safe_id.*phase.*status/i);
  assert.match(admin, /spreadsheetSafe\(value\)/);
  assert.match(admin, /never includes participant labels, raw link tokens, or token hashes/i);
});

test('devotion research UI exposes bounded filters, reconciled evidence, and responsive timelines', async () => {
  const [admin, dashboard, server, styles, architecture] = await Promise.all([
    readFile(new URL('src/admin/DevotionAnalyticsSection.tsx', root), 'utf8'),
    readFile(new URL('src/admin/AdminDashboardPage.tsx', root), 'utf8'),
    readFile(new URL('netlify/functions/lib/devotion-analytics.mjs', root), 'utf8'),
    readFile(new URL('src/styles/index.css', root), 'utf8'),
    readFile(new URL('docs/analytics-architecture.md', root), 'utf8'),
  ]);

  for (const label of ['Cohort', 'Participant', 'Pilot day', 'Prayer date', 'Source', 'Surface', 'Device']) {
    assert.match(admin, new RegExp(`>${label}<`));
  }
  assert.match(admin, /Stored measures and deterministic derivations are labeled separately/i);
  assert.match(admin, /External clicks never imply completion or third-party time/i);
  assert.match(admin, /stage totals match unique drilldown evidence/i);
  assert.match(admin, /Raw non-nested evidence/i);
  assert.match(admin, /Stored prayer-player completion is not campaign or survey completion/i);
  assert.match(admin, /Prayer completion:.*source opened:.*highest progress:/i);
  assert.match(admin, /Canonical source and surface are unavailable until the Sprint B acquisition columns are ready/i);
  assert.match(admin, /Sampled\/partial observation/);
  assert.match(admin, /Completion counts use the full bounded source read and display ≥ when that source is sampled/i);
  assert.match(admin, /averages are labeled sampled\/partial observation instead of lower-bound/i);
  assert.match(admin, /partial known-only sum/i);
  assert.match(admin, /deterministic global budget/i);
  assert.match(admin, /sourceStatus\.truncatedSources\.map\(\(source\) => `\$\{source\} \(\$\{data\.sourceStatus\?\.caps\[source\]\?\.toLocaleString\(\) \?\? 'bounded'\}\)`/);
  assert.match(admin, /Counts from those sources are lower bounds; sampled averages remain partial observations/i);
  assert.match(admin, /No stored session or event-only session evidence matches these filters/i);
  assert.match(server, /ACTIVITY_SESSION_CAP = 40/);
  assert.match(server, /SESSION_TIMELINE_CAP = 20/);
  assert.match(server, /PARTICIPANT_NIGHT_RESOURCE_CAP = 25/);
  assert.match(server, /NIGHT_RESOURCE_CAP = 50/);
  assert.match(server, /PARTICIPANT_RESOURCE_GLOBAL_CAP = 600/);
  assert.match(server, /NIGHT_RESOURCE_GLOBAL_CAP = 400/);
  assert.match(server, /NIGHT_PRAYER_DATE_CAP = 10/);
  assert.match(dashboard, /<DevotionAnalyticsSection key=\{section\} mode=\{section === 'devotions' \? 'operations' : section === 'devotion-sessions' \? 'sessions' : 'analytics'\} \/>/);
  assert.doesNotMatch(server, /source_url/);
  assert.doesNotMatch(server, /anonymous_id/);
  assert.match(styles, /\.devotion-activity-evidence \.admin-table-wrap \{ max-height: 720px; overflow: auto; \}/);
  assert.match(styles, /\.devotion-research-grids \{ grid-template-columns: 1fr;/);
  assert.match(architecture, /Invited \/ enrolled:[\s\S]*Opened:[\s\S]*Engaged \/ prayed:[\s\S]*Returned:[\s\S]*Completed:[\s\S]*Continued:/);
  assert.match(architecture, /Opened and Engaged \/ prayed retain their stored event\/report evidence/i);
});
