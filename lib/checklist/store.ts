import {
  CHECKLIST_BACKUP_KEY,
  CHECKLIST_KEY,
  EMPTY_CHECKLIST,
  parseChecklist,
  withStatus,
  withoutProcedures,
  type ChecklistState,
  type ChecklistStatus,
} from "./storage";

export interface ChecklistSnapshot {
  state: ChecklistState;
  /** False when the browser refuses storage: the checklist then lives in memory only. */
  isPersistent: boolean;
}

export interface ChecklistStore {
  subscribe(onChange: () => void): () => void;
  getSnapshot(): ChecklistSnapshot;
  setStatus(procedureId: string, status: ChecklistStatus): void;
  reset(procedureIds: readonly string[]): void;
}

interface StoreOptions {
  /** Returns the storage, or throws when the browser blocks it. */
  getStorage: () => Storage;
  /** Where `storage` events arrive from other tabs. */
  eventTarget?: Pick<Window, "addEventListener" | "removeEventListener">;
  now?: () => Date;
}

/**
 * The one place that touches localStorage for the checklist (08 P4). Shaped
 * for `useSyncExternalStore`: snapshots are cached and only replaced when the
 * state changes, and a `storage` listener keeps two open tabs in sync.
 */
export function createChecklistStore({
  getStorage,
  eventTarget,
  now = () => new Date(),
}: StoreOptions): ChecklistStore {
  const listeners = new Set<() => void>();
  let snapshot: ChecklistSnapshot | null = null;

  function storageOrNull(): Storage | null {
    try {
      const storage = getStorage();
      // Some private modes expose localStorage but throw on write.
      storage.setItem(`${CHECKLIST_KEY}:probe`, "1");
      storage.removeItem(`${CHECKLIST_KEY}:probe`);
      return storage;
    } catch {
      return null;
    }
  }

  function load(): ChecklistSnapshot {
    const storage = storageOrNull();
    if (!storage) return { state: EMPTY_CHECKLIST, isPersistent: false };
    const raw = storage.getItem(CHECKLIST_KEY);
    const parsed = parseChecklist(raw);
    if (parsed.ok) return { state: parsed.state, isPersistent: true };
    // Unknown version or broken JSON: keep it aside and start empty.
    if (raw !== null) storage.setItem(CHECKLIST_BACKUP_KEY, raw);
    storage.removeItem(CHECKLIST_KEY);
    return { state: EMPTY_CHECKLIST, isPersistent: true };
  }

  function getSnapshot(): ChecklistSnapshot {
    snapshot ??= load();
    return snapshot;
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function commit(state: ChecklistState) {
    let { isPersistent } = getSnapshot();
    if (isPersistent) {
      try {
        getStorage().setItem(CHECKLIST_KEY, JSON.stringify(state));
      } catch {
        // Quota, or storage that stopped working: keep going in memory.
        isPersistent = false;
      }
    }
    snapshot = { state, isPersistent };
    notify();
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== CHECKLIST_KEY && event.key !== null) return;
    snapshot = load();
    notify();
  }

  return {
    subscribe(onChange) {
      if (listeners.size === 0)
        eventTarget?.addEventListener("storage", onStorage);
      listeners.add(onChange);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) {
          eventTarget?.removeEventListener("storage", onStorage);
        }
      };
    },
    getSnapshot,
    setStatus(procedureId, status) {
      commit(withStatus(getSnapshot().state, procedureId, status, now()));
    },
    reset(procedureIds) {
      commit(withoutProcedures(getSnapshot().state, procedureIds));
    },
  };
}
