update public.youtube_videos
set prayer_date = null,
    available_liturgical_seasons = array['ordinary_time']::public.liturgical_season[]
where partner_id in (
    select id
    from public.partners
    where slug = 'word-on-fire'
  )
  and prayer_type = 'compline'::public.liturgical_hour
  and title ilike 'Liturgy of the Hours: Night Prayer for %';
