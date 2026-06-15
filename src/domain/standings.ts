import type { CompletedMatch, PlayerSeed, Standing } from "@/domain/types";

type MutableStanding = Omit<
  Standing,
  "rank" | "pointDifference" | "averagePoints" | "winRate"
>;

export function calculateStandings(
  players: PlayerSeed[],
  matches: CompletedMatch[],
): Standing[] {
  const table = new Map<string, MutableStanding>(
    players.map((player) => [
      player.id,
      {
        playerId: player.id,
        playerName: player.name,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
      },
    ]),
  );

  for (const match of matches) {
    const teamOneWon = match.teamOneScore > match.teamTwoScore;
    const teamTwoWon = match.teamTwoScore > match.teamOneScore;

    for (const [team, pointsFor, pointsAgainst, won, lost] of [
      [
        match.teamOne,
        match.teamOneScore,
        match.teamTwoScore,
        teamOneWon,
        teamTwoWon,
      ],
      [
        match.teamTwo,
        match.teamTwoScore,
        match.teamOneScore,
        teamTwoWon,
        teamOneWon,
      ],
    ] as const) {
      for (const playerId of team) {
        const standing = table.get(playerId);
        if (!standing) throw new Error(`Unknown player in result: ${playerId}`);
        standing.played += 1;
        standing.pointsFor += pointsFor;
        standing.pointsAgainst += pointsAgainst;
        standing.wins += won ? 1 : 0;
        standing.losses += lost ? 1 : 0;
        standing.draws += !won && !lost ? 1 : 0;
      }
    }
  }

  const completedRows = [...table.values()].filter((row) => row.played > 0);
  const useAverage = new Set(completedRows.map((row) => row.played)).size > 1;

  const rows = [...table.values()].map((row) => ({
    ...row,
    pointDifference: row.pointsFor - row.pointsAgainst,
    averagePoints: row.played ? row.pointsFor / row.played : 0,
    winRate: row.played ? row.wins / row.played : 0,
    rank: 0,
  }));

  rows.sort((first, second) => {
    const primaryDifference = useAverage
      ? second.averagePoints - first.averagePoints
      : second.pointsFor - first.pointsFor;
    return (
      primaryDifference ||
      second.winRate - first.winRate ||
      second.pointDifference - first.pointDifference ||
      second.wins - first.wins ||
      first.playerName.localeCompare(second.playerName) ||
      first.playerId.localeCompare(second.playerId)
    );
  });

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
