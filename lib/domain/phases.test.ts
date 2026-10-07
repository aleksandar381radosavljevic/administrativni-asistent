import { describe, expect, it } from "vitest";
import { findCurrentPhase, groupIntoPhases, type PhaseItem } from "./phases";

const item = (
  id: string,
  sort_order: number,
  depends_on: string[] = [],
): PhaseItem => ({
  procedure_id: id,
  sort_order,
  depends_on,
});

const ids = (phases: ReturnType<typeof groupIntoPhases>) =>
  phases.map((phase) => [
    phase.number,
    phase.procedures.map((p) => p.procedure_id),
  ]);

describe("groupIntoPhases", () => {
  it("puts procedures without dependencies in phase 1, in sort order", () => {
    expect(ids(groupIntoPhases([item("b", 2), item("a", 1)]))).toEqual([
      [1, ["a", "b"]],
    ]);
  });

  it("places a procedure one phase after its dependency", () => {
    const phases = groupIntoPhases([
      item("card", 2, ["address"]),
      item("address", 1),
    ]);
    expect(ids(phases)).toEqual([
      [1, ["address"]],
      [2, ["card"]],
    ]);
  });

  it("uses the longest path, not the first dependency", () => {
    // d depends on a (phase 1) and c (phase 3), so d is phase 4.
    const phases = groupIntoPhases([
      item("a", 1),
      item("b", 2, ["a"]),
      item("c", 3, ["b"]),
      item("d", 4, ["a", "c"]),
      item("e", 5, ["a"]),
    ]);
    expect(ids(phases)).toEqual([
      [1, ["a"]],
      [2, ["b", "e"]],
      [3, ["c"]],
      [4, ["d"]],
    ]);
  });

  it("ignores dependencies on procedures that are not in the list", () => {
    expect(ids(groupIntoPhases([item("a", 1, ["hidden-draft"])]))).toEqual([
      [1, ["a"]],
    ]);
  });

  it("keeps every procedure when the data contains a cycle", () => {
    const phases = groupIntoPhases([
      item("a", 1, ["b"]),
      item("b", 2, ["a"]),
      item("c", 3),
    ]);
    const all = phases.flatMap((phase) =>
      phase.procedures.map((p) => p.procedure_id),
    );
    expect(all.sort()).toEqual(["a", "b", "c"]);
  });

  it("returns no phases for no procedures", () => {
    expect(groupIntoPhases([])).toEqual([]);
  });

  it("keeps the caller's extra fields", () => {
    const [phase] = groupIntoPhases([{ ...item("a", 1), title: "Prijava" }]);
    expect(phase.procedures[0].title).toBe("Prijava");
  });
});

describe("findCurrentPhase", () => {
  const phases = groupIntoPhases([
    item("a", 1),
    item("b", 2, ["a"]),
    item("c", 3, ["b"]),
  ]);

  it("is phase 1 without checklist data", () => {
    expect(findCurrentPhase(phases)).toBe(1);
  });

  it("is the lowest phase with an unfinished procedure", () => {
    expect(findCurrentPhase(phases, (id) => id === "a")).toBe(2);
  });

  it("is null when everything is done", () => {
    expect(findCurrentPhase(phases, () => true)).toBeNull();
  });
});
