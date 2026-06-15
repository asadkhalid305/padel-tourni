export type CourtRound = {
  courtCount: number;
  durationMinutes?: number;
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
