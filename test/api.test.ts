import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import request from "supertest";
import { createApp } from "../src/app.js";

function makeTestDb() {
  const db = new Database(":memory:");
  const schema = readFileSync(join(process.cwd(), "src/db/schema.sql"), "utf-8");
  db.exec(schema);
  return db;
}

describe("API", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("POST /api/habits", () => {
    it("creates a habit (201)", async () => {
      const app = createApp(makeTestDb());
      const res = await request(app).post("/api/habits").send({ name: "exercise" });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ name: "exercise" });
      expect(res.body.id).toBeTypeOf("string");
      expect(res.body.createdAt).toBeTypeOf("string");
    });

    it("rejects an empty/whitespace name (400)", async () => {
      const app = createApp(makeTestDb());
      const res = await request(app).post("/api/habits").send({ name: "   " });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("BAD_REQUEST");
    });

    it("rejects a name over 100 characters (400)", async () => {
      const app = createApp(makeTestDb());
      const res = await request(app)
        .post("/api/habits")
        .send({ name: "a".repeat(101) });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("BAD_REQUEST");
    });

    it("rejects a case-insensitive duplicate name (409)", async () => {
      const app = createApp(makeTestDb());
      await request(app).post("/api/habits").send({ name: "exercise" });
      const res = await request(app).post("/api/habits").send({ name: "Exercise" });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("CONFLICT");
    });
  });

  describe("GET /api/habits", () => {
    it("returns [] when there are no habits", async () => {
      const app = createApp(makeTestDb());
      const res = await request(app).get("/api/habits");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("returns habits sorted by created_at ASC with streak fields", async () => {
      const db = makeTestDb();
      const app = createApp(db);

      const first = await request(app).post("/api/habits").send({ name: "first" });
      const second = await request(app).post("/api/habits").send({ name: "second" });

      await request(app)
        .put(`/api/habits/${first.body.id}/entries/2026-09-16`)
        .send({ done: true });
      await request(app)
        .put(`/api/habits/${first.body.id}/entries/2026-09-17`)
        .send({ done: true });

      const res = await request(app).get("/api/habits");
      expect(res.status).toBe(200);
      expect(res.body.map((h: { name: string }) => h.name)).toEqual(["first", "second"]);
      expect(res.body[0]).toMatchObject({ currentStreak: 2, longestStreak: 2 });
      expect(res.body[1]).toMatchObject({ currentStreak: 0, longestStreak: 0 });
    });
  });

  describe("PUT /api/habits/:id/entries/:date", () => {
    it("sets a day's status (200) and overwrites idempotently", async () => {
      const db = makeTestDb();
      const app = createApp(db);
      const created = await request(app).post("/api/habits").send({ name: "exercise" });

      const res = await request(app)
        .put(`/api/habits/${created.body.id}/entries/2026-09-17`)
        .send({ done: true });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        habitId: created.body.id,
        date: "2026-09-17",
        done: true,
      });

      const overwrite = await request(app)
        .put(`/api/habits/${created.body.id}/entries/2026-09-17`)
        .send({ done: false });
      expect(overwrite.status).toBe(200);
      expect(overwrite.body.done).toBe(false);
    });

    it("rejects a non-boolean done (400)", async () => {
      const db = makeTestDb();
      const app = createApp(db);
      const created = await request(app).post("/api/habits").send({ name: "exercise" });

      const res = await request(app)
        .put(`/api/habits/${created.body.id}/entries/2026-09-17`)
        .send({ done: "yes" });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("BAD_REQUEST");
    });

    it("rejects an invalid date (400)", async () => {
      const db = makeTestDb();
      const app = createApp(db);
      const created = await request(app).post("/api/habits").send({ name: "exercise" });

      const res = await request(app)
        .put(`/api/habits/${created.body.id}/entries/2026-02-30`)
        .send({ done: true });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("BAD_REQUEST");
    });

    it("rejects a future date (400)", async () => {
      const db = makeTestDb();
      const app = createApp(db);
      const created = await request(app).post("/api/habits").send({ name: "exercise" });

      const res = await request(app)
        .put(`/api/habits/${created.body.id}/entries/2026-09-18`)
        .send({ done: true });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("BAD_REQUEST");
    });

    it("returns 404 for an unknown habit id", async () => {
      const app = createApp(makeTestDb());
      const res = await request(app)
        .put("/api/habits/does-not-exist/entries/2026-09-17")
        .send({ done: true });
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    });
  });
});
