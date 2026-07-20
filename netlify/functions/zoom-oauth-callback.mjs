import {
  clearStateCookie,
  exchangeCodeForToken,
  getZoomConfig,
  redirect,
  requestUrl,
  sessionCookie,
  verifyOAuthState,
  zoomApi,
} from './lib/zoom.mjs';

export async function handler(event) {
  const config = getZoomConfig();
  const url = requestUrl(event);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const clearState = clearStateCookie();

  if (error || !config || !code || !verifyOAuthState(event, state)) {
    return redirect('/test-room?zoom=denied', { 'set-cookie': clearState });
  }

  try {
    const token = await exchangeCodeForToken(config, code);
    const profile = await zoomApi('/users/me', token.access_token);
    const session = {
      profile: {
        id: profile.id,
        name: profile.display_name || profile.first_name || 'Zoom participant',
        email: profile.email || '',
      },
      accessToken: token.access_token,
      refreshToken: token.refresh_token,
      expiresAt: Date.now() + Math.max(60, token.expires_in ?? 3600) * 1000,
    };
    return redirect('/test-room?zoom=connected', {
      'set-cookie': [sessionCookie(session), clearState],
    });
  } catch (error) {
    console.error('[zoom-oauth-callback] failed', error);
    return redirect('/test-room?zoom=failed', { 'set-cookie': clearState });
  }
}
