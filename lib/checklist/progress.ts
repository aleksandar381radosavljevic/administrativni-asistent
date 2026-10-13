import type { PhaseItem } from "@/lib/domain/phases";
import type { ChecklistStatus } from "./storage";

/**
 * Dependencies of a procedure, inside this life event, that are not done yet
 * (08 P4: a procedure is blocked when at least one of them is not `done`).
 * Dependencies outside the event are ignored, like in the phase grouping.
 */
export function pendingDependencies<T extends PhaseItem>(
  procedure: T,
  procedures: readonly T[],
  statusOf: (procedureId: string) => ChecklistStatus,
): T[] {
  return procedure.depends_on.flatMap((dependencyId) => {
    const dependency = procedures.find((p) => p.procedure_id === dependencyId);
    return dependency && statusOf(dependencyId) !== "done" ? [dependency] : [];
  });
}

export function countDone(
  procedures: readonly PhaseItem[],
  statusOf: (procedureId: string) => ChecklistStatus,
): number {
  return procedures.filter((p) => statusOf(p.procedure_id) === "done").length;
}
