import { isSensitiveValueKey, isTokenShapedValue } from './analyticsContract.mjs';

function redactUrl(value, origin) {
  try {
    const candidate = typeof value === 'string' ? value.trim() : '';
    // A protocol-relative URL has no trustworthy scheme in telemetry. Treat it
    // like any other non-HTTP input, even if a base URL was supplied.
    if (!candidate || candidate.startsWith('//') || candidate.startsWith('#')) return '';
    const url = new URL(candidate, origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    for (const name of [...url.searchParams.keys()]) if (isSensitiveValueKey(name) || /^uv_/i.test(name) || isTokenShapedValue(url.searchParams.get(name))) url.searchParams.delete(name);
    url.hash = '';
    return origin ? `${url.pathname}${url.search}${url.hash}` : url.toString();
  } catch {
    // Telemetry is never a reason to preserve an unparseable URL. A relative
    // page path has an origin above; referrers/source URLs must be absolute.
    return '';
  }
}
export function sanitizeAnalyticsPagePath(value) { return typeof value === 'string' && value.trim() ? redactUrl(value, 'https://analytics.invalid') : value; }
export function sanitizeAnalyticsReferrer(value) { return typeof value === 'string' && value.trim() ? redactUrl(value) : value; }
export function sanitizeAnalyticsMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return Object.fromEntries(Object.entries(metadata).flatMap(([name, value]) => isSensitiveValueKey(name) ? [] : [[name, sanitize(value)]]));
}
function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') return sanitizeAnalyticsMetadata(value);
  if (typeof value !== 'string') return value;
  const candidate = value.trim();
  if (candidate.startsWith('#')) return '';
  const hasSchemeOrProtocolRelative = /^[a-z][a-z0-9+.-]*:/i.test(candidate) || /^\/\//.test(candidate);
  const isRelativeUrlLike = candidate.startsWith('/') || candidate.startsWith('?') || candidate.includes('#') || candidate.includes('?') || candidate.includes('/devotions/');
  const cleaned = hasSchemeOrProtocolRelative
    ? sanitizeAnalyticsReferrer(candidate)
    : (isRelativeUrlLike ? redactUrl(candidate, 'https://analytics.invalid') : candidate);
  return isTokenShapedValue(cleaned) ? '[redacted-participant-token]' : cleaned;
}
