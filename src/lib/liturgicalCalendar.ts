import { supabase } from './supabase';
import type { Tables } from './database.types';

export type Calendar = Tables<'calendars'>;
export type CalendarSource = Tables<'calendar_sources'>;
export type CanonicalCelebration = Tables<'canonical_celebrations'>;
export type CelebrationAlias = Tables<'celebration_aliases'>;
export type CalendarReviewItem = Tables<'calendar_review_items'>;
export type RawCalendarRow = Tables<'raw_calendar_rows'>;
export type LiturgicalDay = Tables<'liturgical_days'>;
export type LiturgicalDayOption = Tables<'liturgical_day_options'>;
export type LiturgicalHourInstance = Tables<'liturgical_hour_instances'>;
export type CalendarConflictRun = Tables<'calendar_conflict_runs'>;
export type CalendarConflict = Tables<'calendar_conflicts'>;

export type LiturgicalDayWithHours = LiturgicalDay & {
    hours: LiturgicalHourInstance[];
};

function requireSupabase() {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
        );
    }

    return supabase;
}

export async function getCalendars() {
    const { data, error } = await requireSupabase()
        .from('calendars')
        .select('*')
        .order('name');

    if (error) {
        throw error;
    }

    return data;
}

export async function getLiturgicalDayWithHours(
    calendarId: string,
    date: string,
): Promise<LiturgicalDayWithHours | null> {
    const { data: day, error: dayError } = await requireSupabase()
        .from('liturgical_days')
        .select('*')
        .eq('calendar_id', calendarId)
        .eq('date', date)
        .maybeSingle();

    if (dayError) {
        throw dayError;
    }

    if (!day) {
        return null;
    }

    const { data: hours, error: hoursError } = await requireSupabase()
        .from('liturgical_hour_instances')
        .select('*')
        .eq('liturgical_day_id', day.id)
        .order('sort_order');

    if (hoursError) {
        throw hoursError;
    }

    return {
        ...day,
        hours,
    };
}

export async function getCalendarConflict(
    date: string,
    baseCalendarId: string,
    comparisonCalendarId: string,
) {
    const { data, error } = await requireSupabase()
        .from('calendar_conflicts')
        .select('*')
        .eq('date', date)
        .eq('base_calendar_id', baseCalendarId)
        .eq('comparison_calendar_id', comparisonCalendarId)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}
