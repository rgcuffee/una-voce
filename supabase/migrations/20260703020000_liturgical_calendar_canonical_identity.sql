create table if not exists public.canonical_celebrations (
  id text primary key,
  default_title text not null,
  category text not null,
  is_universal boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.celebration_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_celebration_id text not null references public.canonical_celebrations(id) on delete cascade,
  calendar_id text references public.calendars(id) on delete cascade,
  source_celebration_id text not null,
  source_title text not null,
  match_confidence numeric(4, 3) not null default 1.0 check (match_confidence >= 0 and match_confidence <= 1),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_id, source_celebration_id, canonical_celebration_id)
);

alter table public.liturgical_days
  add column if not exists canonical_celebration_id text references public.canonical_celebrations(id),
  add column if not exists precedence_rank integer,
  add column if not exists precedence_category text;

alter table public.liturgical_day_options
  add column if not exists canonical_celebration_id text references public.canonical_celebrations(id),
  add column if not exists precedence_rank integer,
  add column if not exists precedence_category text;

create index if not exists canonical_celebrations_category_idx
  on public.canonical_celebrations (category);

create index if not exists celebration_aliases_source_idx
  on public.celebration_aliases (calendar_id, source_celebration_id);

create index if not exists celebration_aliases_canonical_idx
  on public.celebration_aliases (canonical_celebration_id);

create index if not exists liturgical_days_calendar_canonical_idx
  on public.liturgical_days (calendar_id, canonical_celebration_id);

create index if not exists liturgical_days_precedence_idx
  on public.liturgical_days (calendar_id, date, precedence_rank);

create index if not exists liturgical_day_options_calendar_canonical_idx
  on public.liturgical_day_options (calendar_id, canonical_celebration_id);

create index if not exists liturgical_day_options_precedence_idx
  on public.liturgical_day_options (calendar_id, date, precedence_rank);

drop trigger if exists set_canonical_celebrations_updated_at on public.canonical_celebrations;
create trigger set_canonical_celebrations_updated_at
  before update on public.canonical_celebrations
  for each row execute function public.set_updated_at();

drop trigger if exists set_celebration_aliases_updated_at on public.celebration_aliases;
create trigger set_celebration_aliases_updated_at
  before update on public.celebration_aliases
  for each row execute function public.set_updated_at();

alter table public.canonical_celebrations enable row level security;
alter table public.celebration_aliases enable row level security;

drop policy if exists "Canonical celebrations are readable" on public.canonical_celebrations;
create policy "Canonical celebrations are readable"
  on public.canonical_celebrations for select
  using (true);

drop policy if exists "Celebration aliases are readable" on public.celebration_aliases;
create policy "Celebration aliases are readable"
  on public.celebration_aliases for select
  using (true);
