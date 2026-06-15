import { describe, expect, it } from "vitest";

import {
  completeTimer,
  elapsedSeconds,
  pauseTimer,
  resumeTimer,
  timerDisplay,
  type TimerState,
} from "@/domain/timer";

const running: TimerState = {
  durationSeconds: 600,
  startedAt: "2026-06-15T10:00:00.000Z",
  pausedAt: null,
  accumulatedPauseSeconds: 0,
  completedAt: null,
};

describe("timer calculations", () => {
  it("calculates countdown and elapsed time", () => {
    expect(elapsedSeconds(running, "2026-06-15T10:03:00.000Z")).toBe(180);
    expect(timerDisplay(running, "2026-06-15T10:03:00.000Z")).toMatchObject({
      remainingSeconds: 420,
      overtimeSeconds: 0,
    });
  });

  it("freezes while paused and excludes pause duration after resume", () => {
    const paused = pauseTimer(running, "2026-06-15T10:02:00.000Z");
    expect(elapsedSeconds(paused, "2026-06-15T10:05:00.000Z")).toBe(120);
    const resumed = resumeTimer(paused, "2026-06-15T10:05:00.000Z");
    expect(elapsedSeconds(resumed, "2026-06-15T10:06:00.000Z")).toBe(180);
  });

  it("reports overtime", () => {
    expect(timerDisplay(running, "2026-06-15T10:11:30.000Z")).toMatchObject({
      remainingSeconds: 0,
      overtimeSeconds: 90,
      isOvertime: true,
    });
  });

  it("keeps final elapsed time stable", () => {
    const completed = completeTimer(running, "2026-06-15T10:08:00.000Z");
    expect(elapsedSeconds(completed, "2026-06-15T11:00:00.000Z")).toBe(480);
  });
});
