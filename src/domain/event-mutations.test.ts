import { describe, expect, it } from "vitest";

import {
  canChangeEventSchedule,
  canDeleteEvent,
  canEditEventDetails,
} from "@/domain/event-mutations";

describe("event mutation policy", () => {
  it("allows full event deletion only while every match is scheduled", () => {
    expect(
      canDeleteEvent({
        eventStatus: "scheduled",
        matchStatuses: ["scheduled", "scheduled"],
      }),
    ).toBe(true);
    expect(
      canDeleteEvent({
        eventStatus: "scheduled",
        matchStatuses: ["scheduled", "live"],
      }),
    ).toBe(false);
  });

  it("allows event detail edits with completed matches but locks started schedules", () => {
    expect(
      canEditEventDetails({
        eventStatus: "scheduled",
        matchStatuses: ["scheduled", "completed"],
      }),
    ).toBe(true);
    expect(
      canEditEventDetails({
        eventStatus: "completed",
        matchStatuses: ["completed"],
      }),
    ).toBe(false);
    expect(
      canChangeEventSchedule({
        matchStatuses: ["scheduled", "paused"],
      }),
    ).toBe(false);
    expect(
      canChangeEventSchedule({
        matchStatuses: ["scheduled", "scheduled"],
      }),
    ).toBe(true);
  });
});
