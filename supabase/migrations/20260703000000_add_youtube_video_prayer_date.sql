alter table public.youtube_videos
  add column if not exists prayer_date date;

create index if not exists youtube_videos_display_prayer_date_idx
  on public.youtube_videos (display_status, prayer_date desc);
