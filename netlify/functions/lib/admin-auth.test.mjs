import assert from 'node:assert/strict';
import test from 'node:test';
import { createAdminAuthenticator, createAdminAuthorizer } from './admin-auth.mjs';

test('admin authorization accepts the shared secret without exposing it to the client bundle', async () => {
  const authorize = createAdminAuthorizer({
    supabase: null,
    sharedSecret: 'server-only-secret',
    allowedEmails: [],
  });

  assert.equal(await authorize({ headers: { 'X-Admin-Secret': 'server-only-secret' } }), true);
  assert.equal(await authorize({ headers: { authorization: 'Bearer wrong' } }), false);
});

test('admin authentication returns a bounded role identity without exposing credentials', async () => {
  const authenticate = createAdminAuthenticator({
    sharedSecret: 'server-only-secret',
    allowedEmails: ['owner@example.com', 'editor@example.com', 'viewer@example.com'],
    editorEmails: ['EDITOR@example.com'],
    viewerEmails: ['viewer@example.com'],
    supabase: {
      auth: {
        getUser: async (token) => ({
          data: { user: { id: `user-${token}`, email: `${token}@example.com` } },
          error: null,
        }),
      },
    },
  });

  assert.deepEqual(await authenticate({ headers: { 'x-admin-secret': 'server-only-secret' } }), {
    actorId: 'shared-secret', email: null, role: 'owner', method: 'shared-secret',
  });
  assert.equal((await authenticate({ headers: { authorization: 'Bearer owner' } })).role, 'owner');
  assert.equal((await authenticate({ headers: { authorization: 'Bearer editor' } })).role, 'editor');
  assert.equal((await authenticate({ headers: { authorization: 'Bearer viewer' } })).role, 'viewer');
  assert.equal(await authenticate({ headers: { authorization: 'Bearer unknown' } }), null);
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
