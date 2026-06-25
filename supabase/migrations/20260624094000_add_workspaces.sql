create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  personal_owner_app_user_id uuid references public.app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  app_user_id uuid not null references public.app_users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, app_user_id)
);

create unique index workspaces_personal_owner_unique
on public.workspaces(personal_owner_app_user_id)
where personal_owner_app_user_id is not null;

create index workspace_memberships_app_user_id_idx
on public.workspace_memberships(app_user_id);

create index workspace_memberships_workspace_id_role_idx
on public.workspace_memberships(workspace_id, role);

create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute function app_private.set_updated_at();

create trigger workspace_memberships_set_updated_at
before update on public.workspace_memberships
for each row execute function app_private.set_updated_at();

alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;

revoke all on table public.workspaces from anon, authenticated;
revoke all on table public.workspace_memberships from anon, authenticated;

grant all on table public.workspaces to service_role;
grant all on table public.workspace_memberships to service_role;

create policy "Deny direct client access"
on public.workspaces
for all
to anon, authenticated
using (false)
with check (false);

create policy "Deny direct client access"
on public.workspace_memberships
for all
to anon, authenticated
using (false)
with check (false);
