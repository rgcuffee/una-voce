export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export type CalendarSourceType = 'pdf' | 'html_month_page' | 'manual_override';
export type LiturgicalSeason =
    | 'advent'
    | 'christmas'
    | 'ordinary_time'
    | 'lent'
    | 'triduum'
    | 'easter';
export type LiturgicalRank =
    | 'weekday'
    | 'optional_memorial'
    | 'memorial'
    | 'feast'
    | 'solemnity'
    | 'sunday';
export type LiturgicalColor =
    | 'green'
    | 'white'
    | 'red'
    | 'violet'
    | 'rose'
    | 'black';
export type CountryScope = 'US' | 'EW' | 'E' | 'W';
export type LiturgicalHour =
    | 'office_of_readings'
    | 'lauds'
    | 'midday_prayer'
    | 'vespers'
    | 'compline';
export type CalendarConflictSeverity = 'none' | 'minor' | 'major';
export type CalendarConflictReason =
    | 'same'
    | 'different_title'
    | 'different_rank'
    | 'different_color'
    | 'different_holy_day_obligation'
    | 'country_specific'
    | 'manual_review';
export type PrayerAnalyticsEventName =
    | 'prayer_session_started'
    | 'prayer_play_started'
    | 'prayer_play_paused'
    | 'prayer_play_resumed'
    | 'prayer_progress'
    | 'prayer_completed'
    | 'prayer_session_ended'
    | 'source_opened';
export type PartnerOnboardingStatus = 'pending' | 'active' | 'archived';
export type PartnerYoutubeFeedType = 'channel' | 'playlist';
export type PartnerYoutubeContentMode =
    | 'live'
    | 'scheduled_live'
    | 'pre_recorded'
    | 'mixed';
export type PrayerVideoKind =
    | 'video'
    | 'scheduled_live'
    | 'live'
    | 'premiere'
    | 'unknown';
export type YoutubeVideoDisplayStatus =
    | 'pending'
    | 'approved'
    | 'hidden'
    | 'expired';

