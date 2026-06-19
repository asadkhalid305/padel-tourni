export function effectiveEventStatus(options: {
  status: string;
  startsAt: string | Date;
  now?: Date;
}) {
  if (options.status !== "scheduled" && options.status !== "live") {
    return options.status;
  }

  const startsAt =
    options.startsAt instanceof Date
      ? options.startsAt
      : new Date(options.startsAt);
  const now = options.now ?? new Date();
  return startsAt.getTime() <= now.getTime() ? "live" : "scheduled";
}

export function canManageLiveMatches(options: {
  canManage: boolean;
  eventStatus: string;
}) {
  return options.canManage && options.eventStatus === "live";
}
