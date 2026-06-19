"use client";

import { AlertCircle, ChevronDown } from "lucide-react";
import { useActionState, useState } from "react";

import { updateRoundLineup, type ActionState } from "@/app/actions";
import { Button, Spinner } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

type RoundMatch = {
  id: string;
  courtNumber: number;
  playerIds: [string, string, string, string];
  isEditable: boolean;
};

type RoundPlayer = {
  id: string;
  name: string;
  rating: number;
};

export function RoundDrawEditor({
  eventId,
  roundNumber,
  matches,
  players,
}: {
  eventId: string;
  roundNumber: number;
  matches: RoundMatch[];
  players: RoundPlayer[];
}) {
  const [state, action, pending] = useActionState(
    updateRoundLineup,
    initialState,
  );
  const editableMatches = matches.filter((match) => match.isEditable);
  const lockedPlayerIds = matches
    .filter((match) => !match.isEditable)
    .flatMap((match) => match.playerIds);
  const initialSelections = editableMatches.flatMap((match) => match.playerIds);
  const [selections, setSelections] = useState(initialSelections);
  const originalCourtByPlayerId = new Map(
    matches.flatMap((match) =>
      match.playerIds.map((playerId) => [playerId, match.courtNumber]),
    ),
  );
  const assignedCounts = [...lockedPlayerIds, ...selections].reduce(
    (counts, playerId) => counts.set(playerId, (counts.get(playerId) ?? 0) + 1),
    new Map<string, number>(),
  );
  const duplicateIds = new Set(
    selections.filter((playerId) => (assignedCounts.get(playerId) ?? 0) > 1),
  );
  const duplicateNames = players
    .filter((player) => duplicateIds.has(player.id))
    .map((player) => player.name);

  function updateSelection(index: number, playerId: string) {
    setSelections((current) =>
      current.map((selectedId, selectedIndex) =>
        selectedIndex === index ? playerId : selectedId,
      ),
    );
  }

  return (
    <form
      action={action}
      className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5"
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="roundNumber" value={roundNumber} />
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-black text-[var(--ink)]">
            {editableMatches.length === matches.length
              ? `Edit all of Round ${roundNumber}`
              : `Edit scheduled matches in Round ${roundNumber}`}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {editableMatches.length === matches.length
              ? "Swap players between courts, then save the complete round together."
              : "Started or completed matches stay locked; scheduled matches are checked against them before saving."}
          </p>
        </div>
        <span className="mt-2 text-xs font-bold text-emerald-800 sm:mt-0">
          All event players are available
        </span>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {editableMatches.map((match, matchIndex) => (
          <fieldset
            key={match.id}
            className="rounded-2xl border border-white bg-white/85 p-4 shadow-sm"
          >
            <legend className="px-1 text-xs font-black uppercase tracking-[0.14em] text-[var(--green)]">
              Court {match.courtNumber}
            </legend>
            <input type="hidden" name="matchIds" value={match.id} />
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {match.playerIds.map((selectedId, slotIndex) => {
                const selectionIndex = matchIndex * 4 + slotIndex;
                const teamNumber = slotIndex < 2 ? 1 : 2;
                return (
                  <label
                    key={`${match.id}-${slotIndex}`}
                    className="text-xs font-bold text-slate-500"
                  >
                    Team {teamNumber}, player {(slotIndex % 2) + 1}
                    <span className="relative mt-1 block">
                      <select
                        className={`field min-h-11 appearance-none py-2 pl-3 pr-9 text-sm font-semibold ${
                          duplicateIds.has(selections[selectionIndex])
                            ? "border-rose-400 bg-rose-50"
                            : ""
                        }`}
                        name="playerIds"
                        value={selections[selectionIndex] ?? selectedId}
                        disabled={pending}
                        onChange={(event) =>
                          updateSelection(selectionIndex, event.target.value)
                        }
                      >
                        {players.map((player) => {
                          const originalCourt = originalCourtByPlayerId.get(
                            player.id,
                          );
                          const location = originalCourt
                            ? `Court ${originalCourt}`
                            : "Waiting";
                          return (
                            <option key={player.id} value={player.id}>
                              {player.name} · {location} · Rating{" "}
                              {player.rating.toFixed(1)}
                            </option>
                          );
                        })}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-950/60"
                        size={16}
                      />
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {duplicateNames.length ? (
        <p
          className="mt-4 flex items-start gap-2 rounded-xl bg-rose-100 p-3 text-sm font-bold text-rose-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
          {duplicateNames.join(", ")}{" "}
          {duplicateNames.length === 1 ? "is" : "are"} assigned more than once.
          Resolve the conflict before saving, including locked matches.
        </p>
      ) : null}

      <Button
        className="mt-4 w-full shadow-none sm:w-auto"
        variant="primary"
        disabled={pending || duplicateNames.length > 0}
      >
        {pending ? (
          <>
            <Spinner /> Saving round...
          </>
        ) : (
          "Save round draw"
        )}
      </Button>
      {state.message ? (
        <p
          className={`mt-3 text-sm font-bold ${
            state.ok ? "text-emerald-700" : "text-rose-700"
          }`}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