export type Database = {
    public: {
        Tables: {
            partners: {
                Row: {
                    id: string;
                    slug: string;
                    name: string;
                    description: string | null;
                    website: string | null;
                    logo_url: string | null;
                    country: string | null;
                    timezone: string;
                    active: boolean;
                    onboarding_status: PartnerOnboardingStatus;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    slug: string;
                    name: string;
                    description?: string | null;
                    website?: string | null;
                    logo_url?: string | null;
                    country?: string | null;
                    timezone?: string;
                    active?: boolean;
                    onboarding_status?: PartnerOnboardingStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    slug?: string;
                    name?: string;
                    description?: string | null;
                    website?: string | null;
                    logo_url?: string | null;
                    country?: string | null;
                    timezone?: string;
                    active?: boolean;
                    onboarding_status?: PartnerOnboardingStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            partner_youtube_feeds: {
                Row: {
                    id: string;
                    partner_id: string;
                    type: PartnerYoutubeFeedType;
                    youtube_channel_id: string | null;
                    youtube_playlist_id: string | null;
                    rss_url: string;
                    expected_content_mode: PartnerYoutubeContentMode;
                    polling_interval_minutes: number;
                    import_from_date: string | null;
                    active: boolean;
                    last_polled_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    partner_id: string;
                    type: PartnerYoutubeFeedType;
                    youtube_channel_id?: string | null;
                    youtube_playlist_id?: string | null;
                    rss_url: string;
                    expected_content_mode?: PartnerYoutubeContentMode;
                    polling_interval_minutes?: number;
                    import_from_date?: string | null;
                    active?: boolean;
                    last_polled_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    partner_id?: string;
                    type?: PartnerYoutubeFeedType;
                    youtube_channel_id?: string | null;
                    youtube_playlist_id?: string | null;
                    rss_url?: string;
                    expected_content_mode?: PartnerYoutubeContentMode;
                    polling_interval_minutes?: number;
                    import_from_date?: string | null;
                    active?: boolean;
                    last_polled_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'partner_youtube_feeds_partner_id_fkey';
                        columns: ['partner_id'];
                        isOneToOne: false;
                        referencedRelation: 'partners';
                        referencedColumns: ['id'];
                    },
                ];
            };
            partner_classification_rules: {
                Row: {
                    id: string;
                    partner_id: string;
                    name: string;
                    include_keywords: string[];
                    exclude_keywords: string[];
                    prayer_type: LiturgicalHour | null;
                    preferred_language: string | null;
                    priority: number;
                    default_display_status: YoutubeVideoDisplayStatus;
                    active: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    partner_id: string;
                    name: string;
                    include_keywords?: string[];
                    exclude_keywords?: string[];
                    prayer_type?: LiturgicalHour | null;
                    preferred_language?: string | null;
                    priority?: number;
                    default_display_status?: YoutubeVideoDisplayStatus;
                    active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    partner_id?: string;
                    name?: string;
                    include_keywords?: string[];
                    exclude_keywords?: string[];
                    prayer_type?: LiturgicalHour | null;
                    preferred_language?: string | null;
                    priority?: number;
                    default_display_status?: YoutubeVideoDisplayStatus;
                    active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'partner_classification_rules_partner_id_fkey';
                        columns: ['partner_id'];
                        isOneToOne: false;
                        referencedRelation: 'partners';
                        referencedColumns: ['id'];
                    },
                ];
            };
            youtube_videos: {
                Row: {
                    id: string;
                    partner_id: string;
                    feed_id: string;
                    youtube_video_id: string;
                    title: string;
                    description: string | null;
                    published_at: string;
                    scheduled_start_at: string | null;
                    thumbnail_url: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type: LiturgicalHour | null;
                    video_kind: PrayerVideoKind;
                    display_status: YoutubeVideoDisplayStatus;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    partner_id: string;
                    feed_id: string;
                    youtube_video_id: string;
                    title: string;
                    description?: string | null;
                    published_at: string;
                    scheduled_start_at?: string | null;
                    thumbnail_url?: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type?: LiturgicalHour | null;
                    video_kind?: PrayerVideoKind;
                    display_status?: YoutubeVideoDisplayStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    partner_id?: string;
                    feed_id?: string;
                    youtube_video_id?: string;
                    title?: string;
                    description?: string | null;
                    published_at?: string;
                    scheduled_start_at?: string | null;
                    thumbnail_url?: string | null;
                    canonical_url?: string;
                    embed_url?: string;
                    prayer_type?: LiturgicalHour | null;
                    video_kind?: PrayerVideoKind;
                    display_status?: YoutubeVideoDisplayStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'youtube_videos_partner_id_fkey';
                        columns: ['partner_id'];
                        isOneToOne: false;
                        referencedRelation: 'partners';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'youtube_videos_feed_id_fkey';
                        columns: ['feed_id'];
                        isOneToOne: false;
                        referencedRelation: 'partner_youtube_feeds';
                        referencedColumns: ['id'];
                    },
                ];
            };
            analytics_events: {
                Row: {
                    id: string;
                    occurred_at: string;
                    session_id: string;
                    event_name: PrayerAnalyticsEventName;
                    prayer_id: string | null;
                    ministry_id: string | null;
                    hour: string | null;
                    locale: string;
                    user_id: string | null;
                    anonymous_id: string;
                    progress_percent: number | null;
                    playback_seconds: number | null;
                    metadata: Json;
                };
                Insert: {
                    id?: string;
                    occurred_at?: string;
                    session_id: string;
                    event_name: PrayerAnalyticsEventName;
                    prayer_id?: string | null;
                    ministry_id?: string | null;
                    hour?: string | null;
                    locale?: string;
                    user_id?: string | null;
                    anonymous_id: string;
                    progress_percent?: number | null;
                    playback_seconds?: number | null;
                    metadata?: Json;
                };
                Update: {
                    id?: string;
                    occurred_at?: string;
                    session_id?: string;
                    event_name?: PrayerAnalyticsEventName;
                    prayer_id?: string | null;
                    ministry_id?: string | null;
                    hour?: string | null;
                    locale?: string;
                    user_id?: string | null;
                    anonymous_id?: string;
                    progress_percent?: number | null;
                    playback_seconds?: number | null;
                    metadata?: Json;
                };
                Relationships: [];
            };
            analytics_sessions: {
                Row: {
                    session_id: string;
                    started_at: string;
                    ended_at: string | null;
                    active_play_seconds: number;
                    panel_open_seconds: number | null;
                    highest_progress: number;
                    completed: boolean;
                    opened_source: boolean;
                    ministry_id: string | null;
                    prayer_id: string | null;
                    hour: string | null;
                    locale: string;
                    user_id: string | null;
                    anonymous_id: string;
                    source_name: string | null;
                    source_type: string | null;
                    provider: string | null;
                    video_id: string | null;
                    page_context: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    session_id: string;
                    started_at: string;
                    ended_at?: string | null;
                    active_play_seconds?: number;
                    panel_open_seconds?: number | null;
                    highest_progress?: number;
                    completed?: boolean;
                    opened_source?: boolean;
                    ministry_id?: string | null;
                    prayer_id?: string | null;
                    hour?: string | null;
                    locale?: string;
                    user_id?: string | null;
                    anonymous_id: string;
                    source_name?: string | null;
                    source_type?: string | null;
                    provider?: string | null;
                    video_id?: string | null;
                    page_context?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    session_id?: string;
                    started_at?: string;
                    ended_at?: string | null;
                    active_play_seconds?: number;
                    panel_open_seconds?: number | null;
                    highest_progress?: number;
                    completed?: boolean;
                    opened_source?: boolean;
                    ministry_id?: string | null;
                    prayer_id?: string | null;
                    hour?: string | null;
                    locale?: string;
                    user_id?: string | null;
                    anonymous_id?: string;
                    source_name?: string | null;
                    source_type?: string | null;
                    provider?: string | null;
                    video_id?: string | null;
                    page_context?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            calendars: {
                Row: {
                    id: string;
                    name: string;
                    authority: string;
                    default_locale: string;
                    timezone: string | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    name: string;
                    authority: string;
                    default_locale: string;
                    timezone?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    authority?: string;
                    default_locale?: string;
                    timezone?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            calendar_sources: {
                Row: {
                    id: string;
                    calendar_id: string;
                    year: number;
                    source_type: CalendarSourceType;
                    title: string;
                    url: string;
                    retrieved_at: string;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    calendar_id: string;
                    year: number;
                    source_type: CalendarSourceType;
                    title: string;
                    url: string;
                    retrieved_at: string;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    calendar_id?: string;
                    year?: number;
                    source_type?: CalendarSourceType;
                    title?: string;
                    url?: string;
                    retrieved_at?: string;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'calendar_sources_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                ];
            };
            raw_calendar_rows: {
                Row: {
                    id: string;
                    calendar_id: string;
                    source_id: string;
                    date: string;
                    raw_title: string;
                    raw_rank: string | null;
                    raw_color: string | null;
                    raw_notes: string | null;
                    country_scope: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    calendar_id: string;
                    source_id: string;
                    date: string;
                    raw_title: string;
                    raw_rank?: string | null;
                    raw_color?: string | null;
                    raw_notes?: string | null;
                    country_scope?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    calendar_id?: string;
                    source_id?: string;
                    date?: string;
                    raw_title?: string;
                    raw_rank?: string | null;
                    raw_color?: string | null;
                    raw_notes?: string | null;
                    country_scope?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'raw_calendar_rows_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'raw_calendar_rows_source_id_fkey';
                        columns: ['source_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendar_sources';
                        referencedColumns: ['id'];
                    },
                ];
            };
            liturgical_days: {
                Row: {
                    id: string;
                    calendar_id: string;
                    date: string;
                    title: string;
                    display_title: string;
                    season: LiturgicalSeason;
                    season_week: number | null;
                    psalter_week: 1 | 2 | 3 | 4 | null;
                    rank: LiturgicalRank;
                    color: LiturgicalColor | null;
                    country_scope: CountryScope | null;
                    is_holy_day_of_obligation: boolean;
                    source_id: string;
                    raw_source_text: string | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    calendar_id: string;
                    date: string;
                    title: string;
                    display_title: string;
                    season: LiturgicalSeason;
                    season_week?: number | null;
                    psalter_week?: 1 | 2 | 3 | 4 | null;
                    rank: LiturgicalRank;
                    color?: LiturgicalColor | null;
                    country_scope?: CountryScope | null;
                    is_holy_day_of_obligation?: boolean;
                    source_id: string;
                    raw_source_text?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    calendar_id?: string;
                    date?: string;
                    title?: string;
                    display_title?: string;
                    season?: LiturgicalSeason;
                    season_week?: number | null;
                    psalter_week?: 1 | 2 | 3 | 4 | null;
                    rank?: LiturgicalRank;
                    color?: LiturgicalColor | null;
                    country_scope?: CountryScope | null;
                    is_holy_day_of_obligation?: boolean;
                    source_id?: string;
                    raw_source_text?: string | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'liturgical_days_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'liturgical_days_source_id_fkey';
                        columns: ['source_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendar_sources';
                        referencedColumns: ['id'];
                    },
                ];
            };
            liturgical_hour_instances: {
                Row: {
                    id: string;
                    liturgical_day_id: string;
                    calendar_id: string;
                    date: string;
                    hour: LiturgicalHour;
                    display_name: string;
                    latin_name: string | null;
                    sort_order: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    liturgical_day_id: string;
                    calendar_id: string;
                    date: string;
                    hour: LiturgicalHour;
                    display_name: string;
                    latin_name?: string | null;
                    sort_order: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    liturgical_day_id?: string;
                    calendar_id?: string;
                    date?: string;
                    hour?: LiturgicalHour;
                    display_name?: string;
                    latin_name?: string | null;
                    sort_order?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'liturgical_hour_instances_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'liturgical_hour_instances_liturgical_day_id_fkey';
                        columns: ['liturgical_day_id'];
                        isOneToOne: false;
                        referencedRelation: 'liturgical_days';
                        referencedColumns: ['id'];
                    },
                ];
            };
            calendar_conflicts: {
                Row: {
                    id: string;
                    date: string;
                    base_calendar_id: string;
                    comparison_calendar_id: string;
                    base_liturgical_day_id: string;
                    comparison_liturgical_day_id: string;
                    severity: CalendarConflictSeverity;
                    reason: CalendarConflictReason;
                    base_display: string;
                    comparison_display: string;
                    should_show_warning: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    date: string;
                    base_calendar_id: string;
                    comparison_calendar_id: string;
                    base_liturgical_day_id: string;
                    comparison_liturgical_day_id: string;
                    severity: CalendarConflictSeverity;
                    reason: CalendarConflictReason;
                    base_display: string;
                    comparison_display: string;
                    should_show_warning?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    date?: string;
                    base_calendar_id?: string;
                    comparison_calendar_id?: string;
                    base_liturgical_day_id?: string;
                    comparison_liturgical_day_id?: string;
                    severity?: CalendarConflictSeverity;
                    reason?: CalendarConflictReason;
                    base_display?: string;
                    comparison_display?: string;
                    should_show_warning?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'calendar_conflicts_base_calendar_id_fkey';
                        columns: ['base_calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'calendar_conflicts_comparison_calendar_id_fkey';
                        columns: ['comparison_calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'calendar_conflicts_base_liturgical_day_id_fkey';
                        columns: ['base_liturgical_day_id'];
                        isOneToOne: false;
                        referencedRelation: 'liturgical_days';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'calendar_conflicts_comparison_liturgical_day_id_fkey';
                        columns: ['comparison_liturgical_day_id'];
                        isOneToOne: false;
                        referencedRelation: 'liturgical_days';
                        referencedColumns: ['id'];
                    },
                ];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: {
            calendar_source_type: CalendarSourceType;
            liturgical_season: LiturgicalSeason;
            liturgical_rank: LiturgicalRank;
            liturgical_color: LiturgicalColor;
            country_scope: CountryScope;
            liturgical_hour: LiturgicalHour;
            calendar_conflict_severity: CalendarConflictSeverity;
            calendar_conflict_reason: CalendarConflictReason;
            prayer_analytics_event_name: PrayerAnalyticsEventName;
            partner_onboarding_status: PartnerOnboardingStatus;
            partner_youtube_feed_type: PartnerYoutubeFeedType;
            partner_youtube_content_mode: PartnerYoutubeContentMode;
            prayer_video_kind: PrayerVideoKind;
            youtube_video_display_status: YoutubeVideoDisplayStatus;
        };
        CompositeTypes: Record<string, never>;
    };
};

export type Tables<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Row'];

export type Inserts<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Insert'];

export type Updates<T extends keyof Database['public']['Tables']> =
    Database['public']['Tables'][T]['Update'];
