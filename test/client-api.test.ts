import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiError, createHabit, listHabits, setEntry } from "../src/client/api.js";

describe("client api error-envelope parsing", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves createHabit on success", async () => {
    const habit = { id: "1", name: "exercise", createdAt: "2026-09-17T00:00:00.000Z" };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => habit,
    });
    await expect(createHabit("exercise")).resolves.toEqual(habit);
  });

  it("throws ApiError with parsed error/code on failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "name already exists", code: "CONFLICT" }),
    });
    await expect(createHabit("exercise")).rejects.toMatchObject(
      new ApiError("name already exists", "CONFLICT")
    );
  });

  it("falls back to a default message when the error body is unparseable", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("bad json");
      },
    });
    await expect(listHabits()).rejects.toMatchObject(new ApiError("request failed", "UNKNOWN"));
  });

  it("parses setEntry errors", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "habit not found", code: "NOT_FOUND" }),
    });
    await expect(setEntry("bad-id", "2026-09-17", true)).rejects.toMatchObject(
      new ApiError("habit not found", "NOT_FOUND")
    );
  });
});
