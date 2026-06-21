import { describe, expect, it } from "vitest";

import { sortCareerRows, type CareerPlayerStats } from "@/lib/career-ranking";

const rows: CareerPlayerStats[] = [
  {
    playerId: "ali",
    playerName: "Ali",
    events: 3,
    matches: 15,
    wins: 10,
    averagePoints: 3.7,
    winRate: 0.67,
  },
  {
    playerId: "mannan",
    playerName: "Mannan",
    events: 1,
    matches: 4,
    wins: 1,
    averagePoints: 4.3,
    winRate: 0.25,
  },
  {
    playerId: "bilal",
    playerName: "Bilal",
    events: 1,
    matches: 6,
    wins: 6,
    averagePoints: 4.3,
    winRate: 1,
  },
];

describe("career ranking", () => {
  it("ranks career rows by average points before win rate by default", () => {
    expect(sortCareerRows(rows).map((row) => row.playerId)).toEqual([
      "bilal",
      "mannan",
      "ali",
    ]);
  });

  it("can sort by any selected column", () => {
    expect(
      sortCareerRows(rows, { key: "winRate", direction: "desc" }).map(
        (row) => row.playerId,
      ),
    ).toEqual(["bilal", "ali", "mannan"]);
  });
});
