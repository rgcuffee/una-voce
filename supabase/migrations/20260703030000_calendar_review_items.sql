create table if not exists public.calendar_review_items (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null unique,
  calendar_id text not null references public.calendars(id) on delete cascade,
  date date,
  source_table text not null,
  source_row_id uuid,
  source_celebration_id text,
  source_title text,
  issue_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  suggested_canonical_celebration_id text references public.canonical_celebrations(id),
  details jsonb not null default '{}'::jsonb,
  notes text,
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_review_items_calendar_status_idx
  on public.calendar_review_items (calendar_id, status, date);

create index if not exists calendar_review_items_issue_type_idx
  on public.calendar_review_items (issue_type);

create index if not exists calendar_review_items_source_idx
  on public.calendar_review_items (source_table, source_row_id);

drop trigger if exists set_calendar_review_items_updated_at on public.calendar_review_items;
create trigger set_calendar_review_items_updated_at
  before update on public.calendar_review_items
  for each row execute function public.set_updated_at();

alter table public.calendar_review_items enable row level security;

drop policy if exists "Calendar review items are readable" on public.calendar_review_items;
create policy "Calendar review items are readable"
  on public.calendar_review_items for select
  using (true);
