import type { Database } from "better-sqlite3";
import { randomUUID } from "node:crypto";
import { computeStreaks } from "./streaks.js";
import { todayUtc } from "./dates.js";

export interface Habit {
  id: string;
  name: string;
  createdAt: string;
}

export interface HabitWithStreaks extends Habit {
  currentStreak: number;
  longestStreak: number;
  todayDone: boolean;
}

export function isNameTaken(db: Database, name: string): boolean {
  const row = db
    .prepare("SELECT 1 FROM habits WHERE LOWER(name) = LOWER(?)")
    .get(name);
  return row !== undefined;
}

export function createHabit(db: Database, name: string): Habit {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  db.prepare(
    "INSERT INTO habits (id, name, created_at) VALUES (?, ?, ?)"
  ).run(id, name, createdAt);
  return { id, name, createdAt };
}

export function getHabitById(db: Database, id: string): Habit | undefined {
  const row = db
    .prepare("SELECT id, name, created_at as createdAt FROM habits WHERE id = ?")
    .get(id) as Habit | undefined;
  return row;
}

export function listHabitsWithStreaks(db: Database): HabitWithStreaks[] {
  const habits = db
    .prepare("SELECT id, name, created_at as createdAt FROM habits ORDER BY created_at ASC")
    .all() as Habit[];

  const doneDatesStmt = db.prepare(
    "SELECT date FROM habit_entries WHERE habit_id = ? AND done = 1 ORDER BY date ASC"
  );

  const today = todayUtc();

  return habits.map((habit) => {
    const doneDates = (doneDatesStmt.all(habit.id) as { date: string }[]).map(
      (row) => row.date
    );
    const streaks = computeStreaks(doneDates);
    const todayDone = doneDates.includes(today);
    return { ...habit, ...streaks, todayDone };
  });
}

export function upsertEntry(
  db: Database,
  habitId: string,
  date: string,
  done: boolean
): { habitId: string; date: string; done: boolean; updatedAt: string } {
  const updatedAt = new Date().toISOString();
  db.prepare(
    `INSERT INTO habit_entries (habit_id, date, done, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (habit_id, date) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at`
  ).run(habitId, date, done ? 1 : 0, updatedAt);
  return { habitId, date, done, updatedAt };
}
