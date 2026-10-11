"use client";

import { useSyncExternalStore } from "react";
import {
  createChecklistStore,
  type ChecklistSnapshot,
} from "@/lib/checklist/store";
import { EMPTY_CHECKLIST } from "@/lib/checklist/storage";

const store = createChecklistStore({
  getStorage: () => window.localStorage,
  eventTarget: typeof window === "undefined" ? undefined : window,
});

// Before hydration every procedure is `todo` (08 P4), so server HTML never
// depends on the browser's data.
const serverSnapshot: ChecklistSnapshot = {
  state: EMPTY_CHECKLIST,
  isPersistent: true,
};
const getServerSnapshot = () => serverSnapshot;

/**
 * Checklist state for client components. `isHydrated` is false on the server
 * and during hydration, when controls stay disabled.
 */
export function useChecklist() {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
  const isHydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  return {
    ...snapshot,
    isHydrated,
    setStatus: store.setStatus,
    reset: store.reset,
  };
}

function noopSubscribe() {
  return () => undefined;
}
