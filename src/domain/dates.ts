const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in UTC, as "YYYY-MM-DD". */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Validates that `value` is a real calendar date in "YYYY-MM-DD" format
 * and not later than the server's UTC "today".
 */
export function isValidPastOrPresentDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isRealDate) return false;

  return value <= todayUtc();
}

/** Returns the date one day before `value` ("YYYY-MM-DD"). */
export function addDays(value: string, delta: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
