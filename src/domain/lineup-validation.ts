type LineupMatch = {
  id: string;
  playerIds: string[];
};

export type LineupValidationInput = {
  matchId: string;
  selectedPlayerIds: string[];
  eventPlayerIds: string[];
  roundMatches: LineupMatch[];
};

export function getEditableLineupPlayerIds({
  matchId,
  eventPlayerIds,
  roundMatches,
}: Omit<LineupValidationInput, "selectedPlayerIds">) {
  const currentMatch = roundMatches.find((match) => match.id === matchId);
  if (!currentMatch) {
    throw new Error("Match does not belong to this round.");
  }

  const blockedPlayerIds = new Set(
    roundMatches
      .filter((match) => match.id !== matchId)
      .flatMap((match) => match.playerIds),
  );
  return eventPlayerIds.filter((playerId) => !blockedPlayerIds.has(playerId));
}

export function assertValidLineupSelection({
  matchId,
  selectedPlayerIds,
  eventPlayerIds,
  roundMatches,
}: LineupValidationInput) {
  if (
    selectedPlayerIds.length !== 4 ||
    new Set(selectedPlayerIds).size !== 4 ||
    selectedPlayerIds.some(
      (id) => !id.trim() || id.toLowerCase().includes("placeholder"),
    )
  ) {
    throw new Error("Choose four distinct players.");
  }

  const eventPlayerIdSet = new Set(eventPlayerIds);
  if (selectedPlayerIds.some((playerId) => !eventPlayerIdSet.has(playerId))) {
    throw new Error("Every player must belong to this event.");
  }

  const eligiblePlayerIds = new Set(
    getEditableLineupPlayerIds({ matchId, eventPlayerIds, roundMatches }),
  );
  if (selectedPlayerIds.some((playerId) => !eligiblePlayerIds.has(playerId))) {
    throw new Error("Only resting players can replace players in this match.");
  }
}
