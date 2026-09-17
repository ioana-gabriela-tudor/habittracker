import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { isValidPastOrPresentDate } from "../src/domain/dates.js";

describe("isValidPastOrPresentDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-17T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid past date", () => {
    expect(isValidPastOrPresentDate("2026-09-16")).toBe(true);
  });

  it("accepts today", () => {
    expect(isValidPastOrPresentDate("2026-09-17")).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(isValidPastOrPresentDate("2026/09/17")).toBe(false);
    expect(isValidPastOrPresentDate("not-a-date")).toBe(false);
  });

  it("rejects a nonexistent calendar date", () => {
    expect(isValidPastOrPresentDate("2026-02-30")).toBe(false);
  });

  it("rejects a future date", () => {
    expect(isValidPastOrPresentDate("2026-09-18")).toBe(false);
  });
});
