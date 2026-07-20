import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadLocalEnv();

const SESSION_COOKIE = 'una_voce_zoom_session';
const STATE_COOKIE = 'una_voce_zoom_state';

export function getZoomConfig() {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const redirectUri = process.env.ZOOM_OAUTH_REDIRECT_URI;
  const sessionSecret = process.env.ZOOM_SESSION_SECRET;

  if (!clientId || !clientSecret || !redirectUri || !sessionSecret) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

export function getTestRoom() {
  const status = process.env.ZOOM_TEST_ROOM_STATUS === 'live' ? 'live' : 'scheduled';

  return {
    id: 'test-room',
    name: process.env.ZOOM_TEST_ROOM_NAME ?? 'Compline together',
    description:
      process.env.ZOOM_TEST_ROOM_DESCRIPTION ??
      'A quiet, hosted room for praying Night Prayer together.',
    status,
    scheduledFor: process.env.ZOOM_TEST_ROOM_START_AT ?? null,
    requiresZoomAuth: process.env.ZOOM_TEST_ROOM_REQUIRES_AUTH === 'true',
    isConfigured: Boolean(
      process.env.ZOOM_TEST_ROOM_MEETING_NUMBER &&
        process.env.ZOOM_TEST_ROOM_PASSWORD !== undefined &&
        getZoomConfig(),
    ),
  };
}

export function response(statusCode, body, headers = {}) {
  const { multiValueHeaders, normalizedHeaders } = normalizeCookieHeaders(headers);
  return {
    statusCode,
    headers: {
      ...normalizedHeaders,
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    ...(multiValueHeaders ? { multiValueHeaders } : {}),
    body: JSON.stringify(body),
  };
}

export function redirect(location, headers = {}) {
  const { multiValueHeaders, normalizedHeaders } = normalizeCookieHeaders(headers);
  return {
    statusCode: 302,
    headers: {
      location,
      'cache-control': 'no-store',
      ...normalizedHeaders,
    },
    ...(multiValueHeaders ? { multiValueHeaders } : {}),
    body: '',
  };
}

export function requestUrl(event) {
  return new URL(event.rawUrl ?? `https://${event.headers.host}${event.path}`);
}

export function parseCookies(event) {
  const raw = event.headers.cookie ?? '';

  return raw.split(';').reduce((cookies, item) => {
    const separator = item.indexOf('=');
    if (separator === -1) return cookies;
    const key = item.slice(0, separator).trim();
    const value = item.slice(separator + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

export function createOAuthState() {
  return randomBytes(32).toString('base64url');
}

export function stateCookie(state) {
  return cookie(STATE_COOKIE, state, { maxAge: 600, httpOnly: true });
}

export function clearStateCookie() {
  return cookie(STATE_COOKIE, '', { maxAge: 0, httpOnly: true });
}

export function verifyOAuthState(event, state) {
  const received = parseCookies(event)[STATE_COOKIE];
  if (!received || !state || received.length !== state.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(state));
}

export function sessionFromRequest(event) {
  const token = parseCookies(event)[SESSION_COOKIE];
  return token ? decryptSession(token) : null;
}

export function sessionCookie(session) {
  return cookie(SESSION_COOKIE, encryptSession(session), {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
  });
}

export function clearSessionCookie() {
  return cookie(SESSION_COOKIE, '', { maxAge: 0, httpOnly: true });
}

export async function exchangeCodeForToken(config, code) {
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
  });
  const result = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!result.ok) throw new Error('Zoom could not complete the sign-in request.');
  return result.json();
}

export async function refreshAccessToken(config, refreshToken) {
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const result = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${auth}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!result.ok) throw new Error('Your Zoom session has expired. Please sign in again.');
  return result.json();
}

export async function zoomApi(path, accessToken) {
  const result = await fetch(`https://api.zoom.us/v2${path}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!result.ok) throw new Error('Zoom did not accept the account authorization.');
  return result.json();
}

export function meetingSdkJwt({ clientId, clientSecret, meetingNumber, role = 0 }) {
  const now = Math.floor(Date.now() / 1000) - 30;
  const expiresAt = now + 60 * 60;
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJson({
    appKey: clientId,
    mn: String(meetingNumber),
    role,
    iat: now,
    exp: expiresAt,
    tokenExp: expiresAt,
  });
  const signature = createHmac('sha256', clientSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
}

function sessionKey() {
  const secret = process.env.ZOOM_SESSION_SECRET;
  if (!secret) throw new Error('ZOOM_SESSION_SECRET is not configured.');
  return createHash('sha256').update(secret).digest();
}

function encryptSession(session) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sessionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${encrypted.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}`;
}

function decryptSession(value) {
  try {
    const [version, iv, encrypted, tag] = value.split('.');
    if (version !== 'v1' || !iv || !encrypted || !tag) return null;
    const decipher = createDecipheriv('aes-256-gcm', sessionKey(), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]);
    return JSON.parse(plain.toString('utf8'));
  } catch {
    return null;
  }
}

function cookie(name, value, { maxAge, httpOnly }) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
  if (httpOnly) parts.push('HttpOnly');
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (process.env.NETLIFY || process.env.URL?.startsWith('https://')) parts.push('Secure');
  return parts.join('; ');
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function normalizeCookieHeaders(headers) {
  const normalizedHeaders = { ...headers };
  const cookies = normalizedHeaders['set-cookie'];
  delete normalizedHeaders['set-cookie'];
  return {
    normalizedHeaders,
    multiValueHeaders: Array.isArray(cookies) ? { 'set-cookie': cookies } : cookies ? { 'set-cookie': [cookies] } : null,
  };
}

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}
