export function canDeleteEvent(options: {
  eventStatus: string;
  matchStatuses: string[];
}) {
  return (
    options.eventStatus === "scheduled" &&
    options.matchStatuses.every((status) => status === "scheduled")
  );
}

export function canEditEventDetails(options: {
  eventStatus: string;
  matchStatuses: string[];
}) {
  return options.eventStatus !== "completed";
}

export function canChangeEventSchedule(options: { matchStatuses: string[] }) {
  return options.matchStatuses.every((status) => status === "scheduled");
}
