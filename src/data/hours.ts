import type { Hour, DayInfo } from '../types';

export const todayInfo: DayInfo = {
    dateLabel: 'Monday, June 22 · Twelfth Week in Ordinary Time',
    feastName: 'St. John Fisher & St. Thomas More',
    season: 'Ordinary Time · Week IV',
    nextHour: {
        name: 'Vespers',
        time: '6:00 PM',
    },
    prayedCount: 4,
    totalCount: 7,
    liveSession: {
        hourName: 'Evening Prayer',
        partner: 'Abbey of Our Lady',
        viewerCount: 128,
    },
};

export const todayHours: Hour[] = [
    {
        id: 'office-of-readings',
        time: '6:00',
        ampm: 'AM',
        name: 'Office of Readings',
        latin: 'Matutinum',
        partner: 'Sisters of Dawnfield',
        status: 'prayed',
        badge: 'done',
    },
    {
        id: 'morning-prayer',
        time: '7:30',
        ampm: 'AM',
        name: 'Morning Prayer',
        latin: 'Lauds',
        partner: 'Sing the Hours',
        status: 'prayed',
        badge: 'done',
    },
    {
        id: 'midday-prayer',
        time: '12:00',
        ampm: 'PM',
        name: 'Midday Prayer',
        latin: 'Sext',
        partner: 'Divine Office Community',
        status: 'prayed',
        badge: 'done',
    },
    {
        id: 'evening-prayer',
        time: '6:00',
        ampm: 'PM',
        name: 'Evening Prayer',
        latin: 'Vespers',
        partner: 'Abbey of Our Lady',
        status: 'now',
        badge: 'live',
    },
    {
        id: 'night-prayer',
        time: '9:00',
        ampm: 'PM',
        name: 'Night Prayer',
        latin: 'Compline',
        partner: 'Recorded prayer available',
        status: 'upcoming',
        badge: 'recorded',
    },
];
