alter table public.devotions
  drop constraint if exists devotions_duration_days_check;

alter table public.devotions
  add column if not exists description text,
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add constraint devotions_duration_days_check check (duration_days between 1 and 40),
  add constraint scheduled_devotion_requires_schedule check (
    status <> 'scheduled' or (start_date is not null and nullif(trim(timezone), '') is not null)
  );

update public.devotions
set published_at = coalesce(published_at, created_at)
where status in ('active', 'completed');

create table public.devotion_cohorts (
  id uuid primary key default gen_random_uuid(),
  devotion_id uuid not null references public.devotions(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 63),
  name text not null check (char_length(trim(name)) between 1 and 120),
  status public.devotion_status not null default 'draft',
  start_date date,
  timezone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (devotion_id, slug),
  unique (devotion_id, id),
  constraint scheduled_cohort_requires_schedule check (
    status not in ('scheduled', 'active') or
    (start_date is not null and nullif(trim(timezone), '') is not null)
  )
);

create trigger set_devotion_cohorts_updated_at
  before update on public.devotion_cohorts
  for each row execute function public.set_updated_at();

alter table public.devotion_cohorts enable row level security;

create or replace function public.create_devotion_campaign(
  p_description text,
  p_duration_days integer,
  p_hour_key public.liturgical_hour,
  p_name text,
  p_organization_label text,
  p_post_survey_url text,
  p_pre_survey_url text,
  p_slug text,
  p_start_date date,
  p_status public.devotion_status,
  p_timezone text
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  created_devotion public.devotions%rowtype;
  created_cohort public.devotion_cohorts%rowtype;
begin
  insert into public.devotions (
    slug,
    name,
    organization_label,
    description,
    hour_key,
    start_date,
    duration_days,
    timezone,
    status,
    pre_survey_url,
    post_survey_url,
    published_at,
    archived_at
  ) values (
    p_slug,
    p_name,
    p_organization_label,
    p_description,
    p_hour_key,
    p_start_date,
    p_duration_days,
    p_timezone,
    p_status,
    p_pre_survey_url,
    p_post_survey_url,
    case when p_status in ('scheduled', 'active') then now() else null end,
    case when p_status = 'archived' then now() else null end
  ) returning * into created_devotion;

  insert into public.devotion_cohorts (
    devotion_id,
    slug,
    name,
    status,
    start_date,
    timezone,
    archived_at
  ) values (
    created_devotion.id,
    'general',
    'General',
    created_devotion.status,
    created_devotion.start_date,
    created_devotion.timezone,
    created_devotion.archived_at
  ) returning * into created_cohort;

  return jsonb_build_object(
    'devotion', to_jsonb(created_devotion),
    'cohort', to_jsonb(created_cohort)
  );
end;
$$;

revoke all on function public.create_devotion_campaign(
  text,
  integer,
  public.liturgical_hour,
  text,
  text,
  text,
  text,
  text,
  date,
  public.devotion_status,
  text
) from public, anon, authenticated;
grant execute on function public.create_devotion_campaign(
  text,
  integer,
  public.liturgical_hour,
  text,
  text,
  text,
  text,
  text,
  date,
  public.devotion_status,
  text
) to service_role;

comment on function public.create_devotion_campaign(
  text,
  integer,
  public.liturgical_hour,
  text,
  text,
  text,
  text,
  text,
  date,
  public.devotion_status,
  text
) is 'Atomically creates a devotion campaign and its General cohort for service-role admin operations.';

insert into public.devotion_cohorts (
  devotion_id,
  slug,
  name,
  status,
  start_date,
  timezone
)
select
  id,
  'general',
  'General',
  case
    when status = 'active' then 'active'::public.devotion_status
    when status = 'completed' then 'completed'::public.devotion_status
    else 'draft'::public.devotion_status
  end,
  start_date,
  timezone
from public.devotions
on conflict (devotion_id, slug) do nothing;

alter table public.devotion_participants
  add column if not exists cohort_id uuid,
  add column if not exists status public.devotion_participant_status not null default 'enrolled',
  add column if not exists completed_at timestamptz;

update public.devotion_participants participant
set cohort_id = cohort.id
from public.devotion_cohorts cohort
where cohort.devotion_id = participant.devotion_id
  and cohort.slug = 'general'
  and participant.cohort_id is null;

alter table public.devotion_participants
  alter column cohort_id set not null,
  add constraint devotion_participant_cohort_membership
    foreign key (devotion_id, cohort_id)
    references public.devotion_cohorts(devotion_id, id) on delete restrict;

create index devotion_cohorts_devotion_status_idx
  on public.devotion_cohorts (devotion_id, status, start_date);
create index devotion_participants_cohort_status_idx
  on public.devotion_participants (cohort_id, status, created_at);

alter table public.devotion_daily_reports
  drop constraint if exists devotion_daily_reports_pilot_day_check;
alter table public.devotion_daily_reports
  add constraint devotion_daily_reports_pilot_day_check check (pilot_day between 1 and 40);

alter table public.analytics_events
  drop constraint if exists analytics_events_pilot_day_check;
alter table public.analytics_events
  add constraint analytics_events_pilot_day_check check (
    pilot_day is null or pilot_day between 1 and 40
  );

alter table public.analytics_sessions
  drop constraint if exists analytics_sessions_pilot_day_check;
alter table public.analytics_sessions
  add constraint analytics_sessions_pilot_day_check check (
    pilot_day is null or pilot_day between 1 and 40
  );
