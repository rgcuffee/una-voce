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
    icon: IconName;
};

export type IconName =
    | 'today'
    | 'discover'
    | 'live'
    | 'community'
    | 'more';

// Primary destinations shown in the desktop header and the mobile bottom bar.
export const PRIMARY_NAV: NavItem[] = [
    { key: 'today', label: 'Today', icon: 'today' },
    { key: 'discover', label: 'Discover', icon: 'discover' },
    { key: 'live', label: 'Live', icon: 'live' },
    // { key: 'community', label: 'Community', icon: 'community' },
    { key: 'more', label: 'More', icon: 'more' },
];

export type ViewNavigator = (view: ViewKey) => void;
