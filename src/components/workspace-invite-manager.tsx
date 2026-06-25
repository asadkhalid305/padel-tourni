"use client";

import { Copy, Link2, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import {
  createWorkspaceInvite,
  revokeWorkspaceInvite,
  type ActionState,
} from "@/app/actions";
import { Button, Card, Spinner } from "@/components/ui";
import type { WorkspaceInvite } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const initialState: ActionState = { ok: false, message: "" };

export function WorkspaceInviteManager({
  invites,
}: {
  invites: WorkspaceInvite[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createWorkspaceInvite,
    initialState,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
          <Link2 size={18} />
        </span>
        <div>
          <h2 className="text-lg font-black text-[var(--ink)]">
            Invite club members
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Create a private link for someone to join this club. Email is
            optional; if provided, only that address can accept.
          </p>
        </div>
      </div>

      <form action={createAction} className="mt-5 space-y-3">
        <label className="block">
          <span className="field-label">Recipient email</span>
          <input
            className="field"
            name="email"
            type="email"
            placeholder="optional@example.com"
          />
        </label>
        <label className="block">
          <span className="field-label">Link expires after</span>
          <select className="field" name="expiresInDays" defaultValue="14">
            <option value="1">1 day</option>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
          </select>
        </label>
        <Button className="w-full" disabled={createPending}>
          {createPending ? (
            <>
              <Spinner />
              Creating invite...
            </>
          ) : (
            "Create invite link"
          )}
        </Button>
        {createState.message ? (
          <p
            className={`text-sm font-semibold ${
              createState.ok ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {createState.message}
          </p>
        ) : null}
        {createState.inviteUrl ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-800">
              Invite link
            </p>
            <div className="mt-2 flex gap-2">
              <input
                className="field min-w-0 text-xs"
                readOnly
                value={createState.inviteUrl}
                aria-label="Generated invite link"
              />
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard?.writeText(
                    createState.inviteUrl ?? "",
                  );
                  setCopied(true);
                }}
                aria-label="Copy invite link"
              >
                <Copy size={15} />
              </Button>
            </div>
            {copied ? (
              <p className="mt-2 text-xs font-bold text-emerald-800">
                Link copied.
              </p>
            ) : null}
          </div>
        ) : null}
      </form>

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-black text-[var(--ink)]">Recent invites</h3>
        {invites.length ? (
          invites.map((invite) => <InviteRow key={invite.id} invite={invite} />)
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-500">
            No invites created yet.
          </p>
        )}
      </div>
    </Card>
  );
}

function InviteRow({ invite }: { invite: WorkspaceInvite }) {
  const [state, action, pending] = useActionState(
    revokeWorkspaceInvite,
    initialState,
  );
  const active = invite.status === "pending";

  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[var(--ink)]">
            {invite.invitedEmail ?? "Reusable invite link"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {invite.status} · expires {formatDate(invite.expiresAt)}
          </p>
        </div>
        {active ? (
          <form action={action} className="ml-auto">
            <input type="hidden" name="inviteId" value={invite.id} />
            <Button
              type="submit"
              variant="ghost"
              className="min-h-9 px-3"
              disabled={pending}
              aria-label={`Revoke invite for ${invite.invitedEmail ?? "reusable link"}`}
            >
              {pending ? <Spinner /> : <X size={15} />}
            </Button>
          </form>
        ) : null}
      </div>
      {state.message ? (
        <p
          className={`mt-2 text-xs font-semibold ${
            state.ok ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
