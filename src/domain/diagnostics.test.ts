import { describe, expect, it } from "vitest";

import { diagnoseSchedule } from "@/domain/diagnostics";
import type { PlayerSeed, Schedule } from "@/domain/types";

const players: PlayerSeed[] = [
  { id: "a", name: "Ava", rating: 8 },
  { id: "b", name: "Ben", rating: 6 },
  { id: "c", name: "Cleo", rating: 7 },
  { id: "d", name: "Drew", rating: 5 },
  { id: "e", name: "Emi", rating: 4 },
];

describe("schedule diagnostics", () => {
  it("reports player-level rests, repeat pairings, and rating balance", () => {
    const schedule: Schedule = {
      seed: 1,
      rounds: [
        {
          roundNumber: 1,
          courtCount: 1,
          matches: [
            {
              id: "r1-c1",
              roundNumber: 1,
              courtNumber: 1,
              teamOne: ["a", "b"],
              teamTwo: ["c", "d"],
            },
          ],
          restingPlayerIds: ["e"],
        },
        {
          roundNumber: 2,
          courtCount: 1,
          matches: [
            {
              id: "r2-c1",
              roundNumber: 2,
              courtNumber: 1,
              teamOne: ["a", "b"],
              teamTwo: ["c", "e"],
            },
          ],
          restingPlayerIds: ["d"],
        },
      ],
    };

    const diagnostics = diagnoseSchedule(schedule, players);
    const ava = diagnostics.playerFairness.find(
      (player) => player.playerId === "a",
    );
    const drew = diagnostics.playerFairness.find(
      (player) => player.playerId === "d",
    );

    expect(ava).toMatchObject({
      appearances: 2,
      rests: 0,
      maxConsecutiveRests: 0,
      repeatedPartners: 1,
      repeatedOpponents: 1,
      averageRatingDifference: 2.5,
    });
    expect(drew).toMatchObject({
      appearances: 1,
      rests: 1,
      maxConsecutiveRests: 1,
      repeatedPartners: 0,
      repeatedOpponents: 0,
      averageRatingDifference: 2,
    });
  });
});
