import { AccessLimited } from "@/components/access-limited";
import { PlayerManager } from "@/components/player-manager";
import { SectionHeading } from "@/components/ui";
import { WorkspaceInviteManager } from "@/components/workspace-invite-manager";
import {
  canViewPrivateData,
  listLinkableAppUsers,
  listPlayers,
  listWorkspaceMembers,
  listWorkspaceInvites,
} from "@/lib/data";
import { isWorkspaceAdminRole } from "@/lib/roles";
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
  const [players, linkableUsers, invites, members] = await Promise.all([
    listPlayers(workspaceId),
    canManage ? listLinkableAppUsers(workspaceId) : Promise.resolve([]),
    canManage ? listWorkspaceInvites(workspaceId) : Promise.resolve([]),
    listWorkspaceMembers(workspaceId),
  ]);
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="People"
        title="Players"
        description="Manage the people who can play events. A player can be linked to a signed-in account now or later."
      />
      <PlayerManager
        players={players}
        members={members}
        canManage={canManage}
        canManageRoles={canManage}
        currentAppUserId={user.id}
        linkableUsers={linkableUsers}
      />
      {canManage ? <WorkspaceInviteManager invites={invites} /> : null}
    </div>
  );
}
