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
updated_at = now()
from public.partners partner
where partner.id = rule.partner_id
  and partner.slug = 'divine-office'
  and rule.name = 'Daytime Prayer';

update public.apple_podcast_episodes episode
set prayer_type = 'midday_prayer',
    updated_at = now()
from public.partners partner
where partner.id = episode.partner_id
  and partner.slug = 'divine-office'
  and episode.display_status = 'pending'
  and episode.title ~* '\m(midmorning|midday|midafternoon)\M';

update public.spotify_episodes episode
set prayer_type = 'midday_prayer',
    updated_at = now()
from public.partners partner
where partner.id = episode.partner_id
  and partner.slug = 'divine-office'
  and episode.display_status = 'pending'
  and episode.title ~* '\m(midmorning|midday|midafternoon)\M';
