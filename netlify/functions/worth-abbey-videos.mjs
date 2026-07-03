import { worthAbbeyVideosResponse } from './lib/worth-abbey-videos.mjs';

const JSON_HEADERS = {
  'access-control-allow-origin': '*',
  'content-type': 'application/json',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return response(204);
  }

  if (event.httpMethod !== 'GET') {
    return response(405, { error: 'Method not allowed' });
  }

  try {
    const date = event.queryStringParameters?.date;
    const body = await worthAbbeyVideosResponse(date);
    return response(200, body);
  } catch (error) {
    return response(502, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to load Worth Abbey videos',
    });
  }
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: body ? JSON.stringify(body) : '',
  };
}
