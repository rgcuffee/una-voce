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
    | 'commemoration'
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
export type ObligationStatus =
    | 'none'
    | 'sunday'
    | 'holy_day'
    | 'transferred'
    | 'suppressed'
    | 'particular_law';
export type LiturgicalHour =
    | 'office_of_readings'
    | 'lauds'
    | 'midday_prayer'
    | 'vespers'
    | 'compline';
export type CalendarConflictSeverity = 'none' | 'minor' | 'major';
export type CalendarConflictReason =
    | 'same'
    | 'missing_base_day'
    | 'missing_comparison_day'
    | 'missing_canonical_identity'
    | 'missing_precedence'
    | 'different_principal_celebration'
    | 'different_title'
    | 'different_rank'
    | 'different_color'
    | 'different_holy_day_obligation'
    | 'different_obligation'
    | 'different_options'
    | 'country_specific'
    | 'manual_review';
export type CalendarReviewSeverity = 'low' | 'medium' | 'high';
export type CalendarReviewStatus = 'open' | 'resolved' | 'ignored';
export type PrayerAnalyticsEventName =
    | 'app_opened'
    | 'page_viewed'
    | 'navigation_clicked'
    | 'community_page_viewed'
    | 'community_outbound_clicked'
    | 'content_card_viewed'
    | 'content_card_clicked'
    | 'prayer_session_started'
    | 'prayer_play_started'
    | 'prayer_play_paused'
    | 'prayer_play_resumed'
    | 'prayer_progress'
    | 'prayer_completed'
    | 'prayer_session_ended'
    | 'source_opened'
    | 'platform_opened'
    | 'share_clicked'
    | 'search_performed'
    | 'filter_changed'
    | 'utm_landing_recorded';
