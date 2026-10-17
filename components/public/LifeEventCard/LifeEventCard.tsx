import { Card, CardLink, Icon } from "@aleksandar381radosavljevic/osnova-react";
import { EventIcon } from "@/components/public/EventIcon/EventIcon";
import type { LifeEventSummary } from "@/lib/services/schemas";
import styles from "./LifeEventCard.module.css";

interface LifeEventCardProps {
  lifeEvent: Pick<
    LifeEventSummary,
    "slug" | "title" | "icon" | "estimated_duration"
  >;
  /** Must fit the page outline. @default 3 */
  headingLevel?: 3 | 4;
}

/**
 * Link card for a life event, rendered as a list item (06 §12.4). Only the
 * duration goes under the title: the procedure count read as admin data, not
 * as something a citizen decides by (ADR 0020).
 */
export function LifeEventCard({
  lifeEvent,
  headingLevel = 3,
}: LifeEventCardProps) {
  const Heading = headingLevel === 3 ? "h3" : "h4";

  return (
    <Card as="li" padding="compact" className={styles.root}>
      <EventIcon icon={lifeEvent.icon} />
      <div className={styles.text}>
        <Heading className={styles.title}>
          <CardLink href={`/dogadjaj/${lifeEvent.slug}`}>
            {lifeEvent.title}
          </CardLink>
        </Heading>
        {lifeEvent.estimated_duration && (
          <p className={styles.meta}>{lifeEvent.estimated_duration}</p>
        )}
      </div>
      <Icon name="chevron-right" className={styles.chevron} />
    </Card>
  );
}
