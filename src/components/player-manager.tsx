"use client";

import {
  Pencil,
  ShieldCheck,
  ShieldPlus,
  Star,
  UserRound,
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
import type { LinkableAppUser, WorkspaceMember } from "@/lib/data";
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
  members,
  canManage,
  canManageRoles,
  linkableUsers,
}: {
  players: Player[];
  members: WorkspaceMember[];
  canManage: boolean;
  canManageRoles: boolean;
  linkableUsers: LinkableAppUser[];
}) {
  const [editingId, setEditingId] = useState<string>();
  const editingPlayer = players.find((player) => player.id === editingId);
  const linkedMemberIds = new Set(
    players
      .map((player) => player.appUserId)
      .filter((id): id is string => Boolean(id)),
  );
  const unlinkedMembers = members.filter(
    (member) => !linkedMemberIds.has(member.appUserId),
  );
  const hasRows = players.length || unlinkedMembers.length;

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
          {hasRows ? (
            <>
              {players.map((player) => (
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
                      {player.appUserId && player.accountRole ? (
                        <>
                          <Badge tone="success">Linked</Badge>
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
                        </>
                      ) : player.appUserId ? (
                        <Badge tone="warning">Account missing</Badge>
                      ) : (
                        <Badge tone="neutral">Not linked</Badge>
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
              ))}
              {unlinkedMembers.map((member) => (
                <div
                  key={member.membershipId}
                  className="rounded-2xl p-3 transition hover:bg-emerald-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-600">
                      <UserRound size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[var(--ink)]">
                        {member.displayName || member.email}
                      </p>
                      <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                        {member.email}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Add or link a player profile before using this person in
                        events.
                      </p>
                    </div>
                    <div className="ml-auto flex flex-col items-end gap-1">
                      <Badge tone="neutral">Not linked</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-black text-[var(--ink)]">
                No players yet.
              </p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Add your first player to build the event list. You can link that
                player to a signed-in account whenever the real person joins.
              </p>
            </div>
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
