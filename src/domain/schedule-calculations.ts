export type CourtRound = {
  courtCount: number;
  durationMinutes?: number;
};

export type ScheduleCapacity = {
  roundCount: number;
  matchCount: number;
  roundMinutes: number;
  courtMinutes: number[];
  courtNumbersByRound: number[][];
  usedCourtMinutes: number;
  unusedCourtMinutes: number;
};

export function calculateCourtSlots(rounds: CourtRound[]) {
  return rounds.reduce((total, round) => total + round.courtCount, 0);
}

export function calculateScheduledAppearances(rounds: CourtRound[]) {
  return calculateCourtSlots(rounds) * 4;
}

export function recommendMatchDuration(options: {
  eventMinutes: number;
  roundCount: number;
  breakMinutes: number;
}) {
  const { eventMinutes, roundCount, breakMinutes } = options;
  if (eventMinutes <= 0 || roundCount <= 0 || breakMinutes < 0) {
    throw new Error("Event, round, and break durations must be valid.");
  }

  const playableMinutes = eventMinutes - breakMinutes * (roundCount - 1);
  if (playableMinutes < roundCount) {
    throw new Error("The event is too short for the requested rounds.");
  }

  return Math.floor(playableMinutes / roundCount);
}

export function calculateScheduleCapacity(options: {
  courtMinutes: number[];
  requestedRoundMinutes: number;
  breakMinutes: number;
}): ScheduleCapacity {
  const { courtMinutes, requestedRoundMinutes, breakMinutes } = options;
  if (
    !courtMinutes.length ||
    courtMinutes.some((minutes) => !Number.isInteger(minutes) || minutes < 5) ||
    !Number.isInteger(requestedRoundMinutes) ||
    requestedRoundMinutes < 5 ||
    !Number.isInteger(breakMinutes) ||
    breakMinutes < 0
  ) {
    throw new Error("Schedule capacity inputs must be valid whole minutes.");
  }

  const slotCounts = courtMinutes.map((minutes) =>
    Math.floor(
      (minutes + breakMinutes) / (requestedRoundMinutes + breakMinutes),
    ),
  );
  const roundCount = Math.max(...slotCounts);
  const matchCount = slotCounts.reduce((total, slots) => total + slots, 0);
  if (matchCount < 1) {
    throw new Error("The event is too short for one match round.");
  }

  const roundMinutes = Math.min(
    ...slotCounts
      .map((slots, index) =>
        slots > 0
          ? Math.floor(
              (courtMinutes[index] - breakMinutes * (slots - 1)) / slots,
            )
          : Number.POSITIVE_INFINITY,
      )
      .filter(Number.isFinite),
  );
  const courtNumbersByRound = Array.from({ length: roundCount }, (_, index) =>
    slotCounts
      .map((slots, courtIndex) => (slots > index ? courtIndex + 1 : null))
      .filter((courtNumber): courtNumber is number => courtNumber !== null),
  );
  const usedCourtMinutes = slotCounts.reduce(
    (total, slots) =>
      total +
      (slots > 0 ? slots * roundMinutes + (slots - 1) * breakMinutes : 0),
    0,
  );
  const totalCourtMinutes = courtMinutes.reduce(
    (total, minutes) => total + minutes,
    0,
  );

  return {
    roundCount,
    matchCount,
    roundMinutes,
    courtMinutes,
    courtNumbersByRound,
    usedCourtMinutes,
    unusedCourtMinutes: totalCourtMinutes - usedCourtMinutes,
  };
}

export function calculatePlayerAppearanceRange(
  totalAppearances: number,
  playerCount: number,
) {
  if (playerCount < 4) {
    throw new Error("At least four players are required.");
  }

  return {
    minimum: Math.floor(totalAppearances / playerCount),
    maximum: Math.ceil(totalAppearances / playerCount),
  };
}
