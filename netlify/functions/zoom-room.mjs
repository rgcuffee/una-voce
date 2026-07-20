import { getTestRoom, response } from './lib/zoom.mjs';

export async function handler(event) {
  if (event.httpMethod !== 'GET') return response(405, { error: 'Method not allowed' });
  return response(200, { room: getTestRoom() });
}
