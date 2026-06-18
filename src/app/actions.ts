"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { assertCanRegenerate } from "@/domain/consistency";
import { canEditDrawLineup } from "@/domain/draw-permissions";
import { calculateScheduleCapacity } from "@/domain/schedule-calculations";
import type { ScheduleCapacity } from "@/domain/schedule-calculations";
import { generateSchedule } from "@/domain/scheduler";
import {
  createAuthClient,
  createServerClient,
  requireAdminUser,
} from "@/lib/supabase/server";
import { eventSchema, playerSchema, scoreSchema } from "@/lib/validation";

export type ActionState = {
  ok: boolean;
  message: string;
};

const unavailable: ActionState = {
  ok: false,
  message: "Connect Supabase to enable persistent changes.",
};

const forbidden: ActionState = {
  ok: false,
  message: "Only admins can make changes.",
};

async function assertAdminAction(): Promise<ActionState | null> {
  const user = await requireAdminUser();
  return user ? null : forbidden;
}

export async function signOut() {
  const authClient = await createAuthClient();
  if (authClient) {
    await authClient.auth.signOut();
  }
  redirect("/login");
}

export async function savePlayer(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = playerSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    rating: formData.get("rating"),
    isActive: formData.getAll("isActive").includes("true"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  const authorizationError = await assertAdminAction();
  if (authorizationError) return authorizationError;

  const client = createServerClient();
  if (!client) return unavailable;
  const payload = {
    name: parsed.data.name,
    rating: parsed.data.rating,
    is_active: parsed.data.isActive,
  };
  const result = parsed.data.id
    ? await client.from("players").update(payload).eq("id", parsed.data.id)
    : await client.from("players").insert(payload);
  if (result.error) return { ok: false, message: result.error.message };
  revalidatePath("/players");
  revalidatePath("/");
  return { ok: true, message: "Player saved." };
}

export async function deletePlayer(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = playerSchema.shape.id.unwrap().safeParse(formData.get("id"));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid player to delete." };
  }
  const authorizationError = await assertAdminAction();
  if (authorizationError) return authorizationError;

  const client = createServerClient();
  if (!client) return unavailable;

  const { count, error: referenceError } = await client
    .from("event_players")
    .select("id", { count: "exact", head: true })
    .eq("player_id", parsed.data);
  if (referenceError) {
    return { ok: false, message: referenceError.message };
  }
  if (count) {
    return {
      ok: false,
      message:
        "This player belongs to an event and cannot be deleted. Mark them inactive instead.",
    };
  }

  const { error } = await client.from("players").delete().eq("id", parsed.data);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/players");
  revalidatePath("/");
  revalidatePath("/events/new");
  return { ok: true, message: "Player deleted." };
}

