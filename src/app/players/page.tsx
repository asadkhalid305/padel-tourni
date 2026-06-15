import { Star, UserRoundCheck, UserRoundX } from "lucide-react";

import { PlayerForm } from "@/components/player-form";
import { Badge, Card, SectionHeading } from "@/components/ui";
import { listPlayers } from "@/lib/data";
import { initials } from "@/lib/utils";

export const metadata = { title: "Players" };

export default async function PlayersPage() {
  const players = await listPlayers();
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Reusable roster"
        title="Players"
        description="Ratings guide team balance. Event snapshots preserve historical names and ratings."
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="p-2 sm:p-3">
          <div className="grid gap-2">
            {players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-emerald-50/50"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-black text-white">
                  {initials(player.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-[var(--ink)]">
                    {player.name}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Star size={13} className="fill-amber-400 text-amber-400" />
                    Rating {player.rating.toFixed(1)}
                  </div>
                </div>
                <div className="ml-auto">
                  <Badge tone={player.isActive ? "success" : "neutral"}>
                    {player.isActive ? (
                      <UserRoundCheck className="mr-1" size={13} />
                    ) : (
                      <UserRoundX className="mr-1" size={13} />
                    )}
                    {player.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <PlayerForm />
      </div>
    </div>
  );
}
