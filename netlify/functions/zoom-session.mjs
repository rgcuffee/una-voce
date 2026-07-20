import { clearSessionCookie, response, sessionFromRequest } from './lib/zoom.mjs';

export async function handler(event) {
  if (event.httpMethod === 'POST') {
    return response(200, { ok: true }, { 'set-cookie': clearSessionCookie() });
  }
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });

  const session = sessionFromRequest(event);
  return response(200, {
    connected: Boolean(session?.profile),
    profile: session?.profile ?? null,
  });
}
