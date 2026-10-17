import { Icon } from "@aleksandar381radosavljevic/osnova-react";
import { labels } from "@/lib/i18n/labels";
import styles from "./TrustStrip.module.css";

/** Three short promises under the hero (ADR 0020; copy approved 2026-10-16). */
export function TrustStrip() {
  return (
    <section aria-labelledby="kako-radimo" className={styles.root}>
      <h2 id="kako-radimo" className={styles.heading}>
        {labels.home.trustTitle}
      </h2>
      <ul className={styles.list} role="list">
        {labels.home.trust.map((item, index) => (
          <li key={item.title} className={styles.item}>
            <span
              className={`${styles.bubble} ${styles[`tone${String(index + 1)}`]}`}
              aria-hidden="true"
            >
              <Icon name={item.icon} size={20} />
            </span>
            <p>
              <strong>{item.title}</strong> {item.text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
