import { describe, expect, it } from "vitest";
import { countDone, nextStep, pendingDependencies } from "./progress";
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

describe("nextStep", () => {
  it("suggests the first open procedure whose dependencies are done", () => {
    expect(nextStep(procedures, statuses({}))?.procedure_id).toBe("id-card");
    expect(
      nextStep(procedures, statuses({ "id-card": "done" }))?.procedure_id,
    ).toBe("address");
  });

  it("puts started work first", () => {
    const independent = [
      { procedure_id: "a", sort_order: 1, depends_on: [] },
      { procedure_id: "b", sort_order: 2, depends_on: [] },
    ];
    expect(
      nextStep(independent, statuses({ b: "in_progress" }))?.procedure_id,
    ).toBe("b");
  });

  it("is null once everything is done", () => {
    expect(
      nextStep(
        procedures,
        statuses({ "id-card": "done", address: "done", car: "done" }),
      ),
    ).toBeNull();
  });
});
