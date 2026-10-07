import { describe, expect, it } from "vitest";
import { isStale } from "./is-stale";

const now = new Date("2026-10-07T12:00:00Z");

describe("isStale", () => {
  it("treats a never-verified procedure as stale", () => {
    expect(isStale(null, now)).toBe(true);
  });

  it("is fresh within six months", () => {
    expect(isStale("2026-06-15T00:00:00Z", now)).toBe(false);
    expect(isStale("2026-04-07T12:00:00Z", now)).toBe(false);
  });

  it("is stale after six months", () => {
    expect(isStale("2026-04-07T11:59:59Z", now)).toBe(true);
    expect(isStale("2025-01-01T00:00:00Z", now)).toBe(true);
  });
});
