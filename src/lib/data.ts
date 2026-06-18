import "server-only";

import { calculateStandings } from "@/domain/standings";
import type {
  CompletedMatch,
  PlayerSeed,
  ScheduledMatch,
} from "@/domain/types";
import { demoEvent, demoEvents, demoPlayers } from "@/lib/demo-data";
import type { AppUserRole } from "@/lib/roles";
import {
  createServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type PlayerRecord = {
  id: string;
  name: string;
  accountEmail: string | null;
  accountRole: AppUserRole | null;
  rating: number;
  isActive: boolean;
};

type EventSummary = {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  status: string;
  playerCount: number;
  completedMatches: number;
  totalMatches: number;
};

export type EventMatch = ScheduledMatch & {
  status: string;
  teamOneScore: number | null;
  teamTwoScore: number | null;
  timerStartedAt: string | null;
  timerPausedAt: string | null;
  timerAccumulatedPauseSeconds: number;
  timerDurationSeconds: number;
};

type EventSummaryQuery = Pick<
  Database["public"]["Tables"]["events"]["Row"],
  "id" | "name" | "venue" | "starts_at" | "status"
> & {
  event_players: { count: number }[];
  matches: { status: string }[];
};

type MatchRow = Database["public"]["Tables"]["matches"]["Row"];
type RoundWithMatches = Database["public"]["Tables"]["event_rounds"]["Row"] & {
  matches: MatchRow[];
};

export async function listPlayers(): Promise<PlayerRecord[]> {
  const client = createServerClient();
  if (!client) {
    return demoPlayers.map((player) => ({
      ...player,
      accountEmail: null,
      accountRole: null,
      isActive: true,
    }));
  }

  const { data, error } = await client
    .from("players")
    .select("id,name,account_email,rating,is_active")
    .order("is_active", { ascending: false })
    .order("name");
  if (error) throw error;

  const emails = data
    .map((player) => player.account_email)
    .filter((email): email is string => Boolean(email));
  const roleByEmail = new Map<string, AppUserRole>();
  if (emails.length) {
    const { data: users, error: usersError } = await client
      .from("app_users")
      .select("email,role")
      .in("email", emails);
    if (usersError) throw usersError;
    users.forEach((user) => roleByEmail.set(user.email, user.role));
  }

  return data.map((player) => ({
    id: player.id,
    name: player.name,
    accountEmail: player.account_email,
    accountRole: player.account_email
      ? (roleByEmail.get(player.account_email) ?? null)
      : null,
    rating: Number(player.rating),
    isActive: player.is_active,
  }));
}

export async function listEvents(): Promise<EventSummary[]> {
  const client = createServerClient();
  if (!client) {
    return demoEvents.map((event) => ({
      id: event.id,
      name: event.name,
      venue: event.venue,
      startsAt: event.startsAt,
      status: event.status,
      playerCount: event.players.length,
      completedMatches: event.completedMatches.length,
      totalMatches: event.schedule.rounds.flatMap((round) => round.matches)
        .length,
    }));
  }

  const { data, error } = await client
    .from("events")
    .select(
      "id,name,venue,starts_at,status,event_players(count),matches(status)",
    )
    .order("starts_at", { ascending: false });
  if (error) throw error;

  const eventRows = data as unknown as EventSummaryQuery[];
  return eventRows.map((event) => {
    const matches = event.matches;
    const playerAggregate = event.event_players;
    return {
      id: event.id,
      name: event.name,
      venue: event.venue,
      startsAt: event.starts_at,
      status: event.status,
      playerCount: playerAggregate[0]?.count ?? 0,
      completedMatches: matches.filter((match) => match.status === "completed")
        .length,
      totalMatches: matches.length,
    };
  });
}

export async function getEvent(eventId: string) {
  if (!isSupabaseConfigured() && eventId.startsWith("demo-event")) {
    return { ...demoEvent, id: eventId };
  }

  const client = createServerClient();
  if (!client) return null;

  const [{ data: event, error: eventError }, playersResult, roundsResult] =
    await Promise.all([
      client.from("events").select("*").eq("id", eventId).single(),
      client
        .from("event_players")
        .select("*")
        .eq("event_id", eventId)
        .order("display_order"),
      client
        .from("event_rounds")
        .select("*,matches(*)")
        .eq("event_id", eventId)
        .order("round_number"),
    ]);

  if (eventError) return null;
  if (playersResult.error) throw playersResult.error;
  if (roundsResult.error) throw roundsResult.error;

  const players: PlayerSeed[] = playersResult.data.map((player) => ({
    id: player.id,
    name: player.name_snapshot,
    rating: Number(player.rating_snapshot),
  }));
  const playerById = new Map(players.map((player) => [player.id, player]));
  const completedMatches: CompletedMatch[] = [];
  const rounds = roundsResult.data as unknown as RoundWithMatches[];

  const schedule = {
    seed: event.seed,
    rounds: rounds.map((round) => {
      const matches = round.matches
        .slice()
        .sort((first, second) => first.court_number - second.court_number)
        .map((match): EventMatch => {
          const scheduled = {
            id: match.id,
            roundNumber: round.round_number,
            courtNumber: match.court_number,
            teamOne: [
              match.team_one_player_one_id,
              match.team_one_player_two_id,
            ] as [string, string],
            teamTwo: [
              match.team_two_player_one_id,
              match.team_two_player_two_id,
            ] as [string, string],
          };
          if (
            match.status === "completed" &&
            match.team_one_score !== null &&
            match.team_two_score !== null
          ) {
            completedMatches.push({
              ...scheduled,
              status: "completed",
              teamOneScore: match.team_one_score,
              teamTwoScore: match.team_two_score,
            });
          }
          return {
            ...scheduled,
            status: match.status,
            teamOneScore: match.team_one_score,
            teamTwoScore: match.team_two_score,
            timerStartedAt: match.timer_started_at,
            timerPausedAt: match.timer_paused_at,
            timerAccumulatedPauseSeconds: match.timer_accumulated_pause_seconds,
            timerDurationSeconds: match.timer_duration_seconds,
          };
        });
      const playing = new Set(
        matches.flatMap((match) => [...match.teamOne, ...match.teamTwo]),
      );
      return {
        roundNumber: round.round_number,
        courtCount: round.court_count,
        matches,
        restingPlayerIds: players
          .filter((player) => !playing.has(player.id))
          .map((player) => player.id),
      };
    }),
  };

  return {
    id: event.id,
    name: event.name,
    venue: event.venue,
    startsAt: event.starts_at,
    status: event.status,
    seed: event.seed,
    roundMinutes: event.round_minutes,
    breakMinutes: event.break_minutes,
    notes: event.notes,
    players,
    playerById,
    schedule,
    completedMatches,
    standings: calculateStandings(players, completedMatches),
  };
}

export async function getHistoricalPlayerStats() {
  const client = createServerClient();
  if (!client) {
    return demoEvent.standings.map((standing) => ({
      playerId: standing.playerId,
      playerName: standing.playerName,
      events: 2,
      matches: standing.played * 2,
      wins: standing.wins * 2,
      averagePoints: standing.averagePoints,
      winRate: standing.winRate,
    }));
  }

  const [snapshotsResult, matchesResult] = await Promise.all([
    client.from("event_players").select("id,player_id,name_snapshot,event_id"),
    client
      .from("matches")
      .select(
        "event_id,team_one_player_one_id,team_one_player_two_id,team_two_player_one_id,team_two_player_two_id,team_one_score,team_two_score",
      )
      .eq("status", "completed"),
  ]);
  if (snapshotsResult.error) throw snapshotsResult.error;
  if (matchesResult.error) throw matchesResult.error;

  const snapshotById = new Map(
    snapshotsResult.data.map((snapshot) => [snapshot.id, snapshot]),
  );
  const stats = new Map<
    string,
    {
      playerId: string;
      playerName: string;
      events: Set<string>;
      matches: number;
      wins: number;
      points: number;
    }
  >();

  for (const match of matchesResult.data) {
    const teams = [
      {
        ids: [match.team_one_player_one_id, match.team_one_player_two_id],
        points: match.team_one_score ?? 0,
        won: (match.team_one_score ?? 0) > (match.team_two_score ?? 0),
      },
      {
        ids: [match.team_two_player_one_id, match.team_two_player_two_id],
        points: match.team_two_score ?? 0,
        won: (match.team_two_score ?? 0) > (match.team_one_score ?? 0),
      },
    ];
    for (const team of teams) {
      for (const snapshotId of team.ids) {
        const snapshot = snapshotById.get(snapshotId);
        if (!snapshot) continue;
        const current = stats.get(snapshot.player_id) ?? {
          playerId: snapshot.player_id,
          playerName: snapshot.name_snapshot,
          events: new Set<string>(),
          matches: 0,
          wins: 0,
          points: 0,
        };
        current.events.add(match.event_id);
        current.matches += 1;
        current.wins += team.won ? 1 : 0;
        current.points += team.points;
        stats.set(snapshot.player_id, current);
      }
    }
  }

  return [...stats.values()]
    .map((row) => ({
      ...row,
      events: row.events.size,
      averagePoints: row.matches ? row.points / row.matches : 0,
      winRate: row.matches ? row.wins / row.matches : 0,
    }))
    .sort(
      (first, second) =>
        second.winRate - first.winRate ||
        second.averagePoints - first.averagePoints ||
        first.playerName.localeCompare(second.playerName),
    );
}
