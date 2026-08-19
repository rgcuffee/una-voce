export function createAdminAuthorizer({ supabase, sharedSecret, allowedEmails }) {
  const normalizedEmails = new Set(
    [...(allowedEmails ?? [])]
      .map((email) => String(email).trim().toLowerCase())
      .filter(Boolean),
  );

  return async function isAuthorized(event) {
    const headers = normalizeHeaders(event?.headers);
    const secretHeader = headers['x-admin-secret'] ?? '';
    const authorization = headers.authorization ?? '';

    if (
      sharedSecret &&
      (secretHeader === sharedSecret || authorization === `Bearer ${sharedSecret}`)
    ) {
      return true;
    }

    const token = authorization.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length).trim()
      : '';

    if (!token || normalizedEmails.size === 0 || !supabase) {
      return false;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) {
      return false;
    }

    return normalizedEmails.has(data.user.email.toLowerCase());
  };
}

function normalizeHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}
