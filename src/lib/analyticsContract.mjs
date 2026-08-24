/** Public, credential-free analytics vocabulary shared by the browser and Functions. */
export const ANALYTICS_EVENT_NAMES = Object.freeze([
  'app_opened', 'page_viewed', 'navigation_clicked', 'community_page_viewed', 'community_outbound_clicked', 'content_card_viewed', 'content_card_clicked',
  'prayer_session_started', 'prayer_play_started', 'prayer_play_paused', 'prayer_play_resumed', 'prayer_progress', 'prayer_completed', 'prayer_session_ended', 'source_opened', 'platform_opened', 'share_clicked', 'search_performed', 'filter_changed',
  'utm_landing_recorded', 'devotion_page_opened', 'devotion_resource_opened', 'devotion_report_submitted', 'devotion_survey_clicked', 'devotion_survey_started', 'devotion_survey_submitted',
  'links_page_viewed', 'current_hour_cta_viewed', 'current_hour_cta_clicked', 'session_started', 'session_returned', 'pwa_install_eligible', 'pwa_install_prompted', 'pwa_install_installed', 'continuation_opened',
]);
export const CANONICAL_ACQUISITION_SOURCES = Object.freeze({ WEBSITE: 'website', LINKS_PAGE: 'links_page', QR: 'qr', SMS: 'sms', SOCIAL: 'social', INSTAGRAM: 'instagram', ORGANIZATION: 'organization', DEVOTION: 'devotion', DIRECT: 'direct', UNKNOWN: 'unknown' });
export const CANONICAL_SURFACES = Object.freeze({ WEB: 'web', PWA: 'pwa' });
export const DEVOTION_REPORT_OUTCOMES = Object.freeze(['prayed', 'started_not_finished', 'not_tonight']);
export const DEVOTION_SURVEY_KINDS = Object.freeze(['pre', 'post']);
const SOURCE_ALIASES = Object.freeze({ web: 'website', website: 'website', links: 'links_page', linkspage: 'links_page', links_page: 'links_page', qr: 'qr', sms: 'sms', text: 'sms', social: 'social', instagram: 'instagram', insta: 'instagram', facebook: 'social', fb: 'social', twitter: 'social', x: 'social', organization: 'organization', org: 'organization', partner: 'organization', devotion: 'devotion', direct: 'direct', unknown: 'unknown' });
const SURFACE_ALIASES = Object.freeze({ web: 'web', website: 'web', browser: 'web', pwa: 'pwa', installed: 'pwa', app: 'pwa' });
const HANDOFF_KEYS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'campaign_source', 'campaign_medium', 'campaign_name', 'campaign_content', 'campaign_term']);
const TOKEN_SHAPED = /(^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?=$|[^A-Za-z0-9_-])/;
const RFC3339 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-](\d{2}):(\d{2}))$/;
const CAMPAIGN_EVENTS = new Set(['links_page_viewed', 'current_hour_cta_viewed', 'current_hour_cta_clicked', 'session_started', 'session_returned', 'utm_landing_recorded', 'continuation_opened']);
function normalized(value) { return typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s-]+/g, '_') : ''; }
export function normalizeSensitiveKey(value) { return String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
export function isSensitiveValueKey(value) { const name = normalizeSensitiveKey(value); return name === 'p' || /(?:token|secret|password|passcode|authorization|credential|apikey|authkey|clientkey|privatekey|accesskey)$/.test(name); }
export function isTokenShapedValue(value) { return typeof value === 'string' && TOKEN_SHAPED.test(value); }
export function isSafeCampaignValue(value) { return typeof value === 'string' && /^[a-z0-9._-]{1,120}$/i.test(value) && !isTokenShapedValue(value); }
export function normalizeAcquisitionSource(value) { return SOURCE_ALIASES[normalized(value)] ?? null; }
export function normalizeAcquisitionSurface(value) { return SURFACE_ALIASES[normalized(value)] ?? null; }
export function isCanonicalAcquisitionSource(value) { return Object.values(CANONICAL_ACQUISITION_SOURCES).includes(value); }
export function isCanonicalAcquisitionSurface(value) { return Object.values(CANONICAL_SURFACES).includes(value); }
export function isCampaignQueryKey(value) { return HANDOFF_KEYS.has(String(value ?? '').toLowerCase()); }
export function canonicalAcquisitionDefaults() { return { source: 'unknown', surface: 'web', medium: null, campaign: null, content: null, term: null }; }
export function isRfc3339Timestamp(value, now = Date.now(), maxAgeMs = 7 * 86400000, maxFutureMs = 600000) {
  if (typeof value !== 'string') return false; const match = RFC3339.exec(value); if (!match) return false;
  const [, year, month, day, hour, minute, second, zone, offsetHour = '0', offsetMinute = '0'] = match; const n = (part) => Number(part);
  if (n(month) < 1 || n(month) > 12 || n(day) < 1 || n(day) > 31 || n(hour) > 23 || n(minute) > 59 || n(second) > 59 || (zone !== 'Z' && (n(offsetHour) > 23 || n(offsetMinute) > 59))) return false;
  const calendar = new Date(Date.UTC(n(year), n(month) - 1, n(day))); if (calendar.getUTCFullYear() !== n(year) || calendar.getUTCMonth() !== n(month) - 1 || calendar.getUTCDate() !== n(day)) return false;
  const time = Date.parse(value); return Number.isFinite(time) && time >= now - maxAgeMs && time <= now + maxFutureMs;
}
export function extractAcquisitionParams(input) { const params = input instanceof URLSearchParams ? input : new URLSearchParams(input || ''); const value = (...names) => names.map((name) => params.get(name)).find(isSafeCampaignValue) ?? null; const rawUtmSource = value('utm_source'); return { source: normalizeAcquisitionSource(params.get('uv_source')) ?? normalizeAcquisitionSource(params.get('campaign_source')) ?? normalizeAcquisitionSource(rawUtmSource), requestedSurface: normalizeAcquisitionSurface(params.get('uv_surface') ?? params.get('surface')), medium: value('uv_medium', 'campaign_medium', 'utm_medium'), campaign: value('uv_campaign', 'campaign_name', 'utm_campaign'), content: value('uv_content', 'campaign_content', 'utm_content'), term: value('utm_term'), rawUtmSource, rawUtmMedium: value('utm_medium'), rawUtmCampaign: value('utm_campaign'), rawUtmContent: value('utm_content'), sessionId: params.get('uv_session_id') || null, sessionStartedAt: params.get('uv_session_started_at') || null, eventHint: params.get('uv_event') || null, handoffAction: params.get('uv_action') || null }; }
export function sanitizedCampaignQueryParams(input) { const params = input instanceof URLSearchParams ? input : new URLSearchParams(input || ''); const output = new Map(); for (const [name, value] of params) if (!isSensitiveValueKey(name) && isCampaignQueryKey(name) && isSafeCampaignValue(value)) output.set(name.toLowerCase(), value); return output; }
export function buildAcquisitionHandoffQuery(raw = {}) { const result = new URLSearchParams(); result.set('uv_source', normalizeAcquisitionSource(raw.source) ?? 'unknown'); result.set('uv_surface', normalizeAcquisitionSurface(raw.surface) ?? 'web'); for (const [name, value] of [['uv_event', raw.event], ['uv_action', raw.handoffAction]]) if (typeof value === 'string' && /^[a-z0-9:_-]{1,80}$/i.test(value)) result.set(name, value); if (typeof raw.sessionId === 'string' && /^[0-9a-f-]{36}$/i.test(raw.sessionId)) result.set('uv_session_id', raw.sessionId); if (isRfc3339Timestamp(raw.sessionStartedAt)) result.set('uv_session_started_at', raw.sessionStartedAt); for (const [name, value] of (raw.handoffParams instanceof Map ? raw.handoffParams : [])) if (isCampaignQueryKey(name) && isSafeCampaignValue(value)) result.set(name.toLowerCase(), value); return result; }
export function validateAnalyticsEventContract(detail) {
  if (!ANALYTICS_EVENT_NAMES.includes(detail.eventName)) return 'Invalid eventName'; const hasIds = detail.devotionId && detail.devotionParticipantId; const hasNight = hasIds && detail.pilotDay && detail.prayerDate; const survey = ['devotion_survey_clicked', 'devotion_survey_started', 'devotion_survey_submitted'].includes(detail.eventName);
  if (detail.eventName.startsWith('devotion_') && !(survey ? hasIds : hasNight)) return 'Missing devotion attribution';
  if (detail.eventName === 'devotion_resource_opened' && (!detail.resourceId || !detail.provider || !detail.mediaType)) return 'Missing devotion resource attribution';
  if (detail.eventName === 'devotion_report_submitted' && !DEVOTION_REPORT_OUTCOMES.includes(detail.metadata?.outcome)) return 'Invalid devotion report outcome';
  if (survey && (!DEVOTION_SURVEY_KINDS.includes(detail.metadata?.surveyKind) || !detail.resourceId || detail.mediaType !== 'survey_link')) return 'Invalid devotion survey attribution';
  if (detail.eventName.startsWith('pwa_install_') && detail.installSurface !== 'pwa') return 'PWA events require pwa install surface';
  if (CAMPAIGN_EVENTS.has(detail.eventName) && (!isCanonicalAcquisitionSource(detail.acquisitionSource) || !isCanonicalAcquisitionSurface(detail.acquisitionSurface))) return 'Campaign events require canonical acquisition attribution';
  if (detail.eventName === 'continuation_opened' && (detail.pageContext !== 'links_handoff' || detail.acquisitionSource !== 'links_page')) return 'Invalid continuation attribution'; return null;
}
