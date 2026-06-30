alter table public.partner_youtube_feeds
  add column if not exists import_from_date date;

create unique index if not exists partner_youtube_feeds_rss_url_key
  on public.partner_youtube_feeds (rss_url);

create unique index if not exists partner_classification_rules_partner_name_key
  on public.partner_classification_rules (partner_id, name);
