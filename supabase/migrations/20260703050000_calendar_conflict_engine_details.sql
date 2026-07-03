alter type public.calendar_conflict_reason
  add value if not exists 'missing_base_day';

alter type public.calendar_conflict_reason
  add value if not exists 'missing_comparison_day';

alter type public.calendar_conflict_reason
  add value if not exists 'missing_canonical_identity';

alter type public.calendar_conflict_reason
  add value if not exists 'missing_precedence';

alter type public.calendar_conflict_reason
  add value if not exists 'different_obligation';

alter type public.calendar_conflict_reason
  add value if not exists 'different_options';

create table if not exists public.calendar_conflict_runs (
  id uuid primary key default gen_random_uuid(),
  base_calendar_id text not null references public.calendars(id) on delete cascade,
  comparison_calendar_id text not null references public.calendars(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  compared_date_count integer not null default 0 check (compared_date_count >= 0),
  conflict_count integer not null default 0 check (conflict_count >= 0),
  include_none boolean not null default false,
  generator text not null default 'generate-calendar-conflicts',
  status text not null default 'completed' check (status in ('running', 'completed', 'failed')),
  details jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (base_calendar_id <> comparison_calendar_id),
  check (start_date <= end_date)
);

alter table public.calendar_conflicts
  alter column base_liturgical_day_id drop not null,
  alter column comparison_liturgical_day_id drop not null,
  add column if not exists run_id uuid references public.calendar_conflict_runs(id) on delete set null,
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists calendar_conflict_runs_pair_date_idx
  on public.calendar_conflict_runs (base_calendar_id, comparison_calendar_id, start_date, end_date);

create index if not exists calendar_conflict_runs_created_at_idx
  on public.calendar_conflict_runs (created_at desc);

create index if not exists calendar_conflicts_pair_date_idx
  on public.calendar_conflicts (base_calendar_id, comparison_calendar_id, date);

create index if not exists calendar_conflicts_run_idx
  on public.calendar_conflicts (run_id);

drop trigger if exists set_calendar_conflict_runs_updated_at on public.calendar_conflict_runs;
create trigger set_calendar_conflict_runs_updated_at
  before update on public.calendar_conflict_runs
  for each row execute function public.set_updated_at();

alter table public.calendar_conflict_runs enable row level security;

drop policy if exists "Calendar conflict runs are readable" on public.calendar_conflict_runs;
create policy "Calendar conflict runs are readable"
  on public.calendar_conflict_runs for select
  using (true);
