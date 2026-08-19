import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminAuthorizer } from './admin-auth.mjs';

test('admin authorization accepts the shared secret without exposing it to the client bundle', async () => {
  const authorize = createAdminAuthorizer({
    supabase: null,
    sharedSecret: 'server-only-secret',
    allowedEmails: [],
  });

  assert.equal(await authorize({ headers: { 'X-Admin-Secret': 'server-only-secret' } }), true);
  assert.equal(await authorize({ headers: { authorization: 'Bearer wrong' } }), false);
});

test('admin authorization verifies bearer identity against the server allowlist', async () => {
  const authorize = createAdminAuthorizer({
    sharedSecret: '',
    allowedEmails: ['operator@example.com'],
    supabase: {
      auth: {
        getUser: async (token) => ({
          data: { user: token === 'valid' ? { email: 'Operator@Example.com' } : null },
          error: token === 'valid' ? null : new Error('invalid'),
        }),
      },
    },
  });

  assert.equal(await authorize({ headers: { authorization: 'Bearer valid' } }), true);
  assert.equal(await authorize({ headers: { authorization: 'Bearer invalid' } }), false);
});
