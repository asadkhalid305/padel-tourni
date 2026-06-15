"use client";

import { useActionState, useEffect, useRef } from "react";

import { deletePlayer, savePlayer, type ActionState } from "@/app/actions";
import { Button, Card } from "@/components/ui";

const initialState: ActionState = { ok: false, message: "" };

type EditablePlayer = {
  id: string;
  name: string;
  rating: number;
  isActive: boolean;
};

export function PlayerForm({
  player,
  onCancel,
}: {
  player?: EditablePlayer;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState(savePlayer, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.ok) return;
    formRef.current?.reset();
    onCancel?.();
  }, [state.ok, onCancel]);

  return (
    <Card>
      <h2 className="text-lg font-black text-[var(--ink)]">
        {player ? "Edit player" : "Add a player"}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Ratings run from 1 to 10 and help balance teams.
      </p>
      <form
        key={player?.id ?? "new"}
        ref={formRef}
        action={action}
        className="mt-5 space-y-4"
      >
        {player ? <input type="hidden" name="id" value={player.id} /> : null}
        {!player ? <input type="hidden" name="isActive" value="true" /> : null}
        <label className="block">
          <span className="field-label">Name</span>
          <input
            className="field"
            name="name"
            placeholder="Player name"
            required
            minLength={2}
            defaultValue={player?.name}
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
            defaultValue={player?.rating ?? 5}
            required
          />
        </label>
        {player ? (
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-bold text-[var(--ink)]">
            <input type="hidden" name="isActive" value="false" />
            <input
              type="checkbox"
              name="isActive"
              value="true"
              defaultChecked={player.isActive}
              className="size-4 accent-emerald-700"
            />
            Active and available for new events
          </label>
        ) : null}
        <div className="flex gap-2">
          {player ? (
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </Button>
          ) : null}
          <Button className="flex-1" disabled={pending}>
            {pending ? "Saving..." : player ? "Save changes" : "Add player"}
          </Button>
        </div>
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

export function DeletePlayerButton({ player }: { player: EditablePlayer }) {
  const [state, action, pending] = useActionState(deletePlayer, initialState);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Permanently delete ${player.name}?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={player.id} />
      <Button
        type="submit"
        variant="danger"
        disabled={pending}
        aria-label={`Delete ${player.name}`}
      >
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {state.message ? (
        <p
          role="status"
          className={`mt-2 max-w-64 text-xs font-semibold ${
            state.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
