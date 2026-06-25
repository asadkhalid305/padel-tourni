create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  invited_email text check (
    invited_email is null
    or (invited_email = lower(btrim(invited_email)) and invited_email <> '')
  ),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_by_app_user_id uuid not null references public.app_users(id) on delete cascade,
  accepted_by_app_user_id uuid references public.app_users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspace_invites_workspace_id_idx
on public.workspace_invites(workspace_id);

create index workspace_invites_status_expires_at_idx
on public.workspace_invites(status, expires_at);

create trigger workspace_invites_set_updated_at
before update on public.workspace_invites
for each row execute function app_private.set_updated_at();

alter table public.workspace_invites enable row level security;

revoke all on table public.workspace_invites from anon, authenticated;

grant all on table public.workspace_invites to service_role;

create policy "Deny direct client access"
on public.workspace_invites
for all
to anon, authenticated
using (false)
with check (false);
