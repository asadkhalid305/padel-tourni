import { describe, expect, it } from "vitest";

import {
  assertValidLineupSelection,
  getEditableLineupPlayerIds,
} from "@/domain/lineup-validation";

const eventPlayerIds = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
const roundMatches = [
  { id: "match-1", playerIds: ["a", "b", "c", "d"] },
  { id: "match-2", playerIds: ["e", "f", "g", "h"] },
];

describe("lineup validation", () => {
  it("offers current match players plus resting players only", () => {
    expect(
      getEditableLineupPlayerIds({
        matchId: "match-1",
        eventPlayerIds,
        roundMatches,
      }),
    ).toEqual(["a", "b", "c", "d", "i", "j"]);
  });

  it("rejects players already active on another court in the same round", () => {
    expect(() =>
      assertValidLineupSelection({
        matchId: "match-1",
        selectedPlayerIds: ["a", "b", "c", "e"],
        eventPlayerIds,
        roundMatches,
      }),
    ).toThrow(/Only resting players/);
  });

  it("accepts replacing a current player with a resting event player", () => {
    expect(() =>
      assertValidLineupSelection({
        matchId: "match-1",
        selectedPlayerIds: ["a", "b", "c", "i"],
        eventPlayerIds,
        roundMatches,
      }),
    ).not.toThrow();
  });
});
