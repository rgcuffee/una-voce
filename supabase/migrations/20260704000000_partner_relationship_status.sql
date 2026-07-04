do $$
begin
  create type public.partner_relationship_status as enum (
    'curated',
    'verified',
    'partner'
  );
exception
  when duplicate_object then null;
end
$$;

alter table public.partners
  add column if not exists relationship_status public.partner_relationship_status not null default 'curated',
  add column if not exists relationship_status_updated_at timestamptz not null default now(),
  add column if not exists verified_at timestamptz,
  add column if not exists partnered_at timestamptz,
  add column if not exists consent_notes text,
  add column if not exists consent_source text,
  add column if not exists badge_enabled boolean not null default true,
  add column if not exists community_page_enabled boolean not null default false,
  add column if not exists community_page_slug text;

alter table public.partners
  drop constraint if exists partners_community_page_slug_format,
  add constraint partners_community_page_slug_format
    check (
      community_page_slug is null
      or community_page_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    );

create unique index if not exists partners_community_page_slug_key
  on public.partners (community_page_slug)
  where community_page_slug is not null;

create or replace function public.set_partner_relationship_status_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or new.relationship_status is distinct from old.relationship_status then
    new.relationship_status_updated_at = now();

    if new.relationship_status in ('verified', 'partner') and new.verified_at is null then
      new.verified_at = now();
    end if;

    if new.relationship_status = 'partner' and new.partnered_at is null then
      new.partnered_at = now();
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists set_partners_relationship_status_updated_at on public.partners;
create trigger set_partners_relationship_status_updated_at
  before insert or update on public.partners
  for each row
  execute function public.set_partner_relationship_status_updated_at();
