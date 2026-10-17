import type { ReactNode } from "react";
import type { CategoryTone } from "@/lib/domain/categories";
import { VisuallyHidden } from "@/components/public/VisuallyHidden/VisuallyHidden";
import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import styles from "./PhaseIndicator.module.css";

export interface PhaseIndicatorPhase {
  number: number;
  /** The phase's cards, usually a list. */
  content: ReactNode;
}

interface PhaseIndicatorProps {
  phases: readonly PhaseIndicatorPhase[];
  /** The lowest phase with work left (06 §12.6); null when everything is done. */
  currentPhase: number | null;
  "aria-label"?: string;
  /** Colors the markers with a category's tone (P3); the accent otherwise. */
  tone?: CategoryTone;
}

/**
 * The dependency path of a life event (06 §12.6): an ordered list of phases,
 * each with a numbered marker, a heading and its cards.
 */
export function PhaseIndicator({
  phases,
  currentPhase,
  "aria-label": ariaLabel,
  tone,
}: PhaseIndicatorProps) {
  const className = tone ? `${styles.root} ${styles[tone]}` : styles.root;
  return (
    <ol className={className} role="list" aria-label={ariaLabel}>
      {phases.map((phase) => (
        <li
          key={phase.number}
          className={styles.phase}
          data-current={phase.number === currentPhase || undefined}
        >
          <span className={styles.marker} aria-hidden="true">
            {phase.number}
          </span>
          <div className={styles.body}>
            <h2 className={styles.heading}>
              <span className={styles.title}>
                {format(labels.lifeEvent.phaseTitle, { number: phase.number })}
              </span>
              <VisuallyHidden>,</VisuallyHidden>{" "}
              <span className={styles.subtitle}>
                {phase.number === 1
                  ? labels.lifeEvent.phaseFirst
                  : labels.lifeEvent.phaseLater}
              </span>
            </h2>
            {phase.content}
          </div>
        </li>
      ))}
    </ol>
  );
}
