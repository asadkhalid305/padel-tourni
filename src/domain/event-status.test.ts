import { describe, expect, it } from "vitest";

import {
  canManageLiveMatches,
  effectiveEventStatus,
} from "@/domain/event-status";

describe("event status policy", () => {
  const now = new Date("2026-06-19T12:00:00.000Z");

  it("derives scheduled and live status from the event start", () => {
    expect(
      effectiveEventStatus({
        status: "scheduled",
        startsAt: "2026-06-19T12:01:00.000Z",
        now,
      }),
    ).toBe("scheduled");
    expect(
      effectiveEventStatus({
        status: "scheduled",
        startsAt: "2026-06-19T11:59:00.000Z",
        now,
      }),
    ).toBe("live");
  });

  it("preserves terminal statuses and requires admin access for live controls", () => {
    expect(
      effectiveEventStatus({
        status: "completed",
        startsAt: "2026-06-19T11:00:00.000Z",
        now,
      }),
    ).toBe("completed");
    expect(canManageLiveMatches({ canManage: true, eventStatus: "live" })).toBe(
      true,
    );
    expect(
      canManageLiveMatches({ canManage: true, eventStatus: "scheduled" }),
    ).toBe(false);
  });
});
