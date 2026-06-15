import type { PlayerSeed, Schedule } from "@/domain/types";

function pairKey(first: string, second: string) {
  return [first, second].sort().join(":");
}

export type FairnessDiagnostics = {
  appearanceCounts: Record<string, number>;
  appearanceSpread: number;
  repeatedPartnerPairs: number;
  repeatedOpponentPairs: number;
  maxConsecutiveRests: number;
  averageRatingDifference: number;
  isConsistent: boolean;
  issues: string[];
};

export function diagnoseSchedule(
  schedule: Schedule,
  players: PlayerSeed[],
): FairnessDiagnostics {
  const validIds = new Set(players.map((player) => player.id));
  const ratings = new Map(players.map((player) => [player.id, player.rating]));
  const appearanceCounts = Object.fromEntries(
    players.map((player) => [player.id, 0]),
  );
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();
  const restStreaks = new Map(players.map((player) => [player.id, 0]));
  let maxConsecutiveRests = 0;
  let ratingDifferenceTotal = 0;
  let matchCount = 0;
  const issues: string[] = [];

  for (const round of schedule.rounds) {
    const roundPlayers = new Set<string>();

    for (const match of round.matches) {
      const ids = [...match.teamOne, ...match.teamTwo];
      if (new Set(ids).size !== 4) {
        issues.push(`${match.id} does not contain four distinct players.`);
      }

      for (const id of ids) {
        if (!id.trim() || id.toLowerCase().includes("placeholder")) {
          issues.push(`${match.id} contains a blank or placeholder player.`);
        }
        if (!validIds.has(id)) {
          issues.push(`${match.id} references an unknown player.`);
        }
        if (roundPlayers.has(id)) {
          issues.push(
            `${id} appears more than once in round ${round.roundNumber}.`,
          );
        }
        roundPlayers.add(id);
        appearanceCounts[id] = (appearanceCounts[id] ?? 0) + 1;
      }

      for (const team of [match.teamOne, match.teamTwo]) {
        const key = pairKey(team[0], team[1]);
        partnerCounts.set(key, (partnerCounts.get(key) ?? 0) + 1);
      }
      for (const first of match.teamOne) {
        for (const second of match.teamTwo) {
          const key = pairKey(first, second);
          opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
        }
      }

      const teamOneRating = match.teamOne.reduce(
        (total, id) => total + (ratings.get(id) ?? 0),
        0,
      );
      const teamTwoRating = match.teamTwo.reduce(
        (total, id) => total + (ratings.get(id) ?? 0),
        0,
      );
      ratingDifferenceTotal += Math.abs(teamOneRating - teamTwoRating);
      matchCount += 1;
    }

    for (const player of players) {
      const streak = roundPlayers.has(player.id)
        ? 0
        : (restStreaks.get(player.id) ?? 0) + 1;
      restStreaks.set(player.id, streak);
      maxConsecutiveRests = Math.max(maxConsecutiveRests, streak);
    }
  }

  const totalMatches = schedule.rounds.reduce(
    (total, round) => total + round.matches.length,
    0,
  );
  const totalAppearances = Object.values(appearanceCounts).reduce(
    (total, count) => total + count,
    0,
  );
  if (totalAppearances !== totalMatches * 4) {
    issues.push(
      "Scheduled appearances do not equal matches multiplied by four.",
    );
  }

  const counts = Object.values(appearanceCounts);
  const appearanceSpread = Math.max(...counts) - Math.min(...counts);
  if (appearanceSpread > 1) {
    issues.push("Player appearances differ by more than one.");
  }

  return {
    appearanceCounts,
    appearanceSpread,
    repeatedPartnerPairs: [...partnerCounts.values()].filter(
      (count) => count > 1,
    ).length,
    repeatedOpponentPairs: [...opponentCounts.values()].filter(
      (count) => count > 1,
    ).length,
    maxConsecutiveRests,
    averageRatingDifference: matchCount
      ? ratingDifferenceTotal / matchCount
      : 0,
    isConsistent: issues.length === 0,
    issues,
  };
}
