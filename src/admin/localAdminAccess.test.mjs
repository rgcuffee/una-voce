import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearLocalAdminPassword,
  localPasswordModeEnabled,
  readLocalAdminPassword,
  storeLocalAdminPassword,
  validateLocalAdminPassword,
} from './localAdminAccess.mjs';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('correct local password grants access and persists for refreshes', async () => {
  const storage = memoryStorage();
  const password = 'configured-local-password';
  const fetchImpl = async (_url, options) => ({
    ok: options.headers['x-admin-secret'] === password,
  });

  assert.equal(
    await validateLocalAdminPassword({ dev: true, password, fetchImpl }),
    true,
  );

  storeLocalAdminPassword(storage, password);
  assert.equal(readLocalAdminPassword(storage), password);
});

test('incorrect local password is denied and is not persisted', async () => {
  const storage = memoryStorage();
  const fetchImpl = async () => ({ ok: false });

  assert.equal(
    await validateLocalAdminPassword({
      dev: true,
      password: 'incorrect-password',
      fetchImpl,
    }),
    false,
  );
  assert.equal(readLocalAdminPassword(storage), '');
});

test('local password flow is disabled in production mode', async () => {
  let requested = false;
  const fetchImpl = async () => {
    requested = true;
    return { ok: true };
  };

  assert.equal(localPasswordModeEnabled(false), false);
  assert.equal(
    await validateLocalAdminPassword({
      dev: false,
      password: 'configured-local-password',
      fetchImpl,
    }),
    false,
  );
  assert.equal(requested, false);
});

test('local password can be explicitly cleared', () => {
  const storage = memoryStorage();
  storeLocalAdminPassword(storage, 'configured-local-password');
  clearLocalAdminPassword(storage);
  assert.equal(readLocalAdminPassword(storage), '');
});
