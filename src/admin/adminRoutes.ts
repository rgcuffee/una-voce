export type AdminRouteSection =
  | 'home'
  | 'inventory'
  | 'review'
  | 'sources'
  | 'rules'
  | 'devotions'
  | 'activity'
  | 'communities'
  | 'devotion-analytics';

export const ADMIN_ROUTES: Record<AdminRouteSection, string> = {
  home: '/admin',
  inventory: '/admin/partners',
  review: '/admin/partners/review',
  sources: '/admin/partners/sources',
  rules: '/admin/partners/rules',
  devotions: '/admin/devotions',
  activity: '/admin/analytics/activity',
  communities: '/admin/analytics/communities',
  'devotion-analytics': '/admin/analytics/devotions',
};

export const REVIEW_STATUSES = ['pending', 'approved', 'hidden', 'expired'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number] | 'all';

export type AdminHomeSignals = {
  activeDevotions: number | null;
  openCalendarReviews: number | null;
};

export function homeSignalsOrUnavailable(signals?: Partial<AdminHomeSignals>): AdminHomeSignals {
  return {
    activeDevotions: signals?.activeDevotions ?? null,
    openCalendarReviews: signals?.openCalendarReviews ?? null,
  };
}

export function adminLocation(
  section: AdminRouteSection,
  params: Record<string, string | null | undefined> = {},
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  return {
    pathname: ADMIN_ROUTES[section],
    search: search.toString() ? `?${search}` : '',
  };
}

export function adminSectionForPath(pathname: string): AdminRouteSection {
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (normalizedPath === '/admin/partners') return 'inventory';
  if (normalizedPath === '/admin/partners/review') return 'review';
  if (normalizedPath === '/admin/partners/sources') return 'sources';
  if (normalizedPath === '/admin/partners/rules') return 'rules';
  if (normalizedPath === '/admin/devotions') return 'devotions';
  if (normalizedPath === '/admin/analytics/communities') return 'communities';
  if (normalizedPath === '/admin/analytics/devotions') return 'devotion-analytics';
  if (normalizedPath === '/admin/analytics/activity') return 'activity';
  return 'home';
}

export function reviewSearchParams(search: string) {
  const params = new URLSearchParams(search);
  const media = params.get('media') === 'audio' ? 'audio' : 'video';
  const requestedStatus = params.get('status');
  const status: ReviewStatus =
    requestedStatus === 'all' || REVIEW_STATUSES.includes(requestedStatus as (typeof REVIEW_STATUSES)[number])
      ? requestedStatus as ReviewStatus
      : 'pending';

  return {
    media,
    partner: params.get('partner') || 'all',
    date: params.get('date') || '',
    status,
  } as const;
}
