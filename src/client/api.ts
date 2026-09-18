export class ApiError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export interface CreatedHabit {
  id: string;
  name: string;
  createdAt: string;
}

export interface Habit extends CreatedHabit {
  currentStreak: number;
  longestStreak: number;
  todayDone: boolean;
}

export interface EntryResult {
  habitId: string;
  date: string;
  done: boolean;
  updatedAt: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.error ?? "request failed", body.code ?? "UNKNOWN");
  }
  return res.json() as Promise<T>;
}

export async function createHabit(name: string): Promise<CreatedHabit> {
  const res = await fetch("/api/habits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return parseResponse<CreatedHabit>(res);
}

export async function listHabits(): Promise<Habit[]> {
  const res = await fetch("/api/habits");
  return parseResponse<Habit[]>(res);
}

export async function setEntry(
  habitId: string,
  date: string,
  done: boolean
): Promise<EntryResult> {
  const res = await fetch(`/api/habits/${habitId}/entries/${date}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  return parseResponse<EntryResult>(res);
}
