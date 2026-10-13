"use client";

import {
  Banner,
  Button,
  Dialog,
  ProgressBar,
} from "@aleksandar381radosavljevic/osnova-react";
import { useState } from "react";
import { BackLink } from "@/components/public/BackLink/BackLink";
import { CheckCard } from "@/components/public/CheckCard/CheckCard";
import { PhaseIndicator } from "@/components/public/PhaseIndicator/PhaseIndicator";
import { VisuallyHidden } from "@/components/public/VisuallyHidden/VisuallyHidden";
import { countDone, pendingDependencies } from "@/lib/checklist/progress";
import { statusOf, type ChecklistStatus } from "@/lib/checklist/storage";
import { findCurrentPhase, groupIntoPhases } from "@/lib/domain/phases";
import { useChecklist } from "@/lib/hooks/use-checklist";
import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { LifeEventDetail } from "@/lib/services/schemas";
import styles from "./ChecklistView.module.css";

const copy = labels.checklistPage;

/**
 * P4: the user's own progress through one life event (08 P4). The server
 * renders every procedure as "Nije počelo" with the controls disabled; the
 * stored state applies after hydration.
 */
export function ChecklistView({ lifeEvent }: { lifeEvent: LifeEventDetail }) {
  const { state, isPersistent, isHydrated, setStatus, reset } = useChecklist();
  const [announcement, setAnnouncement] = useState("");
  const [isResetOpen, setResetOpen] = useState(false);

  const { procedures } = lifeEvent;
  const status = (id: string) => statusOf(state, id);
  const phases = groupIntoPhases(procedures);
  const done = countDone(procedures, status);
  const total = procedures.length;

  function changeStatus(
    procedureId: string,
    title: string,
    next: ChecklistStatus,
  ) {
    setStatus(procedureId, next);
    // Counted from the new value, since the store's snapshot lands on the next render.
    const nextDone = countDone(procedures, (id) =>
      id === procedureId ? next : status(id),
    );
    setAnnouncement(
      format(copy.announcement, {
        title,
        status: labels.checklist[next],
        done: nextDone,
        total,
      }),
    );
  }

  function confirmReset() {
    reset(procedures.map((p) => p.procedure_id));
    setResetOpen(false);
    setAnnouncement(format(copy.resetDone, { total }));
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <BackLink href={`/dogadjaj/${lifeEvent.slug}`}>
          {lifeEvent.title}
        </BackLink>
        <h1 className={styles.title}>
          {format(copy.title, { title: lifeEvent.title })}
        </h1>
        <ProgressBar
          value={done}
          max={total}
          label={format(copy.progress, { done, total })}
        />
        {isHydrated && !isPersistent ? (
          <Banner tone="warning">{copy.storageBlocked}</Banner>
        ) : (
          <Banner tone="info">
            {copy.storageInfo} {copy.storageInfoMore}
          </Banner>
        )}
      </div>

      <p role="status">
        <VisuallyHidden>{announcement}</VisuallyHidden>
      </p>

      <PhaseIndicator
        aria-label={labels.lifeEvent.phases}
        currentPhase={findCurrentPhase(phases, (id) => status(id) === "done")}
        phases={phases.map((phase) => ({
          number: phase.number,
          content: (
            <ul
              className={styles.cards}
              role="list"
              aria-busy={!isHydrated || undefined}
            >
              {phase.procedures.map((procedure) => (
                <CheckCard
                  key={procedure.procedure_id}
                  procedure={procedure}
                  href={`/procedura/${procedure.slug}?dogadjaj=${encodeURIComponent(lifeEvent.slug)}`}
                  status={status(procedure.procedure_id)}
                  pendingDependencies={pendingDependencies(
                    procedure,
                    procedures,
                    status,
                  ).map((p) => p.title)}
                  disabled={!isHydrated}
                  onStatusChange={(next) =>
                    changeStatus(procedure.procedure_id, procedure.title, next)
                  }
                />
              ))}
            </ul>
          ),
        }))}
      />

      <div>
        <Button
          variant="ghost"
          disabled={!isHydrated}
          onClick={() => setResetOpen(true)}
        >
          {copy.reset}
        </Button>
      </div>
      <Dialog
        open={isResetOpen}
        onClose={() => setResetOpen(false)}
        title={copy.reset}
        description={copy.resetQuestion}
        actions={
          <>
            <Button
              variant="secondary"
              autoFocus
              onClick={() => setResetOpen(false)}
            >
              {copy.resetCancel}
            </Button>
            <Button onClick={confirmReset}>{copy.resetConfirm}</Button>
          </>
        }
      />
    </div>
  );
}
