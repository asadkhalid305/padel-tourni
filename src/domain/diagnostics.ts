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
  playerFairness: PlayerFairnessDiagnostic[];
  isConsistent: boolean;
  issues: string[];
};

export type PlayerFairnessDiagnostic = {
  playerId: string;
  playerName: string;
  appearances: number;
  rests: number;
  maxConsecutiveRests: number;
  repeatedPartners: number;
  repeatedOpponents: number;
  averageRatingDifference: number;
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
  const playerRestCounts = new Map(players.map((player) => [player.id, 0]));
  const playerMaxRestStreaks = new Map(players.map((player) => [player.id, 0]));
  const playerPartnerCounts = new Map(
    players.map((player) => [player.id, new Map<string, number>()]),
  );
  const playerOpponentCounts = new Map(
    players.map((player) => [player.id, new Map<string, number>()]),
  );
  const playerRatingDifferenceTotals = new Map(
    players.map((player) => [player.id, 0]),
  );
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
        for (const [playerId, partnerId] of [
          [team[0], team[1]],
          [team[1], team[0]],
        ]) {
          const playerPartners = playerPartnerCounts.get(playerId);
          if (playerPartners) {
            playerPartners.set(
              partnerId,
              (playerPartners.get(partnerId) ?? 0) + 1,
            );
          }
        }
      }
      for (const first of match.teamOne) {
        for (const second of match.teamTwo) {
          const key = pairKey(first, second);
          opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
          for (const [playerId, opponentId] of [
            [first, second],
            [second, first],
          ]) {
            const playerOpponents = playerOpponentCounts.get(playerId);
            if (playerOpponents) {
              playerOpponents.set(
                opponentId,
                (playerOpponents.get(opponentId) ?? 0) + 1,
              );
            }
          }
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
      const ratingDifference = Math.abs(teamOneRating - teamTwoRating);
      ratingDifferenceTotal += ratingDifference;
      for (const id of ids) {
        playerRatingDifferenceTotals.set(
          id,
          (playerRatingDifferenceTotals.get(id) ?? 0) + ratingDifference,
        );
      }
      matchCount += 1;
    }

    for (const player of players) {
      const streak = roundPlayers.has(player.id)
        ? 0
        : (restStreaks.get(player.id) ?? 0) + 1;
      restStreaks.set(player.id, streak);
      maxConsecutiveRests = Math.max(maxConsecutiveRests, streak);
      playerMaxRestStreaks.set(
        player.id,
        Math.max(playerMaxRestStreaks.get(player.id) ?? 0, streak),
      );
      if (!roundPlayers.has(player.id)) {
        playerRestCounts.set(
          player.id,
          (playerRestCounts.get(player.id) ?? 0) + 1,
        );
      }
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

  const playerFairness = players.map((player) => {
    const appearances = appearanceCounts[player.id] ?? 0;
    const repeatedPartners = [
      ...(playerPartnerCounts.get(player.id)?.values() ?? []),
    ].filter((count) => count > 1).length;
    const repeatedOpponents = [
      ...(playerOpponentCounts.get(player.id)?.values() ?? []),
    ].filter((count) => count > 1).length;

    return {
      playerId: player.id,
      playerName: player.name,
      appearances,
      rests: playerRestCounts.get(player.id) ?? 0,
      maxConsecutiveRests: playerMaxRestStreaks.get(player.id) ?? 0,
      repeatedPartners,
      repeatedOpponents,
      averageRatingDifference: appearances
        ? (playerRatingDifferenceTotals.get(player.id) ?? 0) / appearances
        : 0,
    };
  });

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
    playerFairness,
    isConsistent: issues.length === 0,
    issues,
  };
}
