import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { validateAnalyticsEvent } from '../../netlify/functions/analytics.mjs';

import * as analyticsContract from './analyticsContract.mjs';
import * as analyticsPrivacy from './analyticsPrivacy.mjs';

class MemoryStorage {
  #values = new Map();
  getItem(key) { return this.#values.get(key) ?? null; }
  setItem(key, value) { this.#values.set(key, String(value)); }
}

function installBrowserGlobals() {
  const listeners = new Map();
  const requests = [];
  const storage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  const window = {
    location: { pathname: '/pray', search: '' },
    localStorage: storage,
    sessionStorage,
    innerWidth: 1024,
    matchMedia: () => ({ matches: false }),
    setTimeout: () => 0,
    addEventListener(name, listener) {
      listeners.set(name, listener);
    },
    removeEventListener(name) {
      listeners.delete(name);
    },
    dispatchEvent(event) {
      listeners.get(event.type)?.(event);
      return true;
    },
  };
  const saved = Object.fromEntries(['window', 'document', 'navigator', 'fetch', 'CustomEvent', 'localStorage'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: window },
    document: { configurable: true, value: { referrer: '' } },
    navigator: { configurable: true, value: { language: 'en-US' } },
    localStorage: { configurable: true, value: storage },
    fetch: { configurable: true, value: async (_url, options) => { requests.push(JSON.parse(options.body)); return { ok: true }; } },
    CustomEvent: { configurable: true, value: class CustomEvent { constructor(type, init) { this.type = type; this.detail = init.detail; } } },
  });
  return {
    requests,
    restore() {
      for (const [key, descriptor] of Object.entries(saved)) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
    },
  };
}

function loadPrayerAnalytics() {
  const source = readFileSync(new URL('./prayerAnalytics.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: 'prayerAnalytics.ts',
  }).outputText;
  const module = { exports: {} };
  const require = (name) => {
    if (name === './analyticsContract.mjs') return analyticsContract;
    if (name === './analyticsPrivacy.mjs') return analyticsPrivacy;
    throw new Error(`Unexpected prayer analytics dependency: ${name}`);
  };
  new Function('exports', 'require', 'module', compiled)(module.exports, require, module);
  return module.exports;
}

test('custom analytics events use the shared enrichment and retry path', async () => {
  const browser = installBrowserGlobals();
  try {
    const { dispatchPrayerAnalyticsEvent, installPrayerAnalytics } = loadPrayerAnalytics();
    const stop = installPrayerAnalytics();
    const sessionId = '11111111-1111-4111-8111-111111111111';
    const startedAt = new Date().toISOString();
    const retryId = '22222222-2222-4222-8222-222222222222';

    dispatchPrayerAnalyticsEvent({ eventName: 'prayer_play_started', sessionId, startedAt, eventId: retryId });
    dispatchPrayerAnalyticsEvent({ eventName: 'prayer_play_started', sessionId, startedAt });
    dispatchPrayerAnalyticsEvent({ eventName: 'prayer_play_started', sessionId, startedAt });
    globalThis.window.dispatchEvent({ type: 'beforeinstallprompt' });
    globalThis.window.dispatchEvent({ type: 'appinstalled' });
    dispatchPrayerAnalyticsEvent({ eventName: 'continuation_opened', sessionId, startedAt, acquisitionSource: 'links_page', acquisitionSurface: 'web', acquisitionMedium: 'email', acquisitionCampaign: 'return', acquisitionContent: 'card', acquisitionTerm: 'night', pageContext: 'links_handoff' });
    await Promise.resolve();

    assert.equal(browser.requests.length, 6);
    assert.equal(browser.requests[0].eventId, retryId);
    assert.equal(browser.requests[0].sessionId, sessionId);
    assert.equal(browser.requests[0].startedAt, startedAt);
    assert.equal(browser.requests[0].acquisitionSource, 'direct');
    assert.equal(browser.requests[0].acquisitionSurface, 'web');
    assert.notEqual(browser.requests[1].eventId, browser.requests[2].eventId);
    assert.equal(browser.requests[3].eventName, 'pwa_install_eligible');
    assert.equal(browser.requests[3].acquisitionSurface, 'web');
    assert.equal(browser.requests[3].installSurface, 'pwa');
    assert.equal(validateAnalyticsEvent(browser.requests[3]), null);
    assert.equal(browser.requests[5].acquisitionSource, 'links_page');
    assert.equal(browser.requests[5].acquisitionCampaign, 'return');
    assert.equal(validateAnalyticsEvent(browser.requests[5]), null);
    assert.equal(validateAnalyticsEvent({ ...browser.requests[5], acquisitionSource: 'direct' }), 'Invalid continuation attribution');
    stop();
  } finally {
    browser.restore();
  }
});
