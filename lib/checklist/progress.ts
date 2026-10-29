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

/**
 * The step to suggest next: the first procedure, in phase order, that is not
 * done and whose dependencies are done. In-progress work comes first, so the
 * user finishes what they started. Null only when everything is done: a
 * blocked procedure always has an open dependency to do first.
 */
export function nextStep<T extends PhaseItem>(
  phasedProcedures: readonly T[],
  statusOf: (procedureId: string) => ChecklistStatus,
): T | null {
  const open = phasedProcedures.filter(
    (p) =>
      statusOf(p.procedure_id) !== "done" &&
      pendingDependencies(p, phasedProcedures, statusOf).length === 0,
  );
  return (
    open.find((p) => statusOf(p.procedure_id) === "in_progress") ??
    open[0] ??
    null
  );
}
