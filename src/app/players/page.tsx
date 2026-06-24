import { AccessLimited } from "@/components/access-limited";
import { PlayerManager } from "@/components/player-manager";
import { SectionHeading } from "@/components/ui";
import {
  canViewPrivateData,
  listLinkableAppUsers,
  listPlayers,
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
  const [players, linkableUsers] = await Promise.all([
    listPlayers(workspaceId),
    canManage ? listLinkableAppUsers(workspaceId) : Promise.resolve([]),
  ]);
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Reusable roster"
        title="Players"
        description="Ratings guide team balance. Event snapshots preserve historical names and ratings."
      />
      <PlayerManager
        players={players}
        canManage={canManage}
        canManageRoles={canManageRoles}
        linkableUsers={linkableUsers}
      />
    </div>
  );
}
