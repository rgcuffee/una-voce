import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('./adminRoutes.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const routes = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('admin routes resolve every Sprint 1 destination, including trailing slashes', () => {
  const expected = {
    home: '/admin',
    inventory: '/admin/partners',
    review: '/admin/partners/review',
    sources: '/admin/partners/sources',
    rules: '/admin/partners/rules',
    devotions: '/admin/devotions',
    activity: '/admin/analytics/activity',
    communities: '/admin/analytics/communities',
    'devotion-analytics': '/admin/analytics/devotions',
  };

  assert.deepEqual(routes.ADMIN_ROUTES, expected);
  for (const [section, pathname] of Object.entries(expected)) {
    assert.equal(routes.adminSectionForPath(pathname), section);
    assert.equal(routes.adminSectionForPath(`${pathname}/`), section);
  }
});

test('content review parsing preserves valid filters and rejects unsafe values', () => {
  assert.deepEqual(
    routes.reviewSearchParams('?media=audio&partner=partner-1&date=2026-08-20&status=approved'),
    { media: 'audio', partner: 'partner-1', date: '2026-08-20', status: 'approved' },
  );
  assert.deepEqual(
    routes.reviewSearchParams('?media=unknown&status=unknown'),
    { media: 'video', partner: 'all', date: '', status: 'pending' },
  );
  assert.equal(routes.reviewSearchParams('?status=expired').status, 'expired');
  assert.equal(routes.reviewSearchParams('?status=all').status, 'all');
});

test('admin locations encode Home review actions without leaking stale filters', () => {
  assert.deepEqual(routes.adminLocation('review', { media: 'audio' }), {
    pathname: '/admin/partners/review',
    search: '?media=audio',
  });
  assert.deepEqual(routes.adminLocation('sources', { partner: null }), {
    pathname: '/admin/partners/sources',
    search: '',
  });
});

test('Home signals preserve real zeroes and fail closed for older payloads', () => {
  assert.deepEqual(routes.homeSignalsOrUnavailable(), {
    activeDevotions: null,
    openCalendarReviews: null,
  });
  assert.deepEqual(routes.homeSignalsOrUnavailable({ activeDevotions: 0, openCalendarReviews: 4 }), {
    activeDevotions: 0,
    openCalendarReviews: 4,
  });
});
