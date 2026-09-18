import { addDays, todayLocal } from "./dates.js";

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Reference algorithm from the spec, run per habit.
 * `doneDates` must be sorted ascending, "YYYY-MM-DD" strings.
 */
export function computeStreaks(doneDates: string[]): StreakResult {
  const doneSet = new Set(doneDates);

  let longestStreak = 0;
  let runLength = 0;
  let previousDate: string | null = null;
  for (const date of doneDates) {
    if (previousDate !== null && date === addDays(previousDate, 1)) {
      runLength += 1;
    } else {
      runLength = 1;
    }
    longestStreak = Math.max(longestStreak, runLength);
    previousDate = date;
  }

  const today = todayLocal();
  const yesterday = addDays(today, -1);

  let anchor: string | null = null;
  if (doneSet.has(today)) {
    anchor = today;
  } else if (doneSet.has(yesterday)) {
    anchor = yesterday;
  }

  let currentStreak = 0;
  if (anchor !== null) {
    currentStreak = 1;
    let cursor = addDays(anchor, -1);
    while (doneSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }
  }

  return { currentStreak, longestStreak };
}
