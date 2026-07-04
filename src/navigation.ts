export type ViewKey =
    | 'today'
    | 'discover'
    | 'live'
    | 'community'
    | 'more'
    | 'about'
    | 'getting-started';

export type NavItem = {
    key: ViewKey;
    label: string;
    shortLabel?: string;
    icon: IconName;
};

export type IconName =
    | 'today'
    | 'discover'
    | 'community'
    | 'getting-started'
    | 'about';

// Primary destinations shown in the desktop header and the mobile bottom bar.
export const PRIMARY_NAV: NavItem[] = [
    { key: 'today', label: 'Pray', icon: 'today' },
    { key: 'discover', label: 'Discover', icon: 'discover' },
    { key: 'community', label: 'Community', shortLabel: 'Community', icon: 'community' },
    {
        key: 'getting-started',
        label: 'Getting Started',
        shortLabel: 'Start',
        icon: 'getting-started',
    },
    { key: 'about', label: 'About', icon: 'about' },
];

export type ViewNavigator = (view: ViewKey) => void;

export const VIEW_PATHS: Record<ViewKey, string> = {
    today: '/pray',
    discover: '/discover',
    live: '/live',
    community: '/community',
    more: '/more',
    about: '/about',
    'getting-started': '/getting-started',
};

export function pathForView(view: ViewKey): string {
    return VIEW_PATHS[view];
}

export function viewForPath(pathname: string): ViewKey {
    const normalized = pathname.toLowerCase().replace(/\/+$/, '') || '/';

    if (normalized === '/' || normalized === '/pray') {
        return 'today';
    }

    if (normalized === '/community' || normalized.startsWith('/community/')) {
        return 'community';
    }

    const matched = (Object.entries(VIEW_PATHS) as [ViewKey, string][]).find(
        ([, path]) => path === normalized,
    );

    return matched?.[0] ?? 'today';
}
