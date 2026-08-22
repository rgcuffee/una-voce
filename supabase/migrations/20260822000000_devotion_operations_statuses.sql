alter type public.devotion_status add value if not exists 'draft';
alter type public.devotion_status add value if not exists 'scheduled';
alter type public.devotion_status add value if not exists 'paused';
alter type public.devotion_status add value if not exists 'archived';

create type public.devotion_participant_status as enum (
  'enrolled',
  'active',
  'completed',
  'withdrawn'
);
