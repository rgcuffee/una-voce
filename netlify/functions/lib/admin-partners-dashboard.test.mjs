import assert from 'node:assert/strict';
import test from 'node:test';

import { optionalExactCount } from '../admin-partners.mjs';

test('optional dashboard counts preserve values and isolate missing optional tables', () => {
  assert.equal(optionalExactCount({ count: 7, error: null }), 7);
  assert.equal(optionalExactCount({ count: 0, error: null }), 0);
  assert.equal(optionalExactCount({ count: null, error: null }), 0);
  assert.equal(optionalExactCount({ count: null, error: { code: '42P01' } }), null);
  assert.equal(optionalExactCount(undefined), null);
});
