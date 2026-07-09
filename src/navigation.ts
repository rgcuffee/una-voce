export type ViewKey =
    | 'home'
    | 'today'
    | 'discover'
    | 'live'
    | 'community'
    | 'more'
    | 'about'
    | 'getting-started'
    | 'parishes'
    | 'contact';

export type NavItem = {
    key: ViewKey;
    label: string;
    shortLabel?: string;
    icon: IconName;
};

export type IconName =
    | 'home'
    | 'today'
    | 'discover'
    | 'community'
    | 'getting-started'
    | 'about'
    | 'parishes'
    | 'more';

// Primary destinations shown in the desktop header and the mobile bottom bar.
export const PRIMARY_NAV: NavItem[] = [
    { key: 'home', label: 'Home', icon: 'home' },
    { key: 'today', label: 'Pray Today', shortLabel: 'Pray', icon: 'today' },
    { key: 'getting-started', label: 'Start Here', shortLabel: 'Start', icon: 'getting-started' },
    { key: 'discover', label: 'Discover', icon: 'discover' },
    { key: 'parishes', label: 'For Parishes', shortLabel: 'Parishes', icon: 'parishes' },
    { key: 'about', label: 'About', icon: 'about' },
];

export type ViewNavigator = (
    view: ViewKey,
    options?: { segmentId?: string },
) => void;

export const VIEW_PATHS: Record<ViewKey, string> = {
    home: '/',
    today: '/pray',
    discover: '/discover',
    live: '/live',
    community: '/community',
    more: '/more',
    about: '/about',
    'getting-started': '/start',
    parishes: '/parishes',
    contact: '/contact',
};

export function pathForView(view: ViewKey): string {
    return VIEW_PATHS[view];
}

export function viewForPath(pathname: string): ViewKey {
    const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';

    if (normalized === '/') {
        return 'home';
    }

    if (normalized === '/pray') {
        return 'today';
    }

    if (
        normalized === '/community' ||
        normalized.startsWith('/community/') ||
        normalized === '/communities' ||
        normalized.startsWith('/communities/')
    ) {
        return 'community';
    }

    if (normalized === '/getting-started' || normalized === '/start-here' || normalized === '/new') {
        return 'getting-started';
    }

    const matched = (Object.entries(VIEW_PATHS) as [ViewKey, string][]).find(
        ([, path]) => path === normalized,
    );

    return matched?.[0] ?? 'today';
}
