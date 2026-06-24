"use client";

import {
  Pencil,
  ShieldCheck,
  ShieldPlus,
  Star,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useState } from "react";

import {
  AdminRoleButton,
  DeletePlayerButton,
  PlayerAccountLinkForm,
  PlayerForm,
} from "@/components/player-form";
import { Badge, Button, Card } from "@/components/ui";
import type { LinkableAppUser } from "@/lib/data";
import type { AppUserRole } from "@/lib/roles";
import { roleLabel } from "@/lib/roles";
import { initials } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  appUserId: string | null;
  accountEmail: string | null;
  accountDisplayName: string | null;
  accountRole: AppUserRole | null;
  rating: number;
  isActive: boolean;
};

export function PlayerManager({
  players,
  canManage,
  canManageRoles,
  linkableUsers,
}: {
  players: Player[];
  canManage: boolean;
  canManageRoles: boolean;
  linkableUsers: LinkableAppUser[];
}) {
  const [editingId, setEditingId] = useState<string>();
  const editingPlayer = players.find((player) => player.id === editingId);

  function accountOptionsFor(player: Player) {
    if (!player.appUserId || !player.accountEmail || !player.accountRole) {
      return linkableUsers;
    }

    return [
      {
        id: player.appUserId,
        email: player.accountEmail,
        displayName: player.accountDisplayName ?? "",
        role: player.accountRole,
      },
      ...linkableUsers.filter((user) => user.id !== player.appUserId),
    ];
  }

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
                    {player.accountEmail ? (
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {player.accountEmail}
                      </p>
                    ) : null}
                  </div>
                  <div className="ml-auto flex flex-col items-end gap-1">
                    <Badge tone={player.isActive ? "success" : "neutral"}>
                      {player.isActive ? (
                        <UserRoundCheck className="mr-1" size={13} />
                      ) : (
                        <UserRoundX className="mr-1" size={13} />
                      )}
                      {player.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {player.accountRole ? (
                      <Badge
                        tone={
                          player.accountRole === "super_admin"
                            ? "warning"
                            : player.accountRole === "admin"
                              ? "info"
                              : "neutral"
                        }
                      >
                        {player.accountRole === "super_admin" ? (
                          <ShieldCheck className="mr-1" size={13} />
                        ) : player.accountRole === "admin" ? (
                          <ShieldPlus className="mr-1" size={13} />
                        ) : null}
                        {roleLabel(player.accountRole)}
                      </Badge>
                    ) : player.appUserId ? (
                      <Badge tone="warning">Linked account missing</Badge>
                    ) : player.accountEmail ? (
                      <Badge tone="neutral">Pending invite</Badge>
                    ) : (
                      <Badge tone="neutral">No account linked</Badge>
                    )}
                  </div>
                </div>
                {canManage ? (
                  <div className="mt-3 flex flex-wrap items-start justify-end gap-2 border-t border-slate-100 pt-3">
                    <PlayerAccountLinkForm
                      player={player}
                      linkableUsers={accountOptionsFor(player)}
                    />
                    {canManageRoles && player.appUserId ? (
                      <AdminRoleButton player={player} />
                    ) : null}
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
                ) : null}
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm font-semibold text-slate-500">
              No players yet. Add the first player to build your roster.
            </p>
          )}
        </div>
      </Card>
      {canManage ? (
        <PlayerForm
          key={editingPlayer?.id ?? "new"}
          player={editingPlayer}
          onCancel={() => setEditingId(undefined)}
        />
      ) : null}
    </div>
  );
}
