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
    'worth-abbey',
    'Worth Abbey',
    'Livestreamed prayer and liturgy from the Benedictine community at Worth Abbey.',
    'https://worthabbey.net',
    'GB',
    'Europe/London',
    true,
    'active',
    'verified',
    current_timestamp,
    'Seeded from Una Voce partner configuration',
    'Public badge seed: Verified — ministry has reviewed or claimed its page.',
    true,
    true,
    'worth-abbey'
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
        partnered_at = case
          when excluded.relationship_status = 'partner'
            then coalesce(public.partners.partnered_at, current_timestamp)
          else null
        end,
        consent_source = excluded.consent_source,
        consent_notes = excluded.consent_notes,
        badge_enabled = excluded.badge_enabled,
        community_page_enabled = excluded.community_page_enabled,
        community_page_slug = excluded.community_page_slug
  returning id
),
feeds as (
  insert into public.partner_youtube_feeds (
    partner_id,
    type,
    youtube_channel_id,
    youtube_playlist_id,
    rss_url,
    expected_content_mode,
    polling_interval_minutes,
    import_from_date,
    active
  )
  select
    partner.id,
    feed.type::public.partner_youtube_feed_type,
    feed.youtube_channel_id,
    feed.youtube_playlist_id,
    feed.rss_url,
    feed.expected_content_mode::public.partner_youtube_content_mode,
    feed.polling_interval_minutes,
    current_date,
    true
  from partner
  cross join (
    values
      (
        'channel',
        'UC6qobUSZqHUiFBLChENbExg',
        null,
        'https://www.youtube.com/feeds/videos.xml?channel_id=UC6qobUSZqHUiFBLChENbExg',
        'scheduled_live',
        30
      ),
      (
        'playlist',
        null,
        'PLKT-EuYiVIn8',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLKT-EuYiVIn8',
        'scheduled_live',
        15
      ),
      (
        'playlist',
        null,
        'PLeuAWp_1Rbow',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLeuAWp_1Rbow',
        'scheduled_live',
        15
      ),
      (
        'playlist',
        null,
        'PLeEBUcHTKRkM',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLeEBUcHTKRkM',
        'scheduled_live',
        15
      ),
      (
        'playlist',
        null,
        'PLeezuYzAC08E',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLeezuYzAC08E',
        'scheduled_live',
        15
      ),
      (
        'playlist',
        null,
        'PLZ51AsDFI65k',
        'https://www.youtube.com/feeds/videos.xml?playlist_id=PLZ51AsDFI65k',
        'scheduled_live',
        15
      )
  ) as feed(
    type,
    youtube_channel_id,
    youtube_playlist_id,
    rss_url,
    expected_content_mode,
    polling_interval_minutes
  )
  on conflict (rss_url) do update
    set partner_id = excluded.partner_id,
        type = excluded.type,
        youtube_channel_id = excluded.youtube_channel_id,
        youtube_playlist_id = excluded.youtube_playlist_id,
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
cross join (select count(*) from feeds) as feed_check
cross join (
  values
    (
      'Hide Mass and non-office livestreams',
      array[]::text[],
      array['Monastic Mass', 'Parish Mass', 'Homily', 'Conference', 'Retreat']::text[],
      null,
      400,
      'hidden'
    ),
    (
      'Matins / Office of Readings',
      array['Matins', 'Office of Readings', 'Vigils']::text[],
      array[]::text[],
      'office_of_readings',
      300,
      'approved'
    ),
    (
      'Lauds',
      array['Lauds', 'Morning Prayer']::text[],
      array[]::text[],
      'lauds',
      290,
      'approved'
    ),
    (
      'Midday Prayer',
      array['Midday Prayer']::text[],
      array[]::text[],
      'midday_prayer',
      280,
      'approved'
    ),
    (
      'Vespers',
      array['Vespers', 'Evening Prayer']::text[],
      array[]::text[],
      'vespers',
      270,
      'approved'
    ),
    (
      'Compline',
      array['Compline', 'Night Prayer']::text[],
      array[]::text[],
      'compline',
      260,
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
