"use client";

import { useActionState } from "react";

import { updateMatchLineup, type ActionState } from "@/app/actions";
import { Button } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

export function MatchEditor({
  matchId,
  eventId,
  playerIds,
  players,
  disabled,
}: {
  matchId: string;
  eventId: string;
  playerIds: string[];
  players: { id: string; name: string }[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateMatchLineup,
    initialState,
  );
  return (
    <form action={action} className="mt-4 border-t border-slate-100 pt-4">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {playerIds.map((selectedId, index) => (
          <select
            key={`${matchId}-${index}`}
            className="field py-2 text-sm"
            name="playerIds"
            defaultValue={selectedId}
            disabled={disabled || pending}
            aria-label={`Player slot ${index + 1}`}
          >
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        ))}
      </div>
      <Button
        className="mt-3 w-full"
        variant="ghost"
        disabled={disabled || pending}
      >
        {disabled ? "Draw locked" : pending ? "Updating..." : "Update draw"}
      </Button>
      {state.message ? (
        <p
          className={`mt-2 text-xs font-bold ${
            state.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
