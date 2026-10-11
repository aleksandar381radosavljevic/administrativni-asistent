import { describe, expect, it } from "vitest";
import { countDone, pendingDependencies } from "./progress";
import type { ChecklistStatus } from "./storage";

const procedures = [
  { procedure_id: "id-card", sort_order: 1, depends_on: [] },
  { procedure_id: "address", sort_order: 2, depends_on: ["id-card"] },
  { procedure_id: "car", sort_order: 3, depends_on: ["address", "not-public"] },
];

const statuses =
  (map: Record<string, ChecklistStatus>) =>
  (id: string): ChecklistStatus =>
    map[id] ?? "todo";

describe("pendingDependencies", () => {
  it("lists dependencies in the event that are not done", () => {
    const [, address] = procedures;
    expect(
      pendingDependencies(
        address!,
        procedures,
        statuses({ "id-card": "in_progress" }),
      ),
    ).toEqual([procedures[0]]);
  });

  it("is empty once every dependency is done", () => {
    const [, address] = procedures;
    expect(
      pendingDependencies(
        address!,
        procedures,
        statuses({ "id-card": "done" }),
      ),
    ).toEqual([]);
  });

  it("ignores dependencies outside the event", () => {
    const [, , car] = procedures;
    expect(
      pendingDependencies(car!, procedures, statuses({ address: "done" })),
    ).toEqual([]);
  });
});

describe("countDone", () => {
  it("counts only done procedures", () => {
    expect(
      countDone(
        procedures,
        statuses({ "id-card": "done", address: "in_progress" }),
      ),
    ).toBe(1);
  });
});
