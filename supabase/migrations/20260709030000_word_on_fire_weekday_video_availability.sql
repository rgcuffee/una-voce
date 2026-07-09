alter table public.youtube_videos
  add column if not exists available_weekdays integer[] not null default '{}'::integer[];

alter table public.youtube_videos
  add constraint youtube_videos_available_weekdays_check
    check (available_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]);

create index if not exists youtube_videos_available_weekdays_idx
  on public.youtube_videos using gin (available_weekdays);

update public.youtube_videos
set prayer_date = null,
    available_liturgical_seasons = array['ordinary_time']::public.liturgical_season[],
    available_weekdays = case
      when title ilike '% for Sunday%' then array[0]
      when title ilike '% for Monday%' then array[1]
      when title ilike '% for Tuesday%' then array[2]
      when title ilike '% for Wednesday%' then array[3]
      when title ilike '% for Thursday%' then array[4]
      when title ilike '% for Friday%' then array[5]
      when title ilike '% for Saturday%' then array[6]
      else '{}'::integer[]
    end
where partner_id in (
    select id
    from public.partners
    where slug = 'word-on-fire'
  )
  and prayer_type = 'compline'::public.liturgical_hour
  and title ilike 'Liturgy of the Hours: Night Prayer for %';
