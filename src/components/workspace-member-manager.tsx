"use client";

import { ShieldCheck, ShieldPlus } from "lucide-react";
import { useActionState } from "react";

import { setWorkspaceMemberRole, type ActionState } from "@/app/actions";
import { Badge, Button, Spinner } from "@/components/ui";
import type { WorkspaceMember } from "@/lib/data";
import { workspaceRoleLabel } from "@/lib/roles";

const initialState: ActionState = { ok: false, message: "" };

export function WorkspaceRoleBadge({
  role,
}: {
  role: WorkspaceMember["role"];
}) {
  const roleTone =
    role === "owner" ? "warning" : role === "admin" ? "info" : "neutral";

  return (
    <Badge tone={roleTone}>
      {role === "owner" ? (
        <ShieldCheck className="mr-1" size={13} />
      ) : role === "admin" ? (
        <ShieldPlus className="mr-1" size={13} />
      ) : null}
      {workspaceRoleLabel(role)}
    </Badge>
  );
}

export function WorkspaceMemberRoleForm({
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
  const canChangeRole =
    canManageRoles &&
    member.role !== "owner" &&
    member.appUserId !== currentAppUserId;

  if (!canChangeRole) return null;

  return (
    <div className="basis-full">
      <form action={action} className="mt-3 flex flex-wrap items-start gap-2">
        <input type="hidden" name="membershipId" value={member.membershipId} />
        <label
          className="sr-only"
          htmlFor={`workspace-role-${member.membershipId}`}
        >
          Role for {member.email}
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
