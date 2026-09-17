# Habit Tracker — Core API

**Spec source:** `docs/specs/brief.md`
**Scope:** Habit CRUD, daily status marking, streak computation
**Auth:** None (single-user, local application)

---

## Overview

A REST API backing a single-user habit tracker. Users define a small set of named habits. For each habit, each calendar day has at most one status: `done`, `not_done`, or unmarked (no record). The API returns, per habit, the current streak and the longest streak ever recorded, computed server-side. No client-side date math is needed.

---

## Data Model

```sql
CREATE TABLE habits (
  id         TEXT PRIMARY KEY,      -- uuid
  name       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL          -- ISO 8601 UTC
);

CREATE TABLE habit_entries (
  habit_id   TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  date       TEXT NOT NULL,         -- ISO 8601 date, "YYYY-MM-DD", local calendar day
  done       BOOLEAN NOT NULL,
  updated_at TEXT NOT NULL,         -- ISO 8601 UTC
  PRIMARY KEY (habit_id, date)
);
```

A row in `habit_entries` only exists once a day has been explicitly marked. "Unmarked" is the absence of a row, not a `done = false` row — a day marked not done (`done = false`) and a day never touched are both treated as "not done" for streak purposes, but only the former is persisted.

---

## Endpoints

### `POST /api/habits`

Creates a habit.

**Request body:**
```json
{ "name": "exercise" }
```

**Validation:**
- `name` is required, non-empty after trimming, max 100 characters.
- `name` must be unique (case-insensitive). Duplicate → `409 CONFLICT`.

**Response — 201 Created:**
```json
{
  "id": "uuid",
  "name": "exercise",
  "createdAt": "ISO 8601 timestamptz (UTC)"
}
```

---

### `GET /api/habits`

Lists all habits with computed streak data.

**Query parameters:** none.

**Response — 200 OK:**
```json
[
  {
    "id": "uuid",
    "name": "exercise",
    "createdAt": "ISO 8601 timestamptz (UTC)",
    "currentStreak": 3,
    "longestStreak": 12
  }
]
```

An empty result set returns `[]` (not a `404`). Habits are sorted by `created_at ASC`.

---

### `PUT /api/habits/:id/entries/:date`

Sets (or changes) the done/not-done status for one habit on one calendar day. Idempotent — calling it again with the same body for the same date overwrites the prior status. This is the only way to change a day's status; there is no separate "unmark" endpoint in this version (see Implementation Notes).

