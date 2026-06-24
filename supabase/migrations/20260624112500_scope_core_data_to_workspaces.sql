alter table public.players
add column workspace_id uuid references public.workspaces(id) on delete cascade;

alter table public.events
add column workspace_id uuid references public.workspaces(id) on delete cascade;

insert into public.workspaces (name, personal_owner_app_user_id)
select
  coalesce(nullif(btrim(display_name), ''), email) || '''s workspace',
  id
from public.app_users
on conflict do nothing;

insert into public.workspace_memberships (workspace_id, app_user_id, role)
select id, personal_owner_app_user_id, 'owner'
from public.workspaces
where personal_owner_app_user_id is not null
on conflict (workspace_id, app_user_id) do nothing;

update public.players player
set workspace_id = membership.workspace_id
from public.workspace_memberships membership
where player.workspace_id is null
  and player.app_user_id = membership.app_user_id;

update public.players player
set workspace_id = workspace.id
from public.workspaces workspace
join public.app_users app_user on app_user.id = workspace.personal_owner_app_user_id
where player.workspace_id is null
  and app_user.email = 'asadkhalid305@gmail.com';

update public.events event
set workspace_id = workspace.id
from public.workspaces workspace
join public.app_users app_user on app_user.id = workspace.personal_owner_app_user_id
where event.workspace_id is null
  and app_user.email = 'asadkhalid305@gmail.com';

drop index if exists public.players_name_unique;
drop index if exists public.players_account_email_unique;
drop index if exists public.players_app_user_id_unique;

create index players_workspace_id_idx on public.players(workspace_id);
create index events_workspace_id_idx on public.events(workspace_id);

create unique index players_workspace_name_unique
on public.players(workspace_id, lower(btrim(name)))
where workspace_id is not null;

create unique index players_workspace_account_email_unique
on public.players(workspace_id, account_email)
where workspace_id is not null and account_email is not null;

create unique index players_workspace_app_user_id_unique
on public.players(workspace_id, app_user_id)
where workspace_id is not null and app_user_id is not null;
