with partner as (
  insert into public.partners (
    slug,
    name,
    description,
    website,
    logo_url,
    country,
    timezone,
    active,
    onboarding_status,
    relationship_status,
    consent_source,
    consent_notes,
    badge_enabled,
    community_page_enabled,
    community_page_slug
  )
  values (
    'word-on-fire',
    'Word on Fire',
    'Curated Night Prayer videos from Word on Fire for Ordinary Time, led by Bishop Robert Barron.',
    'https://www.wordonfire.org/pray/',
    'https://yt3.googleusercontent.com/yjqfvu6ZX2QWSqczNIi3sbN6224_O62eAFob7uLgomGEVG6es2Tc3i_RNjAa4TbJfrceWuHw8Q=s900-c-k-c0x00ffffff-no-rj',
    'US',
    'America/Los_Angeles',
    true,
    'active',
    'curated',
    'Seeded from public YouTube playlist request',
    'Public curated seed for the Word on Fire Night Prayer playlist led by Bishop Robert Barron. Import once and automatically approve matching Compline videos.',
    true,
    true,
    'word-on-fire'
  )
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        website = excluded.website,
        logo_url = excluded.logo_url,
        country = excluded.country,
        timezone = excluded.timezone,
        active = excluded.active,
        onboarding_status = excluded.onboarding_status,
        relationship_status = excluded.relationship_status,
        verified_at = null,
        partnered_at = null,
        consent_source = excluded.consent_source,
        consent_notes = excluded.consent_notes,
        badge_enabled = excluded.badge_enabled,
        community_page_enabled = excluded.community_page_enabled,
        community_page_slug = excluded.community_page_slug
  returning id
),
feed as (
  insert into public.partner_youtube_feeds (
    partner_id,
    type,
    youtube_channel_id,
    youtube_playlist_id,
    rss_url,
    expected_content_mode,
    polling_interval_minutes,
    import_from_date,
    poll_once,
    default_available_liturgical_seasons,
    active
  )
  select
    partner.id,
    'playlist',
    'UCcMjLgeWNwqL2LBGS-iPb1A',
    'PLg6k5UmSDlcjmNXrGitfEfieONIIgXen6',
    'https://www.youtube.com/feeds/videos.xml?playlist_id=PLg6k5UmSDlcjmNXrGitfEfieONIIgXen6',
    'pre_recorded',
    525600,
    null,
    true,
    array['ordinary_time']::public.liturgical_season[],
    true
  from partner
  on conflict (rss_url) do update
    set partner_id = excluded.partner_id,
        type = excluded.type,
        youtube_channel_id = excluded.youtube_channel_id,
        youtube_playlist_id = excluded.youtube_playlist_id,
        expected_content_mode = excluded.expected_content_mode,
        polling_interval_minutes = excluded.polling_interval_minutes,
        import_from_date = excluded.import_from_date,
        poll_once = excluded.poll_once,
        default_available_liturgical_seasons = excluded.default_available_liturgical_seasons,
        active = case
          when public.partner_youtube_feeds.last_polled_at is null then excluded.active
          else false
        end
  returning id
)
insert into public.partner_classification_rules (
  partner_id,
  name,
  include_keywords,
  exclude_keywords,
  prayer_type,
  preferred_language,
  priority,
  default_display_status,
  default_available_liturgical_seasons,
  active
)
select
  partner.id,
  'Ordinary Time Night Prayer',
  array['Night Prayer', 'Liturgy of the Hours']::text[],
  array['Shorts']::text[],
  'compline'::public.liturgical_hour,
  'en',
  260,
  'approved'::public.youtube_video_display_status,
  array['ordinary_time']::public.liturgical_season[],
  true
from partner
cross join feed
on conflict (partner_id, name) do update
  set include_keywords = excluded.include_keywords,
      exclude_keywords = excluded.exclude_keywords,
      prayer_type = excluded.prayer_type,
      preferred_language = excluded.preferred_language,
      priority = excluded.priority,
      default_display_status = excluded.default_display_status,
      default_available_liturgical_seasons = excluded.default_available_liturgical_seasons,
      active = excluded.active;
