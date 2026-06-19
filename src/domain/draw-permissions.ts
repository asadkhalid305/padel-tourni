export function canEditDrawLineup({
  canManage,
  eventStatus,
  matchStatus,
}: {
  canManage: boolean;
  eventStatus: string;
  matchStatus: string;
}) {
  return (
    canManage && eventStatus !== "completed" && matchStatus === "scheduled"
  );
}