export async function createEvent(formData: FormData) {
  const parsed = eventSchema.safeParse({
    name: formData.get("name"),
    venue: formData.get("venue"),
    startsAt: formData.get("startsAt"),
    courtCount: formData.get("courtCount"),
    courtMinutes: formData.getAll("courtMinutes"),
    requestedRoundMinutes: formData.get("requestedRoundMinutes"),
    breakMinutes: formData.get("breakMinutes"),
    notes: formData.get("notes"),
    playerIds: formData.getAll("playerIds"),
  });
  if (!parsed.success) {
    redirect(
      `/events/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    redirect("/events?error=Only%20admins%20can%20create%20events");
  }

  const client = createServerClient();
  if (!client) {
    redirect("/events/new?error=Connect%20Supabase%20to%20create%20events");
  }

  let capacity: ScheduleCapacity;
  try {
    capacity = calculateScheduleCapacity(parsed.data);
  } catch (error) {
    redirect(
      `/events/new?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Invalid event availability",
      )}`,
    );
  }
  const seed =
    Math.abs(
      Array.from(
        `${parsed.data.name}:${parsed.data.startsAt.toISOString()}`,
      ).reduce(
        (hash, character) => (hash * 31 + character.charCodeAt(0)) | 0,
        17,
      ),
    ) || 1;

  const { data: sourcePlayers, error: playerError } = await client
    .from("players")
    .select("id,name,rating")
    .in("id", parsed.data.playerIds);
  if (playerError || sourcePlayers.length !== parsed.data.playerIds.length) {
    redirect("/events/new?error=One%20or%20more%20players%20are%20invalid");
  }

  const { data: event, error: eventError } = await client
    .from("events")
    .insert({
      name: parsed.data.name,
      venue: parsed.data.venue,
      starts_at: parsed.data.startsAt.toISOString(),
      status: "scheduled",
      seed,
      round_minutes: capacity.roundMinutes,
      break_minutes: parsed.data.breakMinutes,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();
  if (eventError) {
    redirect(`/events/new?error=${encodeURIComponent(eventError.message)}`);
  }

  try {
    const orderedPlayers = parsed.data.playerIds.map((id) => {
      const player = sourcePlayers.find((candidate) => candidate.id === id);
      if (!player) throw new Error("Selected player no longer exists.");
      return player;
    });
    const { data: snapshots, error: snapshotError } = await client
      .from("event_players")
      .insert(
        orderedPlayers.map((player, displayOrder) => ({
          event_id: event.id,
          player_id: player.id,
          name_snapshot: player.name,
          rating_snapshot: Number(player.rating),
          display_order: displayOrder,
        })),
      )
      .select("id,name_snapshot,rating_snapshot");
    if (snapshotError) throw snapshotError;

    const schedule = generateSchedule({
      players: snapshots.map((player) => ({
        id: player.id,
        name: player.name_snapshot,
        rating: Number(player.rating_snapshot),
      })),
      courtCounts: capacity.courtNumbersByRound.map(
        (courtNumbers) => courtNumbers.length,
      ),
      courtNumbersByRound: capacity.courtNumbersByRound,
      seed,
    });

    for (const round of schedule.rounds) {
      const { data: savedRound, error: roundError } = await client
        .from("event_rounds")
        .insert({
          event_id: event.id,
          round_number: round.roundNumber,
          court_count: round.courtCount,
          duration_seconds: capacity.roundMinutes * 60,
        })
        .select("id")
        .single();
      if (roundError) throw roundError;

      const { error: matchError } = await client.from("matches").insert(
        round.matches.map((match) => ({
          event_id: event.id,
          round_id: savedRound.id,
          court_number: match.courtNumber,
          team_one_player_one_id: match.teamOne[0],
          team_one_player_two_id: match.teamOne[1],
          team_two_player_one_id: match.teamTwo[0],
          team_two_player_two_id: match.teamTwo[1],
          timer_duration_seconds: capacity.roundMinutes * 60,
        })),
      );
      if (matchError) throw matchError;
    }
  } catch (error) {
    await client.from("events").delete().eq("id", event.id);
    redirect(
      `/events/new?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Unable to create event",
      )}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function saveScore(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = scoreSchema.safeParse({
    matchId: formData.get("matchId"),
    eventId: formData.get("eventId"),
    teamOneScore: formData.get("teamOneScore"),
    teamTwoScore: formData.get("teamTwoScore"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  const authorizationError = await assertAdminAction();
  if (authorizationError) return authorizationError;

  const client = createServerClient();
  if (!client) return unavailable;

  const { data: existing, error: readError } = await client
    .from("matches")
    .select("status")
    .eq("id", parsed.data.matchId)
    .single();
  if (readError) return { ok: false, message: readError.message };
  if (existing.status === "completed") {
    return { ok: false, message: "Completed scores are locked." };
  }

  const { error } = await client
    .from("matches")
    .update({
      team_one_score: parsed.data.teamOneScore,
      team_two_score: parsed.data.teamTwoScore,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.matchId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/events/${parsed.data.eventId}`);
  return { ok: true, message: "Score recorded." };
}

export async function updateTimer(formData: FormData) {
  const adminUser = await requireAdminUser();
  if (!adminUser) return;

  const client = createServerClient();
  if (!client) return;
  const matchId = String(formData.get("matchId"));
  const eventId = String(formData.get("eventId"));
  const operation = String(formData.get("operation"));
  const now = new Date().toISOString();
  const { data: match } = await client
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();
  if (!match || match.status === "completed") return;

  if (operation === "start" && !match.timer_started_at) {
    await client
      .from("matches")
      .update({ status: "live", timer_started_at: now })
      .eq("id", matchId);
  } else if (operation === "pause" && !match.timer_paused_at) {
    await client
      .from("matches")
      .update({ status: "paused", timer_paused_at: now })
      .eq("id", matchId);
  } else if (operation === "resume" && match.timer_paused_at) {
    const pauseSeconds = Math.floor(
      (Date.now() - new Date(match.timer_paused_at).getTime()) / 1000,
    );
    await client
      .from("matches")
      .update({
        status: "live",
        timer_paused_at: null,
        timer_accumulated_pause_seconds:
          match.timer_accumulated_pause_seconds + Math.max(0, pauseSeconds),
      })
      .eq("id", matchId);
  }
  revalidatePath(`/events/${eventId}`);
}

export async function updateMatchLineup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const matchId = String(formData.get("matchId"));
  const eventId = String(formData.get("eventId"));
  const playerIds = formData.getAll("playerIds").map(String);
  if (
    !matchId ||
    !eventId ||
    playerIds.length !== 4 ||
    new Set(playerIds).size !== 4 ||
    playerIds.some(
      (id) => !id.trim() || id.toLowerCase().includes("placeholder"),
    )
  ) {
    return { ok: false, message: "Choose four distinct players." };
  }
  const authorizationError = await assertAdminAction();
  if (authorizationError) return authorizationError;

  const client = createServerClient();
  if (!client) return unavailable;
  const { data: match, error: readError } = await client
    .from("matches")
    .select("status")
    .eq("id", matchId)
    .eq("event_id", eventId)
    .single();
  if (readError) return { ok: false, message: readError.message };

  const { data: event, error: eventError } = await client
    .from("events")
    .select("status")
    .eq("id", eventId)
    .single();
  if (eventError) return { ok: false, message: eventError.message };

  if (
    !canEditDrawLineup({
      canManage: true,
      eventStatus: event.status,
      matchStatus: match.status,
    })
  ) {
    return { ok: false, message: "Completed draws are locked." };
  }

  const { data: validPlayers, error: playerError } = await client
    .from("event_players")
    .select("id")
    .eq("event_id", eventId)
    .in("id", playerIds);
  if (playerError || validPlayers.length !== 4) {
    return { ok: false, message: "Every player must belong to this event." };
  }

  const { error } = await client
    .from("matches")
    .update({
      team_one_player_one_id: playerIds[0],
      team_one_player_two_id: playerIds[1],
      team_two_player_one_id: playerIds[2],
      team_two_player_two_id: playerIds[3],
    })
    .eq("id", matchId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true, message: "Draw updated." };
}

export async function regenerateEvent(formData: FormData) {
  const adminUser = await requireAdminUser();
  if (!adminUser) return;

  const client = createServerClient();
  if (!client) return;
  const eventId = String(formData.get("eventId"));
  const { data: matches } = await client
    .from("matches")
    .select("status")
    .eq("event_id", eventId);
  assertCanRegenerate(matches?.map((match) => match.status) ?? []);
}
