import { Medal, TrendingUp, Trophy } from "lucide-react";

import { Card, SectionHeading } from "@/components/ui";
import { getHistoricalPlayerStats, listEvents } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "History" };

export default async function HistoryPage() {
  const [players, events] = await Promise.all([
    getHistoricalPlayerStats(),
    listEvents(),
  ]);
  const completed = events.filter((event) => event.status === "completed");
  return (
    <div className="space-y-7">
      <SectionHeading
        eyebrow="Across every event"
        title="History"
        description="Player trends are derived from completed matches while each event keeps its original roster snapshots."
      />
      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <Trophy className="text-amber-500" />
          <p className="mt-4 text-3xl font-black">{completed.length}</p>
          <p className="text-sm font-bold">Completed events</p>
        </Card>
        <Card>
          <TrendingUp className="text-emerald-600" />
          <p className="mt-4 text-3xl font-black">
            {players.reduce((total, player) => total + player.matches, 0)}
          </p>
          <p className="text-sm font-bold">Player appearances</p>
        </Card>
        <Card>
          <Medal className="text-sky-600" />
          <p className="mt-4 text-3xl font-black">{players.length}</p>
          <p className="text-sm font-bold">Ranked players</p>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="overflow-hidden p-0">
          <div className="p-5">
            <h2 className="text-xl font-black">Career board</h2>
            <p className="text-sm text-slate-500">
              Ranked by win rate, then average points.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-[var(--ink)] text-left text-xs uppercase tracking-[0.12em] text-white/60">
                <tr>
                  {["Player", "Events", "Matches", "Wins", "Avg", "Win %"].map(
                    (heading) => (
                      <th key={heading} className="px-4 py-3">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr
                    key={player.playerId}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-4 font-bold">
                      <span className="mr-3 text-[var(--green)]">
                        {index + 1}.
                      </span>
                      {player.playerName}
                    </td>
                    <td className="px-4 py-4">{player.events}</td>
                    <td className="px-4 py-4">{player.matches}</td>
                    <td className="px-4 py-4">{player.wins}</td>
                    <td className="px-4 py-4">
                      {player.averagePoints.toFixed(1)}
                    </td>
                    <td className="px-4 py-4">
                      {(player.winRate * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-black">Completed nights</h2>
          <div className="mt-5 space-y-3">
            {completed.length ? (
              completed.map((event) => (
                <div key={event.id} className="rounded-2xl bg-slate-50 p-4">
                  <p className="font-bold">{event.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(event.startsAt)}
                  </p>
                  <p className="mt-3 text-sm font-semibold text-[var(--green)]">
                    {event.completedMatches} results · {event.playerCount}{" "}
                    players
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                Completed events will appear here.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
