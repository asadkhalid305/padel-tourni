"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { deletePlayer, savePlayer, type ActionState } from "@/app/actions";
import { Button, Card, Spinner } from "@/components/ui";
import type { WorkspaceRole } from "@/lib/roles";

const initialState: ActionState = { ok: false, message: "" };

type EditablePlayer = {
  id: string;
  name: string;
  appUserId: string | null;
  accountEmail: string | null;
  accountDisplayName: string | null;
  rating: number;
  isActive: boolean;
};

export function PlayerForm({
  player,
  membership,
  canManageRoles = false,
  currentAppUserId,
  onCancel,
}: {
  player?: EditablePlayer;
  membership?: {
    membershipId: string;
    appUserId: string;
    role: WorkspaceRole;
  };
  canManageRoles?: boolean;
  currentAppUserId?: string;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState(savePlayer, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const isLinkedPlayer = Boolean(player?.appUserId);
  const canChangeRole =
    Boolean(membership) &&
    canManageRoles &&
    membership?.role !== "owner" &&
    membership?.appUserId !== currentAppUserId;
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
        Players can be used in events immediately. Joined members use their
        account name and email; admins manage rating and active state here.
      </p>
      <form
        key={player?.id ?? "new"}
        ref={formRef}
        action={action}
        className="mt-5 space-y-4"
      >
        {player ? <input type="hidden" name="id" value={player.id} /> : null}
        {player?.appUserId ? (
          <input type="hidden" name="appUserId" value={player.appUserId} />
        ) : null}
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
            readOnly={isLinkedPlayer}
          />
          {isLinkedPlayer ? (
            <span className="mt-1 block text-xs font-semibold text-slate-500">
              Name is read from the signed-in account.
            </span>
          ) : null}
        </label>
        <label className="block">
          <span className="field-label">Email</span>
          <input
            className="field"
            name="accountEmail"
            type="email"
            placeholder="player@example.com"
            defaultValue={player?.accountEmail ?? ""}
            readOnly={isLinkedPlayer}
          />
          <span className="mt-1 block text-xs font-semibold text-slate-500">
            {isLinkedPlayer
              ? "Email is read from the signed-in account."
              : "Optional. This is only a note until the player joins with an account."}
          </span>
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
        {membership ? (
          <label className="block">
            <span className="field-label">Workspace role</span>
            {canChangeRole ? (
              <>
                <input
                  type="hidden"
                  name="membershipId"
                  value={membership.membershipId}
                />
                <select
                  className="field"
                  name="workspaceRole"
                  defaultValue={membership.role}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </>
            ) : (
              <input
                className="field capitalize"
                value={membership.role}
                readOnly
              />
            )}
            <span className="mt-1 block text-xs font-semibold text-slate-500">
              {canChangeRole
                ? "Owners and admins can promote or demote joined members."
                : "This role cannot be changed here."}
            </span>
          </label>
        ) : null}
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
            {pending ? (
              <>
                <Spinner />
                Saving...
              </>
            ) : player ? (
              "Save changes"
            ) : (
              "Add player"
            )}
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
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

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
        className="size-10 min-h-10 rounded-full px-0"
        aria-label={`Delete ${player.name}`}
        title={`Delete ${player.name}`}
      >
        {pending ? <Spinner /> : <Trash2 size={16} />}
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
