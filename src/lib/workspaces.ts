import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRole } from "@/lib/roles";
import type { Database } from "@/types/database";

export type WorkspaceMembership = {
  workspaceId: string;
  role: WorkspaceRole;
};

export async function ensureDefaultWorkspaceForUser(
  client: SupabaseClient<Database>,
  user: { id: string; displayName: string; email: string },
): Promise<WorkspaceMembership> {
  const { data: existingMembership, error: existingMembershipError } =
    await client
      .from("workspace_memberships")
      .select("workspace_id,role")
      .eq("app_user_id", user.id)
      .order("created_at")
      .limit(1)
      .maybeSingle();

  if (existingMembershipError) throw existingMembershipError;
  if (existingMembership) {
    return {
      workspaceId: existingMembership.workspace_id,
      role: existingMembership.role,
    };
  }

  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .insert({
      name: defaultWorkspaceName(user),
      personal_owner_app_user_id: user.id,
    })
    .select("id")
    .single();

  if (workspaceError) throw workspaceError;

  const { data: membership, error: membershipError } = await client
    .from("workspace_memberships")
    .insert({
      workspace_id: workspace.id,
      app_user_id: user.id,
      role: "owner",
    })
    .select("workspace_id,role")
    .single();

  if (membershipError) throw membershipError;

  return {
    workspaceId: membership.workspace_id,
    role: membership.role,
  };
}

function defaultWorkspaceName(user: { displayName: string; email: string }) {
  const displayName = user.displayName.trim();
  if (displayName) return `${displayName}'s workspace`;

  const [localPart] = user.email.split("@");
  return `${localPart}'s workspace`;
}
