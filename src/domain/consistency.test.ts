import { describe, expect, it } from "vitest";

import {
  assertCanRegenerate,
  assertCompletedAppearanceConsistency,
  assertScheduleConsistency,
} from "@/domain/consistency";
import type { CompletedMatch, Schedule } from "@/domain/types";

const validSchedule: Schedule = {
  seed: 1,
  rounds: [
    {
      roundNumber: 1,
      courtCount: 1,
      restingPlayerIds: [],
      matches: [
        {
          id: "m1",
          roundNumber: 1,
          courtNumber: 1,
          teamOne: ["a", "b"],
          teamTwo: ["c", "d"],
        },
      ],
    },
  ],
};

describe("data consistency", () => {
  it("accepts four distinct players and valid appearance totals", () => {
    expect(() => assertScheduleConsistency(validSchedule)).not.toThrow();
  });

  it("rejects a player appearing twice in a match or round", () => {
    const invalid = structuredClone(validSchedule);
    invalid.rounds[0].matches[0].teamTwo[0] = "a";
    expect(() => assertScheduleConsistency(invalid)).toThrow(
      /four distinct players/,
    );
  });

  it("rejects blank and placeholder IDs", () => {
    for (const invalidId of ["", "placeholder-player"]) {
      const invalid = structuredClone(validSchedule);
      invalid.rounds[0].matches[0].teamOne[0] = invalidId;
      expect(() => assertScheduleConsistency(invalid)).toThrow(
        /invalid player ID/,
      );
    }
  });

  it("verifies completed appearances equal matches multiplied by four", () => {
    const completed = validSchedule.rounds[0].matches[0] as CompletedMatch;
    completed.status = "completed";
    completed.teamOneScore = 10;
    completed.teamTwoScore = 8;
    expect(() =>
      assertCompletedAppearanceConsistency([completed]),
    ).not.toThrow();
  });

  it("protects completed matches from regeneration", () => {
    expect(() => assertCanRegenerate(["scheduled", "completed"])).toThrow(
      /cannot be regenerated/,
    );
  });
});
