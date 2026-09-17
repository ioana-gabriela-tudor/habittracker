## Plan: Habit Tracker — Full Stack (API + Frontend)

Build the full app described in `docs/specs/habit-tracker.spec.md`: a REST API (habit CRUD, daily done/not-done marking, server-computed current/longest streaks) backed by SQLite, plus a single-page frontend that consumes it. The repo is currently greenfield (only `docs/` and `.claude/` exist). This plan supersedes `docs/plans/plan-habitTrackerApi.md`, which covered the API only — that plan's API sections are folded in here unchanged; this version adds the frontend the spec now specifies.

## 1. Project Scaffolding

Nothing exists yet outside `docs/` and `.claude/`. This sets up a minimal TypeScript Node project (server + statically-served frontend) with the dependencies and scripts needed for everything else.

- [ ] `npm init -y`, then set `name`, `type: module` in `package.json`
- [ ] Install runtime deps: `express`, `better-sqlite3`, `uuid`
- [ ] Install dev deps: `typescript`, `@types/express`, `@types/better-sqlite3`, `@types/uuid`, `@types/node`, `tsx`, `vitest`, `supertest`, `@types/supertest`
- [ ] Add `tsconfig.json` (strict mode on)
- [ ] Add npm scripts: `dev` (runs server with `tsx watch`, serving `public/` statically), `build`, `start`, `test`
- [ ] Add `.gitignore` (`node_modules`, `dist`, `*.db`, `*.db-journal`)
- [ ] `public/` directory for the frontend — plain HTML/CSS/TypeScript compiled to a single JS bundle via `tsc` (no framework, no bundler) — see Decisions for why

## 2. Database Layer

Encapsulates schema creation and raw SQL access so route handlers stay thin and the schema matches the spec exactly.

- [ ] `src/db/schema.sql` with `habits` and `habit_entries` tables exactly as specified in the spec's Data Model section
- [ ] `src/db/index.ts` — opens/creates the SQLite file, runs schema migration on startup (idempotent `CREATE TABLE IF NOT EXISTS`), exports the `Database` instance
- [ ] Configurable DB file path via env var (`DB_PATH`), defaulting to a local file, so tests can point at a temp/in-memory DB

## 3. Domain Logic

Pure, unit-testable functions kept separate from Express so the streak math (the trickiest part of the spec) can be tested in isolation without spinning up HTTP.

- [ ] `src/domain/dates.ts` — UTC "today" helper, date validation (`YYYY-MM-DD`, real calendar date, not in the future), date arithmetic (add/subtract one day)
- [ ] `src/domain/streaks.ts` — implement the reference algorithm from the spec verbatim: given a sorted list of `done=true` dates, compute `currentStreak` and `longestStreak`
- [ ] `src/domain/habits.ts` — repository-style functions: `createHabit`, `listHabitsWithStreaks`, `getHabitById`, `upsertEntry`, `isNameTaken` (case-insensitive)

## 4. API Routes

Wires the domain logic to Express endpoints, matching request/response shapes and status codes exactly as specified, and serves the built frontend.

- [ ] `src/app.ts` — Express app factory (app creation separate from `listen()`, so tests can import the app directly); serves `public/` as static files
- [ ] `src/server.ts` — entrypoint that calls the app factory and starts listening
- [ ] `POST /api/habits` — validate `name` (required, trimmed non-empty, max 100 chars), 409 on case-insensitive duplicate, 201 with `{id, name, createdAt}` on success
- [ ] `GET /api/habits` — return all habits sorted by `created_at ASC`, each with computed `currentStreak`/`longestStreak`; `[]` when empty
- [ ] `PUT /api/habits/:id/entries/:date` — validate `date` format/validity/not-future, validate `done` is boolean, 404 on unknown habit id, upsert on `(habit_id, date)`, 200 with `{habitId, date, done, updatedAt}`
- [ ] Shared error envelope middleware — maps validation/not-found/conflict errors to `{error, code}` with correct status codes (`400 BAD_REQUEST`, `404 NOT_FOUND`, `409 CONFLICT`, `500 INTERNAL_ERROR`)
- [ ] Catch-all error handler for unhandled exceptions → `500 INTERNAL_ERROR`

## 5. Frontend

A single-page view served as static assets from `public/`, built as plain HTML/CSS + TypeScript (compiled, no framework) per the spec's Frontend section. No routing needed — one page.

