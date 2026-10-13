import type {
  IconName,
  IconRegistry,
} from "@aleksandar381radosavljevic/osnova-react";
import {
  Armchair,
  ArrowLeft,
  Baby,
  Banknote,
  Building2,
  Car,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock,
  ExternalLink,
  House,
  IdCard,
  ListChecks,
  Lock,
  MessageCircle,
  Plane,
  RotateCw,
  Search,
} from "lucide-react";

// Every icon the app renders by name (Osnova rule: one registry, no dynamic
// imports). Osnova registers its own icons (check, x, info, triangle-alert,
// the spinner) itself.

/**
 * Icons a life event can use (06 §10.2). The admin picks from this list, so a
 * stored name always renders; anything else falls back to `circle-help`.
 */
export const lifeEventIcons = {
  house: House,
  "clipboard-list": ClipboardList,
  "id-card": IdCard,
  plane: Plane,
  car: Car,
  baby: Baby,
  "building-2": Building2,
  armchair: Armchair,
} satisfies IconRegistry;

/** UI icons used by the public screens (06 §10.1). */
const uiIcons = {
  "arrow-left": ArrowLeft,
  banknote: Banknote,
  "chevron-right": ChevronRight,
  "circle-help": CircleHelp,
  clock: Clock,
  "external-link": ExternalLink,
  "list-checks": ListChecks,
  lock: Lock,
  "message-circle": MessageCircle,
  "rotate-cw": RotateCw,
  search: Search,
} satisfies IconRegistry;

export const appIcons: IconRegistry = { ...uiIcons, ...lifeEventIcons };

export const FALLBACK_ICON = "circle-help" satisfies IconName;

/**
 * Narrows an icon name from the database to a registered one. Unknown or
 * empty values fall back to `circle-help`, so a typo never breaks a page.
 */
export function lifeEventIconName(value: string | null): IconName {
  return value !== null && Object.hasOwn(lifeEventIcons, value)
    ? (value as keyof typeof lifeEventIcons)
    : FALLBACK_ICON;
}
