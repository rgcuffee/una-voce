create table if not exists public.partner_apple_podcast_feeds (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  apple_podcast_id text not null,
  show_url text not null,
  embed_url text not null,
  rss_url text,
  polling_interval_minutes integer not null default 120 check (polling_interval_minutes > 0),
  import_from_date date,
  active boolean not null default true,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apple_podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  feed_id uuid not null references public.partner_apple_podcast_feeds(id) on delete cascade,
  apple_episode_id text,
  guid text not null,
  title text not null,
  description text,
  published_at timestamptz not null,
  prayer_date date,
  duration_seconds integer,
  image_url text,
  audio_url text,
  canonical_url text not null,
  embed_url text not null,
  prayer_type public.liturgical_hour,
  display_status public.youtube_video_display_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists partner_apple_podcast_feeds_partner_active_idx
  on public.partner_apple_podcast_feeds (partner_id, active);

create index if not exists partner_apple_podcast_feeds_polling_idx
  on public.partner_apple_podcast_feeds (active, last_polled_at);

create unique index if not exists partner_apple_podcast_feeds_podcast_id_key
  on public.partner_apple_podcast_feeds (apple_podcast_id);

create unique index if not exists partner_apple_podcast_feeds_rss_url_key
  on public.partner_apple_podcast_feeds (rss_url)
  where rss_url is not null;

create unique index if not exists apple_podcast_episodes_guid_key
  on public.apple_podcast_episodes (guid);

create index if not exists apple_podcast_episodes_partner_published_idx
  on public.apple_podcast_episodes (partner_id, published_at desc);

create index if not exists apple_podcast_episodes_display_prayer_date_idx
  on public.apple_podcast_episodes (display_status, prayer_date desc);

drop trigger if exists set_partner_apple_podcast_feeds_updated_at on public.partner_apple_podcast_feeds;
create trigger set_partner_apple_podcast_feeds_updated_at
  before update on public.partner_apple_podcast_feeds
  for each row execute function public.set_updated_at();

drop trigger if exists set_apple_podcast_episodes_updated_at on public.apple_podcast_episodes;
create trigger set_apple_podcast_episodes_updated_at
  before update on public.apple_podcast_episodes
  for each row execute function public.set_updated_at();

alter table public.partner_apple_podcast_feeds enable row level security;
alter table public.apple_podcast_episodes enable row level security;

drop policy if exists "Active partner Apple Podcast feeds are readable" on public.partner_apple_podcast_feeds;
create policy "Active partner Apple Podcast feeds are readable"
  on public.partner_apple_podcast_feeds for select
  using (
    active = true
    and exists (
      select 1
      from public.partners
      where partners.id = partner_apple_podcast_feeds.partner_id
        and partners.active = true
        and partners.onboarding_status = 'active'
    )
  );

drop policy if exists "Approved Apple Podcast episodes are readable" on public.apple_podcast_episodes;
create policy "Approved Apple Podcast episodes are readable"
  on public.apple_podcast_episodes for select
  using (
    display_status = 'approved'
    and exists (
      select 1
      from public.partners
      where partners.id = apple_podcast_episodes.partner_id
        and partners.active = true
        and partners.onboarding_status = 'active'
    )
  );
