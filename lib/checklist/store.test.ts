import { describe, expect, it, vi } from "vitest";
import { CHECKLIST_BACKUP_KEY, CHECKLIST_KEY, statusOf } from "./storage";
import { createChecklistStore } from "./store";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

const now = () => new Date("2026-10-11T10:00:00.000Z");

describe("createChecklistStore", () => {
  it("saves a status so a new page load restores it", () => {
    const storage = new MemoryStorage();
    createChecklistStore({ getStorage: () => storage, now }).setStatus(
      "a",
      "done",
    );
    const reloaded = createChecklistStore({ getStorage: () => storage, now });
    expect(statusOf(reloaded.getSnapshot().state, "a")).toBe("done");
  });

  it("notifies subscribers and keeps the snapshot stable between changes", () => {
    const store = createChecklistStore({
      getStorage: () => new MemoryStorage(),
      now,
    });
    const onChange = vi.fn();
    store.subscribe(onChange);
    const before = store.getSnapshot();
    expect(store.getSnapshot()).toBe(before);
    store.setStatus("a", "in_progress");
    expect(onChange).toHaveBeenCalledOnce();
    expect(store.getSnapshot()).not.toBe(before);
  });

  it("moves unreadable data to the backup key and starts empty", () => {
    const storage = new MemoryStorage();
    storage.setItem(CHECKLIST_KEY, JSON.stringify({ v: 9, items: {} }));
    const store = createChecklistStore({ getStorage: () => storage, now });
    expect(store.getSnapshot().state.items).toEqual({});
    expect(storage.getItem(CHECKLIST_BACKUP_KEY)).toBe(
      JSON.stringify({ v: 9, items: {} }),
    );
    expect(storage.getItem(CHECKLIST_KEY)).toBeNull();
  });

  it("works in memory when the browser blocks storage", () => {
    const store = createChecklistStore({
      getStorage: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      now,
    });
    store.setStatus("a", "done");
    const snapshot = store.getSnapshot();
    expect(snapshot.isPersistent).toBe(false);
    expect(statusOf(snapshot.state, "a")).toBe("done");
  });

  it("falls back to memory when a write fails", () => {
    const storage = new MemoryStorage();
    const store = createChecklistStore({ getStorage: () => storage, now });
    store.getSnapshot();
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    store.setStatus("a", "done");
    expect(store.getSnapshot().isPersistent).toBe(false);
    expect(statusOf(store.getSnapshot().state, "a")).toBe("done");
  });

  it("picks up changes from another tab", () => {
    const storage = new MemoryStorage();
    const target = new EventTarget();
    const store = createChecklistStore({
      getStorage: () => storage,
      eventTarget: target as unknown as Window,
      now,
    });
    const onChange = vi.fn();
    store.subscribe(onChange);
    store.getSnapshot();

    createChecklistStore({ getStorage: () => storage, now }).setStatus(
      "a",
      "done",
    );
    target.dispatchEvent(
      Object.assign(new Event("storage"), { key: CHECKLIST_KEY }),
    );

    expect(onChange).toHaveBeenCalledOnce();
    expect(statusOf(store.getSnapshot().state, "a")).toBe("done");
  });

  it("resets one life event's procedures", () => {
    const store = createChecklistStore({
      getStorage: () => new MemoryStorage(),
      now,
    });
    store.setStatus("a", "done");
    store.setStatus("b", "done");
    store.reset(["a"]);
    expect(statusOf(store.getSnapshot().state, "a")).toBe("todo");
    expect(statusOf(store.getSnapshot().state, "b")).toBe("done");
  });
});
