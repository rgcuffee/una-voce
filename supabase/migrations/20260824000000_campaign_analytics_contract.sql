-- Local-only, idempotent migration. Applying it is an operator-controlled action.
alter type public.prayer_analytics_event_name add value if not exists 'links_page_viewed';
alter type public.prayer_analytics_event_name add value if not exists 'current_hour_cta_viewed';
alter type public.prayer_analytics_event_name add value if not exists 'current_hour_cta_clicked';
alter type public.prayer_analytics_event_name add value if not exists 'session_started';
alter type public.prayer_analytics_event_name add value if not exists 'session_returned';
alter type public.prayer_analytics_event_name add value if not exists 'pwa_install_eligible';
-- Stored enum compatibility only: no public emitter claims these events this sprint.
alter type public.prayer_analytics_event_name add value if not exists 'pwa_install_prompted';
alter type public.prayer_analytics_event_name add value if not exists 'pwa_install_installed';
alter type public.prayer_analytics_event_name add value if not exists 'devotion_survey_started';
alter type public.prayer_analytics_event_name add value if not exists 'devotion_survey_submitted';
alter type public.prayer_analytics_event_name add value if not exists 'continuation_opened';
alter table public.analytics_events add column if not exists event_id text;
alter table public.analytics_events add column if not exists payload_fingerprint text;
alter table public.analytics_events add column if not exists acquisition_source text;
alter table public.analytics_events add column if not exists acquisition_surface text;
alter table public.analytics_events add column if not exists acquisition_medium text;
alter table public.analytics_events add column if not exists acquisition_campaign text;
alter table public.analytics_events add column if not exists acquisition_content text;
alter table public.analytics_events add column if not exists acquisition_term text;
alter table public.analytics_sessions add column if not exists acquisition_source text;
alter table public.analytics_sessions add column if not exists acquisition_surface text;
alter table public.analytics_sessions add column if not exists acquisition_medium text;
alter table public.analytics_sessions add column if not exists acquisition_campaign text;
alter table public.analytics_sessions add column if not exists acquisition_content text;
alter table public.analytics_sessions add column if not exists acquisition_term text;
do $$ begin alter table public.analytics_events add constraint analytics_events_event_id_unique unique (event_id); exception when duplicate_object then null; end $$;
create index if not exists analytics_events_acquisition_occurred_idx on public.analytics_events (acquisition_source, occurred_at desc);

