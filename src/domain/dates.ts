const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in the server's local timezone, as "YYYY-MM-DD". */
export function todayLocal(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates that `value` is a real calendar date in "YYYY-MM-DD" format
 * and not later than today's local calendar day.
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

  return value <= todayLocal();
}

/** Returns the date one day before `value` ("YYYY-MM-DD"). */
export function addDays(value: string, delta: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
