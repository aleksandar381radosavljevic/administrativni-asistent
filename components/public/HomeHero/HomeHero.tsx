import type { ReactNode } from "react";
import { SearchField } from "@/components/public/SearchField/SearchField";
import { labels } from "@/lib/i18n/labels";
import styles from "./HomeHero.module.css";

interface HomeHeroProps {
  /** The search input's id, for links that point at it. */
  searchInputId: string;
  /** The "Na primer" line under the search; streams in with the catalog. */
  examples: ReactNode;
  /** The featured stickers; streams in with the catalog. */
  featured: ReactNode;
}

/**
 * Top of Home (ADR 0020): headline, search and the featured stickers on a
 * field that takes the color of the hovered or focused sticker's area. The
 * color change is CSS only (`:has()` on each sticker's `data-tone`), so it
 * needs no client state and works before hydration.
 */
export function HomeHero({ searchInputId, examples, featured }: HomeHeroProps) {
  return (
    <div className={styles.hero}>
      <svg
        className={styles.glow}
        viewBox="0 0 1440 960"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="1080" cy="430" r="370" className={styles.glowLarge} />
        <circle cx="1130" cy="470" r="240" className={styles.glowSmall} />
        <circle cx="120" cy="110" r="90" className={styles.glowLarge} />
      </svg>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{labels.home.eyebrow}</p>
          <h1 className={styles.title}>
            {labels.home.titleStart}{" "}
            <span className={styles.accent}>{labels.home.titleAccent}</span>
          </h1>
          <p className={styles.lead}>{labels.home.intro}</p>
          <SearchField id={searchInputId} />
          {examples}
        </div>
        {featured}
      </div>
      <svg
        className={styles.wave}
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 50C200 10 360 90 560 60S900 0 1100 50s240 40 340 0V90H0z" />
      </svg>
    </div>
  );
}
