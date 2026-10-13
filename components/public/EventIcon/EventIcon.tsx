import { Icon } from "@aleksandar381radosavljevic/osnova-react";
import { lifeEventIconName } from "@/lib/icons/registry";
import styles from "./EventIcon.module.css";

interface EventIconProps {
  /** Lucide name from `life_events.icon`; unknown values show `circle-help`. */
  icon: string | null;
  /** 40px in lists, 48px on the life event page (06 §12.3). */
  size?: "md" | "lg";
}

/** Decorative icon tile; the title next to it names the event. */
export function EventIcon({ icon, size = "md" }: EventIconProps) {
  return (
    <span className={`${styles.root} ${styles[size]}`} aria-hidden="true">
      <Icon name={lifeEventIconName(icon)} size={size === "lg" ? 24 : 20} />
    </span>
  );
}
