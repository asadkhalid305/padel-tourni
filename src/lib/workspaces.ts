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
    const uniqueName = await availablePlayerName(
      client,
      workspaceId,
      name,
      user.email,
      linkedPlayer.id,
    );
    if (
      linkedPlayer.name !== uniqueName ||
      linkedPlayer.account_email !== user.email
    ) {
      const { error } = await client
        .from("players")
        .update({ name: uniqueName, account_email: user.email })
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
    const uniqueName = await availablePlayerName(
      client,
      workspaceId,
      name,
      user.email,
      emailPlayer.id,
    );
    const { error } = await client
      .from("players")
      .update({
        name: uniqueName,
        account_email: user.email,
        app_user_id: user.id,
      })
      .eq("id", emailPlayer.id)
      .eq("workspace_id", workspaceId);
    if (error) throw error;
    return;
  }

  const uniqueName = await availablePlayerName(
    client,
    workspaceId,
    name,
    user.email,
  );
  const { error } = await client.from("players").insert({
    workspace_id: workspaceId,
    name: uniqueName,
    account_email: user.email,
    app_user_id: user.id,
    rating: 5,
    is_active: true,
  });
  if (isUniqueViolation(error)) {
    const { error: conflictReadError } = await client
      .from("players")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("app_user_id", user.id)
      .maybeSingle();
    if (!conflictReadError) return;
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

async function availablePlayerName(
  client: SupabaseClient<Database>,
  workspaceId: string,
  preferredName: string,
  email: string,
  currentPlayerId?: string,
) {
  const { data: players, error } = await client
    .from("players")
    .select("id,name")
    .eq("workspace_id", workspaceId);
  if (error) throw error;

  const taken = new Set(
    players
      .filter((player) => player.id !== currentPlayerId)
      .map((player) => normalizePlayerName(player.name)),
  );
  if (!taken.has(normalizePlayerName(preferredName))) return preferredName;

  const [localPart] = email.split("@");
  const emailName = `${preferredName} (${localPart})`;
  if (!taken.has(normalizePlayerName(emailName))) return emailName;

  let counter = 2;
  while (taken.has(normalizePlayerName(`${emailName} ${counter}`))) {
    counter += 1;
  }
  return `${emailName} ${counter}`;
}

function playerName(user: { displayName: string; email: string }) {
  const displayName = user.displayName.trim();
  return displayName || user.email;
}

function normalizePlayerName(value: string) {
  return value.trim().toLowerCase();
}

function isUniqueViolation(error: { code?: string } | null) {
  return error?.code === "23505";
}
