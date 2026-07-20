-- Divine Office publishes the three daytime hours under distinct titles.
-- They all belong in the single `midday_prayer` slot in Una Voce.
with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.partner_classification_rules rule
set include_keywords = array[
      'Midmorning Prayer',
      'Midmorning',
      'Midday Prayer',
      'Midday',
      'Midafternoon Prayer',
      'Midafternoon',
      'Daytime Prayer',
      'Sext',
      'None',
      'Terce'
    ]::text[],
    prayer_type = 'midday_prayer'::public.liturgical_hour,
    default_display_status = 'approved',
    updated_at = now()
from divine_office
where rule.partner_id = divine_office.id
  and rule.name = 'Daytime Prayer';

-- Repair any previously imported, still-unreviewed daytime entries immediately.
with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.youtube_videos video
set prayer_type = 'midday_prayer'::public.liturgical_hour,
    display_status = 'approved',
    updated_at = now()
from divine_office
where video.partner_id = divine_office.id
  and video.display_status = 'pending'
  and video.title ~* '\m(midmorning|midday|midafternoon)\M';

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.apple_podcast_episodes episode
set prayer_type = 'midday_prayer'::public.liturgical_hour,
    display_status = 'approved',
    updated_at = now()
from divine_office
where episode.partner_id = divine_office.id
  and episode.display_status = 'pending'
  and episode.title ~* '\m(midmorning|midday|midafternoon)\M';

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.spotify_episodes episode
set prayer_type = 'midday_prayer'::public.liturgical_hour,
    display_status = 'approved',
    updated_at = now()
from divine_office
where episode.partner_id = divine_office.id
  and episode.display_status = 'pending'
  and episode.title ~* '\m(midmorning|midday|midafternoon)\M';
