import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./TextLink.module.css";

interface TextLinkProps extends Omit<ComponentProps<"a">, "href"> {
  href: string;
}

/**
 * Inline text link in the accent color, underlined so it is not color-only.
 * A same-page fragment (`#id`) renders a plain `<a>`: the browser then moves
 * focus to a focusable target, which the router's hash scroll does not.
 */
export function TextLink({ className, href, ...rest }: TextLinkProps) {
  const classes = className ? `${styles.root} ${className}` : styles.root;
  if (href.startsWith("#")) {
    return <a className={classes} href={href} {...rest} />;
  }
  return <Link className={classes} href={href} {...rest} />;
}
