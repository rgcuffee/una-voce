export type HourStatus = 'prayed' | 'now' | 'upcoming';
export type HourBadge = 'live' | 'recorded' | 'done' | 'none';

export interface Hour {
    id: string;
    time: string;
    ampm: 'AM' | 'PM';
    name: string;
    latin: string;
    partner: string;
    status: HourStatus;
    badge: HourBadge;
}

export interface LiveSession {
    hourName: string;
    partner: string;
    viewerCount: number;
}

export interface DayInfo {
    dateLabel: string;
    feastName: string;
    season: string;
    nextHour: {
        name: string;
        time: string;
    };
    prayedCount: number;
    totalCount: number;
    liveSession: LiveSession | null;
}
