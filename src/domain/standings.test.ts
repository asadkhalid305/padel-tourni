import { describe, expect, it } from "vitest";

import { calculateStandings } from "@/domain/standings";
import type { CompletedMatch, PlayerSeed } from "@/domain/types";

const players: PlayerSeed[] = ["A", "B", "C", "D", "E"].map((name, index) => ({
  id: name.toLowerCase(),
  name,
  rating: index + 1,
}));

function match(
  id: string,
  teamOne: [string, string],
  teamTwo: [string, string],
  teamOneScore: number,
  teamTwoScore: number,
): CompletedMatch {
  return {
    id,
    roundNumber: 1,
    courtNumber: 1,
    teamOne,
    teamTwo,
    teamOneScore,
    teamTwoScore,
    status: "completed",
  };
}

describe("standings", () => {
  it("ranks by total points when match counts are equal", () => {
    const standings = calculateStandings(players.slice(0, 4), [
      match("m1", ["a", "b"], ["c", "d"], 12, 8),
    ]);
    expect(standings.slice(0, 2).map((row) => row.playerId)).toEqual([
      "a",
      "b",
    ]);
    expect(standings[0].pointsFor).toBe(12);
  });

  it("ranks by average points when match counts differ", () => {
    const standings = calculateStandings(players, [
      match("m1", ["a", "b"], ["c", "d"], 10, 8),
      match("m2", ["a", "c"], ["d", "e"], 4, 12),
    ]);
    expect(standings[0].playerId).toBe("e");
    expect(standings.find((row) => row.playerId === "a")?.averagePoints).toBe(
      7,
    );
  });

  it("uses win rate and point difference as tiebreakers", () => {
    const standings = calculateStandings(players, [
      match("m1", ["a", "b"], ["c", "d"], 10, 8),
      match("m2", ["a", "c"], ["b", "e"], 6, 10),
    ]);
    expect(standings.findIndex((row) => row.playerId === "b")).toBeLessThan(
      standings.findIndex((row) => row.playerId === "a"),
    );
  });

  it("records draws without adding wins or losses", () => {
    const [standing] = calculateStandings(players.slice(0, 4), [
      match("m1", ["a", "b"], ["c", "d"], 9, 9),
    ]);
    expect(standing.draws).toBe(1);
    expect(standing.wins).toBe(0);
    expect(standing.losses).toBe(0);
  });
});