**Path parameters:**
- `id` — habit id.
- `date` — `YYYY-MM-DD`. Must be a valid calendar date and not in the future (server's UTC "today"). Invalid or future date → `400 BAD_REQUEST`.

**Request body:**
```json
{ "done": true }
```

`done` is required and must be a boolean.

**Response — 200 OK:**
```json
{
  "habitId": "uuid",
  "date": "2026-09-17",
  "done": true,
  "updatedAt": "ISO 8601 timestamptz (UTC)"
}
```

Unknown `id` → `404 NOT_FOUND`.

---

## Streak Calculation

Computed server-side whenever `GET /api/habits` is called. Given a habit's set of entries where `done = true`, expressed as a sorted list of dates:

**Current streak** — the number of consecutive calendar days, ending at "today" or "yesterday", that are marked done:
1. Start at today (server's UTC date). If today is marked done, count it and step backward one day at a time, counting each additional consecutive `done` day, until a day is not done or unmarked.
2. If today is not marked done (or unmarked), instead start at yesterday and apply the same rule. This lets a streak survive until the current day is explicitly marked, without requiring today to be marked yet.
3. If neither today nor yesterday is done, `currentStreak = 0`.

**Longest streak** — the length of the longest run of consecutive calendar days marked done anywhere in the habit's history, including runs that have since ended. Never decreases as new entries are added.

Reference algorithm (pseudocode, run per habit):

```
doneDates = sorted set of dates where done = true, ascending

longestStreak = 0
runLength = 0
previousDate = null
for date in doneDates:
  if previousDate != null and date == previousDate + 1 day:
    runLength += 1
  else:
    runLength = 1
  longestStreak = max(longestStreak, runLength)
  previousDate = date

today = current UTC date
if today in doneDates:
  anchor = today
elif (today - 1 day) in doneDates:
  anchor = today - 1 day
else:
  currentStreak = 0
  anchor = null

if anchor != null:
  currentStreak = 1
  cursor = anchor - 1 day
  while cursor in doneDates:
    currentStreak += 1
    cursor = cursor - 1 day
```

A habit with no entries at all returns `currentStreak: 0, longestStreak: 0`.

---

## Error Responses

All errors use a standard envelope:

```json
{ "error": "string", "code": "string" }
```

| Status | Code            | Condition                                          |
|--------|-----------------|-----------------------------------------------------|
| `400`  | `BAD_REQUEST`   | Missing/invalid `name` or `done`, invalid/future `date` |
| `404`  | `NOT_FOUND`     | `:id` does not match an existing habit              |
| `409`  | `CONFLICT`      | Habit `name` already exists (case-insensitive)      |
| `500`  | `INTERNAL_ERROR`| Unhandled database or server error                  |

---

## Implementation Notes

- Dates are compared as calendar days in UTC; there is no per-user timezone concept in this version (single-user, local app).
- `PUT /api/habits/:id/entries/:date` upserts on the `(habit_id, date)` primary key — no separate create/update distinction at the API layer.
- Deleting a habit and un-marking a specific day (removing the row entirely rather than setting `done = false`) are out of scope for this spec; both are candidates for a follow-up spec if needed.
- Streak computation reads all of a habit's entries per request; no incremental/cached streak storage. Acceptable at single-user scale — revisit if entry volume ever grows large enough to make full scans a real cost.

---

## Frontend

A single-page view. No routing beyond the one page — small enough not to need it.

### Layout

- **Add habit** — a text input + "Add" button pinned above the list. Submits `POST /api/habits`. Empty/whitespace-only input disables the button (mirrors the API's `400` on blank `name`).
- **Habit list** — one row per habit, sorted the same order the API returns (`created_at ASC`). Each row shows:
  - Habit name
  - A **today toggle**: a single control (checkbox/pill button) reflecting today's status — unmarked / done / not done. Clicking it cycles unmarked → done → not done → done → ... (see "Today toggle behavior" below) and calls `PUT /api/habits/:id/entries/:date` with today's date.
  - **Current streak**, e.g. "🔥 3"
  - **Longest streak**, e.g. "best 12"
- Empty state (no habits yet): a short prompt ("Add your first habit above") instead of an empty list.

### Today toggle behavior

The API distinguishes "not done" (an explicit `done: false` row) from "unmarked" (no row), but only for storage — see Data Model. The frontend only ever needs to move a habit between **done** and **not done** for today, since that's what streak math reads:

- Toggle unchecked / neutral → click → sends `{ "done": true }` → shows done state.
- Toggle done → click → sends `{ "done": false }` → shows not-done state.
- Toggle not-done → click → sends `{ "done": true }` → back to done state.

There is no third visible state for "today" — a fresh habit with no entry yet renders as not-done (neutral), matching how the streak algorithm treats an unmarked day. This means the first click on a brand-new habit always marks it done, which is the expected common case.

### Data flow

- On load: `GET /api/habits` populates the list, including `currentStreak`/`longestStreak`.
- After adding a habit or toggling today's status: re-fetch `GET /api/habits` (or optimistically patch the single row's `done`/streak fields) so streaks stay in sync without a full page reload.
- Network/server errors on add or toggle: show an inline error near the affected row/input using the API's `error` message; the input or toggle reverts to its prior state (no optimistic value left stuck on failure).

### Explicitly out of scope

- Viewing or editing any day other than today (a calendar/history view). The API supports arbitrary dates via `:date`, but no UI is specified for it here.
- Deleting or renaming habits (matches the API's Implementation Notes — not supported yet).
- Any visual design system, theming, or responsive/mobile layout details — left to implementation.
