alter type public.prayer_analytics_event_name add value if not exists 'app_opened';
alter type public.prayer_analytics_event_name add value if not exists 'page_viewed';
alter type public.prayer_analytics_event_name add value if not exists 'navigation_clicked';
alter type public.prayer_analytics_event_name add value if not exists 'community_page_viewed';
alter type public.prayer_analytics_event_name add value if not exists 'community_outbound_clicked';
alter type public.prayer_analytics_event_name add value if not exists 'content_card_viewed';
alter type public.prayer_analytics_event_name add value if not exists 'content_card_clicked';
alter type public.prayer_analytics_event_name add value if not exists 'share_clicked';
alter type public.prayer_analytics_event_name add value if not exists 'search_performed';
alter type public.prayer_analytics_event_name add value if not exists 'filter_changed';
alter type public.prayer_analytics_event_name add value if not exists 'utm_landing_recorded';

alter table public.analytics_events
  add column if not exists page_path text,
  add column if not exists page_context text,
  add column if not exists referrer text,
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists device_class text,
  add column if not exists partner_id uuid references public.partners(id) on delete set null,
  add column if not exists community_slug text,
  add column if not exists content_id text,
  add column if not exists content_type text,
  add column if not exists provider text,
  add column if not exists source_url text;

create index if not exists analytics_events_page_occurred_idx
  on public.analytics_events (page_path, occurred_at desc);

create index if not exists analytics_events_partner_occurred_idx
  on public.analytics_events (partner_id, occurred_at desc)
  where partner_id is not null;

create index if not exists analytics_events_community_occurred_idx
  on public.analytics_events (community_slug, occurred_at desc)
  where community_slug is not null;

create index if not exists analytics_events_provider_occurred_idx
  on public.analytics_events (provider, occurred_at desc)
  where provider is not null;