-- The Function calls this RPC only after this migration is present. PostgreSQL
-- executes the event insert and its session rollup in one transaction: a
-- failure rolls back the insert so the same event can be retried safely.
create or replace function public.record_campaign_analytics_event(p_event jsonb, p_session jsonb)
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare existing_session uuid; existing_fingerprint text; event_name text := p_event->>'event_name'; affected_rows integer;
begin
  insert into public.analytics_events (
    event_id, payload_fingerprint, occurred_at, session_id, event_name, prayer_id, ministry_id, hour, locale, user_id, anonymous_id,
    progress_percent, playback_seconds, page_path, page_context, referrer, utm_source, utm_medium, utm_campaign, utm_content,
    device_class, partner_id, community_slug, content_id, content_type, provider, source_url, metadata, devotion_id,
    devotion_participant_id, pilot_day, prayer_date, resource_id, media_type, acquisition_source, acquisition_surface,
    acquisition_medium, acquisition_campaign, acquisition_content, acquisition_term
  ) values (
    p_event->>'event_id', p_event->>'payload_fingerprint', (p_event->>'occurred_at')::timestamptz, (p_event->>'session_id')::uuid,
    event_name::public.prayer_analytics_event_name, nullif(p_event->>'prayer_id',''), nullif(p_event->>'ministry_id',''),
    p_event->>'hour', p_event->>'locale', nullif(p_event->>'user_id','')::uuid, p_event->>'anonymous_id',
    nullif(p_event->>'progress_percent','')::integer, nullif(p_event->>'playback_seconds','')::integer, p_event->>'page_path',
    p_event->>'page_context', p_event->>'referrer', p_event->>'utm_source', p_event->>'utm_medium', p_event->>'utm_campaign',
    p_event->>'utm_content', p_event->>'device_class', nullif(p_event->>'partner_id','')::uuid, p_event->>'community_slug',
    p_event->>'content_id', p_event->>'content_type', p_event->>'provider', p_event->>'source_url', coalesce(p_event->'metadata','{}'::jsonb),
    nullif(p_event->>'devotion_id','')::uuid, nullif(p_event->>'devotion_participant_id','')::uuid, nullif(p_event->>'pilot_day','')::integer,
    nullif(p_event->>'prayer_date','')::date, p_event->>'resource_id', p_event->>'media_type', p_event->>'acquisition_source',
    p_event->>'acquisition_surface', p_event->>'acquisition_medium', p_event->>'acquisition_campaign', p_event->>'acquisition_content', p_event->>'acquisition_term'
  ) on conflict (event_id) do nothing;
  if not found then
    select session_id, payload_fingerprint into existing_session, existing_fingerprint from public.analytics_events where event_id = p_event->>'event_id';
    if existing_session = (p_event->>'session_id')::uuid and existing_fingerprint = p_event->>'payload_fingerprint' then return jsonb_build_object('status','duplicate'); end if;
    raise exception 'Conflicting analytics event ID' using errcode = '23505';
  end if;
  if event_name = 'prayer_session_started' then
    insert into public.analytics_sessions (session_id, started_at, ministry_id, prayer_id, hour, locale, user_id, anonymous_id, source_name, source_type, provider, video_id, page_context, devotion_id, devotion_participant_id, pilot_day, prayer_date, resource_id, media_type, acquisition_source, acquisition_surface, acquisition_medium, acquisition_campaign, acquisition_content, acquisition_term)
    values ((p_session->>'sessionId')::uuid, (p_session->>'startedAt')::timestamptz, nullif(p_session->>'ministryId',''), nullif(p_session->>'prayerId',''), p_session->>'hour', p_session->>'locale', nullif(p_session->>'userId','')::uuid, p_session->>'anonymousId', p_session->>'sourceName', p_session->>'sourceType', p_session->>'provider', p_session->>'videoId', p_session->>'pageContext', nullif(p_session->>'devotionId','')::uuid, nullif(p_session->>'devotionParticipantId','')::uuid, nullif(p_session->>'pilotDay','')::integer, nullif(p_session->>'prayerDate','')::date, p_session->>'resourceId', p_session->>'mediaType', p_session->>'acquisitionSource', p_session->>'acquisitionSurface', p_session->>'acquisitionMedium', p_session->>'acquisitionCampaign', p_session->>'acquisitionContent', p_session->>'acquisitionTerm')
    on conflict (session_id) do update set acquisition_source = excluded.acquisition_source, acquisition_surface = excluded.acquisition_surface, acquisition_medium = excluded.acquisition_medium, acquisition_campaign = excluded.acquisition_campaign, acquisition_content = excluded.acquisition_content, acquisition_term = excluded.acquisition_term;
  elsif event_name = 'prayer_session_ended' then
    update public.analytics_sessions set ended_at = (p_session->>'occurredAt')::timestamptz, panel_open_seconds = nullif(p_session->>'panelOpenSeconds','')::integer, active_play_seconds = coalesce(nullif(p_session->>'activePlaySeconds','')::integer, 0) where session_id = (p_session->>'sessionId')::uuid;
    get diagnostics affected_rows = row_count; if affected_rows = 0 then raise exception 'Missing prayer analytics session for rollup'; end if;
  elsif event_name in ('source_opened', 'platform_opened') then
    update public.analytics_sessions set opened_source = true where session_id = (p_session->>'sessionId')::uuid;
    get diagnostics affected_rows = row_count; if affected_rows = 0 then raise exception 'Missing prayer analytics session for rollup'; end if;
  elsif event_name = 'prayer_completed' then
    update public.analytics_sessions set completed = true, highest_progress = 100 where session_id = (p_session->>'sessionId')::uuid;
    get diagnostics affected_rows = row_count; if affected_rows = 0 then raise exception 'Missing prayer analytics session for rollup'; end if;
  elsif event_name = 'prayer_progress' then
    update public.analytics_sessions set highest_progress = nullif(p_session->>'progressPercent','')::integer where session_id = (p_session->>'sessionId')::uuid;
    get diagnostics affected_rows = row_count; if affected_rows = 0 then raise exception 'Missing prayer analytics session for rollup'; end if;
  end if;
  return jsonb_build_object('status','inserted');
end $$;
revoke execute on function public.record_campaign_analytics_event(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.record_campaign_analytics_event(jsonb, jsonb) to service_role;
