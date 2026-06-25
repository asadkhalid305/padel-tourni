do $$
declare
  v_owner_id uuid;
  v_workspace_id uuid;
  v_legacy_player_count integer;
  v_legacy_event_count integer;
begin
  select count(*)
  into v_legacy_player_count
  from public.players;

  select count(*)
  into v_legacy_event_count
  from public.events;

  if v_legacy_player_count = 0 and v_legacy_event_count = 0 then
    return;
  end if;

  select id
  into v_owner_id
  from public.app_users
  where email = 'asadkhalid305@gmail.com';

  if v_owner_id is null then
    raise exception 'Cannot backfill legacy club data: app user % does not exist.',
      'asadkhalid305@gmail.com';
  end if;

  select id
  into v_workspace_id
  from public.workspaces
  where personal_owner_app_user_id = v_owner_id;

  if v_workspace_id is null then
    insert into public.workspaces (name, personal_owner_app_user_id)
    values ('Asad Ullah Khalid''s club', v_owner_id)
    returning id into v_workspace_id;
  end if;

  insert into public.workspace_memberships (workspace_id, app_user_id, role)
  values (v_workspace_id, v_owner_id, 'owner')
  on conflict (workspace_id, app_user_id) do update
  set role = 'owner';

  insert into public.workspace_memberships (workspace_id, app_user_id, role)
  select distinct
    v_workspace_id,
    player.app_user_id,
    case
      when app_user.role in ('super_admin', 'admin') then 'admin'
      else 'member'
    end
  from public.players player
  join public.app_users app_user on app_user.id = player.app_user_id
  where player.app_user_id is not null
    and player.app_user_id <> v_owner_id
  on conflict (workspace_id, app_user_id) do update
  set role = excluded.role;

  update public.players
  set workspace_id = v_workspace_id
  where workspace_id is null
    or workspace_id <> v_workspace_id;

  update public.events
  set workspace_id = v_workspace_id
  where workspace_id is null
    or workspace_id <> v_workspace_id;

  if exists (
    select 1
    from public.players
    where workspace_id is null
  ) then
    raise exception 'Legacy club backfill failed: players remain without workspace_id.';
  end if;

  if exists (
    select 1
    from public.events
    where workspace_id is null
  ) then
    raise exception 'Legacy club backfill failed: events remain without workspace_id.';
  end if;

  if exists (
    select 1
    from public.event_players event_player
    join public.events event on event.id = event_player.event_id
    join public.players player on player.id = event_player.player_id
    where event.workspace_id <> player.workspace_id
  ) then
    raise exception 'Legacy club backfill failed: event players are not in the event workspace.';
  end if;
end $$;
