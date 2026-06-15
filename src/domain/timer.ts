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
