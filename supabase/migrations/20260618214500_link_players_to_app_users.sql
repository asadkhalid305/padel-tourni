alter table public.players
add column app_user_id uuid references public.app_users(id) on delete set null;

create unique index players_app_user_id_unique
on public.players(app_user_id)
where app_user_id is not null;

update public.players
set app_user_id = app_users.id
from public.app_users
where players.app_user_id is null
  and players.account_email = app_users.email;
