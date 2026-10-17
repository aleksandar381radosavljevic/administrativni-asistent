// Home screen grouping (08 P1): life events by category, in category order.

interface CategoryLike {
  id: string;
  slug: string;
  sort_order: number;
}

interface LifeEventLike {
  category: { id: string };
}

export interface CategoryGroup<
  C extends CategoryLike,
  E extends LifeEventLike,
> {
  category: C;
  lifeEvents: E[];
}

/**
 * Groups life events under their categories, in `categories.sort_order`.
 * Categories without a life event are left out, so a group is never empty;
 * life events keep the order they arrive in (the API sorts them).
 */
export function groupByCategory<
  C extends CategoryLike,
  E extends LifeEventLike,
>(categories: readonly C[], lifeEvents: readonly E[]): CategoryGroup<C, E>[] {
  return [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((category) => ({
      category,
      lifeEvents: lifeEvents.filter((e) => e.category.id === category.id),
    }))
    .filter((group) => group.lifeEvents.length > 0);
}

/** Home's section id for a category: the target of its area link and of P3's back link. */
export function categorySectionId(slug: string): string {
  return `kategorija-${slug}`;
}

/** Osnova's categorical tones, one per category position (ADR 0020). */
export const CATEGORY_TONES = [
  "category-1",
  "category-2",
  "category-3",
  "category-4",
  "category-5",
  "category-6",
] as const;

export type CategoryTone = (typeof CATEGORY_TONES)[number];

/**
 * The tone of the category at `index` in display order. Colors follow
 * position, not identity, so no category is named in code; after six they
 * repeat.
 */
export function categoryTone(index: number): CategoryTone {
  return CATEGORY_TONES[index % CATEGORY_TONES.length] ?? "category-1";
}

/**
 * The tone of one category outside Home (P3, P4): its position among the
 * public categories in display order, the same position Home gives it.
 * `categories` is the public list (RLS keeps only categories with a
 * published life event, as Home's groups do).
 */
export function categoryToneOf(
  categories: readonly CategoryLike[],
  categoryId: string,
): CategoryTone {
  const index = [...categories]
    .sort((a, b) => a.sort_order - b.sort_order)
    .findIndex((c) => c.id === categoryId);
  return categoryTone(Math.max(index, 0));
}

/** How many life events Home features at the top (ADR 0020). */
export const FEATURED_COUNT = 4;

/**
 * Home's featured life events: the first life event of each of the first
 * four categories, each with its category's tone. Derived from the admin's
 * ordering, so nothing is hard-coded (07 rule: content comes from the
 * database).
 */
export function featuredLifeEvents<
  C extends CategoryLike,
  E extends LifeEventLike,
>(
  groups: readonly CategoryGroup<C, E>[],
): { lifeEvent: E; tone: CategoryTone }[] {
  return groups.slice(0, FEATURED_COUNT).flatMap((group, index) => {
    const first = group.lifeEvents[0];
    return first ? [{ lifeEvent: first, tone: categoryTone(index) }] : [];
  });
}

/** How many life events the "Na primer" line under the search links to. */
export const EXAMPLE_COUNT = 4;

/**
 * The life events behind the "Na primer" line: the first ones in catalog
 * order that are not already featured, so the two never repeat each other.
 */
export function exampleLifeEvents<
  C extends CategoryLike,
  E extends LifeEventLike,
>(groups: readonly CategoryGroup<C, E>[]): E[] {
  const featured = new Set(featuredLifeEvents(groups).map((f) => f.lifeEvent));
  return groups
    .flatMap((group) => group.lifeEvents)
    .filter((lifeEvent) => !featured.has(lifeEvent))
    .slice(0, EXAMPLE_COUNT);
}
