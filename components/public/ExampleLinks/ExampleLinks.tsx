import Link from "next/link";
import { labels } from "@/lib/i18n/labels";
import type { LifeEventSummary } from "@/lib/services/schemas";
import styles from "./ExampleLinks.module.css";

interface ExampleLinksProps {
  lifeEvents: readonly Pick<LifeEventSummary, "id" | "slug" | "title">[];
}

/** "Na primer: …" under the search: direct links to life events (ADR 0020). */
export function ExampleLinks({ lifeEvents }: ExampleLinksProps) {
  if (lifeEvents.length === 0) return null;
  return (
    <div className={styles.root}>
      <p id="na-primer" className={styles.label}>
        {labels.home.examples}
      </p>
      <ul className={styles.list} role="list" aria-labelledby="na-primer">
        {lifeEvents.map((lifeEvent) => (
          <li key={lifeEvent.id}>
            <Link href={`/dogadjaj/${lifeEvent.slug}`} className={styles.link}>
              {lifeEvent.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
