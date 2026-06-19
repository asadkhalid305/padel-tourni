"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { assertCanRegenerate } from "@/domain/consistency";
import { canEditDrawLineup } from "@/domain/draw-permissions";
import {
  canChangeEventSchedule,
  canDeleteEvent as canDeleteEventRecord,
  canEditEventDetails,
} from "@/domain/event-mutations";
import { effectiveEventStatus } from "@/domain/event-status";
import { assertValidRoundLineup } from "@/domain/lineup-validation";
import { calculateScheduleCapacity } from "@/domain/schedule-calculations";
import type { ScheduleCapacity } from "@/domain/schedule-calculations";
import { generateSchedule } from "@/domain/scheduler";
import {
  createAuthClient,
  createServerClient,
  requireAdminUser,
  requireSuperAdminUser,
} from "@/lib/supabase/server";
import { appUserRoleSchema, setAppUserRole } from "@/lib/auth-admin";
import { eventSchema, playerSchema, scoreSchema } from "@/lib/validation";
import type { Database } from "@/types/database";

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

const roleChangeSchema = z.object({
  appUserId: z.string().uuid(),
  role: appUserRoleSchema,
});

const eventIdSchema = z.string().uuid();
type EventInput = z.infer<typeof eventSchema>;
type ServerClient = NonNullable<ReturnType<typeof createServerClient>>;
type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventPlayerSnapshot = Pick<
  Database["public"]["Tables"]["event_players"]["Row"],
  "player_id" | "display_order"
>;
type RoundCapacityRow = Pick<
  Database["public"]["Tables"]["event_rounds"]["Row"],
  "round_number" | "court_count" | "duration_seconds"
> & {
  matches: Pick<
    Database["public"]["Tables"]["matches"]["Row"],
    "court_number"
  >[];
};

const roundLineupSchema = z
  .object({
    eventId: z.string().uuid(),
    roundNumber: z.coerce.number().int().positive(),
    matchIds: z.array(z.string().uuid()).min(1),
    playerIds: z.array(z.string().uuid()).min(4),
  })
  .superRefine((draw, context) => {
    if (new Set(draw.matchIds).size !== draw.matchIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each match can only appear once in a round draw.",
        path: ["matchIds"],
      });
    }
    if (draw.playerIds.length !== draw.matchIds.length * 4) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose four players for every court.",
        path: ["playerIds"],
      });
    }
  });

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
    accountEmail: formData.get("accountEmail"),
    appUserId: formData.get("appUserId"),
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
  let accountEmail = parsed.data.accountEmail;
  if (parsed.data.appUserId) {
    const { data: appUser, error: appUserError } = await client
      .from("app_users")
      .select("email")
      .eq("id", parsed.data.appUserId)
      .single();
    if (appUserError) return { ok: false, message: appUserError.message };
    accountEmail = appUser.email;
  }
  const payload = {
    name: parsed.data.name,
    app_user_id: parsed.data.appUserId,
    account_email: accountEmail,
    rating: parsed.data.rating,
    is_active: parsed.data.isActive,
  };
  const result = parsed.data.id
    ? await client.from("players").update(payload).eq("id", parsed.data.id)
    : await client.from("players").insert(payload);
  if (isUndefinedColumnError(result.error)) {
    const fallbackPayload = {
      name: payload.name,
      account_email: payload.account_email,
      rating: payload.rating,
      is_active: payload.is_active,
    };
    const fallbackResult = parsed.data.id
      ? await client
          .from("players")
          .update(fallbackPayload)
          .eq("id", parsed.data.id)
      : await client.from("players").insert(fallbackPayload);
    if (fallbackResult.error) {
      return { ok: false, message: fallbackResult.error.message };
    }
  } else if (result.error) {
    return { ok: false, message: result.error.message };
  }
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

