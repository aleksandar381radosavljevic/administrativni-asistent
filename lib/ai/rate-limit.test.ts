import { describe, expect, it } from "vitest";
import { labels } from "@/lib/i18n/labels";
import {
  clientIp,
  hashClientIp,
  rateLimitedResponse,
  secondsUntilNextHour,
} from "./rate-limit";

const salt = "s".repeat(32);

describe("hashClientIp", () => {
  const day = new Date("2026-10-09T10:15:00Z");

  it("is lowercase hex SHA-256, as ai_rate_limits.ip_hash requires", () => {
    const hash = hashClientIp("203.0.113.7", salt, day);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203.0.113.7");
  });

  it("is stable within a day", () => {
    expect(hashClientIp("203.0.113.7", salt, day)).toBe(
      hashClientIp("203.0.113.7", salt, new Date("2026-10-09T23:59:59Z")),
    );
  });

  it("changes with the day, the salt and the IP", () => {
    const hash = hashClientIp("203.0.113.7", salt, day);
    expect(
      hashClientIp("203.0.113.7", salt, new Date("2026-10-10T00:00:00Z")),
    ).not.toBe(hash);
    expect(hashClientIp("203.0.113.7", "t".repeat(32), day)).not.toBe(hash);
    expect(hashClientIp("203.0.113.8", salt, day)).not.toBe(hash);
  });
});

describe("secondsUntilNextHour", () => {
  it.each([
    ["2026-10-09T10:35:00Z", 1500],
    ["2026-10-09T10:00:00Z", 3600],
    ["2026-10-09T10:59:59.500Z", 1],
  ])("at %s is %i", (now, expected) => {
    expect(secondsUntilNextHour(new Date(now))).toBe(expected);
  });
});

describe("clientIp", () => {
  it("prefers x-real-ip", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.7",
      "x-forwarded-for": "198.51.100.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to the first x-forwarded-for entry", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("uses one shared bucket when no header is present", () => {
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("rateLimitedResponse", () => {
  it("matches the 03 TooManyRequests example", async () => {
    const response = rateLimitedResponse(1500);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1500");
    expect(await response.json()).toEqual({
      error: "rate_limited",
      message:
        "Iskoristio si 10 pitanja za ovaj sat. Pokušaj ponovo za 25 minuta.",
      retry_after_seconds: 1500,
    });
  });

  it("rounds up to whole minutes with the right Serbian form", async () => {
    const { message } = await rateLimitedResponse(30).json();
    expect(message).toBe(
      labels.apiErrors.rateLimited
        .replace("{limit}", "10")
        .replace("{minutes}", "1 minut"),
    );
  });
});
