import { Icon } from "@aleksandar381radosavljevic/osnova-react";
import Link from "next/link";
import { labels } from "@/lib/i18n/labels";
import styles from "./CategoryFilter.module.css";

interface CategoryFilterProps {
  categories: readonly { slug: string; name: string }[];
  /** null for "Sve". */
  selectedSlug: string | null;
}

/**
 * Category chips on Home (06 §12.12). Each chip is a link that sets
 * `?kategorija=`, so the filter is shareable and works without JavaScript.
 * The selected chip is marked with `aria-current` (valid on links, unlike
 * `aria-pressed`) and a check icon, so the state is not color-only.
 */
export function CategoryFilter({
  categories,
  selectedSlug,
}: CategoryFilterProps) {
  const chips = [
    {
      key: "",
      name: labels.home.allCategories,
      href: "/",
      isSelected: selectedSlug === null,
    },
    ...categories.map((c) => ({
      key: c.slug,
      name: c.name,
      href: `/?kategorija=${encodeURIComponent(c.slug)}`,
      isSelected: c.slug === selectedSlug,
    })),
  ];

  return (
    <ul className={styles.root} role="list" aria-label={labels.home.categories}>
      {chips.map((chip) => (
        <li key={chip.key}>
          <Link
            href={chip.href}
            scroll={false}
            className={styles.chip}
            aria-current={chip.isSelected ? "true" : undefined}
          >
            {chip.isSelected && <Icon name="check" size={16} />}
            {chip.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