export async function setPlayerAdminRole(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = roleChangeSchema.safeParse({
    appUserId: formData.get("appUserId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }

  const superAdminUser = await requireSuperAdminUser();
  if (!superAdminUser) {
    return {
      ok: false,
      message: "Only super admins can change account roles.",
    };
  }

  const result = await setAppUserRole(parsed.data.appUserId, parsed.data.role);
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath("/players");
  return {
    ok: true,
    message: `Role updated to ${parsed.data.role.replace("_", " ")}.`,
  };
}

function parseEventFormData(formData: FormData) {
  return eventSchema.safeParse({
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
}

function eventSeed(event: EventInput) {
  return (
    Math.abs(
      Array.from(`${event.name}:${event.startsAt.toISOString()}`).reduce(
        (hash, character) => (hash * 31 + character.charCodeAt(0)) | 0,
        17,
      ),
    ) || 1
  );
}

async function getOrderedSourcePlayers(
  client: ServerClient,
  playerIds: string[],
) {
  const { data: sourcePlayers, error: playerError } = await client
    .from("players")
    .select("id,name,rating")
    .in("id", playerIds);
  if (playerError || sourcePlayers.length !== playerIds.length) {
    throw new Error("One or more players are invalid.");
  }

  return playerIds.map((id) => {
    const player = sourcePlayers.find((candidate) => candidate.id === id);
    if (!player) throw new Error("Selected player no longer exists.");
    return player;
  });
}

async function insertEventSchedule(options: {
  client: ServerClient;
  eventId: string;
  event: EventInput;
  capacity: ScheduleCapacity;
  seed: number;
}) {
  const { client, eventId, event, capacity, seed } = options;
  const orderedPlayers = await getOrderedSourcePlayers(client, event.playerIds);
  const { data: snapshots, error: snapshotError } = await client
    .from("event_players")
    .insert(
      orderedPlayers.map((player, displayOrder) => ({
        event_id: eventId,
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
        event_id: eventId,
        round_number: round.roundNumber,
        court_count: round.courtCount,
        duration_seconds: capacity.roundMinutes * 60,
      })
      .select("id")
      .single();
    if (roundError) throw roundError;

    const { error: matchError } = await client.from("matches").insert(
      round.matches.map((match) => ({
        event_id: eventId,
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
}

function sameOrderedValues(
  first: readonly unknown[],
  second: readonly unknown[],
) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function courtNumbersByRound(rounds: RoundCapacityRow[]) {
  return rounds
    .slice()
    .sort((first, second) => first.round_number - second.round_number)
    .map((round) =>
      round.matches
        .map((match) => match.court_number)
        .sort((first, second) => first - second),
    );
}

function hasDrawChanges(options: {
  event: EventRow;
  players: EventPlayerSnapshot[];
  rounds: RoundCapacityRow[];
  nextEvent: EventInput;
  nextCapacity: ScheduleCapacity;
}) {
  const { event, players, rounds, nextEvent, nextCapacity } = options;
  const existingPlayerIds = players
    .slice()
    .sort((first, second) => first.display_order - second.display_order)
    .map((player) => player.player_id);
  const existingCourtsByRound = courtNumbersByRound(rounds);

  return (
    event.round_minutes !== nextCapacity.roundMinutes ||
    event.break_minutes !== nextEvent.breakMinutes ||
    !sameOrderedValues(existingPlayerIds, nextEvent.playerIds) ||
    existingCourtsByRound.length !== nextCapacity.courtNumbersByRound.length ||
    existingCourtsByRound.some(
      (courtNumbers, index) =>
        !sameOrderedValues(
          courtNumbers,
          nextCapacity.courtNumbersByRound[index] ?? [],
        ),
    )
  );
}

function hasStartTimeChange(currentStartsAt: string, nextStartsAt: Date) {
  return new Date(currentStartsAt).getTime() !== nextStartsAt.getTime();
}

async function createEventWithErrorPath(formData: FormData, errorPath: string) {
  const parsed = parseEventFormData(formData);
  if (!parsed.success) {
    redirect(
      `${errorPath}?error=${encodeURIComponent(parsed.error.issues[0].message)}`,
    );
  }
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    redirect("/events?error=Only%20admins%20can%20create%20events");
  }

  const client = createServerClient();
  if (!client) {
    redirect(`${errorPath}?error=Connect%20Supabase%20to%20create%20events`);
  }

  let capacity: ScheduleCapacity;
  try {
    capacity = calculateScheduleCapacity(parsed.data);
  } catch (error) {
    redirect(
      `${errorPath}?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Invalid event availability",
      )}`,
    );
  }
  const seed = eventSeed(parsed.data);

  const { data: event, error: eventError } = await client
    .from("events")
    .insert({
      name: parsed.data.name,
      venue: parsed.data.venue,
      starts_at: parsed.data.startsAt.toISOString(),
      status: effectiveEventStatus({
        status: "scheduled",
        startsAt: parsed.data.startsAt,
      }),
      seed,
      round_minutes: capacity.roundMinutes,
      break_minutes: parsed.data.breakMinutes,
      notes: parsed.data.notes,
    })
    .select("id")
    .single();
  if (eventError) {
    redirect(`${errorPath}?error=${encodeURIComponent(eventError.message)}`);
  }

  try {
    await insertEventSchedule({
      client,
      eventId: event.id,
      event: parsed.data,
      capacity,
      seed,
    });
  } catch (error) {
    await client.from("events").delete().eq("id", event.id);
    redirect(
      `${errorPath}?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Unable to create event",
      )}`,
    );
  }

  revalidatePath("/");
  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function createEvent(formData: FormData) {
  await createEventWithErrorPath(formData, "/events/new");
}

export async function updateEvent(formData: FormData) {
  const eventId = eventIdSchema.safeParse(formData.get("eventId"));
  const parsed = parseEventFormData(formData);
  if (!eventId.success || !parsed.success) {
    redirect(
      `/events/${eventId.success ? eventId.data : ""}/edit?error=${encodeURIComponent(
        parsed.success
          ? "Choose a valid event."
          : parsed.error.issues[0].message,
      )}`,
    );
  }
  const adminUser = await requireAdminUser();
  if (!adminUser) {
    redirect("/events?error=Only%20admins%20can%20edit%20events");
  }

  const client = createServerClient();
  if (!client) {
    redirect(
      `/events/${eventId.data}/edit?error=Connect%20Supabase%20to%20edit%20events`,
    );
  }

  let capacity: ScheduleCapacity;
  try {
    capacity = calculateScheduleCapacity(parsed.data);
  } catch (error) {
    redirect(
      `/events/${eventId.data}/edit?error=${encodeURIComponent(
        error instanceof Error ? error.message : "Invalid event availability",
      )}`,
    );
  }

  const [{ data: event, error: eventError }, playersResult, roundsResult] =
    await Promise.all([
      client.from("events").select("*").eq("id", eventId.data).single(),
      client
        .from("event_players")
        .select("player_id,display_order")
        .eq("event_id", eventId.data),
      client
        .from("event_rounds")
        .select(
          "round_number,court_count,duration_seconds,matches(court_number)",
        )
        .eq("event_id", eventId.data),
    ]);
  if (eventError) {
    redirect(`/events/${eventId.data}/edit?error=Event%20not%20found`);
  }
  if (playersResult.error) {
    redirect(
      `/events/${eventId.data}/edit?error=${encodeURIComponent(
        playersResult.error.message,
      )}`,
    );
  }
  if (roundsResult.error) {
    redirect(
      `/events/${eventId.data}/edit?error=${encodeURIComponent(
        roundsResult.error.message,
      )}`,
    );
  }

  const { data: matches, error: matchesError } = await client
    .from("matches")
    .select("status")
    .eq("event_id", eventId.data);
  if (matchesError) {
    redirect(
      `/events/${eventId.data}/edit?error=${encodeURIComponent(
        matchesError.message,
      )}`,
    );
  }
  const matchStatuses = matches.map((match) => match.status);
  if (
    !canEditEventDetails({
      eventStatus: event.status,
      matchStatuses,
    })
  ) {
    redirect(
      `/events/${eventId.data}/edit?error=Completed%20event%20data%20is%20locked`,
    );
  }

  const drawChanges = hasDrawChanges({
    event,
    players: playersResult.data,
    rounds: roundsResult.data as RoundCapacityRow[],
    nextEvent: parsed.data,
    nextCapacity: capacity,
  });
  const lockedScheduleChanges =
    drawChanges || hasStartTimeChange(event.starts_at, parsed.data.startsAt);
  if (lockedScheduleChanges && !canChangeEventSchedule({ matchStatuses })) {
    redirect(
      `/events/${eventId.data}/edit?error=Player%2C%20court%2C%20and%20time%20changes%20are%20locked%20once%20a%20match%20starts`,
    );
  }

  const seed = drawChanges ? eventSeed(parsed.data) : event.seed;
  const { error: updateError } = await client
    .from("events")
    .update({
      name: parsed.data.name,
      venue: parsed.data.venue,
      starts_at: parsed.data.startsAt.toISOString(),
      status: effectiveEventStatus({
        status: event.status,
        startsAt: parsed.data.startsAt,
      }),
      seed,
      round_minutes: capacity.roundMinutes,
      break_minutes: parsed.data.breakMinutes,
      notes: parsed.data.notes,
    })
    .eq("id", eventId.data);
  if (updateError) {
    redirect(
      `/events/${eventId.data}/edit?error=${encodeURIComponent(
        updateError.message,
      )}`,
    );
  }

  if (drawChanges) {
    const { error: deleteMatchesError } = await client
      .from("matches")
      .delete()
      .eq("event_id", eventId.data);
    if (deleteMatchesError) {
      redirect(
        `/events/${eventId.data}/edit?error=${encodeURIComponent(
          deleteMatchesError.message,
        )}`,
      );
    }
    const { error: deleteRoundsError } = await client
      .from("event_rounds")
      .delete()
      .eq("event_id", eventId.data);
    if (deleteRoundsError) {
      redirect(
        `/events/${eventId.data}/edit?error=${encodeURIComponent(
          deleteRoundsError.message,
        )}`,
      );
    }
    const { error: deletePlayersError } = await client
      .from("event_players")
      .delete()
      .eq("event_id", eventId.data);
    if (deletePlayersError) {
      redirect(
        `/events/${eventId.data}/edit?error=${encodeURIComponent(
          deletePlayersError.message,
        )}`,
      );
    }

    try {
      await insertEventSchedule({
        client,
        eventId: eventId.data,
        event: parsed.data,
        capacity,
        seed,
      });
    } catch (error) {
      redirect(
        `/events/${eventId.data}/edit?error=${encodeURIComponent(
          error instanceof Error ? error.message : "Unable to update event",
        )}`,
      );
    }
  }

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId.data}`);
  redirect(`/events/${eventId.data}`);
}

export async function duplicateEvent(formData: FormData) {
  const sourceEventId = eventIdSchema.safeParse(formData.get("sourceEventId"));
  const errorPath = sourceEventId.success
    ? `/events/${sourceEventId.data}/duplicate`
    : "/events/new";
  await createEventWithErrorPath(formData, errorPath);
}

export async function deleteEvent(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = eventIdSchema.safeParse(formData.get("eventId"));
  if (!parsed.success) {
    return { ok: false, message: "Choose a valid event to delete." };
  }
  const authorizationError = await assertAdminAction();
  if (authorizationError) return authorizationError;

  const client = createServerClient();
  if (!client) return unavailable;

  const [{ data: event, error: eventError }, matchesResult] = await Promise.all(
    [
      client
        .from("events")
        .select("status,starts_at")
        .eq("id", parsed.data)
        .single(),
      client.from("matches").select("status").eq("event_id", parsed.data),
    ],
  );
  if (eventError) return { ok: false, message: eventError.message };
  if (matchesResult.error) {
    return { ok: false, message: matchesResult.error.message };
  }
  if (
    !canDeleteEventRecord({
      eventStatus: effectiveEventStatus({
        status: event.status,
        startsAt: event.starts_at,
      }),
      matchStatuses: matchesResult.data.map((match) => match.status),
    })
  ) {
    return {
      ok: false,
      message: "Only fully scheduled events can be deleted.",
    };
  }

  const { error } = await client.from("events").delete().eq("id", parsed.data);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/");
  revalidatePath("/events");
  redirect("/events");
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

  const [{ data: existing, error: readError }, eventResult] = await Promise.all(
    [
      client
        .from("matches")
        .select("status")
        .eq("id", parsed.data.matchId)
        .eq("event_id", parsed.data.eventId)
        .single(),
      client
        .from("events")
        .select("status,starts_at")
        .eq("id", parsed.data.eventId)
        .single(),
    ],
  );
  if (readError) return { ok: false, message: readError.message };
  if (eventResult.error) {
    return { ok: false, message: eventResult.error.message };
  }
  if (
    effectiveEventStatus({
      status: eventResult.data.status,
      startsAt: eventResult.data.starts_at,
    }) !== "live"
  ) {
    return { ok: false, message: "The event must be live to record scores." };
  }
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
  const [{ data: match }, { data: event }] = await Promise.all([
    client
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .eq("event_id", eventId)
      .single(),
    client.from("events").select("status,starts_at").eq("id", eventId).single(),
  ]);
  if (
    !match ||
    !event ||
    match.status === "completed" ||
    effectiveEventStatus({
      status: event.status,
      startsAt: event.starts_at,
    }) !== "live"
  ) {
    return;
  }

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

export async function updateRoundLineup(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = roundLineupSchema.safeParse({
    eventId: formData.get("eventId"),
    roundNumber: formData.get("roundNumber"),
    matchIds: formData.getAll("matchIds"),
    playerIds: formData.getAll("playerIds"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0].message };
  }
  const authorizationError = await assertAdminAction();
  if (authorizationError) return authorizationError;

  const client = createServerClient();
  if (!client) return unavailable;
  const { eventId, roundNumber, matchIds, playerIds } = parsed.data;
  const { data: submittedMatches, error: readError } = await client
    .from("matches")
    .select("id,round_id,court_number,status")
    .eq("event_id", eventId)
    .in("id", matchIds);
  if (readError) return { ok: false, message: readError.message };
  if (submittedMatches.length !== matchIds.length) {
    return { ok: false, message: "Every match must belong to this event." };
  }

  const roundIds = new Set(submittedMatches.map((match) => match.round_id));
  if (roundIds.size !== 1) {
    return { ok: false, message: "Every match must belong to the same round." };
  }
  const roundId = submittedMatches[0].round_id;

  const [eventResult, roundResult, roundMatchesResult, eventPlayersResult] =
    await Promise.all([
      client
        .from("events")
        .select("status,starts_at")
        .eq("id", eventId)
        .single(),
      client
        .from("event_rounds")
        .select("round_number")
        .eq("id", roundId)
        .eq("event_id", eventId)
        .single(),
      client
        .from("matches")
        .select(
          "id,court_number,status,team_one_player_one_id,team_one_player_two_id,team_two_player_one_id,team_two_player_two_id",
        )
        .eq("event_id", eventId)
        .eq("round_id", roundId),
      client
        .from("event_players")
        .select("id,name_snapshot")
        .eq("event_id", eventId),
    ]);
  const { data: event, error: eventError } = eventResult;
  if (eventError) return { ok: false, message: eventError.message };
  if (roundResult.error) {
    return { ok: false, message: roundResult.error.message };
  }
  if (roundMatchesResult.error) {
    return { ok: false, message: roundMatchesResult.error.message };
  }
  if (eventPlayersResult.error) {
    return { ok: false, message: eventPlayersResult.error.message };
  }
  if (roundResult.data.round_number !== roundNumber) {
    return { ok: false, message: "Round number does not match this draw." };
  }

  const roundMatchIds = new Set(
    roundMatchesResult.data.map((match) => match.id),
  );
  if (matchIds.some((matchId) => !roundMatchIds.has(matchId))) {
    return { ok: false, message: "Every match must belong to this round." };
  }
  const eventStatus = effectiveEventStatus({
    status: event.status,
    startsAt: event.starts_at,
  });
  if (
    submittedMatches.some(
      (match) =>
        !canEditDrawLineup({
          canManage: true,
          eventStatus,
          matchStatus: match.status,
        }),
    )
  ) {
    return { ok: false, message: "Draws are locked once a match starts." };
  }

  const matchById = new Map(
    roundMatchesResult.data.map((match) => [match.id, match]),
  );
  const submittedPlayerIdsByMatchId = new Map(
    matchIds.map((matchId, index) => [
      matchId,
      playerIds.slice(index * 4, index * 4 + 4),
    ]),
  );
  const selectedMatches = matchIds.map((matchId, index) => {
    const match = matchById.get(matchId);
    return {
      id: matchId,
      courtNumber: match?.court_number ?? 0,
      playerIds: playerIds.slice(index * 4, index * 4 + 4),
    };
  });
  const proposedRoundMatches = roundMatchesResult.data.map((match) => ({
    id: match.id,
    courtNumber: match.court_number,
    playerIds: submittedPlayerIdsByMatchId.get(match.id) ?? [
      match.team_one_player_one_id,
      match.team_one_player_two_id,
      match.team_two_player_one_id,
      match.team_two_player_two_id,
    ],
  }));

  try {
    assertValidRoundLineup({
      selectedMatches: proposedRoundMatches,
      eventPlayers: eventPlayersResult.data.map((player) => ({
        id: player.id,
        name: player.name_snapshot,
      })),
      roundNumber,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Choose a valid round draw.",
    };
  }

  const { error } = await client.rpc("update_scheduled_round_draw", {
    p_event_id: eventId,
    p_round_id: roundId,
    p_assignments: selectedMatches.map((match) => ({
      match_id: match.id,
      player_ids: match.playerIds,
    })),
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true, message: `Round ${roundNumber} draw updated.` };
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

function isUndefinedColumnError(error: { code?: string } | null) {
  return error?.code === "42703";
}