- [ ] `public/index.html` — page shell: add-habit form (text input + "Add" button) pinned above an empty habit list container, plus an empty-state message element
- [ ] `public/styles.css` — minimal styling for the input/button, habit rows, today toggle, streak badges, empty state, and inline error messages
- [ ] `src/client/api.ts` — thin fetch wrapper: `createHabit(name)`, `listHabits()`, `setEntry(habitId, date, done)`; parses the `{error, code}` envelope on failure
- [ ] `src/client/main.ts` — app logic:
  - On load, call `listHabits()` and render rows (or the empty-state prompt if `[]`)
  - Add-habit form: disable submit button while input is empty/whitespace-only; on submit call `createHabit`, then re-fetch the list; show inline error near the input on failure without clearing the input
  - Today toggle per row: derive today's date (UTC) client-side once at render time; track each row's current done/not-done/unmarked state from the list response; clicking cycles per the spec (unmarked/not-done → done → not-done → done…), calling `setEntry` with today's date; on success, either optimistically patch that row's `done`/streak fields or re-fetch the full list; on failure, revert the toggle to its prior visible state and show an inline error on that row
  - Render `currentStreak` (e.g. "🔥 3") and `longestStreak` (e.g. "best 12") per row
- [ ] Build step: compile `src/client/*.ts` to `public/*.js` via a dedicated `tsconfig.client.json` (browser target, no Node types) wired into the `build` npm script

## 6. Validation

Automated tests covering the spec's endpoints, error cases, and the streak algorithm's edge cases, run against a real (temp/in-memory) SQLite DB via HTTP using supertest. Frontend logic gets targeted unit coverage plus a manual browser smoke test, since it has no server-side test harness.

- [ ] Unit tests for `src/domain/streaks.ts`: no entries → `0/0`; today done; today unmarked but yesterday done; broken streak preserved as longest; multiple runs where a past run is longer than the current one
- [ ] Unit tests for date validation: valid date, malformed date, nonexistent calendar date (e.g. Feb 30), future date
- [ ] Integration test: `POST /api/habits` success (201), empty/whitespace name (400), name > 100 chars (400), duplicate name case-insensitive (409)
- [ ] Integration test: `GET /api/habits` empty list (`[]`), sorted order, streak fields present and correct after seeding entries
- [ ] Integration test: `PUT /api/habits/:id/entries/:date` success (200) + idempotent overwrite, invalid `done` type (400), invalid/future date (400), unknown habit id (404)
- [ ] Unit tests for `src/client/api.ts`'s error-envelope parsing (mocked `fetch`)
- [ ] `npm run build` (typecheck, both server and client tsconfigs) passes
- [ ] `npm test` passes
- [ ] Manual smoke test: start server, open `public/index.html` in a browser via the running server — add a habit, toggle today done/not-done/done, reload and confirm streaks and persisted state survive a restart

## Relevant Files

- `docs/specs/habit-tracker.spec.md` — authoritative API + frontend contract for this plan
- `docs/specs/brief.md` — product-level acceptance criteria behind the spec
- `docs/plans/plan-habitTrackerApi.md` — prior API-only plan; superseded by this one (recommend removing once this plan is adopted, to avoid two conflicting plans)
- `package.json`, `tsconfig.json`, `tsconfig.client.json` (proposed, do not exist yet)
- `src/db/index.ts`, `src/db/schema.sql` (proposed)
- `src/domain/dates.ts`, `src/domain/streaks.ts`, `src/domain/habits.ts` (proposed)
- `src/app.ts`, `src/server.ts` (proposed)
- `src/client/api.ts`, `src/client/main.ts` (proposed)
- `public/index.html`, `public/styles.css` (proposed)
- `test/` (proposed, unit + integration tests)

## Decisions

- Stack: Node + Express + TypeScript + SQLite (`better-sqlite3`) for the API, unchanged from the prior plan — the spec's SQL schema maps directly to it.
- Frontend: plain HTML/CSS + compiled TypeScript, no framework/bundler, served statically by the same Express app. The spec explicitly describes a single unrouted page with modest interactivity (one form, one toggle per row) — a framework (React/Vue) would add build tooling and runtime weight the task doesn't need. Revisit only if the frontend's interaction surface grows materially.
- App/server split (`src/app.ts` exports the Express app, `src/server.ts` calls `listen`) so integration tests can exercise the app in-process via supertest without binding a port.
- Streak computation follows the spec's reference pseudocode verbatim rather than a reinterpreted version, to avoid subtle off-by-one divergence.
- No auth, no delete/unmark endpoints, no history/calendar view, no habit delete/rename in the UI — explicitly out of scope per the spec.
- This plan supersedes `plan-habitTrackerApi.md` per explicit direction; the API section here is carried over unchanged from that plan.

## Further Considerations

- [ ] Confirm whether `better-sqlite3` (sync, simpler) vs. an async driver is acceptable given native-module build tooling on the dev/CI environment.
- [ ] Confirm test runner preference (Vitest vs Jest) if there's an existing convention elsewhere — none found in this greenfield repo, so Vitest is a placeholder choice.
- [ ] Confirm whether `docs/plans/plan-habitTrackerApi.md` should be deleted now that this plan supersedes it, or kept for history.
