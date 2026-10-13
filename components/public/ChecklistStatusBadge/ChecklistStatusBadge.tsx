"use client";

import { Badge } from "@aleksandar381radosavljevic/osnova-react";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { labels } from "@/lib/i18n/labels";

const tone = { in_progress: "attention", done: "success" } as const;

/**
 * The user's checklist status for a procedure, shown only after hydration and
 * only once they have started it (08 P3), so the server HTML never depends on
 * the browser's data.
 */
export function ChecklistStatusBadge({ procedureId }: { procedureId: string }) {
  const { state, isHydrated } = useChecklist();
  const status = state.items[procedureId]?.status;
  if (!isHydrated || status === undefined || status === "todo") return null;
  return <Badge tone={tone[status]}>{labels.checklist[status]}</Badge>;
}
