do $$
begin
  if not exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'obligation_status'
  ) then
    create type public.obligation_status as enum (
      'none',
      'sunday',
      'holy_day',
      'transferred',
      'suppressed',
      'particular_law'
    );
  end if;
end;
$$;

alter table public.liturgical_days
  add column if not exists weekday smallint,
  add column if not exists weekday_name text,
  add column if not exists celebration_id text,
  add column if not exists obligation_status public.obligation_status,
  add column if not exists parser_notes text;

update public.liturgical_days
set weekday = extract(dow from date)::smallint
where weekday is null;

update public.liturgical_days
set weekday_name = trim(to_char(date, 'Day'))
where weekday_name is null;

update public.liturgical_days
set celebration_id = lower(regexp_replace(
  regexp_replace(
    regexp_replace(title, '\([^)]*\)', '', 'g'),
    '[^[:alnum:]]+',
    '_',
    'g'
  ),
  '^_+|_+$',
  '',
  'g'
))
where celebration_id is null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'liturgical_days'
      and column_name = 'is_holy_day_of_obligation'
  ) then
    execute $sql$
      update public.liturgical_days
      set obligation_status = case
          when is_holy_day_of_obligation then 'holy_day'::public.obligation_status
          when rank = 'sunday'::public.liturgical_rank then 'sunday'::public.obligation_status
          else 'none'::public.obligation_status
        end
      where obligation_status is null
    $sql$;
  else
    update public.liturgical_days
    set obligation_status = case
        when rank = 'sunday'::public.liturgical_rank then 'sunday'::public.obligation_status
        else 'none'::public.obligation_status
      end
    where obligation_status is null;
  end if;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'liturgical_days'
      and column_name = 'notes'
  ) then
    execute $sql$
      update public.liturgical_days
      set parser_notes = notes
      where parser_notes is null
        and notes is not null
    $sql$;
  end if;
end;
$$;

alter table public.liturgical_days
  alter column weekday set not null,
  alter column weekday_name set not null,
  alter column celebration_id set not null,
  alter column obligation_status set not null,
  alter column obligation_status set default 'none'::public.obligation_status;

create table if not exists public.liturgical_day_options (
  id uuid primary key default gen_random_uuid(),
  calendar_id text not null references public.calendars(id) on delete cascade,
  date date not null,
  celebration_id text not null,
  title text not null,
  rank public.liturgical_rank,
  color public.liturgical_color,
  country_scope public.country_scope,
  source_id uuid references public.calendar_sources(id) on delete cascade,
  raw_source_text text,
  raw_option_text text,
  parser_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_id, date, celebration_id)
);

alter table public.liturgical_day_options
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists liturgical_days_calendar_date_idx
  on public.liturgical_days (calendar_id, date);

create index if not exists liturgical_days_calendar_celebration_idx
  on public.liturgical_days (calendar_id, celebration_id);

create index if not exists liturgical_days_calendar_rank_date_idx
  on public.liturgical_days (calendar_id, rank, date);

create index if not exists liturgical_day_options_calendar_date_idx
  on public.liturgical_day_options (calendar_id, date);

create index if not exists liturgical_day_options_calendar_celebration_idx
  on public.liturgical_day_options (calendar_id, celebration_id);

drop trigger if exists set_liturgical_day_options_updated_at on public.liturgical_day_options;
create trigger set_liturgical_day_options_updated_at
  before update on public.liturgical_day_options
  for each row execute function public.set_updated_at();

alter table public.liturgical_day_options enable row level security;

drop policy if exists "Liturgical day options are readable" on public.liturgical_day_options;
create policy "Liturgical day options are readable"
  on public.liturgical_day_options for select
  using (true);
