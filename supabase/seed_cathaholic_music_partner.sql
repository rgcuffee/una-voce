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
    verified_at,
    consent_source,
    consent_notes,
    badge_enabled,
    community_page_enabled,
    community_page_slug
  )
  values (
    'cathaholic-music',
    'Cathaholic Music',
    'Daily Liturgy of the Hours and Catholic music resources from Cathaholic Music.',
    'https://cathaholicmusic.org',
    'AU',
    'Australia/Sydney',
    true,
    'active',
    'verified',
    current_timestamp,
    'Seeded from Una Voce partner configuration',
    'Public badge seed: Verified — ministry has reviewed or claimed its page.',
    true,
    true,
    'cathaholic-music'
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
        verified_at = coalesce(public.partners.verified_at, excluded.verified_at),
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
    'UCP5XkSkU2UDKWL4CFNMDQEA',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCP5XkSkU2UDKWL4CFNMDQEA',
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
      'Morning Prayer and Lauds',
      array['Morning Prayer', 'Lauds']::text[],
      array[]::text[],
      'lauds',
      200,
      'approved'
    ),
    (
      'Evening Prayer and Vespers',
      array['Evening Prayer', 'Vespers']::text[],
      array[]::text[],
      'vespers',
      190,
      'approved'
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
