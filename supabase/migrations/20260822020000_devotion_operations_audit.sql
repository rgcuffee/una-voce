create table public.devotion_admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id text not null check (char_length(actor_id) between 1 and 160),
  actor_email text check (actor_email is null or char_length(actor_email) <= 320),
  actor_role text not null check (actor_role in ('owner', 'editor', 'viewer')),
  action text not null check (action ~ '^[a-z][a-zA-Z0-9]{1,79}$'),
  devotion_id uuid references public.devotions(id) on delete set null,
  cohort_id uuid references public.devotion_cohorts(id) on delete set null,
  participant_id uuid references public.devotion_participants(id) on delete set null,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default now()
);

create index devotion_admin_audit_created_idx
  on public.devotion_admin_audit (created_at desc);
create index devotion_admin_audit_devotion_created_idx
  on public.devotion_admin_audit (devotion_id, created_at desc);

alter table public.devotion_admin_audit enable row level security;

comment on table public.devotion_admin_audit is
  'Service-role-only devotion administration history. Never stores participant tokens or request credentials.';
