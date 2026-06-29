create extension if not exists pgcrypto;

create type public.calendar_source_type as enum (
  'pdf',
  'html_month_page',
  'manual_override'
);

create type public.liturgical_season as enum (
  'advent',
  'christmas',
  'ordinary_time',
  'lent',
  'triduum',
  'easter'
);

create type public.liturgical_rank as enum (
  'weekday',
  'optional_memorial',
  'memorial',
  'feast',
  'solemnity',
  'sunday'
);

create type public.liturgical_color as enum (
  'green',
  'white',
  'red',
  'violet',
  'rose',
  'black'
);

create type public.country_scope as enum (
  'US',
  'EW',
  'E',
  'W'
);

create type public.liturgical_hour as enum (
  'office_of_readings',
  'lauds',
  'midday_prayer',
  'vespers',
  'compline'
);

create type public.calendar_conflict_severity as enum (
  'none',
  'minor',
  'major'
);

create type public.calendar_conflict_reason as enum (
  'same',
  'different_title',
  'different_rank',
  'different_color',
  'different_holy_day_obligation',
  'country_specific',
  'manual_review'
);

create table public.calendars (
  id text primary key,
  name text not null,
  authority text not null,
  default_locale text not null,
  timezone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calendar_sources (
  id uuid primary key default gen_random_uuid(),
  calendar_id text not null references public.calendars(id) on delete cascade,
  year integer not null check (year >= 1900 and year <= 2200),
  source_type public.calendar_source_type not null,
  title text not null,
  url text not null,
  retrieved_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.raw_calendar_rows (
  id uuid primary key default gen_random_uuid(),
  calendar_id text not null references public.calendars(id) on delete cascade,
  source_id uuid not null references public.calendar_sources(id) on delete cascade,
  date date not null,
  raw_title text not null,
  raw_rank text,
  raw_color text,
  raw_notes text,
  country_scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.liturgical_days (
  id uuid primary key default gen_random_uuid(),
  calendar_id text not null references public.calendars(id) on delete cascade,
  date date not null,
  title text not null,
  display_title text not null,
  season public.liturgical_season not null,
  season_week integer check (season_week is null or season_week > 0),
  psalter_week integer check (psalter_week is null or psalter_week between 1 and 4),
  rank public.liturgical_rank not null,
  color public.liturgical_color,
  country_scope public.country_scope,
  is_holy_day_of_obligation boolean not null default false,
  source_id uuid not null references public.calendar_sources(id),
  raw_source_text text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_id, date)
);

create table public.liturgical_hour_instances (
  id uuid primary key default gen_random_uuid(),
  liturgical_day_id uuid not null references public.liturgical_days(id) on delete cascade,
  calendar_id text not null references public.calendars(id) on delete cascade,
  date date not null,
  hour public.liturgical_hour not null,
  display_name text not null,
  latin_name text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (liturgical_day_id, hour)
);

create table public.calendar_conflicts (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  base_calendar_id text not null references public.calendars(id) on delete cascade,
  comparison_calendar_id text not null references public.calendars(id) on delete cascade,
  base_liturgical_day_id uuid not null references public.liturgical_days(id) on delete cascade,
  comparison_liturgical_day_id uuid not null references public.liturgical_days(id) on delete cascade,
  severity public.calendar_conflict_severity not null,
  reason public.calendar_conflict_reason not null,
  base_display text not null,
  comparison_display text not null,
  should_show_warning boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (base_calendar_id <> comparison_calendar_id),
  unique (date, base_calendar_id, comparison_calendar_id)
);

create index calendar_sources_calendar_year_idx
  on public.calendar_sources (calendar_id, year);

create index raw_calendar_rows_calendar_date_idx
  on public.raw_calendar_rows (calendar_id, date);

create index liturgical_days_date_idx
  on public.liturgical_days (date);

create index liturgical_hour_instances_calendar_date_idx
  on public.liturgical_hour_instances (calendar_id, date, sort_order);

create index calendar_conflicts_date_idx
  on public.calendar_conflicts (date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_calendars_updated_at
  before update on public.calendars
  for each row execute function public.set_updated_at();

create trigger set_calendar_sources_updated_at
  before update on public.calendar_sources
  for each row execute function public.set_updated_at();

create trigger set_raw_calendar_rows_updated_at
  before update on public.raw_calendar_rows
  for each row execute function public.set_updated_at();

create trigger set_liturgical_days_updated_at
  before update on public.liturgical_days
  for each row execute function public.set_updated_at();

create trigger set_liturgical_hour_instances_updated_at
  before update on public.liturgical_hour_instances
  for each row execute function public.set_updated_at();

create trigger set_calendar_conflicts_updated_at
  before update on public.calendar_conflicts
  for each row execute function public.set_updated_at();

create or replace function public.sync_liturgical_hour_instances()
returns trigger
language plpgsql
as $$
begin
  insert into public.liturgical_hour_instances (
    liturgical_day_id,
    calendar_id,
    date,
    hour,
    display_name,
    latin_name,
    sort_order
  )
  values
    (new.id, new.calendar_id, new.date, 'office_of_readings', 'Office of Readings', 'Matutinum', 10),
    (new.id, new.calendar_id, new.date, 'lauds', 'Morning Prayer', 'Lauds', 20),
    (new.id, new.calendar_id, new.date, 'midday_prayer', 'Midday Prayer', 'Sext', 30),
    (new.id, new.calendar_id, new.date, 'vespers', 'Evening Prayer', 'Vespers', 40),
    (new.id, new.calendar_id, new.date, 'compline', 'Night Prayer', 'Compline', 50)
  on conflict (liturgical_day_id, hour) do update
    set calendar_id = excluded.calendar_id,
        date = excluded.date,
        display_name = excluded.display_name,
        latin_name = excluded.latin_name,
        sort_order = excluded.sort_order;

  return new;
end;
$$;

create trigger sync_liturgical_hour_instances
  after insert or update of calendar_id, date on public.liturgical_days
  for each row execute function public.sync_liturgical_hour_instances();

alter table public.calendars enable row level security;
alter table public.calendar_sources enable row level security;
alter table public.raw_calendar_rows enable row level security;
alter table public.liturgical_days enable row level security;
alter table public.liturgical_hour_instances enable row level security;
alter table public.calendar_conflicts enable row level security;

create policy "Calendars are readable"
  on public.calendars for select
  using (true);

create policy "Calendar sources are readable"
  on public.calendar_sources for select
  using (true);

create policy "Liturgical days are readable"
  on public.liturgical_days for select
  using (true);

create policy "Liturgical hour instances are readable"
  on public.liturgical_hour_instances for select
  using (true);

create policy "Calendar conflicts are readable"
  on public.calendar_conflicts for select
  using (true);
