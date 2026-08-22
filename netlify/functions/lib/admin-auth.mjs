export function createAdminAuthenticator({
  supabase,
  sharedSecret,
  allowedEmails,
  editorEmails = [],
  viewerEmails = [],
}) {
  const normalizedEmails = new Set(
    [...(allowedEmails ?? [])]
      .map((email) => String(email).trim().toLowerCase())
      .filter(Boolean),
  );
  const normalizedEditors = normalizedEmailSet(editorEmails);
  const normalizedViewers = normalizedEmailSet(viewerEmails);

  return async function authenticate(event) {
    const headers = normalizeHeaders(event?.headers);
    const secretHeader = headers['x-admin-secret'] ?? '';
    const authorization = headers.authorization ?? '';

    if (
      sharedSecret &&
      (secretHeader === sharedSecret || authorization === `Bearer ${sharedSecret}`)
    ) {
      return { actorId: 'shared-secret', email: null, role: 'owner', method: 'shared-secret' };
    }

    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token || normalizedEmails.size === 0 || !supabase) {
      return null;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) {
      return null;
    }

    const email = data.user.email.toLowerCase();
    if (!normalizedEmails.has(email)) return null;
    return {
      actorId: data.user.id ?? `email:${email}`,
      email,
      role: normalizedViewers.has(email)
        ? 'viewer'
        : normalizedEditors.has(email)
          ? 'editor'
          : 'owner',
      method: 'bearer',
    };
  };
}

export function createAdminAuthorizer(options) {
  const authenticate = createAdminAuthenticator(options);
  return async function isAuthorized(event) {
    return Boolean(await authenticate(event));
  };
}

function normalizedEmailSet(emails) {
  return new Set(
    [...(emails ?? [])]
      .map((email) => String(email).trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
