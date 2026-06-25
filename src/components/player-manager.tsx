"use client";

import { Pencil, Star, UserRoundCheck, UserRoundX } from "lucide-react";
import { useState } from "react";

import {
  DeletePlayerButton,
  PlayerAccountLinkForm,
  PlayerForm,
} from "@/components/player-form";
import { Badge, Button, Card } from "@/components/ui";
import {
  WorkspaceMemberRoleForm,
  WorkspaceRoleBadge,
} from "@/components/workspace-member-manager";
import type { LinkableAppUser, WorkspaceMember } from "@/lib/data";
import type { AppUserRole } from "@/lib/roles";
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
  currentAppUserId,
  linkableUsers,
}: {
  players: Player[];
  members: WorkspaceMember[];
  canManage: boolean;
  canManageRoles: boolean;
  currentAppUserId: string;
  linkableUsers: LinkableAppUser[];
}) {
  const [editingId, setEditingId] = useState<string>();
  const editingPlayer = players.find((player) => player.id === editingId);
  const playerByAppUserId = new Map(
    players
      .filter((player) => player.appUserId)
      .map((player) => [player.appUserId as string, player]),
  );
  const memberRows = members
    .slice()
    .sort(compareMembers)
    .map((member) => ({
      member,
      player: playerByAppUserId.get(member.appUserId) ?? null,
    }));
  const customPlayers = players.filter((player) => !player.appUserId);
  const orphanedLinkedPlayers = players.filter(
    (player) =>
      player.appUserId &&
      !members.some((member) => member.appUserId === player.appUserId),
  );
  const hasRows =
    memberRows.length || customPlayers.length || orphanedLinkedPlayers.length;

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
              {memberRows.map(({ member, player }) => (
                <MemberPlayerRow
                  key={member.membershipId}
                  member={member}
                  player={player}
                  canManage={canManage}
                  canManageRoles={canManageRoles}
                  currentAppUserId={currentAppUserId}
                  onEdit={player ? () => setEditingId(player.id) : undefined}
                />
              ))}
              {orphanedLinkedPlayers.map((player) => (
                <CustomPlayerRow
                  key={player.id}
                  player={player}
                  canManage={canManage}
                  linkableUsers={accountOptionsFor(player)}
                  onEdit={() => setEditingId(player.id)}
                  statusLabel="Account missing"
                />
              ))}
              {customPlayers.map((player) => (
                <CustomPlayerRow
                  key={player.id}
                  player={player}
                  canManage={canManage}
                  linkableUsers={accountOptionsFor(player)}
                  onEdit={() => setEditingId(player.id)}
                  statusLabel="Not linked"
                />
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

function compareMembers(first: WorkspaceMember, second: WorkspaceMember) {
  const roleRank = { owner: 0, admin: 1, member: 2 };
  const firstRank = roleRank[first.role];
  const secondRank = roleRank[second.role];
  if (firstRank !== secondRank) return firstRank - secondRank;

  return (first.displayName || first.email).localeCompare(
    second.displayName || second.email,
  );
}

function MemberPlayerRow({
  member,
  player,
  canManage,
  canManageRoles,
  currentAppUserId,
  onEdit,
}: {
  member: WorkspaceMember;
  player: Player | null;
  canManage: boolean;
  canManageRoles: boolean;
  currentAppUserId: string;
  onEdit?: () => void;
}) {
  const displayName = player?.name ?? (member.displayName || member.email);

  return (
    <div className="rounded-2xl p-3 transition hover:bg-emerald-50/50">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-black text-white">
          {initials(displayName)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-[var(--ink)]">{displayName}</p>
          {player ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              Rating {player.rating.toFixed(1)}
            </div>
          ) : null}
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {member.email}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          {player ? (
            <Badge tone={player.isActive ? "success" : "neutral"}>
              {player.isActive ? (
                <UserRoundCheck className="mr-1" size={13} />
              ) : (
                <UserRoundX className="mr-1" size={13} />
              )}
              {player.isActive ? "Active" : "Inactive"}
            </Badge>
          ) : null}
          <WorkspaceRoleBadge role={member.role} />
        </div>
      </div>
      {canManage ? (
        <div className="mt-3 flex flex-wrap items-start justify-end gap-2 border-t border-slate-100 pt-3">
          {player ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={onEdit}
                aria-label={`Edit ${displayName}`}
              >
                <Pencil size={15} />
                Edit
              </Button>
              <DeletePlayerButton player={player} />
            </>
          ) : (
            <p className="mr-auto text-xs font-semibold text-slate-500">
              Add a player profile or link this account to an existing player
              before using them in events.
            </p>
          )}
          <WorkspaceMemberRoleForm
            member={member}
            currentAppUserId={currentAppUserId}
            canManageRoles={canManageRoles}
          />
        </div>
      ) : null}
    </div>
  );
}

function CustomPlayerRow({
  player,
  canManage,
  linkableUsers,
  onEdit,
  statusLabel,
}: {
  player: Player;
  canManage: boolean;
  linkableUsers: LinkableAppUser[];
  onEdit: () => void;
  statusLabel: "Not linked" | "Account missing";
}) {
  return (
    <div className="rounded-2xl p-3 transition hover:bg-emerald-50/50">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-black text-white">
          {initials(player.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-bold text-[var(--ink)]">{player.name}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            <Star size={13} className="fill-amber-400 text-amber-400" />
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
          <Badge
            tone={statusLabel === "Account missing" ? "warning" : "neutral"}
          >
            {statusLabel}
          </Badge>
        </div>
      </div>
      {canManage ? (
        <div className="mt-3 flex flex-wrap items-start justify-end gap-2 border-t border-slate-100 pt-3">
          <PlayerAccountLinkForm
            player={player}
            linkableUsers={linkableUsers}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={onEdit}
            aria-label={`Edit ${player.name}`}
          >
            <Pencil size={15} />
            Edit
          </Button>
          <DeletePlayerButton player={player} />
        </div>
      ) : null}
    </div>
  );
}
