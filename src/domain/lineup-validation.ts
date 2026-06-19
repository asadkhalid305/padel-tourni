export type RoundLineupMatch = {
  id: string;
  courtNumber: number;
  playerIds: string[];
};

export type RoundLineupPlayer = {
  id: string;
  name: string;
};

export function assertValidRoundLineup({
  selectedMatches,
  eventPlayers,
  roundNumber,
}: {
  selectedMatches: RoundLineupMatch[];
  eventPlayers: RoundLineupPlayer[];
  roundNumber: number;
}) {
  const playerById = new Map(eventPlayers.map((player) => [player.id, player]));
  const assignedCourtByPlayerId = new Map<string, number>();

  for (const match of selectedMatches) {
    if (
      match.playerIds.length !== 4 ||
      match.playerIds.some(
        (id) => !id.trim() || id.toLowerCase().includes("placeholder"),
      )
    ) {
      throw new Error(`Choose four players for Court ${match.courtNumber}.`);
    }

    for (const playerId of match.playerIds) {
      const player = playerById.get(playerId);
      if (!player) {
        throw new Error("Every player must belong to this event.");
      }

      const assignedCourt = assignedCourtByPlayerId.get(playerId);
      if (assignedCourt !== undefined) {
        if (assignedCourt === match.courtNumber) {
          throw new Error(
            `${player.name} is selected more than once on Court ${match.courtNumber}.`,
          );
        }
        throw new Error(
          `${player.name} is assigned more than once in Round ${roundNumber}.`,
        );
      }
      assignedCourtByPlayerId.set(playerId, match.courtNumber);
    }
  }
}
