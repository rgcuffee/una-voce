with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.partner_classification_rules rule
set exclude_keywords = array[
      'Announce',
      'Announcement',
      'Race to the Finish',
      'About Today',
      'Invitatory'
    ]
from divine_office
where rule.partner_id = divine_office.id
  and rule.name = 'Hide non-office announcements';

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.partner_classification_rules rule
set include_keywords = array[
      'Office of Readings',
      'Office of Reading',
      'Office Readings',
      'Readings',
      'Matins',
      'Vigils'
    ]
from divine_office
where rule.partner_id = divine_office.id
  and rule.name = 'Office of Readings';

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.apple_podcast_episodes episode
set display_status = 'hidden',
    prayer_type = null
from divine_office
where episode.partner_id = divine_office.id
  and (
    lower(episode.title) like '%about today%'
    or lower(episode.title) like '%invitatory%'
  );

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.spotify_episodes episode
set display_status = 'hidden',
    prayer_type = null
from divine_office
where episode.partner_id = divine_office.id
  and (
    lower(episode.title) like '%about today%'
    or lower(episode.title) like '%invitatory%'
  );

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.apple_podcast_episodes episode
set prayer_type = 'office_of_readings'
from divine_office
where episode.partner_id = divine_office.id
  and episode.display_status = 'pending'
  and episode.prayer_type is null
  and (
    lower(episode.title) like '%office of readings%'
    or lower(episode.title) like '%office of reading%'
    or lower(episode.title) like '%office readings%'
    or lower(episode.title) like '%matins%'
    or lower(episode.title) like '%vigils%'
  );

with divine_office as (
  select id
  from public.partners
  where slug = 'divine-office'
)
update public.spotify_episodes episode
set prayer_type = 'office_of_readings'
from divine_office
where episode.partner_id = divine_office.id
  and episode.display_status = 'pending'
  and episode.prayer_type is null
  and (
    lower(episode.title) like '%office of readings%'
    or lower(episode.title) like '%office of reading%'
    or lower(episode.title) like '%office readings%'
    or lower(episode.title) like '%matins%'
    or lower(episode.title) like '%vigils%'
  );

update public.partner_youtube_feeds feed
set default_available_liturgical_seasons = '{}'::public.liturgical_season[]
from public.partners partner
where feed.partner_id = partner.id
  and partner.slug <> 'word-on-fire'
  and feed.default_available_liturgical_seasons <> '{}'::public.liturgical_season[];

update public.partner_classification_rules rule
set default_available_liturgical_seasons = '{}'::public.liturgical_season[]
from public.partners partner
where rule.partner_id = partner.id
  and partner.slug <> 'word-on-fire'
  and rule.default_available_liturgical_seasons <> '{}'::public.liturgical_season[];

update public.youtube_videos video
set available_liturgical_seasons = '{}'::public.liturgical_season[],
    available_weekdays = '{}'::integer[]
from public.partners partner
where video.partner_id = partner.id
  and partner.slug <> 'word-on-fire'
  and (
    video.available_liturgical_seasons <> '{}'::public.liturgical_season[]
    or video.available_weekdays <> '{}'::integer[]
  );
