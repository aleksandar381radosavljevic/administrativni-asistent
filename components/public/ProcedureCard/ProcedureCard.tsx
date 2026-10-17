import {
  Badge,
  Card,
  CardLink,
  Icon,
} from "@aleksandar381radosavljevic/osnova-react";
import { ChecklistStatusBadge } from "@/components/public/ChecklistStatusBadge/ChecklistStatusBadge";
import { formatCost, procedureMethods } from "@/lib/i18n/display";
import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { ProcedureInEvent } from "@/lib/services/schemas";
import styles from "./ProcedureCard.module.css";

const methodTone = {
  can_online: "success",
  can_in_person: "accent",
  can_by_mail: "attention",
} as const;

interface ProcedureCardProps {
  procedure: ProcedureInEvent;
  href: string;
  /** Titles of the procedures this one depends on, in this life event. */
  dependsOn: readonly string[];
}

/** Link card for a procedure inside a life event, rendered as a list item (06 §12.7). */
export function ProcedureCard({
  procedure,
  href,
  dependsOn,
}: ProcedureCardProps) {
  const institutions = procedure.institutions.map((i) => i.name).join(", ");

  return (
    <Card as="li" padding="compact" className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <CardLink href={href}>{procedure.title}</CardLink>
        </h3>
        <Icon name="chevron-right" className={styles.chevron} />
      </div>
      <ul className={styles.facts} role="list">
        {institutions && (
          <li>
            <Icon name="building-2" size={16} className={styles.factIcon} />
            {institutions}
          </li>
        )}
        {procedure.processing_time && (
          <li>
            <Icon name="clock" size={16} className={styles.factIcon} />
            {procedure.processing_time}
          </li>
        )}
        <li>
          <Icon name="banknote" size={16} className={styles.factIcon} />
          {formatCost(procedure.cost_type, procedure.cost_amount)}
        </li>
      </ul>
      <ul className={styles.badges} role="list">
        {procedureMethods(procedure).map((method) => (
          <li key={method}>
            <Badge tone={methodTone[method]}>{labels.methods[method]}</Badge>
          </li>
        ))}
      </ul>
      {dependsOn.length > 0 && (
        <p className={styles.caption}>
          {format(labels.lifeEvent.dependsOn, { titles: dependsOn.join(", ") })}
        </p>
      )}
      <div className={styles.status}>
        {procedure.is_stale && (
          <Badge tone="attention" icon="triangle-alert">
            {labels.lifeEvent.stale}
          </Badge>
        )}
        <ChecklistStatusBadge procedureId={procedure.procedure_id} />
      </div>
    </Card>
  );
}
