import { Icon } from "@aleksandar381radosavljevic/osnova-react";
import Link from "next/link";
import styles from "./BackLink.module.css";

interface BackLinkProps {
  href: string;
  /** The destination's name, for example "Početna" or a category. */
  children: string;
}

/** A real link to a known page, never history.back(), so it works on a direct visit (06 §12.2). */
export function BackLink({ href, children }: BackLinkProps) {
  return (
    <Link className={styles.root} href={href}>
      <Icon name="arrow-left" size={16} />
      {children}
    </Link>
  );
}
