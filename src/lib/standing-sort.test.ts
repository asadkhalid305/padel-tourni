import { describe, expect, it } from "vitest";

import type { Standing } from "@/domain/types";
import { sortStandingRows } from "@/lib/standing-sort";

const rows: Standing[] = [
  {
    playerId: "ali",
    playerName: "Ali",
    played: 15,
    wins: 10,
    draws: 0,
    losses: 5,
    pointsFor: 56,
    pointsAgainst: 48,
    pointDifference: 8,
    averagePoints: 3.7,
    winRate: 0.67,
    rank: 2,
  },
  {
    playerId: "mannan",
    playerName: "Mannan",
    played: 4,
    wins: 1,
    draws: 0,
    losses: 3,
    pointsFor: 17,
    pointsAgainst: 20,
    pointDifference: -3,
    averagePoints: 4.3,
    winRate: 0.25,
    rank: 3,
  },
  {
    playerId: "bilal",
    playerName: "Bilal",
    played: 6,
    wins: 6,
    draws: 0,
    losses: 0,
    pointsFor: 26,
    pointsAgainst: 10,
    pointDifference: 16,
    averagePoints: 4.3,
    winRate: 1,
    rank: 1,
  },
];

describe("standing sort", () => {
  it("keeps official rank order by default", () => {
    expect(sortStandingRows(rows).map((row) => row.playerId)).toEqual([
      "bilal",
      "ali",
      "mannan",
    ]);
  });

  it("can sort event standings by a selected column", () => {
    expect(
      sortStandingRows(rows, { key: "averagePoints", direction: "desc" }).map(
        (row) => row.playerId,
      ),
    ).toEqual(["bilal", "mannan", "ali"]);
  });
});
