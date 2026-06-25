create or replace function public.update_scheduled_round_draw(
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
  v_assignment_count integer;
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

  if jsonb_typeof(p_assignments) <> 'array'
    or jsonb_array_length(p_assignments) = 0 then
    raise exception 'Choose at least one scheduled match to update.';
  end if;

  select jsonb_array_length(p_assignments)
  into v_assignment_count;

  if (
    select count(distinct (assignment ->> 'match_id')::uuid)
    from jsonb_array_elements(p_assignments) as assignment
  ) <> v_assignment_count then
    raise exception 'Each match can only appear once in a round draw.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_assignments) as assignment
    left join public.matches match
      on match.id = (assignment ->> 'match_id')::uuid
      and match.event_id = p_event_id
      and match.round_id = p_round_id
    where match.id is null
  ) then
    raise exception 'Every match must belong to this round.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_assignments) as assignment
    join public.matches match
      on match.id = (assignment ->> 'match_id')::uuid
      and match.event_id = p_event_id
      and match.round_id = p_round_id
    where match.status <> 'scheduled'
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

  with assignment_slots as (
    select
      (assignment ->> 'match_id')::uuid as match_id,
      slot.player_id::uuid as player_id
    from jsonb_array_elements(p_assignments) as assignment
    cross join lateral jsonb_array_elements_text(
      assignment -> 'player_ids'
    ) as slot(player_id)
  ), duplicate as (
    select assignment_slots.match_id, assignment_slots.player_id
    from assignment_slots
    group by assignment_slots.match_id, assignment_slots.player_id
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

  with assignment_rows as (
    select
      (assignment ->> 'match_id')::uuid as match_id,
      assignment -> 'player_ids' as player_ids
    from jsonb_array_elements(p_assignments) as assignment
  ), round_slots as (
    select
      match.id as match_id,
      match.court_number,
      coalesce(
        assignment.player_ids ->> 0,
        match.team_one_player_one_id::text
      )::uuid as player_one_id,
      coalesce(
        assignment.player_ids ->> 1,
        match.team_one_player_two_id::text
      )::uuid as player_two_id,
      coalesce(
        assignment.player_ids ->> 2,
        match.team_two_player_one_id::text
      )::uuid as player_three_id,
      coalesce(
        assignment.player_ids ->> 3,
        match.team_two_player_two_id::text
      )::uuid as player_four_id
    from public.matches match
    left join assignment_rows assignment on assignment.match_id = match.id
    where match.event_id = p_event_id and match.round_id = p_round_id
  ), slots as (
    select round_slots.match_id, slot.player_id
    from round_slots
    cross join lateral (
      values
        (round_slots.player_one_id),
        (round_slots.player_two_id),
        (round_slots.player_three_id),
        (round_slots.player_four_id)
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
    and match.round_id = p_round_id
    and match.status = 'scheduled';
end;
$$;

revoke all on function public.update_scheduled_round_draw(uuid, uuid, jsonb)
from public, anon, authenticated;

grant execute on function public.update_scheduled_round_draw(uuid, uuid, jsonb)
to service_role;
