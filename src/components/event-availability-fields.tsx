"use client";

import { useMemo, useState } from "react";

import { calculateMinimumEventPlayerCount } from "@/domain/event-requirements";
import { calculateScheduleCapacity } from "@/domain/schedule-calculations";

type CourtTimeMode = "equal" | "different";

export function EventAvailabilityFields({
  courtCount: controlledCourtCount,
  initialCourtMinutes,
  initialRequestedRoundMinutes,
  initialBreakMinutes,
  disabled = false,
  onCourtCountChange,
}: {
  courtCount?: number;
  initialCourtMinutes?: number[];
  initialRequestedRoundMinutes?: number;
  initialBreakMinutes?: number;
  disabled?: boolean;
  onCourtCountChange?: (courtCount: number) => void;
}) {
  const defaultCourtMinutes =
    initialCourtMinutes && initialCourtMinutes.length
      ? initialCourtMinutes
      : [120, 120];
  const [localCourtCount, setLocalCourtCount] = useState(
    controlledCourtCount ?? defaultCourtMinutes.length,
  );
  const [courtTimeMode, setCourtTimeMode] = useState<CourtTimeMode>(() =>
    defaultCourtMinutes.every((minutes) => minutes === defaultCourtMinutes[0])
      ? "equal"
      : "different",
  );
  const [equalCourtMinutes, setEqualCourtMinutes] = useState(
    defaultCourtMinutes[0] ?? 120,
  );
  const [courtMinutes, setCourtMinutes] = useState(defaultCourtMinutes);
  const [requestedRoundMinutes, setRequestedRoundMinutes] = useState(
    initialRequestedRoundMinutes ?? 20,
  );
  const [breakMinutes, setBreakMinutes] = useState(initialBreakMinutes ?? 3);
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
      {disabled ? (
        <>
          <input type="hidden" name="courtCount" value={courtCount} />
          {effectiveCourtMinutes.map((minutes, index) => (
            <input
              key={index}
              type="hidden"
              name="courtMinutes"
              value={minutes}
            />
          ))}
          <input
            type="hidden"
            name="requestedRoundMinutes"
            value={requestedRoundMinutes}
          />
          <input type="hidden" name="breakMinutes" value={breakMinutes} />
        </>
      ) : null}
      <label className="block">
        <span className="field-label">Number of courts</span>
        <input
          className="field"
          name={disabled ? undefined : "courtCount"}
          type="number"
          min="1"
          max="20"
          value={courtCount}
          onChange={(event) =>
            updateCourtCount(event.currentTarget.valueAsNumber)
          }
          required
          disabled={disabled}
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
          disabled={disabled}
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
            disabled={disabled}
          />
          {!disabled
            ? effectiveCourtMinutes.map((minutes, index) => (
                <input
                  key={index}
                  name="courtMinutes"
                  type="hidden"
                  value={minutes}
                />
              ))
            : null}
        </label>
      ) : (
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          {courtMinutes.slice(0, courtCount).map((minutes, index) => (
            <label className="block" key={index}>
              <span className="field-label">Court {index + 1} minutes</span>
              <input
                className="field"
                name={disabled ? undefined : "courtMinutes"}
                type="number"
                min="5"
                max="1440"
                value={minutes}
                onChange={(event) =>
                  updateCourtMinutes(index, event.currentTarget.valueAsNumber)
                }
                required
                disabled={disabled}
              />
            </label>
          ))}
        </div>
      )}
      <label className="block">
        <span className="field-label">Preferred match minutes</span>
        <input
          className="field"
          name={disabled ? undefined : "requestedRoundMinutes"}
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
          disabled={disabled}
        />
      </label>
      <label className="block">
        <span className="field-label">Rest minutes</span>
        <input
          className="field"
          name={disabled ? undefined : "breakMinutes"}
          type="number"
          min="0"
          max="30"
          value={breakMinutes}
          onChange={(event) =>
            setBreakMinutes(readNumber(event.currentTarget.valueAsNumber))
          }
          required
          disabled={disabled}
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
