import { Card, CardLink, Icon } from "@aleksandar381radosavljevic/osnova-react";
import { EventIcon } from "@/components/public/EventIcon/EventIcon";
import { pluralize } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { LifeEventSummary } from "@/lib/services/schemas";
import styles from "./LifeEventCard.module.css";

interface LifeEventCardProps {
  lifeEvent: Pick<
    LifeEventSummary,
    "slug" | "title" | "icon" | "procedure_count" | "estimated_duration"
  >;
}

/** Link card for a life event, rendered as a list item (06 §12.4). */
export function LifeEventCard({ lifeEvent }: LifeEventCardProps) {
  const meta = [
    pluralize(labels.procedureCount, lifeEvent.procedure_count),
    lifeEvent.estimated_duration,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card as="li" padding="compact" className={styles.root}>
      <EventIcon icon={lifeEvent.icon} />
      <div className={styles.text}>
        <h3 className={styles.title}>
          <CardLink href={`/dogadjaj/${lifeEvent.slug}`}>
            {lifeEvent.title}
          </CardLink>
        </h3>
        <p className={styles.meta}>{meta}</p>
      </div>
      <Icon name="chevron-right" className={styles.chevron} />
    </Card>
  );
}
