"use client";

import { Pencil, Star, UserRoundCheck, UserRoundX } from "lucide-react";
import { useState } from "react";

import { DeletePlayerButton, PlayerForm } from "@/components/player-form";
import { Badge, Button, Card } from "@/components/ui";
import {
  RemoveWorkspaceMemberButton,
  WorkspaceRoleBadge,
} from "@/components/workspace-member-manager";
import type { WorkspaceMember } from "@/lib/data";
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
}: {
  players: Player[];
  members: WorkspaceMember[];
  canManage: boolean;
  canManageRoles: boolean;
  currentAppUserId: string;
}) {
  const [editingId, setEditingId] = useState<string>();
  const editingPlayer = players.find((player) => player.id === editingId);
  const editingMembership = editingPlayer?.appUserId
    ? members.find((member) => member.appUserId === editingPlayer.appUserId)
    : undefined;
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
  const duplicateWarnings = findDuplicateWarnings(customPlayers, members);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="p-2 sm:p-3">
        <div className="grid gap-2">
          {duplicateWarnings.length ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
              {duplicateWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
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
                  onEdit={() => setEditingId(player.id)}
                  statusLabel="Not linked"
                />
              ))}
              {customPlayers.map((player) => (
                <CustomPlayerRow
                  key={player.id}
                  player={player}
                  canManage={canManage}
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
          membership={editingMembership}
          canManageRoles={canManageRoles}
          currentAppUserId={currentAppUserId}
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

function findDuplicateWarnings(players: Player[], members: WorkspaceMember[]) {
  const warnings = new Set<string>();
  const memberByEmail = new Map(
    members.map((member) => [member.email.toLowerCase(), member]),
  );
  const memberNames = members.map((member) => ({
    ...member,
    normalizedName: normalizeName(member.displayName || member.email),
  }));

  players.forEach((player) => {
    const matchingEmail = player.accountEmail
      ? memberByEmail.get(player.accountEmail.toLowerCase())
      : null;
    if (matchingEmail) {
      warnings.add(
        `${player.name} has the same email as ${matchingEmail.displayName || matchingEmail.email}. Delete the duplicate custom player if they are the same person.`,
      );
      return;
    }

    const normalizedPlayerName = normalizeName(player.name);
    const similarMember = memberNames.find(
      (member) =>
        normalizedPlayerName &&
        member.normalizedName &&
        (normalizedPlayerName === member.normalizedName ||
          normalizedPlayerName.includes(member.normalizedName) ||
          member.normalizedName.includes(normalizedPlayerName)),
    );
    if (similarMember) {
      warnings.add(
        `${player.name} looks similar to ${similarMember.displayName || similarMember.email}. Check whether the custom player is still needed.`,
      );
    }
  });

  return [...warnings];
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
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
        <div className="min-w-0 flex-1">
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
        <div className="ml-auto flex shrink-0 items-center gap-2">
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
          {canManage && player && onEdit ? (
            <Button
              type="button"
              variant="secondary"
              onClick={onEdit}
              className="size-10 min-h-10 rounded-full px-0"
              aria-label={`Edit ${displayName}`}
              title={`Edit ${displayName}`}
            >
              <Pencil size={15} />
            </Button>
          ) : null}
          {canManageRoles ? (
            <RemoveWorkspaceMemberButton
              member={member}
              currentAppUserId={currentAppUserId}
              canManageRoles={canManageRoles}
            />
          ) : null}
        </div>
      </div>
      {canManage && !player ? (
        <p className="mt-2 text-xs font-semibold text-slate-500">
          Add a player profile before using this account in events.
        </p>
      ) : null}
    </div>
  );
}

function CustomPlayerRow({
  player,
  canManage,
  onEdit,
  statusLabel,
}: {
  player: Player;
  canManage: boolean;
  onEdit: () => void;
  statusLabel: "Not linked";
}) {
  return (
    <div className="rounded-2xl p-3 transition hover:bg-emerald-50/50">
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--ink)] text-sm font-black text-white">
          {initials(player.name)}
        </span>
        <div className="min-w-0 flex-1">
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
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Badge tone={player.isActive ? "success" : "neutral"}>
            {player.isActive ? (
              <UserRoundCheck className="mr-1" size={13} />
            ) : (
              <UserRoundX className="mr-1" size={13} />
            )}
            {player.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge tone="neutral">{statusLabel}</Badge>
          {canManage ? (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={onEdit}
                className="size-10 min-h-10 rounded-full px-0"
                aria-label={`Edit ${player.name}`}
                title={`Edit ${player.name}`}
              >
                <Pencil size={15} />
              </Button>
              <DeletePlayerButton player={player} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