export type PartnerOnboardingStatus = 'pending' | 'active' | 'archived';
export type PartnerRelationshipStatus = 'curated' | 'verified' | 'partner';
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
                    relationship_status: PartnerRelationshipStatus;
                    relationship_status_updated_at: string;
                    verified_at: string | null;
                    partnered_at: string | null;
                    consent_notes: string | null;
                    consent_source: string | null;
                    badge_enabled: boolean;
                    community_page_enabled: boolean;
                    community_page_slug: string | null;
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
                    relationship_status?: PartnerRelationshipStatus;
                    relationship_status_updated_at?: string;
                    verified_at?: string | null;
                    partnered_at?: string | null;
                    consent_notes?: string | null;
                    consent_source?: string | null;
                    badge_enabled?: boolean;
                    community_page_enabled?: boolean;
                    community_page_slug?: string | null;
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
                    relationship_status?: PartnerRelationshipStatus;
                    relationship_status_updated_at?: string;
                    verified_at?: string | null;
                    partnered_at?: string | null;
                    consent_notes?: string | null;
                    consent_source?: string | null;
                    badge_enabled?: boolean;
                    community_page_enabled?: boolean;
                    community_page_slug?: string | null;
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
                    poll_once: boolean;
                    default_available_liturgical_seasons: LiturgicalSeason[];
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
                    poll_once?: boolean;
                    default_available_liturgical_seasons?: LiturgicalSeason[];
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
                    poll_once?: boolean;
                    default_available_liturgical_seasons?: LiturgicalSeason[];
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
            partner_spotify_feeds: {
                Row: {
                    id: string;
                    partner_id: string;
                    spotify_show_id: string;
                    show_url: string;
                    embed_url: string;
                    rss_url: string | null;
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
                    spotify_show_id: string;
                    show_url: string;
                    embed_url: string;
                    rss_url?: string | null;
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
                    spotify_show_id?: string;
                    show_url?: string;
                    embed_url?: string;
                    rss_url?: string | null;
                    polling_interval_minutes?: number;
                    import_from_date?: string | null;
                    active?: boolean;
                    last_polled_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'partner_spotify_feeds_partner_id_fkey';
                        columns: ['partner_id'];
                        isOneToOne: false;
                        referencedRelation: 'partners';
                        referencedColumns: ['id'];
                    },
                ];
            };
            partner_apple_podcast_feeds: {
                Row: {
                    id: string;
                    partner_id: string;
                    apple_podcast_id: string;
                    show_url: string;
                    embed_url: string;
                    rss_url: string | null;
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
                    apple_podcast_id: string;
                    show_url: string;
                    embed_url: string;
                    rss_url?: string | null;
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
                    apple_podcast_id?: string;
                    show_url?: string;
                    embed_url?: string;
                    rss_url?: string | null;
                    polling_interval_minutes?: number;
                    import_from_date?: string | null;
                    active?: boolean;
                    last_polled_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'partner_apple_podcast_feeds_partner_id_fkey';
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
                    default_available_liturgical_seasons: LiturgicalSeason[];
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
                    default_available_liturgical_seasons?: LiturgicalSeason[];
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
                    default_available_liturgical_seasons?: LiturgicalSeason[];
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
                    prayer_date: string | null;
                    scheduled_start_at: string | null;
                    thumbnail_url: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type: LiturgicalHour | null;
                    video_kind: PrayerVideoKind;
                    display_status: YoutubeVideoDisplayStatus;
                    available_liturgical_seasons: LiturgicalSeason[];
                    available_weekdays: number[];
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
                    prayer_date?: string | null;
                    scheduled_start_at?: string | null;
                    thumbnail_url?: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type?: LiturgicalHour | null;
                    video_kind?: PrayerVideoKind;
                    display_status?: YoutubeVideoDisplayStatus;
                    available_liturgical_seasons?: LiturgicalSeason[];
                    available_weekdays?: number[];
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
                    prayer_date?: string | null;
                    scheduled_start_at?: string | null;
                    thumbnail_url?: string | null;
                    canonical_url?: string;
                    embed_url?: string;
                    prayer_type?: LiturgicalHour | null;
                    video_kind?: PrayerVideoKind;
                    display_status?: YoutubeVideoDisplayStatus;
                    available_liturgical_seasons?: LiturgicalSeason[];
                    available_weekdays?: number[];
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
            spotify_episodes: {
                Row: {
                    id: string;
                    partner_id: string;
                    feed_id: string;
                    spotify_episode_id: string | null;
                    guid: string;
                    title: string;
                    description: string | null;
                    published_at: string;
                    prayer_date: string | null;
                    duration_seconds: number | null;
                    image_url: string | null;
                    audio_url: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type: LiturgicalHour | null;
                    display_status: YoutubeVideoDisplayStatus;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    partner_id: string;
                    feed_id: string;
                    spotify_episode_id?: string | null;
                    guid: string;
                    title: string;
                    description?: string | null;
                    published_at: string;
                    prayer_date?: string | null;
                    duration_seconds?: number | null;
                    image_url?: string | null;
                    audio_url?: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type?: LiturgicalHour | null;
                    display_status?: YoutubeVideoDisplayStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    partner_id?: string;
                    feed_id?: string;
                    spotify_episode_id?: string | null;
                    guid?: string;
                    title?: string;
                    description?: string | null;
                    published_at?: string;
                    prayer_date?: string | null;
                    duration_seconds?: number | null;
                    image_url?: string | null;
                    audio_url?: string | null;
                    canonical_url?: string;
                    embed_url?: string;
                    prayer_type?: LiturgicalHour | null;
                    display_status?: YoutubeVideoDisplayStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'spotify_episodes_partner_id_fkey';
                        columns: ['partner_id'];
                        isOneToOne: false;
                        referencedRelation: 'partners';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'spotify_episodes_feed_id_fkey';
                        columns: ['feed_id'];
                        isOneToOne: false;
                        referencedRelation: 'partner_spotify_feeds';
                        referencedColumns: ['id'];
                    },
                ];
            };
            apple_podcast_episodes: {
                Row: {
                    id: string;
                    partner_id: string;
                    feed_id: string;
                    apple_episode_id: string | null;
                    guid: string;
                    title: string;
                    description: string | null;
                    published_at: string;
                    prayer_date: string | null;
                    duration_seconds: number | null;
                    image_url: string | null;
                    audio_url: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type: LiturgicalHour | null;
                    display_status: YoutubeVideoDisplayStatus;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    partner_id: string;
                    feed_id: string;
                    apple_episode_id?: string | null;
                    guid: string;
                    title: string;
                    description?: string | null;
                    published_at: string;
                    prayer_date?: string | null;
                    duration_seconds?: number | null;
                    image_url?: string | null;
                    audio_url?: string | null;
                    canonical_url: string;
                    embed_url: string;
                    prayer_type?: LiturgicalHour | null;
                    display_status?: YoutubeVideoDisplayStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    partner_id?: string;
                    feed_id?: string;
                    apple_episode_id?: string | null;
                    guid?: string;
                    title?: string;
                    description?: string | null;
                    published_at?: string;
                    prayer_date?: string | null;
                    duration_seconds?: number | null;
                    image_url?: string | null;
                    audio_url?: string | null;
                    canonical_url?: string;
                    embed_url?: string;
                    prayer_type?: LiturgicalHour | null;
                    display_status?: YoutubeVideoDisplayStatus;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'apple_podcast_episodes_partner_id_fkey';
                        columns: ['partner_id'];
                        isOneToOne: false;
                        referencedRelation: 'partners';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'apple_podcast_episodes_feed_id_fkey';
                        columns: ['feed_id'];
                        isOneToOne: false;
                        referencedRelation: 'partner_apple_podcast_feeds';
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
                    page_path: string | null;
                    page_context: string | null;
                    referrer: string | null;
                    utm_source: string | null;
                    utm_medium: string | null;
                    utm_campaign: string | null;
                    utm_content: string | null;
                    device_class: string | null;
                    partner_id: string | null;
                    community_slug: string | null;
                    content_id: string | null;
                    content_type: string | null;
                    provider: string | null;
                    source_url: string | null;
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
                    page_path?: string | null;
                    page_context?: string | null;
                    referrer?: string | null;
                    utm_source?: string | null;
                    utm_medium?: string | null;
                    utm_campaign?: string | null;
                    utm_content?: string | null;
                    device_class?: string | null;
                    partner_id?: string | null;
                    community_slug?: string | null;
                    content_id?: string | null;
                    content_type?: string | null;
                    provider?: string | null;
                    source_url?: string | null;
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
                    page_path?: string | null;
                    page_context?: string | null;
                    referrer?: string | null;
                    utm_source?: string | null;
                    utm_medium?: string | null;
                    utm_campaign?: string | null;
                    utm_content?: string | null;
                    device_class?: string | null;
                    partner_id?: string | null;
                    community_slug?: string | null;
                    content_id?: string | null;
                    content_type?: string | null;
                    provider?: string | null;
                    source_url?: string | null;
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
            canonical_celebrations: {
                Row: {
                    id: string;
                    default_title: string;
                    category: string;
                    is_universal: boolean;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    default_title: string;
                    category: string;
                    is_universal?: boolean;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    default_title?: string;
                    category?: string;
                    is_universal?: boolean;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [];
            };
            celebration_aliases: {
                Row: {
                    id: string;
                    canonical_celebration_id: string;
                    calendar_id: string | null;
                    source_celebration_id: string;
                    source_title: string;
                    match_confidence: number;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    canonical_celebration_id: string;
                    calendar_id?: string | null;
                    source_celebration_id: string;
                    source_title: string;
                    match_confidence?: number;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    canonical_celebration_id?: string;
                    calendar_id?: string | null;
                    source_celebration_id?: string;
                    source_title?: string;
                    match_confidence?: number;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'celebration_aliases_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'celebration_aliases_canonical_celebration_id_fkey';
                        columns: ['canonical_celebration_id'];
                        isOneToOne: false;
                        referencedRelation: 'canonical_celebrations';
                        referencedColumns: ['id'];
                    },
                ];
            };
            calendar_review_items: {
                Row: {
                    id: string;
                    issue_key: string;
                    calendar_id: string;
                    date: string | null;
                    source_table: string;
                    source_row_id: string | null;
                    source_celebration_id: string | null;
                    source_title: string | null;
                    issue_type: string;
                    severity: CalendarReviewSeverity;
                    status: CalendarReviewStatus;
                    suggested_canonical_celebration_id: string | null;
                    details: Json;
                    notes: string | null;
                    detected_at: string;
                    resolved_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    issue_key: string;
                    calendar_id: string;
                    date?: string | null;
                    source_table: string;
                    source_row_id?: string | null;
                    source_celebration_id?: string | null;
                    source_title?: string | null;
                    issue_type: string;
                    severity?: CalendarReviewSeverity;
                    status?: CalendarReviewStatus;
                    suggested_canonical_celebration_id?: string | null;
                    details?: Json;
                    notes?: string | null;
                    detected_at?: string;
                    resolved_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    issue_key?: string;
                    calendar_id?: string;
                    date?: string | null;
                    source_table?: string;
                    source_row_id?: string | null;
                    source_celebration_id?: string | null;
                    source_title?: string | null;
                    issue_type?: string;
                    severity?: CalendarReviewSeverity;
                    status?: CalendarReviewStatus;
                    suggested_canonical_celebration_id?: string | null;
                    details?: Json;
                    notes?: string | null;
                    detected_at?: string;
                    resolved_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'calendar_review_items_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'calendar_review_items_suggested_canonical_celebration_id_fkey';
                        columns: ['suggested_canonical_celebration_id'];
                        isOneToOne: false;
                        referencedRelation: 'canonical_celebrations';
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
                    weekday: number;
                    weekday_name: string;
                    celebration_id: string;
                    title: string;
                    display_title: string;
                    season: LiturgicalSeason;
                    season_week: number | null;
                    psalter_week: 1 | 2 | 3 | 4 | null;
                    rank: LiturgicalRank;
                    color: LiturgicalColor | null;
                    country_scope: CountryScope | null;
                    obligation_status: ObligationStatus;
                    canonical_celebration_id: string | null;
                    precedence_rank: number | null;
                    precedence_category: string | null;
                    source_id: string;
                    raw_source_text: string | null;
                    parser_notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    calendar_id: string;
                    date: string;
                    weekday: number;
                    weekday_name: string;
                    celebration_id: string;
                    title: string;
                    display_title: string;
                    season: LiturgicalSeason;
                    season_week?: number | null;
                    psalter_week?: 1 | 2 | 3 | 4 | null;
                    rank: LiturgicalRank;
                    color?: LiturgicalColor | null;
                    country_scope?: CountryScope | null;
                    obligation_status?: ObligationStatus;
                    canonical_celebration_id?: string | null;
                    precedence_rank?: number | null;
                    precedence_category?: string | null;
                    source_id: string;
                    raw_source_text?: string | null;
                    parser_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    calendar_id?: string;
                    date?: string;
                    weekday?: number;
                    weekday_name?: string;
                    celebration_id?: string;
                    title?: string;
                    display_title?: string;
                    season?: LiturgicalSeason;
                    season_week?: number | null;
                    psalter_week?: 1 | 2 | 3 | 4 | null;
                    rank?: LiturgicalRank;
                    color?: LiturgicalColor | null;
                    country_scope?: CountryScope | null;
                    obligation_status?: ObligationStatus;
                    canonical_celebration_id?: string | null;
                    precedence_rank?: number | null;
                    precedence_category?: string | null;
                    source_id?: string;
                    raw_source_text?: string | null;
                    parser_notes?: string | null;
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
                    {
                        foreignKeyName: 'liturgical_days_canonical_celebration_id_fkey';
                        columns: ['canonical_celebration_id'];
                        isOneToOne: false;
                        referencedRelation: 'canonical_celebrations';
                        referencedColumns: ['id'];
                    },
                ];
            };
            liturgical_day_options: {
                Row: {
                    id: string;
                    calendar_id: string;
                    date: string;
                    celebration_id: string;
                    title: string;
                    rank: LiturgicalRank | null;
                    color: LiturgicalColor | null;
                    country_scope: CountryScope | null;
                    canonical_celebration_id: string | null;
                    precedence_rank: number | null;
                    precedence_category: string | null;
                    source_id: string | null;
                    raw_source_text: string | null;
                    raw_option_text: string | null;
                    parser_notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    calendar_id: string;
                    date: string;
                    celebration_id: string;
                    title: string;
                    rank?: LiturgicalRank | null;
                    color?: LiturgicalColor | null;
                    country_scope?: CountryScope | null;
                    canonical_celebration_id?: string | null;
                    precedence_rank?: number | null;
                    precedence_category?: string | null;
                    source_id?: string | null;
                    raw_source_text?: string | null;
                    raw_option_text?: string | null;
                    parser_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    calendar_id?: string;
                    date?: string;
                    celebration_id?: string;
                    title?: string;
                    rank?: LiturgicalRank | null;
                    color?: LiturgicalColor | null;
                    country_scope?: CountryScope | null;
                    canonical_celebration_id?: string | null;
                    precedence_rank?: number | null;
                    precedence_category?: string | null;
                    source_id?: string | null;
                    raw_source_text?: string | null;
                    raw_option_text?: string | null;
                    parser_notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'liturgical_day_options_calendar_id_fkey';
                        columns: ['calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'liturgical_day_options_source_id_fkey';
                        columns: ['source_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendar_sources';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'liturgical_day_options_canonical_celebration_id_fkey';
                        columns: ['canonical_celebration_id'];
                        isOneToOne: false;
                        referencedRelation: 'canonical_celebrations';
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
            calendar_conflict_runs: {
                Row: {
                    id: string;
                    base_calendar_id: string;
                    comparison_calendar_id: string;
                    start_date: string;
                    end_date: string;
                    compared_date_count: number;
                    conflict_count: number;
                    include_none: boolean;
                    generator: string;
                    status: string;
                    details: Json;
                    started_at: string;
                    completed_at: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    base_calendar_id: string;
                    comparison_calendar_id: string;
                    start_date: string;
                    end_date: string;
                    compared_date_count?: number;
                    conflict_count?: number;
                    include_none?: boolean;
                    generator?: string;
                    status?: string;
                    details?: Json;
                    started_at?: string;
                    completed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    base_calendar_id?: string;
                    comparison_calendar_id?: string;
                    start_date?: string;
                    end_date?: string;
                    compared_date_count?: number;
                    conflict_count?: number;
                    include_none?: boolean;
                    generator?: string;
                    status?: string;
                    details?: Json;
                    started_at?: string;
                    completed_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'calendar_conflict_runs_base_calendar_id_fkey';
                        columns: ['base_calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'calendar_conflict_runs_comparison_calendar_id_fkey';
                        columns: ['comparison_calendar_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendars';
                        referencedColumns: ['id'];
                    },
                ];
            };
            calendar_conflicts: {
                Row: {
                    id: string;
                    run_id: string | null;
                    date: string;
                    base_calendar_id: string;
                    comparison_calendar_id: string;
                    base_liturgical_day_id: string | null;
                    comparison_liturgical_day_id: string | null;
                    severity: CalendarConflictSeverity;
                    reason: CalendarConflictReason;
                    base_display: string;
                    comparison_display: string;
                    should_show_warning: boolean;
                    details: Json;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    run_id?: string | null;
                    date: string;
                    base_calendar_id: string;
                    comparison_calendar_id: string;
                    base_liturgical_day_id?: string | null;
                    comparison_liturgical_day_id?: string | null;
                    severity: CalendarConflictSeverity;
                    reason: CalendarConflictReason;
                    base_display: string;
                    comparison_display: string;
                    should_show_warning?: boolean;
                    details?: Json;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    run_id?: string | null;
                    date?: string;
                    base_calendar_id?: string;
                    comparison_calendar_id?: string;
                    base_liturgical_day_id?: string | null;
                    comparison_liturgical_day_id?: string | null;
                    severity?: CalendarConflictSeverity;
                    reason?: CalendarConflictReason;
                    base_display?: string;
                    comparison_display?: string;
                    should_show_warning?: boolean;
                    details?: Json;
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
                    {
                        foreignKeyName: 'calendar_conflicts_run_id_fkey';
                        columns: ['run_id'];
                        isOneToOne: false;
                        referencedRelation: 'calendar_conflict_runs';
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
            partner_relationship_status: PartnerRelationshipStatus;
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
