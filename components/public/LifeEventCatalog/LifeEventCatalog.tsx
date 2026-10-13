import { CategoryFilter } from "@/components/public/CategoryFilter/CategoryFilter";
import { LifeEventCard } from "@/components/public/LifeEventCard/LifeEventCard";
import { SectionLabel } from "@/components/public/SectionLabel/SectionLabel";
import { VisuallyHidden } from "@/components/public/VisuallyHidden/VisuallyHidden";
import type { CategoryGroup } from "@/lib/domain/categories";
import { pluralize } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { Category, LifeEventSummary } from "@/lib/services/schemas";
import styles from "./LifeEventCatalog.module.css";

interface LifeEventCatalogProps {
  /** Every non-empty category with its life events, in display order. */
  groups: readonly CategoryGroup<Category, LifeEventSummary>[];
  /** The `?kategorija=` filter; null shows every category. */
  selected: Category | null;
}

/** Category chips and the life events grouped by category (08 P1). */
export function LifeEventCatalog({ groups, selected }: LifeEventCatalogProps) {
  const shown = selected
    ? groups.filter((g) => g.category.id === selected.id)
    : groups;
  const count = shown.reduce((sum, g) => sum + g.lifeEvents.length, 0);

  return (
    <div className={styles.root}>
      <CategoryFilter
        categories={groups.map((g) => g.category)}
        selectedSlug={selected?.slug ?? null}
      />
      {/* Announces the new count when a chip changes the filter. */}
      <p role="status">
        <VisuallyHidden>
          {pluralize(labels.home.shownCount, count)}
        </VisuallyHidden>
      </p>
      {shown.map(({ category, lifeEvents }) => (
        <section
          key={category.id}
          className={styles.group}
          aria-labelledby={`kategorija-${category.slug}`}
        >
          <SectionLabel id={`kategorija-${category.slug}`}>
            {category.name}
          </SectionLabel>
          <ul className={styles.list} role="list">
            {lifeEvents.map((lifeEvent) => (
              <LifeEventCard key={lifeEvent.id} lifeEvent={lifeEvent} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
