import type { ReactNode } from "react";
import styles from "./EventArt.module.css";

// In-house illustrations, one per life-event icon name (ADR 0020). Keyed by
// the same names as the icon registry, so the admin's icon choice also picks
// the artwork and no life event is named in code. Shapes only: colors come
// from theme tokens through the classes in EventArt.module.css.

const s = styles;

const arts: Record<string, ReactNode> = {
  "id-card": (
    <>
      <rect x="50" y="26" width="140" height="92" rx="12" className={s.paper} />
      <path
        d="M62 26h116a12 12 0 0 1 12 12v10H50V38a12 12 0 0 1 12-12z"
        className={s.c4}
      />
      <rect x="64" y="60" width="38" height="46" rx="6" className={s.c1} />
      <circle cx="83" cy="77" r="9" className={s.paper} />
      <path d="M69 104c2-9 8-14 14-14s12 5 14 14z" className={s.paper} />
      <rect x="114" y="64" width="62" height="8" rx="4" className={s.line} />
      <rect x="114" y="80" width="46" height="8" rx="4" className={s.line} />
      <rect x="114" y="96" width="54" height="8" rx="4" className={s.line} />
      <circle cx="192" cy="112" r="18" className={s.c3} />
      <path
        d="M192 103v9l6 4"
        className={`${s.stroke} ${s.sInk}`}
        strokeWidth="3"
      />
    </>
  ),
  plane: (
    <>
      <path
        d="M30 120c40-50 90-70 150-60"
        className={`${s.stroke} ${s.sC1} ${s.dashed}`}
        strokeWidth="3"
      />
      <g transform="translate(70 30) rotate(-8)">
        <rect width="74" height="98" rx="10" className={s.d4} />
        <circle
          cx="37"
          cy="40"
          r="17"
          className={`${s.stroke} ${s.sC3}`}
          strokeWidth="3.5"
        />
        <path
          d="M20 40h34M37 23c-7 10-7 24 0 34M37 23c7 10 7 24 0 34"
          className={`${s.stroke} ${s.sC3}`}
          strokeWidth="2.5"
        />
        <rect x="19" y="74" width="36" height="6" rx="3" className={s.c3} />
      </g>
      <g transform="translate(176 42) rotate(-20)">
        <path d="M0 10L34 0 24 14 34 28z" className={s.paper} />
      </g>
      <circle cx="190" cy="114" r="10" className={s.paper} />
      <circle cx="204" cy="108" r="14" className={s.paper} />
      <circle cx="218" cy="116" r="9" className={s.paper} />
    </>
  ),
  house: (
    <>
      <path
        d="M78 112c30 20 70 20 96-6"
        className={`${s.stroke} ${s.sC2} ${s.dashed}`}
        strokeWidth="3"
      />
      <g transform="translate(28 46)">
        <rect y="16" width="70" height="56" rx="6" className={s.c3} />
        <path d="M0 16l10-16h50l10 16z" className={s.c3} />
        <rect x="28" y="16" width="14" height="56" className={s.paper} />
      </g>
      <g transform="translate(146 26)">
        <path d="M0 44L36 10l36 34z" className={s.d1} />
        <rect x="8" y="40" width="56" height="50" rx="4" className={s.paper} />
        <rect x="28" y="60" width="16" height="30" rx="3" className={s.d2} />
        <rect x="14" y="52" width="10" height="10" rx="2" className={s.c2} />
        <rect x="48" y="52" width="10" height="10" rx="2" className={s.c2} />
      </g>
    </>
  ),
  baby: (
    <>
      <g transform="translate(60 18)">
        <path d="M10 54a54 54 0 0 1 54-54v54z" className={s.c1} />
        <path d="M10 54h108a54 54 0 0 1-108 0z" className={s.paper} />
        <path
          d="M118 54l18-30h14"
          className={`${s.stroke} ${s.sInk}`}
          strokeWidth="5"
        />
        <circle cx="34" cy="108" r="12" className={s.ink} />
        <circle cx="96" cy="108" r="12" className={s.ink} />
      </g>
      <path
        d="M190 34c-6-8-18-2-12 8l12 12 12-12c6-10-6-16-12-8z"
        className={s.c6}
      />
    </>
  ),
  car: (
    <>
      <path
        d="M20 124h200"
        className={`${s.stroke} ${s.sC4}`}
        strokeWidth="4"
        strokeDasharray="18 12"
      />
      <g transform="translate(44 40)">
        <path
          d="M8 50l18-34c4-8 10-12 20-12h48c10 0 16 4 20 12l18 34z"
          className={s.c6}
        />
        <path d="M36 46l12-26h22v26zM78 46V20h18l12 26z" className={s.paper} />
        <rect y="46" width="140" height="30" rx="12" className={s.c6} />
        <circle cx="34" cy="78" r="15" className={s.ink} />
        <circle cx="108" cy="78" r="15" className={s.ink} />
      </g>
      <g transform="translate(184 16) rotate(25)">
        <circle
          cx="12"
          cy="12"
          r="11"
          className={`${s.stroke} ${s.sInk}`}
          strokeWidth="5"
        />
        <rect x="20" y="9" width="30" height="7" rx="3" className={s.ink} />
      </g>
    </>
  ),
  "building-2": (
    <>
      <g transform="translate(66 22)">
        <rect y="20" width="110" height="76" rx="12" className={s.c5} />
        <path
          d="M36 20V10a6 6 0 0 1 6-6h26a6 6 0 0 1 6 6v10"
          className={`${s.stroke} ${s.sInk}`}
          strokeWidth="6"
        />
        <rect y="50" width="110" height="10" className={s.d5} />
        <rect x="46" y="44" width="18" height="22" rx="4" className={s.c3} />
      </g>
      <circle cx="44" cy="44" r="10" className={s.c3} />
      <circle cx="200" cy="100" r="7" className={s.c2} />
    </>
  ),
  armchair: (
    <>
      <g transform="translate(62 26)">
        <rect x="16" y="0" width="84" height="56" rx="16" className={s.c5} />
        <rect x="0" y="34" width="26" height="54" rx="12" className={s.d5} />
        <rect x="90" y="34" width="26" height="54" rx="12" className={s.d5} />
        <rect x="20" y="52" width="76" height="26" rx="8" className={s.c5} />
        <rect x="10" y="86" width="8" height="18" rx="3" className={s.ink} />
        <rect x="98" y="86" width="8" height="18" rx="3" className={s.ink} />
      </g>
      <path
        d="M200 40c-6-8-18-2-12 8l12 12 12-12c6-10-6-16-12-8z"
        className={s.c6}
      />
    </>
  ),
  "clipboard-list": (
    <>
      <g transform="translate(76 14) rotate(-4 44 56)">
        <rect width="88" height="112" rx="12" className={s.c3} />
        <rect x="10" y="16" width="68" height="88" rx="6" className={s.paper} />
        <rect x="28" y="4" width="32" height="16" rx="6" className={s.ink} />
        <circle cx="26" cy="42" r="7" className={s.d2} />
        <rect x="40" y="38" width="30" height="8" rx="4" className={s.line} />
        <circle cx="26" cy="64" r="7" className={s.d2} />
        <rect x="40" y="60" width="24" height="8" rx="4" className={s.line} />
        <circle
          cx="26"
          cy="86"
          r="6"
          className={`${s.stroke} ${s.sLine}`}
          strokeWidth="3"
        />
        <rect x="40" y="82" width="28" height="8" rx="4" className={s.line} />
      </g>
      <circle
        cx="190"
        cy="104"
        r="22"
        className={`${s.stroke} ${s.sC1}`}
        strokeWidth="5"
      />
    </>
  ),
  // The assistant (Home's assistant band), not a life event.
  "message-circle": (
    <>
      <path
        d="M40 22h104a16 16 0 0 1 16 16v34a16 16 0 0 1-16 16H76l-22 18v-18H40a16 16 0 0 1-16-16V38a16 16 0 0 1 16-16z"
        className={s.paper}
      />
      <rect x="44" y="44" width="80" height="8" rx="4" className={s.line} />
      <rect x="44" y="60" width="56" height="8" rx="4" className={s.line} />
      <path
        d="M112 64h88a14 14 0 0 1 14 14v26a14 14 0 0 1-14 14h-8v16l-20-16h-60a14 14 0 0 1-14-14V78a14 14 0 0 1 14-14z"
        className={s.c1}
      />
      <circle cx="132" cy="91" r="6" className={s.paper} />
      <circle cx="152" cy="91" r="6" className={s.paper} />
      <circle cx="172" cy="91" r="6" className={s.paper} />
    </>
  ),
};

const FALLBACK = "clipboard-list";

interface EventArtProps {
  /** Icon name from `life_events.icon`; unknown values get the checklist art. */
  icon: string | null;
  className?: string;
}

/** Decorative illustration for a life event; hidden from screen readers. */
export function EventArt({ icon, className }: EventArtProps) {
  const art =
    icon !== null && Object.hasOwn(arts, icon) ? arts[icon] : arts[FALLBACK];
  return (
    <svg
      viewBox="0 0 240 140"
      aria-hidden="true"
      focusable="false"
      className={className ? `${styles.art} ${className}` : styles.art}
    >
      {art}
    </svg>
  );
}
