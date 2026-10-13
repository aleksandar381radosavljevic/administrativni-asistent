import { Button, Card } from "@aleksandar381radosavljevic/osnova-react";
import { BackLink } from "@/components/public/BackLink/BackLink";
import { EventIcon } from "@/components/public/EventIcon/EventIcon";
import { MetaRow, type MetaRowItem } from "@/components/public/MetaRow/MetaRow";
import { PhaseIndicator } from "@/components/public/PhaseIndicator/PhaseIndicator";
import { ProcedureCard } from "@/components/public/ProcedureCard/ProcedureCard";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { findCurrentPhase, groupIntoPhases } from "@/lib/domain/phases";
import { pluralize } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { LifeEventDetail } from "@/lib/services/schemas";
import styles from "./LifeEventView.module.css";

/** P3: one life event with its procedures grouped into dependency phases (08 P3). */
export function LifeEventView({ lifeEvent }: { lifeEvent: LifeEventDetail }) {
  const phases = groupIntoPhases(lifeEvent.procedures);
  const titleOf = new Map(
    lifeEvent.procedures.map((p) => [p.procedure_id, p.title]),
  );
  const meta: MetaRowItem[] = [
    {
      icon: "list-checks",
      term: labels.lifeEvent.procedureCountTerm,
      value: pluralize(labels.procedureCount, lifeEvent.procedures.length),
    },
  ];
  if (lifeEvent.estimated_duration) {
    meta.push({
      icon: "clock",
      term: labels.lifeEvent.durationTerm,
      value: lifeEvent.estimated_duration,
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <BackLink
          href={`/?kategorija=${encodeURIComponent(lifeEvent.category.slug)}`}
        >
          {lifeEvent.category.name}
        </BackLink>
        <div className={styles.titleRow}>
          <EventIcon icon={lifeEvent.icon} size="lg" />
          <h1 className={styles.title}>{lifeEvent.title}</h1>
        </div>
        {lifeEvent.description && (
          <p className={styles.description}>{lifeEvent.description}</p>
        )}
      </div>

      <aside className={styles.aside}>
        <MetaRow items={meta} />
        <Button
          href={`/dogadjaj/${lifeEvent.slug}/checklist`}
          iconStart="list-checks"
          className={styles.checklistButton}
        >
          {labels.lifeEvent.openChecklist}
        </Button>
        <Card
          as="section"
          aria-labelledby="pitanje"
          className={styles.question}
        >
          <h2 id="pitanje" className={styles.questionTitle}>
            {labels.lifeEvent.questionTitle}
          </h2>
          <TextLink href="/ai">{labels.layout.askAssistant}</TextLink>
        </Card>
      </aside>

      <div className={styles.phases}>
        <PhaseIndicator
          aria-label={labels.lifeEvent.phases}
          currentPhase={findCurrentPhase(phases)}
          phases={phases.map((phase) => ({
            number: phase.number,
            content: (
              <ul className={styles.cards} role="list">
                {phase.procedures.map((procedure) => (
                  <ProcedureCard
                    key={procedure.procedure_id}
                    procedure={procedure}
                    href={`/procedura/${procedure.slug}?dogadjaj=${encodeURIComponent(lifeEvent.slug)}`}
                    dependsOn={procedure.depends_on.flatMap(
                      (id) => titleOf.get(id) ?? [],
                    )}
                  />
                ))}
              </ul>
            ),
          }))}
        />
      </div>
    </div>
  );
}
