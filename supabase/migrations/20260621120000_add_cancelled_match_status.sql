alter table public.matches
  drop constraint matches_status_check;

alter table public.matches
  add constraint matches_status_check
  check (status in ('scheduled', 'live', 'paused', 'completed', 'cancelled'));
