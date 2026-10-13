import { labels } from "@/lib/i18n/labels";
import styles from "./SiteFooter.module.css";

/** Disclaimer under every public page (08 §0.6). */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <p className={styles.inner}>{labels.layout.disclaimer}</p>
    </footer>
  );
}
