"use client";

import { Save, ShieldCheck, ShieldPlus, UserMinus } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  removeWorkspaceMember,
  setWorkspaceMemberRole,
  type ActionState,
} from "@/app/actions";
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
    <div>
      <form action={action} className="flex items-start gap-2">
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
          className="field min-h-10 w-28 py-1.5 text-sm"
          defaultValue={member.role}
          disabled={pending}
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button
          type="submit"
          variant="ghost"
          disabled={pending}
          className="size-10 min-h-10 rounded-full px-0"
          aria-label={`Update role for ${member.email}`}
          title={`Update role for ${member.email}`}
        >
          {pending ? <Spinner /> : <Save size={15} />}
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

export function RemoveWorkspaceMemberButton({
  member,
  currentAppUserId,
  canManageRoles,
}: {
  member: WorkspaceMember;
  currentAppUserId: string;
  canManageRoles: boolean;
}) {
  const [state, action, pending] = useActionState(
    removeWorkspaceMember,
    initialState,
  );
  const router = useRouter();
  const canRemove =
    canManageRoles &&
    member.role !== "owner" &&
    member.appUserId !== currentAppUserId;

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [router, state.ok]);

  if (!canRemove) return null;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${member.displayName || member.email} from this workspace?`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="membershipId" value={member.membershipId} />
      <Button
        type="submit"
        variant="danger"
        disabled={pending}
        className="size-10 min-h-10 rounded-full px-0"
        aria-label={`Remove ${member.displayName || member.email}`}
        title={`Remove ${member.displayName || member.email}`}
      >
        {pending ? <Spinner /> : <UserMinus size={16} />}
      </Button>
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
    </form>
  );
}
