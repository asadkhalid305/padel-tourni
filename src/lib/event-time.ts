const dateTimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export function parseEventStart(
  value: string,
  timezoneOffsetMinutes: number,
): Date | null {
  const match = dateTimeLocalPattern.exec(value.trim());
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const instant = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  const localDate = new Date(instant);
  if (
    localDate.getUTCFullYear() !== Number(year) ||
    localDate.getUTCMonth() !== Number(month) - 1 ||
    localDate.getUTCDate() !== Number(day) ||
    localDate.getUTCHours() !== Number(hour) ||
    localDate.getUTCMinutes() !== Number(minute) ||
    localDate.getUTCSeconds() !== Number(second)
  ) {
    return null;
  }

  const date = new Date(instant + timezoneOffsetMinutes * 60_000);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateTimeLocalValue(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return offsetDate.toISOString().slice(0, 16);
}
