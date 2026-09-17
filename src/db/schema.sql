CREATE TABLE IF NOT EXISTS habits (
  id         TEXT PRIMARY KEY,      -- uuid
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL          -- ISO 8601 UTC
);

CREATE TABLE IF NOT EXISTS habit_entries (
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,         -- ISO 8601 date, "YYYY-MM-DD", local calendar day
  done       BOOLEAN NOT NULL,
  updated_at TEXT NOT NULL,         -- ISO 8601 UTC
  PRIMARY KEY (habit_id, date)
);
