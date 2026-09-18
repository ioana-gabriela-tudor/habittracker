import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Database } from "better-sqlite3";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { habitsRouter } from "./routes/habits.js";
import { AppError } from "./errors.js";

export function createApp(db: Database): Express {
  const app = express();

  app.use(express.json());

  const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
  app.use(express.static(publicDir));

  app.use("/api", habitsRouter(db));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.status).json({ error: err.message, code: err.code });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "internal server error", code: "INTERNAL_ERROR" });
  });

  return app;
}
