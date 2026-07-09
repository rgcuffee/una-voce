alter table public.partner_youtube_feeds
  add column if not exists poll_once boolean not null default false,
  add column if not exists default_available_liturgical_seasons public.liturgical_season[] not null default '{}'::public.liturgical_season[];

alter table public.partner_classification_rules
  add column if not exists default_available_liturgical_seasons public.liturgical_season[] not null default '{}'::public.liturgical_season[];

alter table public.youtube_videos
  add column if not exists available_liturgical_seasons public.liturgical_season[] not null default '{}'::public.liturgical_season[];

create index if not exists youtube_videos_available_liturgical_seasons_idx
  on public.youtube_videos using gin (available_liturgical_seasons);
