import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { WorkspaceRole } from "@/lib/roles";
import type { Database } from "@/types/database";

export type WorkspaceMembership = {
  workspaceId: string;
  role: WorkspaceRole;
};

export type UserWorkspaceMembership = WorkspaceMembership & {
  name: string;
};

export async function ensureDefaultWorkspaceForUser(
  client: SupabaseClient<Database>,
  user: { id: string; displayName: string; email: string },
  preferredWorkspaceId?: string | null,
): Promise<WorkspaceMembership> {
  if (preferredWorkspaceId) {
    const { data: preferredMembership, error: preferredMembershipError } =
      await client
        .from("workspace_memberships")
        .select("workspace_id,role")
        .eq("app_user_id", user.id)
        .eq("workspace_id", preferredWorkspaceId)
        .maybeSingle();

    if (preferredMembershipError) throw preferredMembershipError;
    if (preferredMembership) {
      await ensureWorkspaceMemberPlayer(
        client,
        preferredMembership.workspace_id,
        user,
      );
      return {
        workspaceId: preferredMembership.workspace_id,
        role: preferredMembership.role,
      };
    }

    const linkedPreferredMembership = await joinLinkedPlayerWorkspaceForUser(
      client,
      user,
      preferredWorkspaceId,
    );
    if (linkedPreferredMembership) return linkedPreferredMembership;
  }

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
    await ensureWorkspaceMemberPlayer(
      client,
      existingMembership.workspace_id,
      user,
    );
    return {
      workspaceId: existingMembership.workspace_id,
      role: existingMembership.role,
    };
  }

  const adoptedSeedWorkspace = await adoptSeedWorkspaceForUser(client, user);
  if (adoptedSeedWorkspace) {
    return adoptedSeedWorkspace;
  }

  const linkedWorkspace = await joinLinkedPlayerWorkspaceForUser(client, user);
  if (linkedWorkspace) {
    return linkedWorkspace;
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
  await ensureWorkspaceMemberPlayer(client, membership.workspace_id, user);

  return {
    workspaceId: membership.workspace_id,
    role: membership.role,
  };
}

async function joinLinkedPlayerWorkspaceForUser(
  client: SupabaseClient<Database>,
  user: { id: string; displayName: string; email: string },
  preferredWorkspaceId?: string | null,
): Promise<WorkspaceMembership | null> {
  let linkedPlayerQuery = client
    .from("players")
    .select("workspace_id")
    .eq("account_email", user.email);

  if (preferredWorkspaceId) {
    linkedPlayerQuery = linkedPlayerQuery.eq("workspace_id", preferredWorkspaceId);
  }

  const { data: linkedPlayer, error: linkedPlayerError } =
    await linkedPlayerQuery
      .is("app_user_id", null)
      .order("created_at")
      .limit(1)
      .maybeSingle();
  if (linkedPlayerError) throw linkedPlayerError;
  if (!linkedPlayer?.workspace_id) return null;

  const { data: membership, error: insertMembershipError } = await client
    .from("workspace_memberships")
    .insert({
      workspace_id: linkedPlayer.workspace_id,
      app_user_id: user.id,
      role: "member",
    })
    .select("workspace_id,role")
    .single();
  if (insertMembershipError) throw insertMembershipError;

  await ensureWorkspaceMemberPlayer(client, membership.workspace_id, user);

  return {
    workspaceId: membership.workspace_id,
    role: membership.role,
  };
}

