import { describe, expect, it } from "vitest";
import {
  EMPTY_CHECKLIST,
  parseChecklist,
  statusOf,
  withStatus,
  withoutProcedures,
} from "./storage";

const now = new Date("2026-10-11T10:00:00.000Z");

describe("parseChecklist", () => {
  it("treats a missing value as an empty checklist", () => {
    expect(parseChecklist(null)).toEqual({ ok: true, state: EMPTY_CHECKLIST });
  });

  it("reads a v1 document", () => {
    const raw = JSON.stringify({
      v: 1,
      items: { a: { status: "done", updatedAt: now.toISOString() } },
    });
    const result = parseChecklist(raw);
    expect(result.ok && statusOf(result.state, "a")).toBe("done");
  });

  it("drops single malformed items and keeps the rest", () => {
    const raw = JSON.stringify({
      v: 1,
      items: {
        a: { status: "done", updatedAt: now.toISOString() },
        b: { status: "finished", updatedAt: now.toISOString() },
        c: "done",
      },
    });
    const result = parseChecklist(raw);
    expect(result.ok && Object.keys(result.state.items)).toEqual(["a"]);
  });

  it.each([
    ["broken JSON", "{not json"],
    ["an unknown version", JSON.stringify({ v: 2, items: {} })],
    ["a document without items", JSON.stringify({ v: 1 })],
    ["a non-object", JSON.stringify("done")],
  ])("rejects %s", (_, raw) => {
    expect(parseChecklist(raw)).toEqual({ ok: false });
  });
});

describe("checklist updates", () => {
  it("treats a procedure without an entry as todo", () => {
    expect(statusOf(EMPTY_CHECKLIST, "a")).toBe("todo");
  });

  it("sets a status with the time of the change", () => {
    const state = withStatus(EMPTY_CHECKLIST, "a", "in_progress", now);
    expect(state.items.a).toEqual({
      status: "in_progress",
      updatedAt: "2026-10-11T10:00:00.000Z",
    });
  });

  it("resets only the given procedures", () => {
    let state = withStatus(EMPTY_CHECKLIST, "a", "done", now);
    state = withStatus(state, "shared-elsewhere", "done", now);
    state = withoutProcedures(state, ["a"]);
    expect(statusOf(state, "a")).toBe("todo");
    expect(statusOf(state, "shared-elsewhere")).toBe("done");
  });
});
