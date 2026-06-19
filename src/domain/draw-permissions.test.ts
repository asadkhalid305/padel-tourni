import { describe, expect, it } from "vitest";

import { canEditDrawLineup } from "@/domain/draw-permissions";

describe("draw lineup permissions", () => {
  it("allows admins to edit scheduled matches on active events", () => {
    expect(
      canEditDrawLineup({
        canManage: true,
        eventStatus: "live",
        matchStatus: "scheduled",
      }),
    ).toBe(true);
  });

  it.each(["live", "paused", "completed"])(
    "locks %s matches",
    (matchStatus) => {
      expect(
        canEditDrawLineup({
          canManage: true,
          eventStatus: "live",
          matchStatus,
        }),
      ).toBe(false);
    },
  );

  it("locks completed events", () => {
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
