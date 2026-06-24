"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  deletePlayer,
  linkPlayerAccount,
  savePlayer,
  setPlayerAdminRole,
  unlinkPlayerAccount,
  type ActionState,
} from "@/app/actions";
import { Button, Card, Spinner } from "@/components/ui";
import type { LinkableAppUser } from "@/lib/data";
import { roleLabel, type AppUserRole } from "@/lib/roles";

const initialState: ActionState = { ok: false, message: "" };

type EditablePlayer = {
  id: string;
  name: string;
  appUserId: string | null;
  accountEmail: string | null;
  accountDisplayName: string | null;
  accountRole: AppUserRole | null;
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
        Players can be used in events immediately. Link a player to a signed-in
        account when the real person joins.
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
          <span className="field-label">Email</span>
          <input
            className="field"
            name="accountEmail"
            type="email"
            placeholder="player@example.com"
            defaultValue={player?.appUserId ? "" : (player?.accountEmail ?? "")}
          />
          <span className="mt-1 block text-xs font-semibold text-slate-500">
            Optional. This is only a note until the player is linked to a
            signed-in account.
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

export function PlayerAccountLinkForm({
  player,
  linkableUsers,
}: {
  player: EditablePlayer;
  linkableUsers: LinkableAppUser[];
}) {
  const [linkState, linkAction, linkPending] = useActionState(
    linkPlayerAccount,
    initialState,
  );
  const [unlinkState, unlinkAction, unlinkPending] = useActionState(
    unlinkPlayerAccount,
    initialState,
  );
  const pending = linkPending || unlinkPending;

  if (!player.appUserId && !linkableUsers.length) {
    return (
      <p className="text-xs font-semibold text-slate-500">
        Invite and accept a workspace member before linking this player.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      <form action={linkAction} className="flex flex-wrap items-start gap-2">
        <input type="hidden" name="playerId" value={player.id} />
        <label className="sr-only" htmlFor={`account-${player.id}`}>
          App account for {player.name}
        </label>
        <select
          id={`account-${player.id}`}
          name="appUserId"
          className="field min-h-11 w-64 py-2 text-sm"
          defaultValue={player.appUserId ?? ""}
          disabled={pending}
          required
        >
          <option value="" disabled>
            Connect joined account
          </option>
          {linkableUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayName ? `${user.displayName} · ` : ""}
              {user.email} · {roleLabel(user.role)}
            </option>
          ))}
        </select>
        <Button type="submit" variant="ghost" disabled={pending}>
          {linkPending ? (
            <>
              <Spinner />
              Linking...
            </>
          ) : (
            "Link account"
          )}
        </Button>
      </form>
      {player.appUserId ? (
        <form action={unlinkAction}>
          <input type="hidden" name="playerId" value={player.id} />
          <Button type="submit" variant="ghost" disabled={pending}>
            {unlinkPending ? (
              <>
                <Spinner />
                Unlinking...
              </>
            ) : (
              "Unlink"
            )}
          </Button>
        </form>
      ) : null}
      {linkState.message ? (
        <p
          role="status"
          className={`basis-full text-xs font-semibold ${
            linkState.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {linkState.message}
        </p>
      ) : null}
      {unlinkState.message ? (
        <p
          role="status"
          className={`basis-full text-xs font-semibold ${
            unlinkState.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {unlinkState.message}
        </p>
      ) : null}
    </div>
  );
}

export function AdminRoleButton({ player }: { player: EditablePlayer }) {
  const [state, action, pending] = useActionState(
    setPlayerAdminRole,
    initialState,
  );

  if (!player.appUserId || !player.accountRole) return null;

  return (
    <form action={action} className="flex flex-wrap items-start gap-2">
      <input type="hidden" name="appUserId" value={player.appUserId} />
      <label className="sr-only" htmlFor={`role-${player.id}`}>
        Role for {player.name}
      </label>
      <select
        id={`role-${player.id}`}
        name="role"
        className="field min-h-11 w-36 py-2 text-sm"
        defaultValue={player.accountRole}
        disabled={pending}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
        <option value="super_admin">Super admin</option>
      </select>
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? (
          <>
            <Spinner />
            Updating...
          </>
        ) : (
          "Update role"
        )}
      </Button>
      {state.message ? (
        <p
          role="status"
          className={`basis-full text-xs font-semibold ${
            state.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
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
        aria-label={`Delete ${player.name}`}
      >
        {pending ? (
          <>
            <Spinner />
            Deleting...
          </>
        ) : (
          "Delete"
        )}
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
