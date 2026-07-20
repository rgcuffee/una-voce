import { createOAuthState, getZoomConfig, redirect, stateCookie } from './lib/zoom.mjs';

export async function handler() {
  const config = getZoomConfig();
  if (!config) {
    return redirect('/test-room?zoom=not-configured');
  }

  const state = createOAuthState();
  const authorizationUrl = new URL('https://zoom.us/oauth/authorize');
  authorizationUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
  }).toString();

  return redirect(authorizationUrl.toString(), { 'set-cookie': stateCookie(state) });
}