async function adoptSeedWorkspaceForUser(
  client: SupabaseClient<Database>,
  user: { id: string; displayName: string; email: string },
): Promise<WorkspaceMembership | null> {
  const { data: seededPlayer, error: seededPlayerError } = await client
    .from("players")
    .select("workspace_id")
    .eq("account_email", user.email)
    .is("app_user_id", null)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (seededPlayerError) throw seededPlayerError;
  if (!seededPlayer?.workspace_id) return null;

  const { data: workspace, error: workspaceError } = await client
    .from("workspaces")
    .select("id,personal_owner_app_user_id")
    .eq("id", seededPlayer.workspace_id)
    .maybeSingle();
  if (workspaceError) throw workspaceError;
  if (!workspace || workspace.personal_owner_app_user_id) return null;

  const { data: membership, error: membershipError } = await client
    .from("workspace_memberships")
    .select("workspace_id")
    .eq("workspace_id", workspace.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (membership) return null;

  const { error: updateWorkspaceError } = await client
    .from("workspaces")
    .update({
      name: defaultWorkspaceName(user),
      personal_owner_app_user_id: user.id,
    })
    .eq("id", workspace.id);
  if (updateWorkspaceError) throw updateWorkspaceError;

  const { data: adoptedMembership, error: insertMembershipError } = await client
    .from("workspace_memberships")
    .insert({
      workspace_id: workspace.id,
      app_user_id: user.id,
      role: "owner",
    })
    .select("workspace_id,role")
    .single();
  if (insertMembershipError) throw insertMembershipError;

  await ensureWorkspaceMemberPlayer(client, workspace.id, user);

  return {
    workspaceId: adoptedMembership.workspace_id,
    role: adoptedMembership.role,
  };
}

export async function listUserWorkspaceMemberships(
  client: SupabaseClient<Database>,
  appUserId: string,
): Promise<UserWorkspaceMembership[]> {
  const { data: memberships, error: membershipsError } = await client
    .from("workspace_memberships")
    .select("workspace_id,role")
    .eq("app_user_id", appUserId)
    .order("created_at");
  if (membershipsError) throw membershipsError;
  if (!memberships.length) return [];

  const workspaceIds = memberships.map((membership) => membership.workspace_id);
  const { data: workspaces, error: workspacesError } = await client
    .from("workspaces")
    .select("id,name")
    .in("id", workspaceIds);
  if (workspacesError) throw workspacesError;

  const workspaceNameById = new Map(
    workspaces.map((workspace) => [
      workspace.id,
      clubDisplayName(workspace.name),
    ]),
  );

  return memberships
    .map((membership) => {
      const name = workspaceNameById.get(membership.workspace_id);
      if (!name) return null;

      return {
        workspaceId: membership.workspace_id,
        role: membership.role,
        name,
      };
    })
    .filter((membership): membership is UserWorkspaceMembership =>
      Boolean(membership),
    );
}

function defaultWorkspaceName(user: { displayName: string; email: string }) {
  const displayName = user.displayName.trim();
  if (displayName) return `${displayName}'s club`;

  const [localPart] = user.email.split("@");
  return `${localPart}'s club`;
}

function clubDisplayName(name: string) {
  return name.endsWith("'s workspace")
    ? `${name.slice(0, -"workspace".length)}club`
    : name;
}

export async function ensureWorkspaceMemberPlayer(
  client: SupabaseClient<Database>,
  workspaceId: string,
  user: { id: string; displayName: string; email: string },
) {
  const name = playerName(user);
  const { data: linkedPlayer, error: linkedPlayerError } = await client
    .from("players")
    .select("id,name,account_email")
    .eq("workspace_id", workspaceId)
    .eq("app_user_id", user.id)
    .maybeSingle();
  if (linkedPlayerError) throw linkedPlayerError;

  if (linkedPlayer) {
    if (
      linkedPlayer.name !== name ||
      linkedPlayer.account_email !== user.email
    ) {
      const { error } = await client
        .from("players")
        .update({ name, account_email: user.email })
        .eq("id", linkedPlayer.id)
        .eq("workspace_id", workspaceId);
      if (error) throw error;
    }
    return;
  }

  const { data: emailPlayer, error: emailPlayerError } = await client
    .from("players")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("account_email", user.email)
    .maybeSingle();
  if (emailPlayerError) throw emailPlayerError;

  if (emailPlayer) {
    const { error } = await client
      .from("players")
      .update({
        name,
        account_email: user.email,
        app_user_id: user.id,
      })
      .eq("id", emailPlayer.id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("players").insert({
    workspace_id: workspaceId,
    name,
    account_email: user.email,
    app_user_id: user.id,
    rating: 5,
    is_active: true,
  });
  if (isUniqueViolation(error)) {
    const { data: conflictPlayer, error: conflictReadError } = await client
      .from("players")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("app_user_id", user.id)
      .maybeSingle();
    if (!conflictReadError && conflictPlayer) return;
  }
  if (error) throw error;
}

export async function ensureWorkspaceMemberPlayers(
  client: SupabaseClient<Database>,
  workspaceId: string,
) {
  const { data: memberships, error: membershipsError } = await client
    .from("workspace_memberships")
    .select("app_user_id")
    .eq("workspace_id", workspaceId);
  if (membershipsError) throw membershipsError;
  if (!memberships.length) return;

  const appUserIds = memberships.map((membership) => membership.app_user_id);
  const { data: users, error: usersError } = await client
    .from("app_users")
    .select("id,email,display_name")
    .in("id", appUserIds);
  if (usersError) throw usersError;

  for (const user of users) {
    await ensureWorkspaceMemberPlayer(client, workspaceId, {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
    });
  }
}

function playerName(user: { displayName: string; email: string }) {
  const displayName = user.displayName.trim();
  return displayName || user.email;
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}
