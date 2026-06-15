"use client";

import { Pencil, Star, UserRoundCheck, UserRoundX } from "lucide-react";
import { useState } from "react";

import { DeletePlayerButton, PlayerForm } from "@/components/player-form";
import { Badge, Button, Card } from "@/components/ui";
import { initials } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  rating: number;
  isActive: boolean;
};

export function PlayerManager({ players }: { players: Player[] }) {
  const [editingId, setEditingId] = useState<string>();
  const editingPlayer = players.find((player) => player.id === editingId);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="p-2 sm:p-3">
        <div className="grid gap-2">
          {players.length ? (
            players.map((player) => (
              <div
                key={player.id}
                className="rounded-2xl p-3 transition hover:bg-emerald-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-black text-white">
                    {initials(player.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-[var(--ink)]">
                      {player.name}
                    </p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <Star
                        size={13}
                        className="fill-amber-400 text-amber-400"
                      />
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
                <div className="mt-3 flex items-start justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingId(player.id)}
                    aria-label={`Edit ${player.name}`}
                  >
                    <Pencil size={15} />
                    Edit
                  </Button>
                  <DeletePlayerButton player={player} />
                </div>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm font-semibold text-slate-500">
              No players yet. Add the first player to build your roster.
            </p>
          )}
        </div>
      </Card>
      <PlayerForm
        key={editingPlayer?.id ?? "new"}
        player={editingPlayer}
        onCancel={() => setEditingId(undefined)}
      />
    </div>
  );
}
