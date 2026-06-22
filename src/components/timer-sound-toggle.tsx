"use client";

import { Volume2, VolumeX } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useSyncExternalStore,
} from "react";

const TimerSoundContext = createContext(false);
const TimerSoundUpdateContext = createContext<(enabled: boolean) => void>(
  () => {},
);
const storageKey = "padeltour.timerSoundEnabled";
const storageChangeEvent = "padeltour:timer-sound-change";

function getTimerSoundSnapshot() {
  return window.localStorage.getItem(storageKey) === "true";
}

function getServerTimerSoundSnapshot() {
  return false;
}

function subscribeToTimerSound(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(storageChangeEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(storageChangeEvent, callback);
  };
}

export function TimerSoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(
    subscribeToTimerSound,
    getTimerSoundSnapshot,
    getServerTimerSoundSnapshot,
  );

  function updateEnabled(nextEnabled: boolean) {
    window.localStorage.setItem(storageKey, String(nextEnabled));
    window.dispatchEvent(new Event(storageChangeEvent));
  }

  return (
    <TimerSoundContext.Provider value={enabled}>
      <TimerSoundUpdateContext.Provider value={updateEnabled}>
        {children}
      </TimerSoundUpdateContext.Provider>
    </TimerSoundContext.Provider>
  );
}

export function useTimerSoundEnabled() {
  return useContext(TimerSoundContext);
}

export function TimerSoundToggle() {
  const enabled = useContext(TimerSoundContext);
  const setEnabled = useContext(TimerSoundUpdateContext);
  const Icon = enabled ? Volume2 : VolumeX;

  return (
    <label className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-[var(--green)]">
          <Icon size={20} />
        </span>
        <span>
          <span className="block text-sm font-black text-[var(--ink)]">
            Timer sound
          </span>
          <span className="block text-sm text-slate-500">
            Siren at zero, spoken reminders before and during overtime.
          </span>
        </span>
      </span>
      <span className="inline-flex items-center gap-3 self-start sm:self-center">
        <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          {enabled ? "On" : "Off"}
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.currentTarget.checked)}
          className="peer sr-only"
        />
        <span className="relative h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-[var(--green)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--lime)]">
          <span
            className={`absolute left-1 top-1 size-5 rounded-full bg-white shadow transition ${
              enabled ? "translate-x-5" : ""
            }`}
          />
        </span>
      </span>
    </label>
  );
}
