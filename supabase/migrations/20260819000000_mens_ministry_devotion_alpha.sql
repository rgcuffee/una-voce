create type public.devotion_status as enum ('inactive', 'active', 'completed');
create type public.devotion_report_outcome as enum (
  'prayed',
  'started_not_finished',
  'not_tonight'
);

create table public.devotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  organization_label text not null,
  hour_key public.liturgical_hour not null default 'compline',
  start_date date,
  duration_days integer not null default 7 check (duration_days = 7),
  timezone text,
  status public.devotion_status not null default 'inactive',
  pre_survey_url text,
  post_survey_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_devotion_requires_schedule check (
    status <> 'active' or (start_date is not null and nullif(trim(timezone), '') is not null)
  )
);

create table public.devotion_participants (
  id uuid primary key default gen_random_uuid(),
  devotion_id uuid not null references public.devotions(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 120),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (devotion_id, id)
);

create table public.devotion_daily_reports (
  id uuid primary key default gen_random_uuid(),
  devotion_id uuid not null references public.devotions(id) on delete cascade,
  participant_id uuid not null,
  pilot_day integer not null check (pilot_day between 1 and 7),
  prayer_date date not null,
  outcome public.devotion_report_outcome not null,
  first_reported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devotion_report_participant_membership foreign key (devotion_id, participant_id)
    references public.devotion_participants(devotion_id, id) on delete cascade,
  unique (devotion_id, participant_id, pilot_day)
);

create index devotion_participants_devotion_created_idx
  on public.devotion_participants (devotion_id, created_at);
create index devotion_reports_devotion_day_idx
  on public.devotion_daily_reports (devotion_id, pilot_day);

create trigger set_devotions_updated_at
  before update on public.devotions
  for each row execute function public.set_updated_at();
create trigger set_devotion_reports_updated_at
  before update on public.devotion_daily_reports
  for each row execute function public.set_updated_at();

alter table public.devotions enable row level security;
alter table public.devotion_participants enable row level security;
alter table public.devotion_daily_reports enable row level security;

alter type public.prayer_analytics_event_name
  add value if not exists 'devotion_page_opened';
alter type public.prayer_analytics_event_name
  add value if not exists 'devotion_resource_opened';
alter type public.prayer_analytics_event_name
  add value if not exists 'devotion_report_submitted';
alter type public.prayer_analytics_event_name
  add value if not exists 'devotion_survey_clicked';

alter table public.analytics_events
  add column if not exists devotion_id uuid references public.devotions(id) on delete set null,
  add column if not exists devotion_participant_id uuid references public.devotion_participants(id) on delete set null,
  add column if not exists pilot_day integer check (pilot_day is null or pilot_day between 1 and 7),
  add column if not exists prayer_date date,
  add column if not exists resource_id text,
  add column if not exists media_type text;

alter table public.analytics_sessions
  add column if not exists devotion_id uuid references public.devotions(id) on delete set null,
  add column if not exists devotion_participant_id uuid references public.devotion_participants(id) on delete set null,
  add column if not exists pilot_day integer check (pilot_day is null or pilot_day between 1 and 7),
  add column if not exists prayer_date date,
  add column if not exists resource_id text,
  add column if not exists media_type text;

alter table public.analytics_events
  add constraint analytics_events_devotion_participant_membership
  foreign key (devotion_id, devotion_participant_id)
  references public.devotion_participants(devotion_id, id) on delete set null;

alter table public.analytics_sessions
  add constraint analytics_sessions_devotion_participant_membership
  foreign key (devotion_id, devotion_participant_id)
  references public.devotion_participants(devotion_id, id) on delete set null;

create index analytics_events_devotion_participant_day_idx
  on public.analytics_events (devotion_id, devotion_participant_id, pilot_day, occurred_at desc)
  where devotion_id is not null;
create index analytics_sessions_devotion_participant_day_idx
  on public.analytics_sessions (devotion_id, devotion_participant_id, pilot_day, started_at desc)
  where devotion_id is not null;

insert into public.devotions (
  slug,
  name,
  organization_label,
  hour_key,
  start_date,
  duration_days,
  timezone,
  status
)
values (
  'holy-spirit-mens-ministry',
  '7-Day Night Prayer Devotion',
  'Holy Spirit Men''s Ministry',
  'compline',
  null,
  7,
  null,
  'inactive'
)
on conflict (slug) do nothing;
