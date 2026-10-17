import { LifeEventCard } from "@/components/public/LifeEventCard/LifeEventCard";
import {
  categorySectionId,
  categoryTone,
  type CategoryGroup,
} from "@/lib/domain/categories";
import { labels } from "@/lib/i18n/labels";
import type { Category, LifeEventSummary } from "@/lib/services/schemas";
import styles from "./LifeEventCatalog.module.css";

interface LifeEventCatalogProps {
  /** Every non-empty category with its life events, in display order. */
  groups: readonly CategoryGroup<Category, LifeEventSummary>[];
}

/**
 * Every life event, in a tinted block per category, with a row of area links
 * that jump to the blocks (08 P1, ADR 0020). Links, not a filter: the whole
 * catalog stays on the page and works without JavaScript.
 */
export function LifeEventCatalog({ groups }: LifeEventCatalogProps) {
  return (
    <section aria-labelledby="sve-situacije" className={styles.root}>
      <div className={styles.header}>
        <h2 id="sve-situacije" className={styles.title}>
          {labels.home.allEvents}
        </h2>
        <nav aria-label={labels.home.areas}>
          <ul className={styles.areas} role="list">
            {groups.map(({ category }, index) => (
              <li key={category.id}>
                <a
                  href={`#${categorySectionId(category.slug)}`}
                  className={`${styles.area} ${styles[categoryTone(index)]}`}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  {category.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      {groups.map(({ category, lifeEvents }, index) => (
        <section
          key={category.id}
          id={categorySectionId(category.slug)}
          // Focusable so the area link moves focus here, not only the view.
          tabIndex={-1}
          className={`${styles.group} ${styles[categoryTone(index)]}`}
          aria-labelledby={`${categorySectionId(category.slug)}-naslov`}
        >
          <h3
            id={`${categorySectionId(category.slug)}-naslov`}
            className={styles.groupTitle}
          >
            {category.name}
          </h3>
          <ul className={styles.list} role="list">
            {lifeEvents.map((lifeEvent) => (
              <LifeEventCard
                key={lifeEvent.id}
                lifeEvent={lifeEvent}
                headingLevel={4}
              />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
