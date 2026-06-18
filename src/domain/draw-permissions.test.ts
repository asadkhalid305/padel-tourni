import { describe, expect, it } from "vitest";

import { canEditDrawLineup } from "@/domain/draw-permissions";

describe("draw lineup permissions", () => {
  it.each(["scheduled", "live", "paused"])(
    "allows admins to edit %s matches on active events",
    (matchStatus) => {
      expect(
        canEditDrawLineup({
          canManage: true,
          eventStatus: "live",
          matchStatus,
        }),
      ).toBe(true);
    },
  );

  it("locks completed matches and completed events", () => {
    expect(
      canEditDrawLineup({
        canManage: true,
        eventStatus: "live",
        matchStatus: "completed",
      }),
    ).toBe(false);
    expect(
      canEditDrawLineup({
        canManage: true,
        eventStatus: "completed",
        matchStatus: "scheduled",
      }),
    ).toBe(false);
  });

  it("blocks non-admin users", () => {
    expect(
      canEditDrawLineup({
        canManage: false,
        eventStatus: "scheduled",
        matchStatus: "scheduled",
      }),
    ).toBe(false);
  });
});
