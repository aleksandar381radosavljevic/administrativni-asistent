import { Icon, type IconName } from "@aleksandar381radosavljevic/osnova-react";
import { VisuallyHidden } from "@/components/public/VisuallyHidden/VisuallyHidden";
import styles from "./MetaRow.module.css";

export interface MetaRowItem {
  icon: IconName;
  /** Read by screen readers only; the icon shows it visually. */
  term: string;
  value: string;
}

/** Summary strip of a life event (06 §12.5), a `<dl>` so every value has a term. */
export function MetaRow({ items }: { items: readonly MetaRowItem[] }) {
  return (
    <dl className={styles.root}>
      {items.map((item) => (
        <div key={item.term} className={styles.item}>
          <dt>
            <Icon name={item.icon} size={16} />
            <VisuallyHidden>{item.term}</VisuallyHidden>
          </dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
