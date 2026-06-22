export type TimerState = {
  durationSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  accumulatedPauseSeconds: number;
  completedAt: string | null;
};

function secondsBetween(start: string, end: string) {
  return Math.max(
    0,
    Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000),
  );
}

export function elapsedSeconds(state: TimerState, now: string) {
  if (!state.startedAt) return 0;
  const effectiveEnd = state.completedAt ?? state.pausedAt ?? now;
  return Math.max(
    0,
    secondsBetween(state.startedAt, effectiveEnd) -
      state.accumulatedPauseSeconds,
  );
}

export function timerDisplay(state: TimerState, now: string) {
  const elapsed = elapsedSeconds(state, now);
  return {
    elapsedSeconds: elapsed,
    remainingSeconds: Math.max(0, state.durationSeconds - elapsed),
    overtimeSeconds: Math.max(0, elapsed - state.durationSeconds),
    isOvertime: elapsed > state.durationSeconds,
  };
}

export type TimerSoundCue =
  | { type: "remaining"; seconds: 60 | 120 | 300 }
  | { type: "expired" }
  | { type: "overtime"; seconds: number };

const remainingCueSeconds = [300, 120, 60] as const;
const overtimeCueIntervalSeconds = 300;

export function timerSoundCues(options: {
  previousElapsedSeconds: number;
  elapsedSeconds: number;
  durationSeconds: number;
}) {
  const { previousElapsedSeconds, elapsedSeconds, durationSeconds } = options;
  if (elapsedSeconds <= previousElapsedSeconds || durationSeconds <= 0) {
    return [] satisfies TimerSoundCue[];
  }

  const cues: TimerSoundCue[] = [];
  for (const seconds of remainingCueSeconds) {
    const cueElapsedSeconds = durationSeconds - seconds;
    if (
      cueElapsedSeconds > 0 &&
      previousElapsedSeconds < cueElapsedSeconds &&
      elapsedSeconds >= cueElapsedSeconds
    ) {
      cues.push({ type: "remaining", seconds });
    }
  }

  if (
    previousElapsedSeconds < durationSeconds &&
    elapsedSeconds >= durationSeconds
  ) {
    cues.push({ type: "expired" });
  }

  const previousOvertime = Math.max(
    0,
    previousElapsedSeconds - durationSeconds,
  );
  const currentOvertime = Math.max(0, elapsedSeconds - durationSeconds);
  const firstOvertimeCue =
    Math.floor(previousOvertime / overtimeCueIntervalSeconds) + 1;
  const lastOvertimeCue = Math.floor(
    currentOvertime / overtimeCueIntervalSeconds,
  );
  for (let cue = firstOvertimeCue; cue <= lastOvertimeCue; cue += 1) {
    cues.push({
      type: "overtime",
      seconds: cue * overtimeCueIntervalSeconds,
    });
  }

  return cues;
}

export function pauseTimer(state: TimerState, pausedAt: string): TimerState {
  if (!state.startedAt || state.pausedAt || state.completedAt) return state;
  return { ...state, pausedAt };
}

export function resumeTimer(state: TimerState, resumedAt: string): TimerState {
  if (!state.pausedAt || state.completedAt) return state;
  return {
    ...state,
    accumulatedPauseSeconds:
      state.accumulatedPauseSeconds + secondsBetween(state.pausedAt, resumedAt),
    pausedAt: null,
  };
}

export function completeTimer(
  state: TimerState,
  completedAt: string,
): TimerState {
  if (!state.startedAt || state.completedAt) return state;
  const resumed = state.pausedAt ? resumeTimer(state, completedAt) : state;
  return { ...resumed, completedAt };
}
