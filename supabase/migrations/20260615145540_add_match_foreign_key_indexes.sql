create index matches_event_round_idx
on public.matches (event_id, round_id);

create index matches_event_team_one_player_one_idx
on public.matches (event_id, team_one_player_one_id);

create index matches_event_team_one_player_two_idx
on public.matches (event_id, team_one_player_two_id);

create index matches_event_team_two_player_one_idx
on public.matches (event_id, team_two_player_one_id);

create index matches_event_team_two_player_two_idx
on public.matches (event_id, team_two_player_two_id);
