create type public.prayer_analytics_event_name as enum (
  'prayer_session_started',
  'prayer_play_started',
  'prayer_play_paused',
  'prayer_play_resumed',
  'prayer_progress',
  'prayer_completed',
  'prayer_session_ended',
  'source_opened'
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  session_id uuid not null,
  event_name public.prayer_analytics_event_name not null,
  prayer_id text,
  ministry_id text,
  hour text,
  locale text not null default 'en-US',
  user_id uuid,
  anonymous_id text not null,
  progress_percent integer check (
    progress_percent is null or progress_percent between 0 and 100
  ),
  playback_seconds integer check (
    playback_seconds is null or playback_seconds >= 0
  ),
  metadata jsonb not null default '{}'::jsonb
);

create table public.analytics_sessions (
  session_id uuid primary key,
  started_at timestamptz not null,
  ended_at timestamptz,
  active_play_seconds integer not null default 0 check (active_play_seconds >= 0),
  panel_open_seconds integer check (
    panel_open_seconds is null or panel_open_seconds >= 0
  ),
  highest_progress integer not null default 0 check (highest_progress between 0 and 100),
  completed boolean not null default false,
  opened_source boolean not null default false,
  ministry_id text,
  prayer_id text,
  hour text,
  locale text not null default 'en-US',
  user_id uuid,
  anonymous_id text not null,
  source_name text,
  source_type text,
  provider text,
  video_id text,
  page_context text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index analytics_events_session_occurred_idx
  on public.analytics_events (session_id, occurred_at);

create index analytics_events_event_occurred_idx
  on public.analytics_events (event_name, occurred_at);

create index analytics_events_ministry_hour_occurred_idx
  on public.analytics_events (ministry_id, hour, occurred_at);

create index analytics_sessions_started_at_idx
  on public.analytics_sessions (started_at);

create index analytics_sessions_ministry_hour_started_idx
  on public.analytics_sessions (ministry_id, hour, started_at);

create trigger set_analytics_sessions_updated_at
  before update on public.analytics_sessions
  for each row execute function public.set_updated_at();

create or replace function public.protect_analytics_session_rollups()
returns trigger
language plpgsql
as $$
begin
  new.highest_progress = greatest(old.highest_progress, new.highest_progress);
  new.active_play_seconds = greatest(old.active_play_seconds, new.active_play_seconds);
  new.completed = old.completed or new.completed;
  new.opened_source = old.opened_source or new.opened_source;
  return new;
end;
$$;

create trigger protect_analytics_session_rollups
  before update on public.analytics_sessions
  for each row execute function public.protect_analytics_session_rollups();

alter table public.analytics_events enable row level security;
alter table public.analytics_sessions enable row level security;
