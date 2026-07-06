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
    partnered_at,
    consent_source,
    consent_notes,
    badge_enabled,
    community_page_enabled,
    community_page_slug
  )
  values (
    'cantor-del-camino',
    'Cantor del Camino',
    'Spanish-language Liturgy of the Hours videos from Cantor del Camino, including Lauds, Nona, and Vespers.',
    'https://cantordelcamino.com/',
    'ES',
    'Europe/Madrid',
    true,
    'active',
    'partner',
    current_timestamp,
    current_timestamp,
    'Seeded from public YouTube channel request',
    'Public partner seed created from the Cantor del Camino YouTube channel. Partnership details can be refined during follow-up.',
    true,
    true,
    'cantor-del-camino'
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
        partnered_at = coalesce(public.partners.partnered_at, excluded.partnered_at),
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
    'UCXqRDLJ_3nEcWqAR32trRDw',
    'https://www.youtube.com/feeds/videos.xml?channel_id=UCXqRDLJ_3nEcWqAR32trRDw',
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
      array['Laudes', 'Lauds', 'Morning Prayer', 'Oración de la Mañana', 'Oracion de la Manana']::text[],
      array[]::text[],
      'lauds',
      220,
      'approved'
    ),
    (
      'Nona / None',
      array['Nona', 'Midafternoon Prayer', 'Prayer at None']::text[],
      array[]::text[],
      'midday_prayer',
      210,
      'approved'
    ),
    (
      'Vespers',
      array['Vísperas', 'Visperas', 'Vespers', 'Evening Prayer']::text[],
      array[]::text[],
      'vespers',
      200,
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

with partner as (
  select id
  from public.partners
  where slug = 'cantor-del-camino'
)
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
  '2hjsBOvhziCNvmX5osD05V',
  'https://open.spotify.com/show/2hjsBOvhziCNvmX5osD05V',
  'https://open.spotify.com/embed/show/2hjsBOvhziCNvmX5osD05V',
  'https://www.spreaker.com/show/5555170/episodes/feed',
  120,
  current_date,
  true
from partner
on conflict (spotify_show_id) do update
  set partner_id = excluded.partner_id,
      show_url = excluded.show_url,
      embed_url = excluded.embed_url,
      rss_url = coalesce(public.partner_spotify_feeds.rss_url, excluded.rss_url),
      polling_interval_minutes = excluded.polling_interval_minutes,
      import_from_date = excluded.import_from_date,
      active = excluded.active;
