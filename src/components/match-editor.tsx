"use client";

import { ChevronDown } from "lucide-react";
import { useActionState } from "react";

import { updateMatchLineup, type ActionState } from "@/app/actions";
import { Button, Spinner } from "@/components/ui";

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
  players: { id: string; name: string; rating: number }[];
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateMatchLineup,
    initialState,
  );
  const hasSubstitutes = players.length > playerIds.length;
  if (!disabled && !hasSubstitutes) {
    return null;
  }

  return (
    <form action={action} className="mt-4 border-t border-emerald-950/10 pt-4">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {playerIds.map((selectedId, index) => (
          <div key={`${matchId}-${index}`} className="relative">
            <select
              className="field min-h-10 appearance-none py-2 pl-3 pr-9 text-sm font-semibold leading-tight"
              name="playerIds"
              defaultValue={selectedId}
              disabled={disabled || pending}
              aria-label={`Player slot ${index + 1}`}
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name} · Rating {player.rating.toFixed(1)}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-emerald-950/60"
              size={16}
            />
          </div>
        ))}
      </div>
      <Button
        className="mt-3 w-full shadow-none"
        variant="primary"
        disabled={disabled || pending}
      >
        {disabled ? (
          "Draw locked"
        ) : pending ? (
          <>
            <Spinner />
            Updating...
          </>
        ) : (
          "Update draw"
        )}
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
