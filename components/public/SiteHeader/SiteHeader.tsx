import { Icon } from "@aleksandar381radosavljevic/osnova-react";
import Link from "next/link";
import { labels } from "@/lib/i18n/labels";
import styles from "./SiteHeader.module.css";

export const MAIN_CONTENT_ID = "sadrzaj";

/** Skip link, app name and the assistant link (08 §0.6). */
export function SiteHeader() {
  return (
    <>
      <a className={styles.skipLink} href={`#${MAIN_CONTENT_ID}`}>
        {labels.layout.skipToContent}
      </a>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link className={styles.appName} href="/">
            {labels.layout.appName}
          </Link>
          <nav aria-label={labels.layout.mainNavigation}>
            <Link className={styles.navLink} href="/ai">
              <Icon name="message-circle" />
              {/* The short label replaces the long one on narrow screens; both are real text. */}
              <span className={styles.longLabel}>
                {labels.layout.askAssistant}
              </span>
              <span className={styles.shortLabel}>
                {labels.layout.askAssistantShort}
              </span>
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
