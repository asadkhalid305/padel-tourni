"use client";

import { useActionState, useEffect, useRef } from "react";

import { savePlayer, type ActionState } from "@/app/actions";
import { Button, Card } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

export function PlayerForm() {
  const [state, action, pending] = useActionState(savePlayer, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <Card>
      <h2 className="text-lg font-black text-[var(--ink)]">Add a player</h2>
      <p className="mt-1 text-sm text-slate-500">
        Ratings run from 1 to 10 and help balance teams.
      </p>
      <form ref={formRef} action={action} className="mt-5 space-y-4">
        <label className="block">
          <span className="field-label">Name</span>
          <input
            className="field"
            name="name"
            placeholder="Player name"
            required
            minLength={2}
          />
        </label>
        <label className="block">
          <span className="field-label">Rating</span>
          <input
            className="field"
            name="rating"
            type="number"
            min="1"
            max="10"
            step="0.5"
            defaultValue="5"
            required
          />
        </label>
        <Button className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Add player"}
        </Button>
        {state.message ? (
          <p
            className={`text-sm font-semibold ${
              state.ok ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}
