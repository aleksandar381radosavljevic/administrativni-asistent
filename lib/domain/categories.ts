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

/**
 * The selected category from `?kategorija=`, or null for "Sve". An unknown
 * slug, a repeated parameter or an empty value is treated as "Sve" (08 P1).
 */
export function selectedCategory<C extends CategoryLike>(
  groups: readonly CategoryGroup<C, LifeEventLike>[],
  param: string | string[] | undefined,
): C | null {
  if (typeof param !== "string") return null;
  return groups.find((g) => g.category.slug === param)?.category ?? null;
}
