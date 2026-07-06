create table if not exists public.partner_spotify_feeds (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  spotify_show_id text not null,
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

create table if not exists public.spotify_episodes (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  feed_id uuid not null references public.partner_spotify_feeds(id) on delete cascade,
  spotify_episode_id text,
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

create index if not exists partner_spotify_feeds_partner_active_idx
  on public.partner_spotify_feeds (partner_id, active);

create index if not exists partner_spotify_feeds_polling_idx
  on public.partner_spotify_feeds (active, last_polled_at);

create unique index if not exists partner_spotify_feeds_show_id_key
  on public.partner_spotify_feeds (spotify_show_id);

create unique index if not exists partner_spotify_feeds_rss_url_key
  on public.partner_spotify_feeds (rss_url)
  where rss_url is not null;

create unique index if not exists spotify_episodes_guid_key
  on public.spotify_episodes (guid);

create index if not exists spotify_episodes_partner_published_idx
  on public.spotify_episodes (partner_id, published_at desc);

create index if not exists spotify_episodes_display_prayer_date_idx
  on public.spotify_episodes (display_status, prayer_date desc);

drop trigger if exists set_partner_spotify_feeds_updated_at on public.partner_spotify_feeds;
create trigger set_partner_spotify_feeds_updated_at
  before update on public.partner_spotify_feeds
  for each row execute function public.set_updated_at();

drop trigger if exists set_spotify_episodes_updated_at on public.spotify_episodes;
create trigger set_spotify_episodes_updated_at
  before update on public.spotify_episodes
  for each row execute function public.set_updated_at();

alter table public.partner_spotify_feeds enable row level security;
alter table public.spotify_episodes enable row level security;

drop policy if exists "Active partner Spotify feeds are readable" on public.partner_spotify_feeds;
create policy "Active partner Spotify feeds are readable"
  on public.partner_spotify_feeds for select
  using (
    active = true
    and exists (
      select 1
      from public.partners
      where partners.id = partner_spotify_feeds.partner_id
        and partners.active = true
        and partners.onboarding_status = 'active'
    )
  );

drop policy if exists "Approved Spotify episodes are readable" on public.spotify_episodes;
create policy "Approved Spotify episodes are readable"
  on public.spotify_episodes for select
  using (
    display_status = 'approved'
    and exists (
      select 1
      from public.partners
      where partners.id = spotify_episodes.partner_id
        and partners.active = true
        and partners.onboarding_status = 'active'
    )
  );
