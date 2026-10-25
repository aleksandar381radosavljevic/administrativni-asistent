"use client";

import {
  Banner,
  Button,
  Dialog,
  Icon,
  ProgressBar,
} from "@aleksandar381radosavljevic/osnova-react";
import { useState } from "react";
import { AssistantPromo } from "@/components/public/AssistantPromo/AssistantPromo";
import { BackLink } from "@/components/public/BackLink/BackLink";
import { CheckCard } from "@/components/public/CheckCard/CheckCard";
import { PhaseIndicator } from "@/components/public/PhaseIndicator/PhaseIndicator";
import { VisuallyHidden } from "@/components/public/VisuallyHidden/VisuallyHidden";
import {
  countDone,
  nextStep,
  pendingDependencies,
} from "@/lib/checklist/progress";
import { statusOf, type ChecklistStatus } from "@/lib/checklist/storage";
import type { CategoryTone } from "@/lib/domain/categories";
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
export function ChecklistView({
  lifeEvent,
  tone,
}: {
  lifeEvent: LifeEventDetail;
  /** The category's tone, as on the life event page (ADR 0020). */
  tone: CategoryTone;
}) {
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

  const ordered = phases.flatMap((phase) => phase.procedures);
  const next = nextStep(ordered, status);

  return (
    <div className={`${styles.root} ${styles[tone]}`}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <BackLink href={`/dogadjaj/${lifeEvent.slug}`}>
              {lifeEvent.title}
            </BackLink>
            <h1 className={styles.title}>
              <span className={styles.eyebrow}>
                {copy.eyebrow}
                <VisuallyHidden>:</VisuallyHidden>
              </span>{" "}
              <span className={styles.titleText}>{lifeEvent.title}</span>
            </h1>
          </div>
        </div>
      </header>

      <p role="status">
        <VisuallyHidden>{announcement}</VisuallyHidden>
      </p>

      <div className={styles.body}>
        <section aria-labelledby="napredak" className={styles.progress}>
          <h2 id="napredak" className={styles.progressTitle}>
            {labels.lifeEvent.progressTitle}
          </h2>
          <ProgressBar
            value={done}
            max={total}
            label={
              <span className={styles.count}>
                <span className={styles.countDone}>{done}</span>
                {format(copy.progressRest, { total })}
              </span>
            }
          />
          {next ? (
            // One link, "Sledeće" included, so its name differs from the card's.
            <a href={`#${stepId(next.slug)}`} className={styles.next}>
              <span className={styles.nextLabel}>
                {copy.next}
                <VisuallyHidden>:</VisuallyHidden>
              </span>{" "}
              <span className={styles.nextTitle}>{next.title}</span>
            </a>
          ) : (
            <p className={styles.allDone}>{copy.allDone}</p>
          )}
          {isHydrated && !isPersistent ? (
            <Banner tone="warning">{copy.storageBlocked}</Banner>
          ) : (
            <p className={styles.storage}>
              <Icon name="info" size={16} className={styles.storageIcon} />
              <span>
                {copy.storageInfo} {copy.storageInfoMore}
              </span>
            </p>
          )}
        </section>
        <div className={styles.phases}>
          <PhaseIndicator
            aria-label={labels.lifeEvent.phases}
            tone={tone}
            currentPhase={findCurrentPhase(
              phases,
              (id) => status(id) === "done",
            )}
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
                      id={stepId(procedure.slug)}
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
                        changeStatus(
                          procedure.procedure_id,
                          procedure.title,
                          next,
                        )
                      }
                    />
                  ))}
                </ul>
              ),
            }))}
          />

          <Button
            variant="ghost"
            disabled={!isHydrated}
            onClick={() => setResetOpen(true)}
          >
            {copy.reset}
          </Button>
        </div>
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

      <AssistantPromo />
    </div>
  );
}

/** Anchor of a procedure's card, the target of the "Sledeće" link. */
function stepId(slug: string) {
  return `korak-${slug}`;
}
