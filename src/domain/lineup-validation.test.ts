import { describe, expect, it } from "vitest";

import { assertValidRoundLineup } from "@/domain/lineup-validation";

const eventPlayers = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(
  (id) => ({ id, name: `Player ${id.toUpperCase()}` }),
);

describe("round lineup validation", () => {
  it("accepts an atomic cross-match swap", () => {
    expect(() =>
      assertValidRoundLineup({
        eventPlayers,
        roundNumber: 1,
        selectedMatches: [
          { id: "match-1", courtNumber: 1, playerIds: ["e", "b", "c", "d"] },
          { id: "match-2", courtNumber: 2, playerIds: ["a", "f", "g", "h"] },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects a duplicate within one match with the player and court", () => {
    expect(() =>
      assertValidRoundLineup({
        eventPlayers,
        roundNumber: 1,
        selectedMatches: [
          { id: "match-1", courtNumber: 1, playerIds: ["a", "a", "c", "d"] },
        ],
      }),
    ).toThrow("Player A is selected more than once on Court 1.");
  });

  it("rejects a duplicate across courts with the player and round", () => {
    expect(() =>
      assertValidRoundLineup({
        eventPlayers,
        roundNumber: 3,
        selectedMatches: [
          { id: "match-1", courtNumber: 1, playerIds: ["a", "b", "c", "d"] },
          { id: "match-2", courtNumber: 2, playerIds: ["a", "f", "g", "h"] },
        ],
      }),
    ).toThrow("Player A is assigned more than once in Round 3.");
  });

  it("rejects a duplicate against a locked match in the same round", () => {
    expect(() =>
      assertValidRoundLineup({
        eventPlayers,
        roundNumber: 2,
        selectedMatches: [
          {
            id: "locked-match",
            courtNumber: 1,
            playerIds: ["a", "b", "c", "d"],
          },
          {
            id: "editable-match",
            courtNumber: 2,
            playerIds: ["e", "f", "a", "h"],
          },
        ],
      }),
    ).toThrow("Player A is assigned more than once in Round 2.");
  });

  it("rejects blanks, placeholders, and players outside the event roster", () => {
    for (const invalidId of ["", "placeholder-player", "outsider"]) {
      expect(() =>
        assertValidRoundLineup({
          eventPlayers,
          roundNumber: 1,
          selectedMatches: [
            {
              id: "match-1",
              courtNumber: 1,
              playerIds: [invalidId, "b", "c", "d"],
            },
          ],
        }),
      ).toThrow();
    }
  });
});
