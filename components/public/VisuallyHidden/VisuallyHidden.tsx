import type { ReactNode } from "react";
import styles from "./VisuallyHidden.module.css";

/** Text for screen readers only, for example a term that the icon shows visually. */
export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className={styles.root}>{children}</span>;
}
