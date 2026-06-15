import type { CompletedMatch, Schedule } from "@/domain/types";

export function assertScheduleConsistency(schedule: Schedule) {
  const issues: string[] = [];
  for (const round of schedule.rounds) {
    const seen = new Set<string>();
    for (const match of round.matches) {
      const players = [...match.teamOne, ...match.teamTwo];
      if (new Set(players).size !== 4) {
        issues.push(`${match.id} must contain four distinct players.`);
      }
      for (const playerId of players) {
        if (
          !playerId.trim() ||
          playerId.toLowerCase().includes("placeholder")
        ) {
          issues.push(`${match.id} contains an invalid player ID.`);
        }
        if (seen.has(playerId)) {
          issues.push(
            `${playerId} appears twice in round ${round.roundNumber}.`,
          );
        }
        seen.add(playerId);
      }
    }
  }

  const matches = schedule.rounds.flatMap((round) => round.matches);
  const appearances = matches.reduce(
    (total, match) => total + match.teamOne.length + match.teamTwo.length,
    0,
  );
  if (appearances !== matches.length * 4) {
    issues.push("Scheduled appearance count is inconsistent.");
  }
  if (issues.length) throw new Error(issues.join(" "));
}

export function assertCompletedAppearanceConsistency(
  matches: CompletedMatch[],
) {
  const appearances = matches.reduce(
    (total, match) => total + match.teamOne.length + match.teamTwo.length,
    0,
  );
  if (appearances !== matches.length * 4) {
    throw new Error("Completed appearance count is inconsistent.");
  }
}

export function assertCanRegenerate(statuses: string[]) {
  if (statuses.includes("completed")) {
    throw new Error("Completed matches cannot be regenerated.");
  }
}
