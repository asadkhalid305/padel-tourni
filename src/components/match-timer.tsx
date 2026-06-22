"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { updateTimer } from "@/app/actions";
import { PendingSubmitButton } from "@/components/pending-submit-button";
import { useTimerSoundEnabled } from "@/components/timer-sound-toggle";
import {
  timerDisplay,
  timerSoundCues,
  type TimerSoundCue,
} from "@/domain/timer";

function clock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

let audioContext: AudioContext | null = null;
let sirenStopTime = 0;
let activeSiren: {
  masterGain: GainNode;
  sources: AudioScheduledSourceNode[];
} | null = null;

function getAudioContext() {
  audioContext ??= new window.AudioContext();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playSiren() {
  const context = getAudioContext();
  if (context.currentTime < sirenStopTime) return;

  const start = context.currentTime;
  const duration = 30;
  const end = start + duration;
  sirenStopTime = end;

  const masterGain = context.createGain();
  masterGain.gain.setValueAtTime(0.001, start);
  masterGain.gain.exponentialRampToValueAtTime(0.36, start + 0.12);
  masterGain.gain.setValueAtTime(0.36, end - 0.8);
  masterGain.gain.exponentialRampToValueAtTime(0.001, end);
  masterGain.connect(context.destination);
  const siren = { masterGain, sources: [] as AudioScheduledSourceNode[] };
  activeSiren = siren;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-24, start);
  compressor.knee.setValueAtTime(18, start);
  compressor.ratio.setValueAtTime(5, start);
  compressor.attack.setValueAtTime(0.02, start);
  compressor.release.setValueAtTime(0.28, start);
  compressor.connect(masterGain);

  for (const offset of [0, 0.32]) {
    const hornGain = context.createGain();
    hornGain.gain.setValueAtTime(0.95, start);
    hornGain.connect(compressor);

    const oscillator = context.createOscillator();
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(185 + offset * 55, start);
    for (let step = 0; step < Math.ceil(duration / 1.6); step += 1) {
      const time = start + offset + step * 1.6;
      oscillator.frequency.linearRampToValueAtTime(
        620 + offset * 90,
        time + 0.8,
      );
      oscillator.frequency.linearRampToValueAtTime(
        170 + offset * 50,
        time + 1.6,
      );
    }
    oscillator.connect(hornGain);
    oscillator.start(start + offset);
    oscillator.stop(end);
    siren.sources.push(oscillator);
  }

  const subPulse = context.createOscillator();
  const subGain = context.createGain();
  subPulse.type = "square";
  subPulse.frequency.setValueAtTime(58, start);
  subGain.gain.setValueAtTime(0.18, start);
  subPulse.connect(subGain);
  subGain.connect(compressor);
  subPulse.start(start);
  subPulse.stop(end);
  siren.sources.push(subPulse);

  const noiseBuffer = context.createBuffer(
    1,
    context.sampleRate * duration,
    context.sampleRate,
  );
  const noise = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noise.length; index += 1) {
    noise[index] = (Math.random() * 2 - 1) * 0.22;
  }
  const noiseSource = context.createBufferSource();
  const noiseFilter = context.createBiquadFilter();
  const noiseGain = context.createGain();
  noiseSource.buffer = noiseBuffer;
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(420, start);
  noiseFilter.Q.setValueAtTime(0.85, start);
  noiseGain.gain.setValueAtTime(0.09, start);
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(compressor);
  noiseSource.start(start);
  noiseSource.stop(end);
  siren.sources.push(noiseSource);

  window.setTimeout(() => {
    if (sirenStopTime <= end) {
      activeSiren = null;
      sirenStopTime = 0;
    }
  }, duration * 1000);
}

function stopTimerAudio() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  const context = audioContext;
  if (!context || !activeSiren) {
    sirenStopTime = 0;
    activeSiren = null;
    return;
  }

  const stopAt = context.currentTime + 0.12;
  activeSiren.masterGain.gain.cancelScheduledValues(context.currentTime);
  activeSiren.masterGain.gain.setTargetAtTime(0.001, context.currentTime, 0.03);
  for (const source of activeSiren.sources) {
    try {
      source.stop(stopAt);
    } catch {
      // Source may already have naturally ended.
    }
  }
  activeSiren = null;
  sirenStopTime = 0;
}

function say(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1.25;
  utterance.volume = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function announceCue(cue: TimerSoundCue) {
  if (cue.type === "expired") {
    playSiren();
    say("Time is up. You are now in overtime.");
    return;
  }

  const minutes = Math.floor(cue.seconds / 60);
  if (cue.type === "remaining") {
    say(`${minutes} ${minutes === 1 ? "minute" : "minutes"} left.`);
  } else {
    say(`You are over ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`);
  }
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
  const soundEnabled = useTimerSoundEnabled();
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
  const previousElapsedSecondsRef = useRef(display.elapsedSeconds);
  useEffect(() => {
    if (!soundEnabled) {
      stopTimerAudio();
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (!soundEnabled || !startedAt || pausedAt) {
      previousElapsedSecondsRef.current = display.elapsedSeconds;
      return;
    }

    const cues = timerSoundCues({
      previousElapsedSeconds: previousElapsedSecondsRef.current,
      elapsedSeconds: display.elapsedSeconds,
      durationSeconds,
    });
    previousElapsedSecondsRef.current = display.elapsedSeconds;

    for (const cue of cues) {
      announceCue(cue);
    }
  }, [
    display.elapsedSeconds,
    durationSeconds,
    pausedAt,
    soundEnabled,
    startedAt,
  ]);
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
