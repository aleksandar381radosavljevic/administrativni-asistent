import { Button } from "@aleksandar381radosavljevic/osnova-react";
import { AssistantPromo } from "@/components/public/AssistantPromo/AssistantPromo";
import { BackLink } from "@/components/public/BackLink/BackLink";
import { ChecklistProgress } from "@/components/public/ChecklistProgress/ChecklistProgress";
import { EventArt } from "@/components/public/EventArt/EventArt";
import { MetaRow, type MetaRowItem } from "@/components/public/MetaRow/MetaRow";
import { PhaseIndicator } from "@/components/public/PhaseIndicator/PhaseIndicator";
import { ProcedureCard } from "@/components/public/ProcedureCard/ProcedureCard";
import { TextLink } from "@/components/public/TextLink/TextLink";
import { categorySectionId, type CategoryTone } from "@/lib/domain/categories";
import { findCurrentPhase, groupIntoPhases } from "@/lib/domain/phases";
import { pluralize } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { LifeEventDetail } from "@/lib/services/schemas";
import styles from "./LifeEventView.module.css";

interface LifeEventViewProps {
  lifeEvent: LifeEventDetail;
  /** The category's tone, the same one Home gives it (ADR 0020). */
  tone: CategoryTone;
}

/** P3: one life event with its procedures grouped into dependency phases (08 P3). */
export function LifeEventView({ lifeEvent, tone }: LifeEventViewProps) {
  const phases = groupIntoPhases(lifeEvent.procedures);
  const titleOf = new Map(
    lifeEvent.procedures.map((p) => [p.procedure_id, p.title]),
  );
  const checklistHref = `/dogadjaj/${lifeEvent.slug}/checklist`;

  const facts: MetaRowItem[] = [
    {
      icon: "list-checks",
      term: labels.lifeEvent.procedureCountTerm,
      value: pluralize(labels.procedureCount, lifeEvent.procedures.length),
    },
  ];
  if (lifeEvent.estimated_duration) {
    facts.push({
      icon: "clock",
      term: labels.lifeEvent.durationTerm,
      value: lifeEvent.estimated_duration,
    });
  }
  // Only a total that is certain: "Besplatno" when every procedure is free.
  if (
    lifeEvent.procedures.length > 0 &&
    lifeEvent.procedures.every((p) => p.cost_type === "free")
  ) {
    facts.push({
      icon: "banknote",
      term: labels.lifeEvent.costTerm,
      value: labels.cost.free,
    });
  }

  return (
    <div className={`${styles.root} ${styles[tone]}`}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <BackLink href={`/#${categorySectionId(lifeEvent.category.slug)}`}>
              {lifeEvent.category.name}
            </BackLink>
            <h1 className={styles.title}>{lifeEvent.title}</h1>
            {lifeEvent.description && (
              <p className={styles.description}>{lifeEvent.description}</p>
            )}
            <MetaRow items={facts} />
            <Button
              href={checklistHref}
              size="lg"
              iconStart="list-checks"
              className={styles.cta}
            >
              {labels.lifeEvent.openChecklist}
            </Button>
          </div>
          <div className={styles.art} aria-hidden="true">
            <EventArt icon={lifeEvent.icon} />
          </div>
        </div>
      </header>

      <div className={styles.body}>
        <section aria-labelledby="napredak" className={styles.progress}>
          <h2 id="napredak" className={styles.progressTitle}>
            {labels.lifeEvent.progressTitle}
          </h2>
          <ChecklistProgress procedures={lifeEvent.procedures} />
          <TextLink href={checklistHref} className={styles.progressLink}>
            {labels.lifeEvent.openChecklist}
          </TextLink>
        </section>

        <div className={styles.phases}>
          <PhaseIndicator
            aria-label={labels.lifeEvent.phases}
            tone={tone}
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

      <AssistantPromo />
    </div>
  );
}
