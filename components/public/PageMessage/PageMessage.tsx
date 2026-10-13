import { Icon, type IconName } from "@aleksandar381radosavljevic/osnova-react";
import type { ReactNode } from "react";
import styles from "./PageMessage.module.css";

interface PageMessageProps {
  icon: IconName;
  /** `danger` for errors (06 §12.18), `muted` otherwise. */
  tone?: "muted" | "danger";
  title: string;
  description?: string;
  /** The next step; never leave the user on a dead end (ES-06). */
  action: ReactNode;
}

/**
 * A page that is only a message: not found and error pages (08 P8). Like
 * Osnova's EmptyState, but the title is the page's `h1`, which EmptyState
 * (heading levels 2-4) cannot render.
 */
export function PageMessage({
  icon,
  tone = "muted",
  title,
  description,
  action,
}: PageMessageProps) {
  return (
    <div className={styles.root}>
      <span className={styles[tone]}>
        <Icon name={icon} size={24} />
      </span>
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
      <div className={styles.action}>{action}</div>
    </div>
  );
}
