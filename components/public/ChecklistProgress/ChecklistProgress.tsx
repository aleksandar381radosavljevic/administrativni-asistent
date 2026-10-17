"use client";

import { ProgressBar } from "@aleksandar381radosavljevic/osnova-react";
import { countDone } from "@/lib/checklist/progress";
import type { PhaseItem } from "@/lib/domain/phases";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";

/**
 * The user's checklist progress for a life event, read from this browser
 * (P4 storage). Before hydration it shows 0, like P4, so the server HTML
 * never depends on the browser's data.
 */
export function ChecklistProgress({
  procedures,
}: {
  procedures: readonly PhaseItem[];
}) {
  const { state } = useChecklist();
  const done = countDone(procedures, (id) => state.items[id]?.status ?? "todo");
  const total = procedures.length;
  return (
    <ProgressBar
      value={done}
      max={total}
      label={format(labels.checklistPage.progress, { done, total })}
    />
  );
}
