"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { updateTimer } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { timerDisplay } from "@/domain/timer";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

export function MatchTimer({
  matchId,
  eventId,
  durationSeconds,
  startedAt,
  pausedAt,
  accumulatedPauseSeconds,
  initialNow,
  canManage,
  disabled = false,
}: {
  matchId: string;
  eventId: string;
  durationSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedPauseSeconds: number;
  initialNow: string;
  canManage: boolean;
  disabled?: boolean;
}) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const interval = window.setInterval(
      () => setNow(new Date().toISOString()),
      1000,
    );
    return () => window.clearInterval(interval);
  }, []);
  const display = timerDisplay(
    {
      durationSeconds,
      startedAt,
      pausedAt,
      accumulatedPauseSeconds,
      completedAt: null,
    },
    now,
  );
  const operation = !startedAt ? "start" : pausedAt ? "resume" : "pause";

  return (
    <div className="rounded-2xl bg-[var(--ink)] p-4 text-white">
      <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-white/50">
        {display.isOvertime ? "Overtime" : pausedAt ? "Paused" : "Match clock"}
      </p>
      <p
        className={`mt-1 text-center text-4xl font-black tabular-nums ${
          display.isOvertime ? "text-rose-300" : "text-[var(--lime)]"
        }`}
      >
        {display.isOvertime
          ? `+${clock(display.overtimeSeconds)}`
          : clock(display.remainingSeconds)}
      </p>
      {canManage ? (
        <form action={updateTimer} className="mt-3">
          <input type="hidden" name="matchId" value={matchId} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="operation" value={operation} />
          <PendingSubmitButton
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-bold text-white shadow-none hover:bg-white/15"
            variant="ghost"
            pendingLabel="Updating timer..."
            disabled={disabled}
          >
            {!startedAt ? (
              <Play size={17} />
            ) : pausedAt ? (
              <RotateCcw size={17} />
            ) : (
              <Pause size={17} />
            )}
            {disabled
              ? "Available when event is live"
              : !startedAt
                ? "Start timer"
                : pausedAt
                  ? "Resume timer"
                  : "Pause timer"}
          </PendingSubmitButton>
        </form>
      ) : null}
    </div>
  );
}
