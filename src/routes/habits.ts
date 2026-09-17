import { Router } from "express";
import type { Database } from "better-sqlite3";
import { isValidPastOrPresentDate } from "../domain/dates.js";
import {
  createHabit,
  getHabitById,
  isNameTaken,
  listHabitsWithStreaks,
  upsertEntry,
} from "../domain/habits.js";
import { badRequest, conflict, notFound } from "../errors.js";

export function habitsRouter(db: Database): Router {
  const router = Router();

  router.post("/habits", (req, res, next) => {
    try {
      const rawName = req.body?.name;
      if (typeof rawName !== "string") {
        throw badRequest("name is required");
      }
      const name = rawName.trim();
      if (name.length === 0) {
        throw badRequest("name must not be empty");
      }
      if (name.length > 100) {
        throw badRequest("name must be at most 100 characters");
      }
      if (isNameTaken(db, name)) {
        throw conflict("a habit with this name already exists");
      }
      const habit = createHabit(db, name);
      res.status(201).json(habit);
    } catch (err) {
      next(err);
    }
  });

  router.get("/habits", (_req, res, next) => {
    try {
      res.status(200).json(listHabitsWithStreaks(db));
    } catch (err) {
      next(err);
    }
  });

  router.put("/habits/:id/entries/:date", (req, res, next) => {
    try {
      const { id, date } = req.params;
      const done = req.body?.done;

      if (!isValidPastOrPresentDate(date)) {
        throw badRequest("date must be a valid, non-future calendar date (YYYY-MM-DD)");
      }
      if (typeof done !== "boolean") {
        throw badRequest("done is required and must be a boolean");
      }
      if (!getHabitById(db, id)) {
        throw notFound("habit not found");
      }

      const entry = upsertEntry(db, id, date, done);
      res.status(200).json(entry);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
