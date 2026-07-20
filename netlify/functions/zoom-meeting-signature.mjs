import {
  getTestRoom,
  getZoomConfig,
  meetingSdkJwt,
  refreshAccessToken,
  response,
  sessionCookie,
  sessionFromRequest,
  zoomApi,
} from './lib/zoom.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  const config = getZoomConfig();
  const room = getTestRoom();
  if (!config || !room.isConfigured) {
    return response(503, { error: 'The test room has not been configured yet.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body ?? '{}');
  } catch {
    return response(400, { error: 'Invalid request.' });
  }
  if (payload.roomId !== room.id) return response(404, { error: 'Room not found.' });

  const userName = String(payload.userName ?? '').trim().slice(0, 64);
  if (!userName) return response(400, { error: 'Please enter the name you would like to use in the room.' });

  let session = sessionFromRequest(event);
  let updatedSession = false;
  let zak;
  try {
    if (room.requiresZoomAuth) {
      if (!session?.accessToken || !session?.refreshToken) {
        return response(401, { error: 'This room requires a connected Zoom account.' });
      }
      if (session.expiresAt < Date.now() + 60_000) {
        const token = await refreshAccessToken(config, session.refreshToken);
        session = {
          ...session,
          accessToken: token.access_token,
          refreshToken: token.refresh_token ?? session.refreshToken,
          expiresAt: Date.now() + Math.max(60, token.expires_in ?? 3600) * 1000,
        };
        updatedSession = true;
      }
      const zakToken = await zoomApi('/users/me/token?type=zak', session.accessToken);
      zak = zakToken.token;
    }

    const signature = meetingSdkJwt({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      meetingNumber: process.env.ZOOM_TEST_ROOM_MEETING_NUMBER,
      role: 0,
    });
    return response(
      200,
      {
        signature,
        meetingNumber: process.env.ZOOM_TEST_ROOM_MEETING_NUMBER,
        password: process.env.ZOOM_TEST_ROOM_PASSWORD ?? '',
        zak,
      },
      updatedSession ? { 'set-cookie': sessionCookie(session) } : {},
    );
  } catch (error) {
    console.error('[zoom-meeting-signature] failed', error);
    return response(401, { error: error instanceof Error ? error.message : 'Unable to authorize the Zoom join.' });
  }
}
