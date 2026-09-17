import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dbPath = process.env.DB_PATH ?? join(process.cwd(), "habits.db");

export const db = new Database(dbPath);

const schemaPath = join(dirname(fileURLToPath(import.meta.url)), "schema.sql");
db.exec(readFileSync(schemaPath, "utf-8"));
