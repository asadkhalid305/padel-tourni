create function public.update_scheduled_round_draw(
  p_event_id uuid,
  p_round_id uuid,
  p_assignments jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_status text;
  v_round_number integer;
  v_match_count integer;
  v_duplicate_player_name text;
  v_duplicate_court_number integer;
begin
  select status
  into v_event_status
  from public.events
  where id = p_event_id
  for update;

  if v_event_status is null then
    raise exception 'Event not found.';
  end if;
  if v_event_status = 'completed' then
    raise exception 'Completed events cannot be edited.';
  end if;

  select round_number
  into v_round_number
  from public.event_rounds
  where id = p_round_id and event_id = p_event_id;

  if v_round_number is null then
    raise exception 'Round does not belong to this event.';
  end if;

  -- Serialize draw edits with timer and score changes for every match in the round.
  perform id
  from public.matches
  where event_id = p_event_id and round_id = p_round_id
  for update;

  select count(*)
  into v_match_count
  from public.matches
  where event_id = p_event_id and round_id = p_round_id;

  if jsonb_typeof(p_assignments) <> 'array'
    or jsonb_array_length(p_assignments) <> v_match_count then
    raise exception 'Save every match in the round together.';
  end if;

  if exists (
    select 1
    from public.matches
    where event_id = p_event_id
      and round_id = p_round_id
      and status <> 'scheduled'
  ) then
    raise exception 'Draws are locked once a match starts.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_assignments) as assignment
    where jsonb_typeof(assignment -> 'player_ids') <> 'array'
      or jsonb_array_length(assignment -> 'player_ids') <> 4
  ) then
    raise exception 'Choose four players for every court.';
  end if;

  if (
    select count(distinct (assignment ->> 'match_id')::uuid)
    from jsonb_array_elements(p_assignments) as assignment
  ) <> v_match_count or exists (
    select 1
    from jsonb_array_elements(p_assignments) as assignment
    left join public.matches match
      on match.id = (assignment ->> 'match_id')::uuid
      and match.event_id = p_event_id
      and match.round_id = p_round_id
    where match.id is null
  ) then
    raise exception 'Save every match in the round together.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_assignments) as assignment
    cross join lateral jsonb_array_elements_text(
      assignment -> 'player_ids'
    ) as slot(player_id)
    left join public.event_players player
      on player.id = slot.player_id::uuid
      and player.event_id = p_event_id
    where btrim(slot.player_id) = ''
      or lower(slot.player_id) like '%placeholder%'
      or player.id is null
  ) then
    raise exception 'Every player must belong to this event.';
  end if;

  with slots as (
    select
      (assignment ->> 'match_id')::uuid as match_id,
      slot.player_id::uuid as player_id
    from jsonb_array_elements(p_assignments) as assignment
    cross join lateral jsonb_array_elements_text(
      assignment -> 'player_ids'
    ) as slot(player_id)
  ), duplicate as (
    select slots.match_id, slots.player_id
    from slots
    group by slots.match_id, slots.player_id
    having count(*) > 1
    limit 1
  )
  select player.name_snapshot, match.court_number
  into v_duplicate_player_name, v_duplicate_court_number
  from duplicate
  join public.event_players player
    on player.id = duplicate.player_id and player.event_id = p_event_id
  join public.matches match on match.id = duplicate.match_id;

  if v_duplicate_player_name is not null then
    raise exception '% is selected more than once on Court %.',
      v_duplicate_player_name,
      v_duplicate_court_number;
  end if;

  with slots as (
    select slot.player_id::uuid as player_id
    from jsonb_array_elements(p_assignments) as assignment
    cross join lateral jsonb_array_elements_text(
      assignment -> 'player_ids'
    ) as slot(player_id)
  ), duplicate as (
    select slots.player_id
    from slots
    group by slots.player_id
    having count(*) > 1
    limit 1
  )
  select player.name_snapshot
  into v_duplicate_player_name
  from duplicate
  join public.event_players player
    on player.id = duplicate.player_id and player.event_id = p_event_id;

  if v_duplicate_player_name is not null then
    raise exception '% is assigned more than once in Round %.',
      v_duplicate_player_name,
      v_round_number;
  end if;

  with assignment_rows as (
    select
      (assignment ->> 'match_id')::uuid as match_id,
      assignment -> 'player_ids' as player_ids
    from jsonb_array_elements(p_assignments) as assignment
  )
  update public.matches as match
  set
    team_one_player_one_id = (assignment.player_ids ->> 0)::uuid,
    team_one_player_two_id = (assignment.player_ids ->> 1)::uuid,
    team_two_player_one_id = (assignment.player_ids ->> 2)::uuid,
    team_two_player_two_id = (assignment.player_ids ->> 3)::uuid
  from assignment_rows as assignment
  where match.id = assignment.match_id
    and match.event_id = p_event_id
    and match.round_id = p_round_id;
end;
$$;

revoke all on function public.update_scheduled_round_draw(uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.update_scheduled_round_draw(uuid, uuid, jsonb)
to service_role;
