"use client";

import { ShieldCheck, ShieldPlus, UserRound } from "lucide-react";
import { useActionState } from "react";

import { setWorkspaceMemberRole, type ActionState } from "@/app/actions";
import { Badge, Button, Card, Spinner } from "@/components/ui";
import type { WorkspaceMember } from "@/lib/data";
import { workspaceRoleLabel } from "@/lib/roles";

const initialState: ActionState = { ok: false, message: "" };

export function WorkspaceMemberManager({
  members,
  currentAppUserId,
  canManageRoles,
}: {
  members: WorkspaceMember[];
  currentAppUserId: string;
  canManageRoles: boolean;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800">
          <UserRound size={18} />
        </span>
        <div>
          <h2 className="text-lg font-black text-[var(--ink)]">Access</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Control who can manage events, scores, timers, invites, and player
            links.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        {members.map((member) => (
          <WorkspaceMemberRow
            key={member.membershipId}
            member={member}
            currentAppUserId={currentAppUserId}
            canManageRoles={canManageRoles}
          />
        ))}
      </div>
    </Card>
  );
}

function WorkspaceMemberRow({
  member,
  currentAppUserId,
  canManageRoles,
}: {
  member: WorkspaceMember;
  currentAppUserId: string;
  canManageRoles: boolean;
}) {
  const [state, action, pending] = useActionState(
    setWorkspaceMemberRole,
    initialState,
  );
  const roleTone =
    member.role === "owner"
      ? "warning"
      : member.role === "admin"
        ? "info"
        : "neutral";
  const canChangeRole =
    canManageRoles &&
    member.role !== "owner" &&
    member.appUserId !== currentAppUserId;

  return (
    <div className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[var(--ink)]">
            {member.displayName || member.email}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {member.email}
            {member.linkedPlayerName
              ? ` · linked to ${member.linkedPlayerName}`
              : ""}
          </p>
        </div>
        <Badge tone={roleTone}>
          {member.role === "owner" ? (
            <ShieldCheck className="mr-1" size={13} />
          ) : member.role === "admin" ? (
            <ShieldPlus className="mr-1" size={13} />
          ) : null}
          {workspaceRoleLabel(member.role)}
        </Badge>
      </div>

      {canChangeRole ? (
        <form action={action} className="mt-3 flex flex-wrap items-start gap-2">
          <input
            type="hidden"
            name="membershipId"
            value={member.membershipId}
          />
          <label
            className="sr-only"
            htmlFor={`workspace-role-${member.membershipId}`}
          >
            Workspace role for {member.email}
          </label>
          <select
            id={`workspace-role-${member.membershipId}`}
            name="role"
            className="field min-h-11 w-40 py-2 text-sm"
            defaultValue={member.role}
            disabled={pending}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
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
        </form>
      ) : null}
      {state.message ? (
        <p
          role="status"
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
