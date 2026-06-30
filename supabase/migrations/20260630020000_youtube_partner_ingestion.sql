create type public.partner_onboarding_status as enum (
  'pending',
  'active',
  'archived'
);

create type public.partner_youtube_feed_type as enum (
  'channel',
  'playlist'
);

create type public.partner_youtube_content_mode as enum (
  'live',
  'scheduled_live',
  'pre_recorded',
  'mixed'
);

create type public.prayer_video_kind as enum (
  'video',
  'scheduled_live',
  'live',
  'premiere',
  'unknown'
);

create type public.youtube_video_display_status as enum (
  'pending',
  'approved',
  'hidden',
  'expired'
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  website text,
  logo_url text,
  country text,
  timezone text not null default 'UTC',
  active boolean not null default true,
  onboarding_status public.partner_onboarding_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug = lower(slug)),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.partner_youtube_feeds (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  type public.partner_youtube_feed_type not null,
  youtube_channel_id text,
  youtube_playlist_id text,
  rss_url text not null,
  expected_content_mode public.partner_youtube_content_mode not null default 'mixed',
  polling_interval_minutes integer not null default 120 check (polling_interval_minutes > 0),
  import_from_date date,
  active boolean not null default true,
  last_polled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (type = 'channel' and youtube_channel_id is not null and youtube_playlist_id is null)
    or
    (type = 'playlist' and youtube_playlist_id is not null)
  )
);

create table public.partner_classification_rules (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  name text not null,
  include_keywords text[] not null default '{}'::text[],
  exclude_keywords text[] not null default '{}'::text[],
  prayer_type public.liturgical_hour,
  preferred_language text,
  priority integer not null default 100,
  default_display_status public.youtube_video_display_status not null default 'approved',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (array_length(include_keywords, 1) is not null or array_length(exclude_keywords, 1) is not null)
);

create table public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  feed_id uuid not null references public.partner_youtube_feeds(id) on delete cascade,
  youtube_video_id text not null unique,
  title text not null,
  description text,
  published_at timestamptz not null,
  scheduled_start_at timestamptz,
  thumbnail_url text,
  canonical_url text not null,
  embed_url text not null,
  prayer_type public.liturgical_hour,
  video_kind public.prayer_video_kind not null default 'unknown',
  display_status public.youtube_video_display_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_youtube_feeds_partner_active_idx
  on public.partner_youtube_feeds (partner_id, active);

create index partner_youtube_feeds_polling_idx
  on public.partner_youtube_feeds (active, last_polled_at);

create unique index partner_youtube_feeds_rss_url_key
  on public.partner_youtube_feeds (rss_url);

create index partner_classification_rules_partner_priority_idx
  on public.partner_classification_rules (partner_id, active, priority desc);

create unique index partner_classification_rules_partner_name_key
  on public.partner_classification_rules (partner_id, name);

create index youtube_videos_partner_published_idx
  on public.youtube_videos (partner_id, published_at desc);

create index youtube_videos_display_published_idx
  on public.youtube_videos (display_status, published_at desc);

create trigger set_partners_updated_at
  before update on public.partners
  for each row execute function public.set_updated_at();

create trigger set_partner_youtube_feeds_updated_at
  before update on public.partner_youtube_feeds
  for each row execute function public.set_updated_at();

create trigger set_partner_classification_rules_updated_at
  before update on public.partner_classification_rules
  for each row execute function public.set_updated_at();

create trigger set_youtube_videos_updated_at
  before update on public.youtube_videos
  for each row execute function public.set_updated_at();

alter table public.partners enable row level security;
alter table public.partner_youtube_feeds enable row level security;
alter table public.partner_classification_rules enable row level security;
alter table public.youtube_videos enable row level security;

create policy "Active partners are readable"
  on public.partners for select
  using (active = true and onboarding_status = 'active');

create policy "Active partner YouTube feeds are readable"
  on public.partner_youtube_feeds for select
  using (
    active = true
    and exists (
      select 1
      from public.partners
      where partners.id = partner_youtube_feeds.partner_id
        and partners.active = true
        and partners.onboarding_status = 'active'
    )
  );

create policy "Approved YouTube videos are readable"
  on public.youtube_videos for select
  using (
    display_status = 'approved'
    and exists (
      select 1
      from public.partners
      where partners.id = youtube_videos.partner_id
        and partners.active = true
        and partners.onboarding_status = 'active'
    )
  );
