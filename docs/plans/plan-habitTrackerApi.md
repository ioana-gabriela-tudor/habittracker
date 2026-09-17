## Plan: Habit Tracker — Core API

Build the REST API described in `docs/specs/habit-tracker.spec.md`: habit CRUD (create/list), daily done/not-done marking, and server-computed current/longest streaks, backed by SQLite. The repo is currently greenfield (only `docs/` and `.claude/` exist) — this plan scaffolds the whole project using Node + Express + SQLite with TypeScript. No auth, single-user, per the spec.

## 1. Project Scaffolding

Nothing exists yet outside `docs/` and `.claude/`. This sets up a minimal TypeScript Node project with the dependencies and scripts needed for everything else.

- [ ] `npm init -y`, then add `name`, `type: module` (or CJS, pick one convention) to `package.json`
- [ ] Install runtime deps: `express`, `better-sqlite3`, `uuid`
- [ ] Install dev deps: `typescript`, `@types/express`, `@types/better-sqlite3`, `@types/uuid`, `@types/node`, `tsx` (or `ts-node`), `vitest` (or `jest` + `supertest`), `supertest`, `@types/supertest`
- [ ] Add `tsconfig.json` (strict mode on)
- [ ] Add npm scripts: `dev`, `build`, `start`, `test`
- [ ] Add `.gitignore` (`node_modules`, `dist`, `*.db`, `*.db-journal`)

## 2. Database Layer

Encapsulates schema creation and raw SQL access so route handlers stay thin and the schema matches the spec exactly.

- [ ] `src/db/schema.sql` (or inline SQL) with `habits` and `habit_entries` tables exactly as specified in the spec's Data Model section
- [ ] `src/db/index.ts` — opens/creates the SQLite file, runs schema migration on startup (idempotent `CREATE TABLE IF NOT EXISTS`), exports the `Database` instance
- [ ] Use a configurable DB file path (env var, e.g. `DB_PATH`, defaulting to a local file) so tests can point at a temp/in-memory DB

## 3. Domain Logic

Pure, unit-testable functions kept separate from Express so the streak math (the trickiest part of the spec) can be tested in isolation without spinning up HTTP.

- [ ] `src/domain/dates.ts` — UTC "today" helper, date validation (`YYYY-MM-DD`, real calendar date, not in the future), date arithmetic (add/subtract one day)
- [ ] `src/domain/streaks.ts` — implement the reference algorithm from the spec: given a sorted list of `done=true` dates, compute `currentStreak` and `longestStreak`
- [ ] `src/domain/habits.ts` — repository-style functions: `createHabit`, `listHabitsWithStreaks`, `getHabitById`, `upsertEntry`, `isNameTaken` (case-insensitive)

## 4. API Routes

Wires the domain logic to Express endpoints, matching request/response shapes and status codes exactly as specified.

- [ ] `src/app.ts` — Express app factory (app creation separate from `listen()`, so tests can import the app directly)
- [ ] `src/server.ts` — entrypoint that calls the app factory and starts listening
- [ ] `POST /api/habits` — validate `name` (required, trimmed non-empty, max 100 chars), 409 on case-insensitive duplicate, 201 with `{id, name, createdAt}` on success
- [ ] `GET /api/habits` — return all habits sorted by `created_at ASC`, each with computed `currentStreak`/`longestStreak`; `[]` when empty
- [ ] `PUT /api/habits/:id/entries/:date` — validate `date` format/validity/not-future, validate `done` is boolean, 404 on unknown habit id, upsert on `(habit_id, date)`, 200 with `{habitId, date, done, updatedAt}`
- [ ] Shared error envelope middleware — maps validation/not-found/conflict errors to `{error, code}` with the correct status codes (`400 BAD_REQUEST`, `404 NOT_FOUND`, `409 CONFLICT`, `500 INTERNAL_ERROR`)
- [ ] Catch-all error handler for unhandled exceptions → `500 INTERNAL_ERROR`

## 5. Validation

Automated tests covering the spec's endpoints, error cases, and the streak algorithm's edge cases, run against a real (temp/in-memory) SQLite DB via HTTP using supertest.

- [ ] Unit tests for `src/domain/streaks.ts`: no entries → `0/0`; today done; today unmarked but yesterday done; broken streak preserved as longest; multiple runs where a past run is longer than the current one
- [ ] Unit tests for date validation: valid date, malformed date, nonexistent calendar date (e.g. Feb 30), future date
- [ ] Integration test: `POST /api/habits` success (201), empty/whitespace name (400), name > 100 chars (400), duplicate name case-insensitive (409)
- [ ] Integration test: `GET /api/habits` empty list (`[]`), sorted order, streak fields present and correct after seeding entries
- [ ] Integration test: `PUT /api/habits/:id/entries/:date` success (200) + idempotent overwrite, invalid `done` type (400), invalid/future date (400), unknown habit id (404)
- [ ] `npm run build` (typecheck) passes
- [ ] `npm test` passes
- [ ] Manual smoke test: start server, run a few `curl` requests against `POST`/`GET`/`PUT` to confirm real end-to-end behavior

## Relevant Files

- `docs/specs/habit-tracker.spec.md` — authoritative API contract for this plan
- `docs/specs/brief.md` — product-level acceptance criteria behind the spec
- `package.json` (proposed, does not exist yet)
- `tsconfig.json` (proposed, does not exist yet)
- `src/db/index.ts`, `src/db/schema.sql` (proposed)
- `src/domain/dates.ts`, `src/domain/streaks.ts`, `src/domain/habits.ts` (proposed)
- `src/app.ts`, `src/server.ts` (proposed)
- `test/` (proposed, unit + integration tests)

## Decisions

- Stack: Node + Express + TypeScript + SQLite (`better-sqlite3`), confirmed with the user given the repo is greenfield and the spec's SQL schema maps directly to it.
- App/server split (`src/app.ts` exports the Express app, `src/server.ts` calls `listen`) so integration tests can exercise the app in-process via supertest without binding a port.
- Streak computation follows the spec's reference pseudocode verbatim rather than a reinterpreted version, to avoid subtle off-by-one divergence.
- No auth, no delete/unmark endpoints — explicitly out of scope per the spec's Implementation Notes.

## Further Considerations

- [ ] Confirm whether `better-sqlite3` (sync, simpler) vs. `sqlite3`/an async driver is acceptable given native-module build tooling on the dev/CI environment.
- [ ] Confirm test runner preference (Vitest vs Jest) if the workspace has an existing convention elsewhere — none found in this greenfield repo, so Vitest is a placeholder choice.
- [ ] Frontend/UI is out of scope for this spec (API-only) — a follow-up plan would be needed if a client is required.
