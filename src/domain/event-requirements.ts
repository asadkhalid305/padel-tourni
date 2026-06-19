export function calculateMinimumEventPlayerCount(courtCount: number) {
  return courtCount * 4;
}

export function formatMinimumEventPlayerMessage(options: {
  courtCount: number;
  selectedPlayerCount: number;
}) {
  const minimumPlayerCount = calculateMinimumEventPlayerCount(
    options.courtCount,
  );
  const remainingPlayerCount = Math.max(
    0,
    minimumPlayerCount - options.selectedPlayerCount,
  );
  const remainingLabel = remainingPlayerCount === 1 ? "player" : "players";
  const courtLabel = options.courtCount === 1 ? "court" : "courts";
  const selectedLabel =
    options.selectedPlayerCount === 1 ? "player" : "players";

  return `Select at least ${remainingPlayerCount} more ${remainingLabel} for ${options.courtCount} ${courtLabel}. You have only selected ${options.selectedPlayerCount} ${selectedLabel}.`;
}
