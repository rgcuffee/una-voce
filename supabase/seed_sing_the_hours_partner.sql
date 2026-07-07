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
    'sing-the-hours',
    'Sing the Hours',
    'Daily chanted Liturgy of the Hours videos from Sing the Hours, including Lauds and Vespers.',
    'https://singthehours.org/',
    'US',
    'America/Los_Angeles',
    true,
    'pending',
    'curated',
    'Seeded from public YouTube channel request',
    'Public partner seed created from the Sing the Hours YouTube channel. Keep account pending until the source and partnership details are reviewed.',
    true,
    false,
    'sing-the-hours'
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
  insert into public.partner_youtube_feeds (
    partner_id,
    type,
    youtube_channel_id,
    rss_url,
    expected_content_mode,
    polling_interval_minutes,
    import_from_date,
    active
  )
  select
    partner.id,
    'channel',
    'UCPfmxPAYNK00-jp4JB1qhqg',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCPfmxPAYNK00-jp4JB1qhqg',
    'pre_recorded',
    120,
    current_date,
    true
  from partner
  on conflict (rss_url) do update
    set partner_id = excluded.partner_id,
        type = excluded.type,
        youtube_channel_id = excluded.youtube_channel_id,
        youtube_playlist_id = null,
        expected_content_mode = excluded.expected_content_mode,
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
      'Lauds',
      array['Lauds', 'Morning Catholic Prayer', 'Morning Prayer']::text[],
      array['Shorts']::text[],
      'lauds',
      220,
      'pending'
    ),
    (
      'Vespers',
      array['Vespers', 'Evening Catholic Prayer', 'Evening Prayer']::text[],
      array['Shorts']::text[],
      'vespers',
      210,
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
