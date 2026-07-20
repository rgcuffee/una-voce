-- Office names are matched as words or phrases by each ingester. Keep the
-- concise English names in every partner's rules so titles such as "Morning
-- Office" and "Evening Office" can be classified without matching compounds
-- such as "Midmorning".
update public.partner_classification_rules rule
set include_keywords = array(
      select distinct keyword
      from unnest(rule.include_keywords || array['Morning']) as keyword
    ),
    default_display_status = 'approved',
    updated_at = now()
where rule.active = true
  and rule.prayer_type = 'lauds'::public.liturgical_hour;

update public.partner_classification_rules rule
set include_keywords = array(
      select distinct keyword
      from unnest(rule.include_keywords || array['Evening']) as keyword
    ),
    default_display_status = 'approved',
    updated_at = now()
where rule.active = true
  and rule.prayer_type = 'vespers'::public.liturgical_hour;

update public.partner_classification_rules rule
set include_keywords = array(
      select distinct keyword
      from unnest(rule.include_keywords || array['Compline']) as keyword
    ),
    default_display_status = 'approved',
    updated_at = now()
where rule.active = true
  and rule.prayer_type = 'compline'::public.liturgical_hour;

-- Do not convert the daytime hours into Lauds merely because their title
-- contains the substring "morning". Leave those entries pending for the
-- corrected classifier to assign on the next ingest.
update public.youtube_videos
set prayer_type = null,
    display_status = 'pending',
    updated_at = now()
where display_status = 'pending'
  and prayer_type = 'lauds'::public.liturgical_hour
  and title ~* '\m(midmorning|midday|midafternoon)\M';

update public.apple_podcast_episodes
set prayer_type = null,
    display_status = 'pending',
    updated_at = now()
where display_status = 'pending'
  and prayer_type = 'lauds'::public.liturgical_hour
  and title ~* '\m(midmorning|midday|midafternoon)\M';

update public.spotify_episodes
set prayer_type = null,
    display_status = 'pending',
    updated_at = now()
where display_status = 'pending'
  and prayer_type = 'lauds'::public.liturgical_hour
  and title ~* '\m(midmorning|midday|midafternoon)\M';

-- Existing pending records that already carry one of the trusted office
-- classifications can now take the same automatic approval path as new ones.
update public.youtube_videos
set display_status = 'approved',
    updated_at = now()
where display_status = 'pending'
  and prayer_type in (
    'lauds'::public.liturgical_hour,
    'vespers'::public.liturgical_hour,
    'compline'::public.liturgical_hour
  );

update public.apple_podcast_episodes
set display_status = 'approved',
    updated_at = now()
where display_status = 'pending'
  and prayer_type in (
    'lauds'::public.liturgical_hour,
    'vespers'::public.liturgical_hour,
    'compline'::public.liturgical_hour
  );

update public.spotify_episodes
set display_status = 'approved',
    updated_at = now()
where display_status = 'pending'
  and prayer_type in (
    'lauds'::public.liturgical_hour,
    'vespers'::public.liturgical_hour,
    'compline'::public.liturgical_hour
  );
