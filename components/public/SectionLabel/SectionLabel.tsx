import type { ComponentPropsWithoutRef } from "react";
import styles from "./SectionLabel.module.css";

interface SectionLabelProps extends ComponentPropsWithoutRef<"h2"> {
  level?: 2 | 3;
}

/** Eyebrow heading for a page section (06 §12.1). Uppercase only in CSS, so it is read normally. */
export function SectionLabel({
  level = 2,
  className,
  ...rest
}: SectionLabelProps) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <Heading
      className={className ? `${styles.root} ${className}` : styles.root}
      {...rest}
    />
  );
}
