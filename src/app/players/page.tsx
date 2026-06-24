import { AccessLimited } from "@/components/access-limited";
import { PlayerManager } from "@/components/player-manager";
import { SectionHeading } from "@/components/ui";
import { WorkspaceInviteManager } from "@/components/workspace-invite-manager";
import { WorkspaceMemberManager } from "@/components/workspace-member-manager";
import {
  canViewPrivateData,
  listLinkableAppUsers,
  listPlayers,
  listWorkspaceMembers,
  listWorkspaceInvites,
} from "@/lib/data";
import { isSuperAdminRole, isWorkspaceAdminRole } from "@/lib/roles";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const metadata = { title: "Players" };

export default async function PlayersPage() {
  const user = await getAuthenticatedUser();
  if (!(await canViewPrivateData(user))) {
    return <AccessLimited />;
  }
  const workspaceId = user?.activeWorkspaceId;
  if (!workspaceId) return <AccessLimited />;

  const canManage = isWorkspaceAdminRole(user?.activeWorkspaceRole ?? null);
  const canManageRoles = user ? isSuperAdminRole(user.role) : false;
  const [players, linkableUsers, invites, members] = await Promise.all([
    listPlayers(workspaceId),
    canManage ? listLinkableAppUsers(workspaceId) : Promise.resolve([]),
    canManage ? listWorkspaceInvites(workspaceId) : Promise.resolve([]),
    listWorkspaceMembers(workspaceId),
  ]);
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Workspace players"
        title="Players"
        description="Add manual event participants here, then link them to signed-in workspace members when the real accounts join."
      />
      <PlayerManager
        players={players}
        canManage={canManage}
        canManageRoles={canManageRoles}
        linkableUsers={linkableUsers}
      />
      <WorkspaceMemberManager
        members={members}
        currentAppUserId={user.id}
        canManageRoles={canManage}
      />
      {canManage ? <WorkspaceInviteManager invites={invites} /> : null}
    </div>
  );
}
