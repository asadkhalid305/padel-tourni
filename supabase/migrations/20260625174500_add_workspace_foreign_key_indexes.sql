create index players_app_user_id_idx
on public.players(app_user_id)
where app_user_id is not null;

create index workspace_invites_created_by_app_user_id_idx
on public.workspace_invites(created_by_app_user_id);

create index workspace_invites_accepted_by_app_user_id_idx
on public.workspace_invites(accepted_by_app_user_id)
where accepted_by_app_user_id is not null;
