import {
  Icon,
  IllustratedCard,
} from "@aleksandar381radosavljevic/osnova-react";
import { EventArt } from "@/components/public/EventArt/EventArt";
import type { CategoryTone } from "@/lib/domain/categories";
import { labels } from "@/lib/i18n/labels";
import type { LifeEventSummary } from "@/lib/services/schemas";
import styles from "./FeaturedStickers.module.css";

// A fixed tilt per position, so the pile looks hand-placed but renders the
// same on the server and the client.
const TILTS = [-6, 5, 4, -4] as const;

interface FeaturedStickersProps {
  items: readonly {
    lifeEvent: Pick<
      LifeEventSummary,
      "id" | "slug" | "title" | "icon" | "estimated_duration"
    >;
    tone: CategoryTone;
  }[];
}

/**
 * Home's featured life events as tilted stickers (ADR 0020). Each item
 * carries `data-tone`, which HomeHero reads to recolor its field.
 */
export function FeaturedStickers({ items }: FeaturedStickersProps) {
  return (
    <section aria-labelledby="izdvojeno" className={styles.root}>
      <h2 id="izdvojeno" className={styles.heading}>
        {labels.home.featured}
      </h2>
      <ul className={styles.pile} role="list">
        {items.map(({ lifeEvent, tone }, index) => (
          <li key={lifeEvent.id} data-tone={tone} className={styles.item}>
            <IllustratedCard
              variant="sticker"
              tilt={TILTS[index % TILTS.length]}
              tone={tone}
              href={`/dogadjaj/${lifeEvent.slug}`}
              title={lifeEvent.title}
              illustration={<EventArt icon={lifeEvent.icon} />}
              meta={
                <span className={styles.meta}>
                  <span>{lifeEvent.estimated_duration}</span>
                  {/* A visual cue only; the link already says where it goes. */}
                  <span className={styles.cue} aria-hidden="true">
                    {labels.home.showSteps}
                    <Icon name="arrow-right" size={16} />
                  </span>
                </span>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
