create extension if not exists pgcrypto;

create schema if not exists app_private;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 80),
  rating numeric(3, 1) not null default 5 check (rating between 1 and 10),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index players_name_unique on public.players (lower(btrim(name)));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  venue text not null default '',
  starts_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'live', 'completed', 'archived')),
  seed integer not null default 1,
  round_minutes integer not null default 20 check (round_minutes between 5 and 120),
  break_minutes integer not null default 3 check (break_minutes between 0 and 30),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_players (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete restrict,
  name_snapshot text not null check (length(btrim(name_snapshot)) between 2 and 80),
  rating_snapshot numeric(3, 1) not null check (rating_snapshot between 1 and 10),
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  unique (event_id, player_id),
  unique (event_id, display_order),
  unique (event_id, id)
);

create table public.event_rounds (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  court_count integer not null check (court_count > 0),
  starts_at timestamptz,
  duration_seconds integer not null check (duration_seconds between 300 and 7200),
  created_at timestamptz not null default now(),
  unique (event_id, round_number),
  unique (event_id, id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  round_id uuid not null,
  court_number integer not null check (court_number > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'paused', 'completed')),
  team_one_player_one_id uuid not null,
  team_one_player_two_id uuid not null,
  team_two_player_one_id uuid not null,
  team_two_player_two_id uuid not null,
  team_one_score integer check (team_one_score between 0 and 99),
  team_two_score integer check (team_two_score between 0 and 99),
  timer_started_at timestamptz,
  timer_paused_at timestamptz,
  timer_accumulated_pause_seconds integer not null default 0
    check (timer_accumulated_pause_seconds >= 0),
  timer_duration_seconds integer not null check (timer_duration_seconds between 300 and 7200),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (event_id, round_id)
    references public.event_rounds(event_id, id) on delete cascade,
  foreign key (event_id, team_one_player_one_id)
    references public.event_players(event_id, id) on delete restrict,
  foreign key (event_id, team_one_player_two_id)
    references public.event_players(event_id, id) on delete restrict,
  foreign key (event_id, team_two_player_one_id)
    references public.event_players(event_id, id) on delete restrict,
  foreign key (event_id, team_two_player_two_id)
    references public.event_players(event_id, id) on delete restrict,
  unique (round_id, court_number),
  check (
    team_one_player_one_id <> team_one_player_two_id
    and team_one_player_one_id <> team_two_player_one_id
    and team_one_player_one_id <> team_two_player_two_id
    and team_one_player_two_id <> team_two_player_one_id
    and team_one_player_two_id <> team_two_player_two_id
    and team_two_player_one_id <> team_two_player_two_id
  ),
  check (
    (status = 'completed' and team_one_score is not null and team_two_score is not null and completed_at is not null)
    or status <> 'completed'
  )
);

create index event_players_player_id_idx on public.event_players(player_id);
create index event_rounds_event_id_idx on public.event_rounds(event_id);
create index matches_event_id_idx on public.matches(event_id);
create index matches_round_id_idx on public.matches(round_id);
create index events_starts_at_idx on public.events(starts_at desc);

create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function app_private.protect_completed_match()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'completed' then
      raise exception 'Completed matches cannot be deleted';
    end if;
    return old;
  end if;

  if old.status = 'completed' and (
    new.status is distinct from old.status
    or new.event_id is distinct from old.event_id
    or new.round_id is distinct from old.round_id
    or new.court_number is distinct from old.court_number
    or new.team_one_player_one_id is distinct from old.team_one_player_one_id
    or new.team_one_player_two_id is distinct from old.team_one_player_two_id
    or new.team_two_player_one_id is distinct from old.team_two_player_one_id
    or new.team_two_player_two_id is distinct from old.team_two_player_two_id
    or new.team_one_score is distinct from old.team_one_score
    or new.team_two_score is distinct from old.team_two_score
    or new.completed_at is distinct from old.completed_at
  ) then
    raise exception 'Completed matches cannot be overwritten';
  end if;
  return new;
end;
$$;

create trigger players_set_updated_at
before update on public.players
for each row execute function app_private.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function app_private.set_updated_at();

create trigger matches_set_updated_at
before update on public.matches
for each row execute function app_private.set_updated_at();

create trigger matches_protect_completed
before update or delete on public.matches
for each row execute function app_private.protect_completed_match();

alter table public.players enable row level security;
alter table public.events enable row level security;
alter table public.event_players enable row level security;
alter table public.event_rounds enable row level security;
alter table public.matches enable row level security;

revoke all on table public.players from anon, authenticated;
revoke all on table public.events from anon, authenticated;
revoke all on table public.event_players from anon, authenticated;
revoke all on table public.event_rounds from anon, authenticated;
revoke all on table public.matches from anon, authenticated;

grant all on table public.players to service_role;
grant all on table public.events to service_role;
grant all on table public.event_players to service_role;
grant all on table public.event_rounds to service_role;
grant all on table public.matches to service_role;
