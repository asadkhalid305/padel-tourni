import { PlayerManager } from "@/components/player-manager";
import { SectionHeading } from "@/components/ui";
import { listPlayers } from "@/lib/data";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export const metadata = { title: "Players" };

export default async function PlayersPage() {
  const [players, user] = await Promise.all([
    listPlayers(),
    getAuthenticatedUser(),
  ]);
  const canManage = user?.role === "admin";
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Reusable roster"
        title="Players"
        description="Ratings guide team balance. Event snapshots preserve historical names and ratings."
      />
      <PlayerManager players={players} canManage={canManage} />
    </div>
  );
}
