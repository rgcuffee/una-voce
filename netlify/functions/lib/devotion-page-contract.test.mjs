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
    viteConfig,
    /devotions\/holy-spirit-mens-ministry\/night-prayer\/index\.html/,
  );
  assert.match(
    viteConfig,
    /navigateFallbackDenylist:\s*\[\/\^\\\/devotions\\\/\//,
  );
  assert.match(
    netlifyConfig,
    /from = "\/devotions\/holy-spirit-mens-ministry\/night-prayer"[\s\S]*to = "\/devotions\/holy-spirit-mens-ministry\/night-prayer\/index\.html"[\s\S]*force = true/,
  );
});

test('invalid-link and focus styles expose accessible state', async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL('src/pages/DevotionPage.tsx', root), 'utf8'),
    readFile(new URL('src/styles/index.css', root), 'utf8'),
  ]);

  assert.match(page, /role=\{error \? 'alert' : undefined\}/);
  assert.match(page, /aria-live=\{error \? 'assertive' : undefined\}/);
  assert.match(styles, /\.devotion-page :is\(a, button, input\):focus-visible \{[\s\S]*outline: 3px solid #4f6745/);
  assert.match(styles, /\.devotion-eyebrow,[\s\S]*color: #5f6f53/);
});
