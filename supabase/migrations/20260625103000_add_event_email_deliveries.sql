create table public.event_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_player_id uuid not null references public.event_players(id) on delete cascade,
  recipient_app_user_id uuid references public.app_users(id) on delete set null,
  recipient_email text not null
    check (recipient_email = lower(btrim(recipient_email)) and recipient_email <> ''),
  recipient_name text not null default ''
    check (length(recipient_name) <= 160),
  kind text not null default 'final_standings'
    check (kind in ('final_standings')),
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  provider text,
  provider_message_id text,
  payload_snapshot jsonb not null default '{}'::jsonb,
  error_message text,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, event_id, recipient_email, kind)
);

create index event_email_deliveries_workspace_event_status_idx
on public.event_email_deliveries(workspace_id, event_id, status);

create index event_email_deliveries_event_player_idx
on public.event_email_deliveries(event_player_id);

create trigger event_email_deliveries_set_updated_at
before update on public.event_email_deliveries
for each row execute function app_private.set_updated_at();

alter table public.event_email_deliveries enable row level security;

revoke all on table public.event_email_deliveries from anon, authenticated;

grant all on table public.event_email_deliveries to service_role;

create policy "Deny direct client access"
on public.event_email_deliveries
for all
to anon, authenticated
using (false)
with check (false);
