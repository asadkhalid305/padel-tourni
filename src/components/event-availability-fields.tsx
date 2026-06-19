"use client";

import { useMemo, useState } from "react";

import { calculateMinimumEventPlayerCount } from "@/domain/event-requirements";
import { calculateScheduleCapacity } from "@/domain/schedule-calculations";

type CourtTimeMode = "equal" | "different";

export function EventAvailabilityFields({
  courtCount: controlledCourtCount,
  onCourtCountChange,
}: {
  courtCount?: number;
  onCourtCountChange?: (courtCount: number) => void;
}) {
  const [localCourtCount, setLocalCourtCount] = useState(2);
  const [courtTimeMode, setCourtTimeMode] = useState<CourtTimeMode>("equal");
  const [equalCourtMinutes, setEqualCourtMinutes] = useState(120);
  const [courtMinutes, setCourtMinutes] = useState([120, 120]);
  const [requestedRoundMinutes, setRequestedRoundMinutes] = useState(20);
  const [breakMinutes, setBreakMinutes] = useState(3);
  const courtCount = controlledCourtCount ?? localCourtCount;
  const readNumber = (value: number) => (Number.isNaN(value) ? 0 : value);
  const effectiveCourtMinutes =
    courtTimeMode === "equal"
      ? Array(courtCount).fill(equalCourtMinutes)
      : courtMinutes.slice(0, courtCount);
  const minimumPlayerCount = calculateMinimumEventPlayerCount(courtCount);

  const capacity = useMemo(() => {
    try {
      return calculateScheduleCapacity({
        courtMinutes: effectiveCourtMinutes,
        requestedRoundMinutes,
        breakMinutes,
      });
    } catch {
      return null;
    }
  }, [breakMinutes, effectiveCourtMinutes, requestedRoundMinutes]);

  function updateCourtCount(value: number) {
    const nextCourtCount = Math.max(1, Math.min(20, readNumber(value)));
    setLocalCourtCount(nextCourtCount);
    onCourtCountChange?.(nextCourtCount);
    setCourtMinutes((current) =>
      Array.from(
        { length: nextCourtCount },
        (_, index) => current[index] ?? equalCourtMinutes,
      ),
    );
  }

  function updateCourtMinutes(index: number, value: number) {
    setCourtMinutes((current) =>
      current.map((minutes, currentIndex) =>
        currentIndex === index ? readNumber(value) : minutes,
      ),
    );
  }

  return (
    <>
      <label className="block">
        <span className="field-label">Number of courts</span>
        <input
          className="field"
          name="courtCount"
          type="number"
          min="1"
          max="20"
          value={courtCount}
          onChange={(event) =>
            updateCourtCount(event.currentTarget.valueAsNumber)
          }
          required
        />
      </label>
      <label className="block">
        <span className="field-label">Court time setup</span>
        <select
          className="field"
          value={courtTimeMode}
          onChange={(event) =>
            setCourtTimeMode(event.currentTarget.value as CourtTimeMode)
          }
        >
          <option value="equal">Equal time for each court</option>
          <option value="different">Different time per court</option>
        </select>
      </label>
      {courtTimeMode === "equal" ? (
        <label className="block sm:col-span-2">
          <span className="field-label">Minutes for each court</span>
          <input
            className="field"
            type="number"
            min="5"
            max="1440"
            value={equalCourtMinutes}
            onChange={(event) =>
              setEqualCourtMinutes(
                readNumber(event.currentTarget.valueAsNumber),
              )
            }
            required
          />
          {effectiveCourtMinutes.map((minutes, index) => (
            <input
              key={index}
              name="courtMinutes"
              type="hidden"
              value={minutes}
            />
          ))}
        </label>
      ) : (
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          {courtMinutes.slice(0, courtCount).map((minutes, index) => (
            <label className="block" key={index}>
              <span className="field-label">Court {index + 1} minutes</span>
              <input
                className="field"
                name="courtMinutes"
                type="number"
                min="5"
                max="1440"
                value={minutes}
                onChange={(event) =>
                  updateCourtMinutes(index, event.currentTarget.valueAsNumber)
                }
                required
              />
            </label>
          ))}
        </div>
      )}
      <label className="block">
        <span className="field-label">Preferred match minutes</span>
        <input
          className="field"
          name="requestedRoundMinutes"
          type="number"
          min="5"
          max="120"
          value={requestedRoundMinutes}
          onChange={(event) =>
            setRequestedRoundMinutes(
              readNumber(event.currentTarget.valueAsNumber),
            )
          }
          required
        />
      </label>
      <label className="block">
        <span className="field-label">Rest minutes</span>
        <input
          className="field"
          name="breakMinutes"
          type="number"
          min="0"
          max="30"
          value={breakMinutes}
          onChange={(event) =>
            setBreakMinutes(readNumber(event.currentTarget.valueAsNumber))
          }
          required
        />
      </label>
      <div
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:col-span-2"
        aria-live="polite"
      >
        {capacity ? (
          <div className="space-y-2 text-sm font-semibold text-emerald-950">
            <p>
              <strong className="font-black">
                {capacity.matchCount} matches
              </strong>{" "}
              across {capacity.roundCount} rounds at {capacity.roundMinutes}{" "}
              minutes each
              {capacity.roundMinutes !== requestedRoundMinutes
                ? ` (adjusted from ${requestedRoundMinutes} minutes)`
                : ""}
              .
            </p>
            <p className="text-xs text-emerald-900/80">
              Minimum roster: {minimumPlayerCount} players.
            </p>
            <p className="text-xs text-emerald-900/80">
              Total court time:{" "}
              {effectiveCourtMinutes.reduce(
                (total, minutes) => total + minutes,
                0,
              )}{" "}
              minutes. Unused court time: {capacity.unusedCourtMinutes} minutes.
            </p>
            <p className="text-xs text-emerald-900/80">
              Court assignment by round:{" "}
              {capacity.courtNumbersByRound
                .map(
                  (courtNumbers, index) =>
                    `R${index + 1}: ${courtNumbers
                      .map((courtNumber) => `Court ${courtNumber}`)
                      .join(" + ")}`,
                )
                .join("; ")}
            </p>
          </div>
        ) : (
          <p className="text-sm font-semibold text-rose-700">
            Enter enough event time for at least one match round.
          </p>
        )}
      </div>
    </>
  );
}
