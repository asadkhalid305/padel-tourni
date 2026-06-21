import type { Standing } from "@/domain/types";

export type StandingSortKey =
  | "rank"
  | "playerName"
  | "played"
  | "wins"
  | "draws"
  | "losses"
  | "pointsFor"
  | "pointDifference"
  | "averagePoints"
  | "winRate";

export type SortDirection = "asc" | "desc";

export type StandingSort = {
  key: StandingSortKey;
  direction: SortDirection;
};

export const defaultStandingSort: StandingSort = {
  key: "rank",
  direction: "asc",
};

function compareValues(
  first: Standing,
  second: Standing,
  key: StandingSortKey,
) {
  if (key === "playerName") {
    return first.playerName.localeCompare(second.playerName);
  }
  return first[key] - second[key];
}

export function sortStandingRows(
  rows: Standing[],
  sort: StandingSort = defaultStandingSort,
) {
  return [...rows].sort((first, second) => {
    const primary = compareValues(first, second, sort.key);
    if (primary !== 0) {
      return sort.direction === "asc" ? primary : -primary;
    }

    return (
      first.rank - second.rank ||
      first.playerName.localeCompare(second.playerName) ||
      first.playerId.localeCompare(second.playerId)
    );
  });
}
