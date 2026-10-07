// Dependency phases for the life event page and the checklist (06 §12.6,
// 08 "Life event page"). Ported from the prototype, which had two diverging
// implementations: one put procedures with unknown or cyclic dependencies in
// phase 1, the other dropped them. This single version never drops a
// procedure.

export interface PhaseItem {
  procedure_id: string;
  sort_order: number;
  depends_on: readonly string[];
}

export interface Phase<T extends PhaseItem> {
  /** 1-based phase number. */
  number: number;
  /** Procedures of this phase, in life event order (`sort_order`). */
  procedures: T[];
}

/**
 * Groups procedures into phases: phase 1 for a procedure without
 * dependencies, otherwise 1 + the highest phase among its dependencies (the
 * longest dependency path).
 *
 * - Dependencies on procedures that are not in the list are ignored; the API
 *   already filters out dependencies on non-public procedures.
 * - The database rejects cycles. If one reaches this function anyway, the
 *   edge that closes the cycle is ignored so every procedure still appears.
 */
export function groupIntoPhases<T extends PhaseItem>(
  procedures: readonly T[],
): Phase<T>[] {
  const byId = new Map(procedures.map((p) => [p.procedure_id, p]));
  const phaseOf = new Map<string, number>();
  const inProgress = new Set<string>();

  const resolve = (id: string): number => {
    const known = phaseOf.get(id);
    if (known !== undefined) return known;
    inProgress.add(id);
    let phase = 1;
    for (const dependencyId of byId.get(id)?.depends_on ?? []) {
      if (!byId.has(dependencyId) || inProgress.has(dependencyId)) continue;
      phase = Math.max(phase, resolve(dependencyId) + 1);
    }
    inProgress.delete(id);
    phaseOf.set(id, phase);
    return phase;
  };

  const groups = new Map<number, T[]>();
  for (const procedure of procedures) {
    const phase = resolve(procedure.procedure_id);
    groups.set(phase, [...(groups.get(phase) ?? []), procedure]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([number, items]) => ({
      number,
      procedures: [...items].sort((a, b) => a.sort_order - b.sort_order),
    }));
}

/**
 * The current phase is the lowest phase that still has a procedure not
 * marked done (06 §12.6). Without checklist data that is phase 1. Returns
 * null when every procedure is done or there are no phases.
 */
export function findCurrentPhase<T extends PhaseItem>(
  phases: readonly Phase<T>[],
  isDone: (procedureId: string) => boolean = () => false,
): number | null {
  const current = phases.find((phase) =>
    phase.procedures.some((p) => !isDone(p.procedure_id)),
  );
  return current?.number ?? null;
}
