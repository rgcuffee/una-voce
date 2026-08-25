create type public.devotion_survey_phase as enum ('pre', 'post');
create type public.devotion_survey_status as enum ('partial', 'submitted');

create or replace function public.is_valid_devotion_survey_response(
  p_phase public.devotion_survey_phase,
  p_status public.devotion_survey_status,
  p_answers jsonb
)
returns boolean
language plpgsql
immutable
strict
set search_path = public, pg_temp
as $$
declare
  answer_key text;
  friction_item text;
  allowed_keys text[];
  required_keys text[];
begin
  if jsonb_typeof(p_answers) <> 'object' or pg_column_size(p_answers) > 4096 then
    return false;
  end if;

  if p_phase = 'pre' then
    allowed_keys := array['liturgyFamiliarity', 'massFrequency', 'prayerFrequency', 'hourConfidence', 'friction', 'continueLikelihood'];
    required_keys := allowed_keys;
  else
    allowed_keys := array['hourConfidence', 'friction', 'continueLikelihood', 'experienceRating', 'continuedAfterWindow'];
    required_keys := array['hourConfidence', 'friction', 'continueLikelihood', 'experienceRating'];
  end if;

  for answer_key in select jsonb_object_keys(p_answers) loop
    if not (answer_key = any(allowed_keys)) then return false; end if;
  end loop;

  if p_answers ? 'liturgyFamiliarity' and p_answers->>'liturgyFamiliarity' not in ('not_familiar', 'a_little', 'somewhat', 'very') then return false; end if;
  if p_answers ? 'massFrequency' and p_answers->>'massFrequency' not in ('rarely', 'few_times_year', 'monthly', 'weekly_or_more') then return false; end if;
  if p_answers ? 'prayerFrequency' and p_answers->>'prayerFrequency' not in ('rarely', 'few_times_month', 'few_times_week', 'daily') then return false; end if;
  if p_answers ? 'continuedAfterWindow' and p_answers->>'continuedAfterWindow' not in ('yes', 'no', 'not_sure', 'not_applicable') then return false; end if;

  foreach answer_key in array array['hourConfidence', 'continueLikelihood', 'experienceRating'] loop
    if p_answers ? answer_key and (
      jsonb_typeof(p_answers->answer_key) <> 'number' or
      not (p_answers->>answer_key ~ '^[1-5]$')
    ) then return false; end if;
  end loop;

  if p_answers ? 'friction' then
    if jsonb_typeof(p_answers->'friction') <> 'array' or jsonb_array_length(p_answers->'friction') > 6 then return false; end if;
    for friction_item in select jsonb_array_elements_text(p_answers->'friction') loop
      if friction_item not in ('none', 'finding_time', 'knowing_how', 'technology', 'content_length', 'other') then return false; end if;
    end loop;
    if jsonb_array_length(p_answers->'friction') <> (
      select count(distinct item) from jsonb_array_elements_text(p_answers->'friction') item
    ) then return false; end if;
    if p_answers->'friction' ? 'none' and jsonb_array_length(p_answers->'friction') > 1 then return false; end if;
  end if;

  if p_status = 'submitted' then
    foreach answer_key in array required_keys loop
      if not (p_answers ? answer_key) then return false; end if;
    end loop;
    if jsonb_array_length(p_answers->'friction') = 0 then return false; end if;
  end if;

  return true;
exception when others then
  return false;
end;
$$;

create table public.devotion_survey_responses (
  id uuid primary key default gen_random_uuid(),
  devotion_id uuid not null references public.devotions(id) on delete cascade,
  participant_id uuid not null,
  phase public.devotion_survey_phase not null,
  status public.devotion_survey_status not null default 'partial',
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint devotion_survey_participant_membership foreign key (devotion_id, participant_id)
    references public.devotion_participants(devotion_id, id) on delete cascade,
  constraint devotion_survey_completion_timestamp check (
    (status = 'submitted' and submitted_at is not null) or
    (status = 'partial' and submitted_at is null)
  ),
  constraint devotion_survey_answers_valid check (
    public.is_valid_devotion_survey_response(phase, status, answers)
  ),
  unique (devotion_id, participant_id, phase)
);

create index devotion_survey_responses_devotion_phase_status_idx
  on public.devotion_survey_responses (devotion_id, phase, status, updated_at desc);

create trigger set_devotion_survey_responses_updated_at
  before update on public.devotion_survey_responses
  for each row execute function public.set_updated_at();

alter table public.devotion_survey_responses enable row level security;

create or replace function public.upsert_devotion_survey_response(
  p_answers jsonb,
  p_devotion_id uuid,
  p_participant_id uuid,
  p_phase public.devotion_survey_phase,
  p_status public.devotion_survey_status
)
returns setof public.devotion_survey_responses
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  saved public.devotion_survey_responses%rowtype;
begin
  insert into public.devotion_survey_responses (
    devotion_id,
    participant_id,
    phase,
    status,
    answers,
    submitted_at
  ) values (
    p_devotion_id,
    p_participant_id,
    p_phase,
    p_status,
    p_answers,
    case when p_status = 'submitted' then now() else null end
  )
  on conflict (devotion_id, participant_id, phase) do update
  set
    answers = excluded.answers,
    status = excluded.status,
    submitted_at = case
      when excluded.status = 'submitted' then coalesce(devotion_survey_responses.submitted_at, now())
      else null
    end
  where
    not (devotion_survey_responses.status = 'submitted' and excluded.status = 'partial')
    and (
      devotion_survey_responses.answers is distinct from excluded.answers or
      devotion_survey_responses.status is distinct from excluded.status
    )
  returning * into saved;

  if saved.id is null then
    select * into strict saved
    from public.devotion_survey_responses
    where devotion_id = p_devotion_id
      and participant_id = p_participant_id
      and phase = p_phase;
  end if;

  return next saved;
end;
$$;

revoke all on function public.upsert_devotion_survey_response(
  jsonb,
  uuid,
  uuid,
  public.devotion_survey_phase,
  public.devotion_survey_status
) from public, anon, authenticated;
grant execute on function public.upsert_devotion_survey_response(
  jsonb,
  uuid,
  uuid,
  public.devotion_survey_phase,
  public.devotion_survey_status
) to service_role;

comment on table public.devotion_survey_responses is
  'First-party campaign survey responses pseudonymously linked by participant UUID; raw link tokens are never stored.';
comment on function public.upsert_devotion_survey_response(
  jsonb,
  uuid,
  uuid,
  public.devotion_survey_phase,
  public.devotion_survey_status
) is
  'Service-role survey upsert that preserves first-start/first-submit timestamps, rejects completion regression, and leaves identical retries unchanged.';
