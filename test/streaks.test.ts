import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { computeStreaks } from "../src/domain/streaks.js";

describe("computeStreaks", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0/0 for no entries", () => {
    expect(computeStreaks([])).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  it("counts today done as part of the streak", () => {
    expect(computeStreaks(["2026-09-15", "2026-09-16", "2026-09-17"])).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it("keeps current streak alive when today is unmarked but yesterday is done", () => {
    expect(computeStreaks(["2026-09-14", "2026-09-15", "2026-09-16"])).toEqual({
      currentStreak: 3,
      longestStreak: 3,
    });
  });

  it("preserves a broken streak as the longest", () => {
    // Run of 5 days long ago, then nothing recent.
    expect(
      computeStreaks(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05"])
    ).toEqual({ currentStreak: 0, longestStreak: 5 });
  });

  it("keeps the longest run even when a shorter run is current", () => {
    expect(
      computeStreaks([
        "2026-09-01",
        "2026-09-02",
        "2026-09-03",
        "2026-09-04",
        "2026-09-05",
        "2026-09-16",
        "2026-09-17",
      ])
    ).toEqual({ currentStreak: 2, longestStreak: 5 });
  });
});
