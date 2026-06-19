"use client";

import { useActionState } from "react";

import { saveScore, type ActionState } from "@/app/actions";
import { Button, Spinner } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

export function ScoreForm({
  matchId,
  eventId,
}: {
  matchId: string;
  eventId: string;
}) {
  const [state, action, pending] = useActionState(saveScore, initialState);
  return (
    <form action={action} className="mt-5">
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="eventId" value={eventId} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <input
          aria-label="Team one score"
          className="score-field"
          name="teamOneScore"
          type="number"
          min="0"
          max="99"
          defaultValue="0"
          required
        />
        <span className="font-black text-slate-300">:</span>
        <input
          aria-label="Team two score"
          className="score-field"
          name="teamTwoScore"
          type="number"
          min="0"
          max="99"
          defaultValue="0"
          required
        />
      </div>
      <Button className="mt-3 w-full" variant="secondary" disabled={pending}>
        {pending ? (
          <>
            <Spinner />
            Saving score...
          </>
        ) : (
          "Complete match"
        )}
      </Button>
      {state.message ? (
        <p
          className={`mt-2 text-center text-xs font-bold ${
            state.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
