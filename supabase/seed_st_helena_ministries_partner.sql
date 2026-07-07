with partner as (
  insert into public.partners (
    slug,
    name,
    description,
    website,
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
    'st-helena-ministries',
    'St Helena Ministries',
    'Daily Prayer with the Divine Office from St Helena Ministries, including Lauds, Vespers, Compline, and the Office of Readings.',
    'https://sthelenaministries.com/office-of-readings-podcast/',
    'US',
    'America/New_York',
    true,
    'pending',
    'curated',
    'Seeded from public Spotify show request',
    'Public Spotify show seed created from Daily Prayer with the Divine Office. Keep account pending until the source is reviewed.',
    false,
    false,
    null
  )
  on conflict (slug) do update
    set name = excluded.name,
        description = excluded.description,
        website = excluded.website,
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
  insert into public.partner_spotify_feeds (
    partner_id,
    spotify_show_id,
    show_url,
    embed_url,
    rss_url,
    polling_interval_minutes,
    import_from_date,
    active
  )
  select
    partner.id,
    '70YjmFQpK2AWFJ0UNeTXGE',
    'https://open.spotify.com/show/70YjmFQpK2AWFJ0UNeTXGE',
    'https://open.spotify.com/embed/show/70YjmFQpK2AWFJ0UNeTXGE',
    'https://anchor.fm/s/7545aa7c/podcast/rss',
    120,
    current_date - 1,
    true
  from partner
  on conflict (spotify_show_id) do update
    set partner_id = excluded.partner_id,
        show_url = excluded.show_url,
        embed_url = excluded.embed_url,
        rss_url = excluded.rss_url,
        polling_interval_minutes = excluded.polling_interval_minutes,
        import_from_date = excluded.import_from_date,
        active = excluded.active
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
  active
)
select
  partner.id,
  rule.name,
  rule.include_keywords,
  rule.exclude_keywords,
  rule.prayer_type::public.liturgical_hour,
  'en',
  rule.priority,
  rule.default_display_status::public.youtube_video_display_status,
  true
from partner
cross join feed
cross join (
  values
    (
      'Hide trailers',
      array[]::text[],
      array['Trailer']::text[],
      null,
      400,
      'hidden'
    ),
    (
      'Office of Readings',
      array['Office of Readings', 'Office of Reading', 'Matins', 'Vigils']::text[],
      array[]::text[],
      'office_of_readings',
      300,
      'pending'
    ),
    (
      'Lauds',
      array['Lauds', 'Morning Prayer']::text[],
      array[]::text[],
      'lauds',
      290,
      'pending'
    ),
    (
      'Vespers',
      array['Vespers', 'Evening Prayer']::text[],
      array[]::text[],
      'vespers',
      280,
      'pending'
    ),
    (
      'Compline',
      array['Compline', 'Night Prayer']::text[],
      array[]::text[],
      'compline',
      270,
      'pending'
    )
) as rule(
  name,
  include_keywords,
  exclude_keywords,
  prayer_type,
  priority,
  default_display_status
)
on conflict (partner_id, name) do update
  set include_keywords = excluded.include_keywords,
      exclude_keywords = excluded.exclude_keywords,
      prayer_type = excluded.prayer_type,
      preferred_language = excluded.preferred_language,
      priority = excluded.priority,
      default_display_status = excluded.default_display_status,
      active = excluded.active;
