"use client";

import {
  Banner,
  Icon,
  SegmentedControl,
} from "@aleksandar381radosavljevic/osnova-react";
import Link from "next/link";
import {
  CHECKLIST_STATUSES,
  type ChecklistStatus,
} from "@/lib/checklist/storage";
import { format } from "@/lib/i18n/format";
import { labels } from "@/lib/i18n/labels";
import type { ProcedureInEvent } from "@/lib/services/schemas";
import styles from "./CheckCard.module.css";

const options = CHECKLIST_STATUSES.map((status) => ({
  value: status,
  label: labels.checklist[status],
}));

interface CheckCardProps {
  procedure: Pick<ProcedureInEvent, "title" | "institutions">;
  href: string;
  status: ChecklistStatus;
  /** Titles of dependencies in this event that are not done yet. */
  pendingDependencies: readonly string[];
  /** True until the stored state is applied after hydration (08 P4). */
  disabled: boolean;
  onStatusChange: (status: ChecklistStatus) => void;
}

/**
 * A procedure in the checklist with its status (06 §12.14). A blocked card
 * stays editable (ES-04) and warns once the user starts it anyway (UF-07).
 */
export function CheckCard({
  procedure,
  href,
  status,
  pendingDependencies,
  disabled,
  onStatusChange,
}: CheckCardProps) {
  const isBlocked = pendingDependencies.length > 0;
  const titles = pendingDependencies.join(", ");
  const institutions = procedure.institutions.map((i) => i.name).join(", ");

  return (
    // Not Osnova's Card: the blocked style replaces the card's shadow with a
    // dashed outline, and Osnova components must not be restyled.
    <li className={styles.root} data-blocked={isBlocked || undefined}>
      <div className={styles.main}>
        <span className={styles.marker} aria-hidden="true">
          {isBlocked ? (
            <Icon name="lock" size={20} />
          ) : (
            <span className={styles.circle} data-status={status}>
              {status === "done" && <Icon name="check" size={16} />}
            </span>
          )}
        </span>
        <div className={styles.text}>
          <h3 className={styles.title}>
            <Link className={styles.link} href={href}>
              {procedure.title}
            </Link>
          </h3>
          {institutions && <p className={styles.caption}>{institutions}</p>}
          {isBlocked && (
            <p className={styles.blockedText}>
              {format(labels.checklistPage.blockedBy, { titles })}
            </p>
          )}
        </div>
        <SegmentedControl
          className={styles.status}
          legend={procedure.title}
          legendDisplay="hidden"
          options={options}
          value={status}
          disabled={disabled}
          onChange={(value) => onStatusChange(value as ChecklistStatus)}
        />
      </div>
      {isBlocked && status !== "todo" && (
        <Banner tone="warning">
          {format(labels.checklistPage.blockedWarning, { titles })}
        </Banner>
      )}
    </li>
  );
}
