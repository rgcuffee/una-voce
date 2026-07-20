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
    'padre-ruben-dario-garcia',
    'Padre Ruben Dario Garcia',
    'Spanish-language Liturgy of the Hours videos from Padre Ruben Dario Garcia, including Lauds and Compline.',
    'https://www.youtube.com/@padrerubendariogarcia1513',
    null,
    'UTC',
    true,
    'pending',
    'partner',
    'Seeded from public YouTube channel request',
    'Public partner seed created from the Padre Ruben Dario Garcia Jesus Eucaristia YouTube channel. Keep account pending until the source and partnership details are reviewed.',
    false,
    false,
    'padre-ruben-dario-garcia'
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
    'UCH_7yMvvSYOhpbpVOOEz7vw',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCH_7yMvvSYOhpbpVOOEz7vw',
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
  'es',
  rule.priority,
  rule.default_display_status::public.youtube_video_display_status,
  true
from partner
cross join feed
cross join (
  values
    (
      'Lauds and Morning Prayer',
      array['Lauds', 'Morning', 'Laudes', 'Mañana', 'Manana']::text[],
      array[]::text[],
      'lauds',
      220,
      'approved'
    ),
    (
      'Compline and Night Prayer',
      array['Compline', 'Night', 'Completas', 'Noche']::text[],
      array[]::text[],
      'compline',
      210,
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
