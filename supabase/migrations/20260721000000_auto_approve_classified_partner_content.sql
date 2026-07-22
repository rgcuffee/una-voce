-- Divine Office's single daytime classification intentionally covers all three
-- distinct daytime offices. Keep each imported episode separate; they share the
-- same Una Voce prayer type but have different titles and source URLs.
update public.partner_classification_rules rule
set include_keywords = array[
      'Midmorning Prayer',
      'Midday Prayer',
      'Midafternoon Prayer'
    ]::text[],
    prayer_type = 'midday_prayer'::public.liturgical_hour,
    default_display_status = 'approved',
    updated_at = now()
from public.partners partner
where rule.partner_id = partner.id
  and partner.slug = 'divine-office'
  and rule.name = 'Daytime Prayer';

-- Every classified item across every partner and provider is visible
-- immediately for classification testing. Leave unclassified records in their
-- existing review state.
update public.youtube_videos
set display_status = 'approved',
    updated_at = now()
where prayer_type is not null
  and display_status is distinct from 'approved';

update public.spotify_episodes
set display_status = 'approved',
    updated_at = now()
where prayer_type is not null
  and display_status is distinct from 'approved';

update public.apple_podcast_episodes
set display_status = 'approved',
    updated_at = now()
where prayer_type is not null
  and display_status is distinct from 'approved';
