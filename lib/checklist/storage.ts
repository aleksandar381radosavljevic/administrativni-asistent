// Checklist state in localStorage (08 P4, 05 §5). One key for the whole app,
// keyed by procedure id, so a procedure shared by several life events has one
// status everywhere. Nothing here is ever sent to the server.

export const CHECKLIST_KEY = "aa:checklist";
export const CHECKLIST_BACKUP_KEY = "aa:checklist:backup";

export const CHECKLIST_STATUSES = ["todo", "in_progress", "done"] as const;
export type ChecklistStatus = (typeof CHECKLIST_STATUSES)[number];

export interface ChecklistItem {
  status: ChecklistStatus;
  /** ISO 8601. */
  updatedAt: string;
}

export interface ChecklistState {
  v: 1;
  items: Readonly<Record<string, ChecklistItem>>;
}

export const EMPTY_CHECKLIST: ChecklistState = { v: 1, items: {} };

export type ParseResult =
  | { ok: true; state: ChecklistState }
  /** Unknown version or unreadable JSON: keep the raw value as a backup. */
  | { ok: false };

function isChecklistItem(value: unknown): value is ChecklistItem {
  if (typeof value !== "object" || value === null) return false;
  const { status, updatedAt } = value as Record<string, unknown>;
  return (
    typeof status === "string" &&
    (CHECKLIST_STATUSES as readonly string[]).includes(status) &&
    typeof updatedAt === "string"
  );
}

/**
 * Reads the stored value. A missing value is an empty checklist. Inside a
 * valid v1 document, single malformed items are dropped rather than failing
 * the whole checklist.
 */
export function parseChecklist(raw: string | null): ParseResult {
  if (raw === null) return { ok: true, state: EMPTY_CHECKLIST };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false };
  }
  if (typeof data !== "object" || data === null) return { ok: false };
  const { v, items } = data as Record<string, unknown>;
  if (v !== 1 || typeof items !== "object" || items === null) {
    return { ok: false };
  }
  const valid = Object.entries(items).filter(([, item]) =>
    isChecklistItem(item),
  ) as [string, ChecklistItem][];
  return { ok: true, state: { v: 1, items: Object.fromEntries(valid) } };
}

export function statusOf(
  state: ChecklistState,
  procedureId: string,
): ChecklistStatus {
  return state.items[procedureId]?.status ?? "todo";
}

export function withStatus(
  state: ChecklistState,
  procedureId: string,
  status: ChecklistStatus,
  now: Date,
): ChecklistState {
  return {
    v: 1,
    items: {
      ...state.items,
      [procedureId]: { status, updatedAt: now.toISOString() },
    },
  };
}

/**
 * Resets only the given procedures (one life event's) to `todo` by removing
 * their entries; other events' procedures keep their status.
 */
export function withoutProcedures(
  state: ChecklistState,
  procedureIds: readonly string[],
): ChecklistState {
  const reset = new Set(procedureIds);
  return {
    v: 1,
    items: Object.fromEntries(
      Object.entries(state.items).filter(([id]) => !reset.has(id)),
    ),
  };
}
