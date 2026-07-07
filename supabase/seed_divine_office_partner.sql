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
    'divine-office',
    'Divine Office',
    'Audio Liturgy of the Hours from DivineOffice.org, including Office of Readings, Lauds, Daytime Prayer, Vespers, and Compline.',
    'https://divineoffice.org/',
    'US',
    'America/Los_Angeles',
    true,
    'pending',
    'partner',
    'Seeded from public Apple Podcasts show request',
    'Public Apple Podcasts seed created from Divine Office - Liturgy of the Hours. Keep account and community page pending until partnership details are reviewed.',
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
  insert into public.partner_apple_podcast_feeds (
    partner_id,
    apple_podcast_id,
    show_url,
    embed_url,
    rss_url,
    polling_interval_minutes,
    import_from_date,
    active
  )
  select
    partner.id,
    '1615786349',
    'https://podcasts.apple.com/us/podcast/divine-office-liturgy-of-the-hours-of-the/id1615786349',
    'https://embed.podcasts.apple.com/us/podcast/divine-office-liturgy-of-the-hours-of-the/id1615786349',
    'https://divineoffice.org/feed/podcast/',
    120,
    current_date - 1,
    true
  from partner
  on conflict (apple_podcast_id) do update
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
      'Hide non-office announcements',
      array[]::text[],
      array['Announce', 'Announcement', 'Race to the Finish']::text[],
      null,
      500,
      'hidden'
    ),
    (
      'Office of Readings',
      array['Office of Readings', 'Office of Reading']::text[],
      array[]::text[],
      'office_of_readings',
      400,
      'pending'
    ),
    (
      'Lauds',
      array['Morning Prayer', 'Lauds']::text[],
      array[]::text[],
      'lauds',
      390,
      'pending'
    ),
    (
      'Daytime Prayer',
      array['Midmorning Prayer', 'Midday Prayer', 'Midafternoon Prayer', 'Daytime Prayer', 'Sext', 'None', 'Terce']::text[],
      array[]::text[],
      'midday_prayer',
      380,
      'pending'
    ),
    (
      'Vespers',
      array['Evening Prayer', 'Vespers']::text[],
      array[]::text[],
      'vespers',
      370,
      'pending'
    ),
    (
      'Compline',
      array['Night Prayer', 'Compline']::text[],
      array[]::text[],
      'compline',
      360,
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
