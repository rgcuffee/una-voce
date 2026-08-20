export type AnalyticsFilters = {
  range: 'today' | '7d' | '30d' | 'custom';
  grain: 'daily' | 'weekly' | 'monthly';
  start: string;
  end: string;
  device: string;
  event: string;
  page: string;
  community: string;
  partner: string;
  session: string;
  pageNumber: number;
  communitySort: 'engagement' | 'users' | 'views' | 'clicks';
  communityOrder: 'asc' | 'desc';
  selectedCommunity: string;
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilters = {
  range: '30d', grain: 'daily', start: '', end: '', device: '', event: '', page: '', community: '', partner: '', session: '', pageNumber: 1, communitySort: 'engagement', communityOrder: 'desc', selectedCommunity: '',
};

export function analyticsFiltersFromSearch(search: string): AnalyticsFilters {
  const params = new URLSearchParams(search);
  const range = params.get('range');
  return {
    ...DEFAULT_ANALYTICS_FILTERS,
    range: range === 'today' || range === '7d' || range === 'custom' ? range : '30d',
    grain: ['weekly', 'monthly'].includes(params.get('grain') ?? '') ? params.get('grain') as 'weekly' | 'monthly' : 'daily',
    start: safeDate(params.get('start')),
    end: safeDate(params.get('end')),
    device: safeValue(params.get('device')),
    event: safeValue(params.get('event')),
    page: safeValue(params.get('page')),
    community: safeValue(params.get('community')),
    partner: safeValue(params.get('partner')),
    session: safeValue(params.get('session')),
    pageNumber: Math.max(1, Number.parseInt(params.get('pageNumber') ?? '1', 10) || 1),
    communitySort: ['users', 'views', 'clicks'].includes(params.get('communitySort') ?? '') ? params.get('communitySort') as 'users' | 'views' | 'clicks' : 'engagement',
    communityOrder: params.get('communityOrder') === 'asc' ? 'asc' : 'desc',
    selectedCommunity: safeValue(params.get('selectedCommunity')),
  };
}

export function analyticsSearch(filters: AnalyticsFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if ((key === 'start' || key === 'end') && filters.range !== 'custom') continue;
    if (key === 'pageNumber' ? value !== 1 : value && value !== DEFAULT_ANALYTICS_FILTERS[key as keyof AnalyticsFilters]) params.set(key, String(value));
  }
  return params.toString();
}

export function analyticsDataSearch(search: string) {
  const params = new URLSearchParams(search);
  const output = new URLSearchParams();
  for (const key of ['range', 'grain', 'start', 'end', 'pageNumber', 'device', 'event', 'page', 'community', 'partner', 'session']) {
    const value = params.get(key); if (value) output.set(key, value);
  }
  return output.toString();
}

export function comparison(current: number, prior: number) {
  if (!Number.isFinite(prior) || prior === 0) return { prior, change: null as number | null, label: prior === 0 ? 'No prior data' : 'Unavailable' };
  const change = Math.round(((current - prior) / prior) * 100);
  return { prior, change, label: `${change >= 0 ? '+' : ''}${change}% vs prior period` };
}

export function csv(rows: Array<Record<string, unknown>>, headers: string[]) {
  const quote = (value: unknown) => `"${spreadsheetSafe(value).replace(/"/g, '""')}"`;
  return [headers.map(quote).join(','), ...rows.map((row) => headers.map((header) => quote(row[header])).join(','))].join('\n');
}

export function spreadsheetSafe(value: unknown) {
  const text = String(value ?? '');
  return /^[\t\n\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

export function metricPresentation(value: number | null, options: { sampled?: boolean; cap?: number; detail: string }) {
  if (value === null) return { value: '—', detail: options.detail };
  return options.sampled ? { value: `≥${value}`, detail: `At least · newest ${options.cap ?? 10000}-row sample` } : { value, detail: options.detail };
}

function safeDate(value: string | null) { return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''; }
function safeValue(value: string | null) { return value ? value.slice(0, 160) : ''; }
