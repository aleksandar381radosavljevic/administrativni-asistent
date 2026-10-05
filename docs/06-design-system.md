# 06 – Design System

- Version: 2.0
- Date: 2026-10-05
- Supersedes: 06-design-system.md v1.0 (June 2026)
- Related: [ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md), [ADR 0010](decisions/0010-build-osnova-as-package.md), [ADR 0011](decisions/0011-content-and-copy-defaults.md), [08 – Screen specifications](08-screen-specifications.md)

## How to use this document

- This is the project's design layer on top of **Osnova**, the shared design system ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md), [ADR 0010](decisions/0010-build-osnova-as-package.md)). Osnova owns the components and the token contract; this document owns the project theme (the values behind the tokens) and the few project-local components.
- Styling is **CSS Modules only** (`Name.module.css` next to `Name.tsx`), using tokens from §3–§9. No utility-class framework, no third-party component kit, no CSS-in-JS, no hard-coded colors, spacing, radii, shadows or font stacks.
- Build UI from Osnova components first (§11). If something is missing, propose adding it to Osnova with the `new-component` skill instead of building a one-off. App-specific pieces listed in §12 stay in the app until a second project needs them ([ADR 0010](decisions/0010-build-osnova-as-package.md)).
- Change the look only by overriding Osnova tokens in the project theme, `app/theme.css` (§3.5). Never target Osnova's internal class names.
- Icons only through Osnova's `Icon` component, by Lucide icon name (§10).
- System font stacks only; never load web fonts (§4).
- Every color pair you add must be added to the contrast table in §3.3 and re-checked with the script in Appendix A. Nothing ships below WCAG 2.2 AA.
- Visual source: `vizuelni-pravac.html` (mockup). This document keeps its direction and corrects its values; where they differ, this document wins.

---

## 1. Principles

- **Warm and approachable.** The app guides people through bureaucracy like a friend, not like an office. Warmth comes from color and the tone of the copy (informal "ti", [ADR 0011](decisions/0011-content-and-copy-defaults.md)), not from decoration.
- **Color carries meaning, never alone.** Amber = action and in-person, sage = done and online, honey = attention and in progress, rust = error. Every colored state also has a text label or a distinct shape (WCAG 1.4.1).
- **Structure carries information.** Phases and step numbers show order and dependency; they are not ornaments.
- **Calm for dense content.** Cards, spacing and hierarchy do the work; no visual noise on small screens.
- **Accessible by default.** WCAG 2.2 AA is in scope for v1 ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)): contrast, keyboard access, visible focus, 44×44 px touch targets, reduced motion. The audience includes retirees and people under stress on a phone in sunlight.
- **Light theme only in v1.** Tokens are semantic so a dark theme can be added later by overriding values, without touching components.

---

## 2. Relationship to Osnova

| Layer | Owner | What lives there |
|---|---|---|
| Osnova tokens (contract) | Osnova package | Semantic token names (`--color-*`, `--space-*`, `--radius-*`, …) with neutral defaults |
| Osnova components | Osnova package | Button, Badge, Card, Input, Icon, Banner, Skeleton, EmptyState (first scope, [ADR 0010](decisions/0010-build-osnova-as-package.md)) |
| Project theme | This app, `app/theme.css` | Palette primitives (`--aa-*`) and overrides of the Osnova semantic tokens (§3.5) |
| Project-local components | This app, `components/public/` and `components/admin/` | PhaseIndicator, CheckCard and the others in §12, CSS Modules using only semantic tokens |

Rules:

- Project-local components read **semantic tokens** (`--color-text-muted`), not palette primitives (`--aa-ink-muted`). Primitives are only referenced inside `theme.css`. This keeps a future theme change to one file.
- The semantic token names in this document are this project's proposal for Osnova's first token contract. If the first Osnova release names a token differently, `theme.css` maps it; component code does not change. (See Open questions.)
- Public UI work starts after the first Osnova release; database, API and admin logic do not wait ([ADR 0010](decisions/0010-build-osnova-as-package.md)).

---

## 3. Color

### 3.1 Palette primitives

The mockup's palette is kept for surfaces and decoration. Every color that sits **behind or as text, or marks a UI boundary**, uses a darker `-strong` variant so it meets AA. Soft variants stay as backgrounds ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md), consequence 2).

| Primitive | Hex | Allowed use |
|---|---|---|
| `--aa-cream` | `#FBF6ED` | Page background |
| `--aa-paper` | `#FFFFFF` | Card, input, dialog background; text on `-strong` fills |
| `--aa-ink` | `#2B2622` | Primary text, headings |
| `--aa-ink-muted` | `#6B6157` | Secondary text, meta, placeholders (was `#93897C`, 3.19:1 on cream) |
| `--aa-clay` | `#ECE3D3` | Neutral backgrounds: chips, todo badge, skeleton, progress track |
| `--aa-clay-dark` | `#DCD0BB` | Decorative dividers and the inactive phase path line only. Never a component boundary (1.52:1 on paper) |
| `--aa-line-strong` | `#8C8073` | UI boundaries: input, checkbox, status circle, chip and secondary-button borders (new) |
| `--aa-amber` | `#E8743B` | Decorative brand accent only: the active phase path line. Never text, never behind text, never the only cue |
| `--aa-amber-strong` | `#A04617` | Primary action fill, active chip, user chat bubble, links, eyebrow labels, focus ring, progress fill (new) |
| `--aa-amber-strong-hover` | `#8C3C13` | Hover/active of `amber-strong` fills (new) |
| `--aa-amber-soft` | `#FBE4D6` | Background for amber accents (badges, step numbers, event icon tile) |
| `--aa-sage` | `#6F9B7D` | Decorative only (not used for text or state in v1) |
| `--aa-sage-strong` | `#3F6B4E` | Text on sage-soft; "done" status fill (new) |
| `--aa-sage-soft` | `#E3EFE7` | Background for success accents |
| `--aa-honey` | `#F2B544` | Decorative half-fill inside the "in progress" status circle only (its border carries the contrast) |
| `--aa-honey-strong` | `#7A5A12` | Text and icons on honey-soft; "in progress" circle border (replaces mockup `#8A6A1F` 4.42:1 and `#B5851F` 2.90:1) |
| `--aa-honey-soft` | `#FCEFD2` | Background for attention accents (info/warning Banner, "U toku" and "Poštom" badges) |
| `--aa-rust-strong` | `#9E3A33` | Error text and icons, invalid input border, destructive button fill (replaces v1.0 `rust` `#C0524A`, 3.71:1 on rust-soft) |
| `--aa-rust-strong-hover` | `#86302A` | Hover/active of destructive fill |
| `--aa-rust-soft` | `#F7E2DE` | Background for error Banner |

### 3.2 Semantic tokens

Components use only these. Values are set in `theme.css` (§3.5).

| Semantic token | Primitive | Role |
|---|---|---|
| `--color-bg` | cream | Page background |
| `--color-surface` | paper | Cards, inputs, dialogs, AI chat bubble |
| `--color-surface-sunken` | cream | Nested surface inside a card (ChatRelatedCard) |
| `--color-surface-neutral` | clay | Neutral chips, todo badge, skeleton, progress track, disabled fill |
| `--color-text` | ink | Primary text |
| `--color-text-muted` | ink-muted | Secondary text, placeholders |
| `--color-text-on-accent` | paper | Text and icons on accent, success and danger fills |
| `--color-border-subtle` | clay-dark | Decorative dividers only |
| `--color-border` | line-strong | Component boundaries (inputs, checkboxes, chips, secondary buttons) |
| `--color-accent` | amber-strong | Primary button, active chip, user bubble, progress fill |
| `--color-accent-hover` | amber-strong-hover | Hover/active of accent fills |
| `--color-accent-text` | amber-strong | Links, eyebrow labels, accent text on light surfaces |
| `--color-accent-soft` | amber-soft | Accent badge and icon-tile background |
| `--color-accent-decorative` | amber | Active phase path line |
| `--color-success` | sage-strong | Success text, done status fill |
| `--color-success-soft` | sage-soft | Success badge and Banner background |
| `--color-attention` | honey-strong | Attention text, icons, in-progress border |
| `--color-attention-fill` | honey | In-progress half-fill (decorative) |
| `--color-attention-soft` | honey-soft | Info/warning Banner and attention badge background |
| `--color-danger` | rust-strong | Error text, invalid border, destructive fill |
| `--color-danger-hover` | rust-strong-hover | Hover/active of destructive fill |
| `--color-danger-soft` | rust-soft | Error Banner background |
| `--color-focus` | amber-strong | Focus ring |

### 3.3 Contrast table (WCAG 2.2 AA)

Thresholds: 4.5:1 for text (1.4.3), 3:1 for non-text UI components, graphical objects and focus indicators (1.4.11). All text in this system is below the "large text" size (24 px regular / 18.66 px bold) except the `display` style, so 4.5:1 is applied to all text. Ratios are computed with the script in Appendix A (WCAG 2.x relative luminance). Every pair the components in §11–§12 use is listed; a pair not in this table is not allowed until it is added and passes.

| Foreground | Background | Ratio | Needs | Result | Used for |
|---|---|---|---|---|---|
| `ink` #2B2622 | `cream` #FBF6ED | 13.90 | 4.5:1 text | pass | Body text, headings on page background |
| `ink` #2B2622 | `paper` #FFFFFF | 14.97 | 4.5:1 text | pass | Body text in cards, inputs |
| `ink` #2B2622 | `clay` #ECE3D3 | 11.76 | 4.5:1 text | pass | Text on neutral chips, secondary button hover, future-phase marker number |
| `ink` #2B2622 | `amber-soft` #FBE4D6 | 12.24 | 4.5:1 text | pass | Text on amber-soft surfaces (active admin nav item) |
| `ink` #2B2622 | `honey-soft` #FCEFD2 | 13.13 | 4.5:1 text | pass | Banner body text (warning/info) |
| `ink` #2B2622 | `sage-soft` #E3EFE7 | 12.66 | 4.5:1 text | pass | Banner body text (success) |
| `ink` #2B2622 | `rust-soft` #F7E2DE | 12.04 | 4.5:1 text | pass | Banner body text (error) |
| `ink-muted` #6B6157 | `cream` #FBF6ED | 5.62 | 4.5:1 text | pass | Secondary text, back link, meta on page |
| `ink-muted` #6B6157 | `paper` #FFFFFF | 6.05 | 4.5:1 text | pass | Secondary text in cards, input placeholder |
| `ink-muted` #6B6157 | `clay` #ECE3D3 | 4.75 | 4.5:1 text | pass | Badge "Nije počelo", "Opciono" |
| `ink-muted` #6B6157 | `amber-soft` #FBE4D6 | 4.94 | 4.5:1 text | pass | Meta text on amber-soft surfaces |
| `amber-strong` #A04617 | `cream` #FBF6ED | 5.77 | 4.5:1 text | pass | Eyebrow / SectionLabel, links on page |
| `amber-strong` #A04617 | `paper` #FFFFFF | 6.21 | 4.5:1 text | pass | Links and step links inside cards |
| `amber-strong` #A04617 | `amber-soft` #FBE4D6 | 5.08 | 4.5:1 text | pass | Badge "Lično", "Obavezno", step number, active phase badge |
| `amber-strong` #A04617 | `clay` #ECE3D3 | 4.88 | 4.5:1 text | pass | Active-phase label next to clay elements |
| `white` #FFFFFF | `amber-strong` #A04617 | 6.21 | 4.5:1 text | pass | Primary button, active chip, user chat bubble, active phase marker |
| `white` #FFFFFF | `amber-strong-hover` #8C3C13 | 7.58 | 4.5:1 text | pass | Primary button hover/active |
| `sage-strong` #3F6B4E | `sage-soft` #E3EFE7 | 5.19 | 4.5:1 text | pass | Badge "Online", "Završeno"; success Banner title |
| `sage-strong` #3F6B4E | `paper` #FFFFFF | 6.13 | 4.5:1 text | pass | Success text in cards |
| `white` #FFFFFF | `sage-strong` #3F6B4E | 6.13 | 3:1 non-text | pass | Check icon inside the "done" status circle |
| `honey-strong` #7A5A12 | `honey-soft` #FCEFD2 | 5.58 | 4.5:1 text | pass | Badge "Poštom", "U toku"; warning/info banner title and icon |
| `honey-strong` #7A5A12 | `paper` #FFFFFF | 6.37 | 3:1 non-text | pass | "In progress" status circle border |
| `rust-strong` #9E3A33 | `rust-soft` #F7E2DE | 5.44 | 4.5:1 text | pass | Error banner text and icon |
| `rust-strong` #9E3A33 | `paper` #FFFFFF | 6.76 | 4.5:1 text | pass | Field error message, error icon in ErrorState |
| `rust-strong` #9E3A33 | `cream` #FBF6ED | 6.28 | 4.5:1 text | pass | Field error message on page background |
| `white` #FFFFFF | `rust-strong` #9E3A33 | 6.76 | 4.5:1 text | pass | Destructive button (admin "Arhiviraj") |
| `white` #FFFFFF | `rust-strong-hover` #86302A | 8.50 | 4.5:1 text | pass | Destructive button hover/active |
| `amber-strong` #A04617 | `cream` #FBF6ED | 5.77 | 3:1 non-text | pass | Focus ring (2px) on page background |
| `amber-strong` #A04617 | `paper` #FFFFFF | 6.21 | 3:1 non-text | pass | Focus ring on cards and inputs |
| `amber-strong` #A04617 | `clay` #ECE3D3 | 4.88 | 3:1 non-text | pass | Focus ring on clay surfaces |
| `line-strong` #8C8073 | `paper` #FFFFFF | 3.85 | 3:1 non-text | pass | Input, checkbox and status-circle borders on cards |
| `line-strong` #8C8073 | `cream` #FBF6ED | 3.58 | 3:1 non-text | pass | Input and secondary-button borders on page background |
| `line-strong` #8C8073 | `clay` #ECE3D3 | 3.03 | 3:1 non-text | pass | Chip borders on clay |
| `amber-strong` #A04617 | `clay` #ECE3D3 | 4.88 | 3:1 non-text | pass | Progress bar fill against its track |
| `sage-strong` #3F6B4E | `paper` #FFFFFF | 6.13 | 3:1 non-text | pass | "Done" status circle fill |
| `ink-muted` #6B6157 | `clay` #ECE3D3 | 4.75 | 4.5:1 text | pass | Disabled button and disabled chip label (exceeds the exemption on purpose) |
| `ink` #2B2622 | `cream` #FBF6ED | 13.90 | 4.5:1 text | pass | ChatRelatedCard text inside an AI bubble |
| `ink-muted` #6B6157 | `honey-soft` #FCEFD2 | 5.30 | 4.5:1 text | pass | Secondary text inside a warning Banner |
| `ink-muted` #6B6157 | `rust-soft` #F7E2DE | 4.86 | 4.5:1 text | pass | Secondary text inside an error Banner |
| `rust-strong` #9E3A33 | `paper` #FFFFFF | 6.76 | 3:1 non-text | pass | Invalid input border |

Previous values, measured with the same script, for reference:

| v1.0 pair | Colors | Ratio | Replaced by |
|---|---|---|---|
| amber on amber-soft (badges "Lično", "Obavezno") | `#E8743B` / `#FBE4D6` | 2.46 | amber-strong on amber-soft, 5.08 |
| sage on sage-soft (badges "Online", "Završeno") | `#6F9B7D` / `#E3EFE7` | 2.67 | sage-strong on sage-soft, 5.19 |
| white on amber (primary button, user bubble, active chip) | `#FFFFFF` / `#E8743B` | 3.00 | white on amber-strong, 6.21 |
| ink-muted on cream (secondary text, placeholder) | `#93897C` / `#FBF6ED` | 3.19 | new ink-muted on cream, 5.62 |
| `#8A6A1F` on honey-soft (local-storage note) | `#8A6A1F` / `#FCEFD2` | 4.42 | honey-strong on honey-soft, 5.58 |
| `#B5851F` on honey-soft (badges "Poštom", "U toku") | `#B5851F` / `#FCEFD2` | 2.90 | honey-strong on honey-soft, 5.58 |
| amber on paper (links) | `#E8743B` / `#FFFFFF` | 3.00 | amber-strong on paper, 6.21 |
| amber on cream (eyebrow) | `#E8743B` / `#FBF6ED` | 2.79 | amber-strong on cream, 5.77 |
| ink-muted on clay (todo badge) | `#93897C` / `#ECE3D3` | 2.70 | new ink-muted on clay, 4.75 |
| rust on rust-soft (errors) | `#C0524A` / `#F7E2DE` | 3.71 | rust-strong on rust-soft, 5.44 |
| clay-dark as input/checkbox border on paper | `#DCD0BB` / `#FFFFFF` | 1.52 | line-strong on paper, 3.85 |

### 3.4 Color rules

- Soft colors are backgrounds only. Text and icons on them use the matching `-strong` color.
- `--color-accent-decorative` (amber), sage and honey are never text and never the only carrier of meaning.
- No opacity tricks for states. The v1.0 "blocked" card at 60% opacity dropped its text below AA; states use the tokens above instead.
- Disabled controls use `--color-surface-neutral` with `--color-text-muted` (4.75:1). WCAG exempts disabled controls, but the target audience still needs to read what is unavailable.
- Status is always text plus color plus shape: badges have a label, status circles differ in fill pattern (empty, half, full with a check, lock icon).

### 3.5 Theme file

`app/theme.css`, imported once in the root layout after Osnova's base stylesheet:

```css
:root {
  /* Palette primitives (only referenced in this file) */
  --aa-cream: #fbf6ed;
  --aa-paper: #ffffff;
  --aa-ink: #2b2622;
  --aa-ink-muted: #6b6157;
  --aa-clay: #ece3d3;
  --aa-clay-dark: #dcd0bb;
  --aa-line-strong: #8c8073;
  --aa-amber: #e8743b;
  --aa-amber-strong: #a04617;
  --aa-amber-strong-hover: #8c3c13;
  --aa-amber-soft: #fbe4d6;
  --aa-sage: #6f9b7d;
  --aa-sage-strong: #3f6b4e;
  --aa-sage-soft: #e3efe7;
  --aa-honey: #f2b544;
  --aa-honey-strong: #7a5a12;
  --aa-honey-soft: #fcefd2;
  --aa-rust-strong: #9e3a33;
  --aa-rust-strong-hover: #86302a;
  --aa-rust-soft: #f7e2de;

  /* Osnova semantic tokens, overridden by this theme */
  --color-bg: var(--aa-cream);
  --color-surface: var(--aa-paper);
  --color-surface-sunken: var(--aa-cream);
  --color-surface-neutral: var(--aa-clay);
  --color-text: var(--aa-ink);
  --color-text-muted: var(--aa-ink-muted);
  --color-text-on-accent: var(--aa-paper);
  --color-border-subtle: var(--aa-clay-dark);
  --color-border: var(--aa-line-strong);
  --color-accent: var(--aa-amber-strong);
  --color-accent-hover: var(--aa-amber-strong-hover);
  --color-accent-text: var(--aa-amber-strong);
  --color-accent-soft: var(--aa-amber-soft);
  --color-accent-decorative: var(--aa-amber);
  --color-success: var(--aa-sage-strong);
  --color-success-soft: var(--aa-sage-soft);
  --color-attention: var(--aa-honey-strong);
  --color-attention-fill: var(--aa-honey);
  --color-attention-soft: var(--aa-honey-soft);
  --color-danger: var(--aa-rust-strong);
  --color-danger-hover: var(--aa-rust-strong-hover);
  --color-danger-soft: var(--aa-rust-soft);
  --color-focus: var(--aa-amber-strong);

  color-scheme: light;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
}
```

Typography, spacing, radius, shadow and motion tokens (§4–§8) are set in the same file.

---

## 4. Typography

### 4.1 Font stacks

System fonts only (Osnova rule; [ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)). This removes three web-font downloads from the < 2 s page-load budget, and system UI fonts cover Serbian Latin diacritics (č, ć, š, ž, đ) and Cyrillic on every supported platform.

| Token | Value | Use |
|---|---|---|
| `--font-body` | `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif` | All text, including headings |
| `--font-mono` | `ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, "Liberation Mono", monospace` | Data: prices, durations, dates, counts (keeps the mockup's "official numbers" feel) |

Headings get their character from weight (700–800) and tight letter-spacing, which the system UI fonts support, instead of a separate display font. Data styles also set `font-variant-numeric: tabular-nums` so numbers align.

### 4.2 Type scale

Sizes are in `rem` so text scales with the user's browser setting (1.4.4). The v1.0 scale is raised by one step: 14 px body and 11–12 px meta were too small for the audience, and inputs below 16 px make iOS Safari zoom the page on focus.

| Token | Size | Line height | Weight | Font | Use |
|---|---|---|---|---|---|
| `--text-display` | 1.75rem (28 px) | 1.2 | 800 | body | Page title (h1) |
| `--text-title` | 1.375rem (22 px) | 1.25 | 800 | body | Section titles, smaller page titles (h2) |
| `--text-heading` | 1.125rem (18 px) | 1.3 | 700 | body | Card titles, subheadings (h3) |
| `--text-body` | 1rem (16 px) | 1.55 | 400 / 600 | body | Body text, inputs, buttons |
| `--text-body-sm` | 0.9375rem (15 px) | 1.5 | 400 | body | Descriptions, step text |
| `--text-caption` | 0.875rem (14 px) | 1.4 | 600 | body | Meta: organization name, dependency note, badges |
| `--text-eyebrow` | 0.8125rem (13 px) | 1.3 | 800 | body | SectionLabel, uppercase, `letter-spacing: 0.06em` |
| `--text-data` | 0.875rem (14 px) | 1.4 | 600 | mono | Prices, durations, dates, counts |

Each token is a set: `--text-<name>-size`, `--text-<name>-line`, `--text-<name>-weight`. Long words wrap (`overflow-wrap: anywhere` on titles) so long Serbian compound titles never overflow at 320 px.

---

## 5. Spacing

A 4 px base. Names are steps, not pixels, so they survive a scale change.

| Token | Value | Use |
|---|---|---|
| `--space-1` | 0.25rem (4 px) | Inside badges, icon-to-text gap in compact rows |
| `--space-2` | 0.5rem (8 px) | Between small elements (tags, dot separator), list gaps |
| `--space-3` | 0.75rem (12 px) | Compact card padding (CheckCard, ProcedureCard) |
| `--space-4` | 1rem (16 px) | Standard card padding, page side gutter on phones |
| `--space-5` | 1.25rem (20 px) | Between phases or groups |
| `--space-6` | 1.5rem (24 px) | Between page sections; side gutter from `md` up |
| `--space-8` | 2rem (32 px) | Large vertical gaps (EmptyState) |
| `--space-12` | 3rem (48 px) | Page top/bottom padding on desktop |

---

## 6. Radius

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 6px | Checkboxes, small indicators |
| `--radius-md` | 10px | Icon tiles, step number, Banner, ChatRelatedCard |
| `--radius-lg` | 12px | Cards, inputs, buttons (default) |
| `--radius-xl` | 16px | Dialogs, chat bubbles |
| `--radius-full` | 9999px | Badges, chips, round icon buttons, status circles, progress bar |

---

## 7. Elevation

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgb(43 38 34 / 0.06)` | Default cards |
| `--shadow-md` | `0 2px 8px rgb(43 38 34 / 0.10)` | Sticky chat composer, popovers |
| `--shadow-lg` | `0 8px 24px rgb(43 38 34 / 0.16)` | Dialogs |

Shadows are never the only boundary of an interactive element: inputs, chips and secondary buttons also have a `--color-border` outline (1.4.11). Cards that are links are identified by their title text and chevron, so the shadow may stay their only edge.

---

## 8. Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120ms | Hover and press color changes |
| `--duration-base` | 200ms | Banner and panel enter, chip selection |
| `--duration-slow` | 1200ms | Skeleton pulse cycle |
| `--easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | All transitions |

Rules:

- Only color, opacity and small transforms (≤ 4 px) animate. No parallax, no auto-scrolling carousels.
- Under `@media (prefers-reduced-motion: reduce)` the theme sets every `--duration-*` to `0.01ms`; Skeleton stops pulsing and shows a static fill; the AI "thinking" indicator shows static dots plus the text "Razmišljam…"; `scroll-behavior` is `auto`.
- Nothing flashes more than three times per second (2.3.1).

---

## 9. Layout, touch targets and focus

### 9.1 Breakpoints and layout

Mobile first; the same pages serve every device ([ADR 0002](decisions/0002-web-only-v1.md): responsive web, no native app).

| Token | Min width | Layout change |
|---|---|---|
| (base) | 0 | One column, side gutter `--space-4`, content full width |
| `--bp-md` | 40rem (640 px) | Side gutter `--space-6`; Home event list becomes a 2-column grid |
| `--bp-lg` | 64rem (1024 px) | Two-column detail layouts (main + aside, see 08); admin gets a persistent side navigation |

CSS custom properties cannot be used inside media queries, so the breakpoint values are repeated as literals in `@media` rules and documented here as the single source.

- Reading width: main text columns max `40rem`; page container max `72rem`, centered.
- Reflow: every page works at 320 CSS px wide with no horizontal scrolling of the page (1.4.10). Wide admin tables scroll inside their own container with a visible scrollbar and a caption.
- Text spacing overrides (1.4.12) must not clip text: no fixed heights on text containers.

### 9.2 Touch targets

- Every interactive element is at least **44×44 px** (exceeds 2.5.8's 24 px minimum; the audience includes older users). Small visuals (16 px icons, 24 px status circles, 18 px checkboxes) get padding or a larger hit area so the target is 44 px.
- At least `--space-2` (8 px) between adjacent targets.
- The chat send button is 44 × 44 px.

### 9.3 Focus

- Every interactive element has a visible `:focus-visible` indicator: `outline: 2px solid var(--color-focus); outline-offset: 2px;`. The ring color has ≥ 3:1 against every surface it can sit on (§3.3: 5.77 on cream, 6.21 on paper, 4.88 on clay).
- Never `outline: none` without this replacement.
- Focus is never hidden behind sticky UI (2.4.11): the page sets `scroll-padding-bottom` equal to the sticky chat composer height and `scroll-padding-top` for a sticky header.
- Focus order follows reading order. After client navigation, focus moves to the page `h1` (which has `tabindex="-1"`); a "Preskoči na sadržaj" skip link is the first focusable element on every page.

---

## 10. Iconography

### 10.1 UI icons

Only through Osnova's `Icon` component, by Lucide icon name in kebab-case (the form stored in `categories.icon` and `life_events.icon`, see 01). Sizes: 16 px inline with caption text, 20 px default, 24 px in navigation and empty states.

- Decorative icons (next to a text label) are `aria-hidden`. An icon-only button has an accessible name (`aria-label`, Serbian, e.g. "Pošalji pitanje").
- Icon color follows the text color it sits with; status icons follow §3.2.

| Meaning | Lucide name | Where |
|---|---|---|
| Back | `arrow-left` | BackLink |
| Search | `search` | SearchField |
| Send | `arrow-up` | ChatComposer |
| Done | `check` | CheckCard status, success Banner |
| Blocked by a dependency | `lock` | CheckCard |
| Go to page | `chevron-right` | LifeEventCard, ProcedureCard |
| External link | `external-link` | Official links, forms (with "(otvara se u novom tabu)" visually hidden) |
| Warning | `triangle-alert` | Stale warning, ErrorState, error Banner |
| Info | `info` | Info Banner |
| Address | `map-pin` | InstitutionCard |
| Phone | `phone` | InstitutionCard |
| Email | `mail` | InstitutionCard |
| Website | `globe` | InstitutionCard |
| Working hours, duration | `clock` | InstitutionCard, MetaRow |
| Cost | `banknote` | Procedure meta |
| Procedure count, checklist | `list-checks` | MetaRow, "Otvori checklist" |
| AI assistant | `message-circle` | Header link, AI entry points |
| Close / clear | `x` | Search clear, dialogs |
| Retry | `rotate-cw` | ErrorState |
| Reorder | `chevron-up`, `chevron-down` | Admin sortable lists |

### 10.2 Life event icons

`life_events.icon` holds a Lucide icon name rendered through `Icon`, never an emoji, because (a) the Osnova rule allows icons only through `Icon`, and (b) newer emoji such as 🪪 (Unicode 14) render as empty boxes on older Android and Windows devices. The admin picks the icon from a curated list in the life event form (08, A5); the stored value is the Lucide name (01, 03). Existing emoji values are replaced by hand (about 20 rows).

| Life event | Lucide name |
|---|---|
| Selim se na novu adresu | `house` |
| Prijavljujem boravište | `clipboard-list` |
| Istekla mi je lična karta | `id-card` |
| Istekao mi je pasoš | `plane` |
| Kupujem auto | `car` |
| Upisujem dete u vrtić | `baby` |
| Otvaram firmu | `building-2` |
| Odoh u penziju | `armchair` |

Unknown or empty values fall back to `circle-help`, so a typo never breaks a page. Displayed inside EventIcon (§12).

---

## 11. Osnova components (first scope)

These come from the Osnova package. The props below are what this app needs; if Osnova's released API differs, follow Osnova and update this section. Each component renders the native element and forwards `className`, `ref`, `aria-*` and event props.

### 11.1 Button

Renders `<button>`, or `<a>` when given `href` (navigation must be a link, not a button with a click handler).

| Prop | Values | Default |
|---|---|---|
| `variant` | `primary`, `secondary`, `ghost`, `danger` | `primary` |
| `size` | `md` (min-height 44 px), `lg` (48 px) | `md` |
| `loading` | boolean | `false` |
| `iconStart`, `iconEnd` | Lucide name | none |

- `primary`: `--color-accent` fill, `--color-text-on-accent` text; hover `--color-accent-hover`. Main action ("Pošalji", "Sačuvaj", "Otvori checklist").
- `secondary`: `--color-surface` fill, `--color-text` text, 1 px `--color-border`. Secondary actions ("Pokušaj ponovo").
- `ghost`: transparent, `--color-text` text (was ink-muted), underline on hover. Low-emphasis actions ("Novi razgovor").
- `danger`: `--color-danger` fill, text-on-accent; hover `--color-danger-hover`. Admin "Arhiviraj" only, always behind a confirmation.
- States: hover, active, `:focus-visible` (§9.3), disabled (`disabled` attribute; neutral fill and muted text, §3.4), loading (`aria-busy="true"`, spinner icon, label kept so the name does not change; repeated clicks ignored).
- Tokens: `--radius-lg`, padding `--space-3` / `--space-5`, `--text-body` weight 700.

### 11.2 Badge

Non-interactive pill label. Renders `<span>`. The text is the meaning; color reinforces it.

| `tone` | Background / text | Used for |
|---|---|---|
| `neutral` | surface-neutral / text-muted | "Nije počelo", "Opciono", future phase, "Nacrt" (admin) |
| `accent` | accent-soft / accent-text | "Lično", "Obavezno", active phase |
| `success` | success-soft / success | "Online", "Završeno", "Objavljeno" (admin) |
| `attention` | attention-soft / attention | "Poštom", "U toku", "Zastarelo" (admin) |
| `danger` | danger-soft / danger | "Arhivirano" (admin) |

- Optional `icon` (Lucide name, `aria-hidden`).
- Tokens: `--radius-full`, padding `--space-1` / `--space-2`, `--text-caption` weight 700.
- Status labels are fixed strings: `todo` → "Nije počelo", `in_progress` → "U toku", `done` → "Završeno" (one spelling everywhere).

### 11.3 Card

Container. Renders `<div>` by default, or `<article>`/`<section>` through `as`. A whole-card link is a real `<a>` wrapping the title, with the click area stretched to the card by CSS (no nested interactive elements inside a link).

- `--color-surface`, `--radius-lg`, `--shadow-sm`, padding `--space-3` (compact) or `--space-4` (default) via `padding="compact" | "default"`.
- Link cards: hover raises to `--shadow-md`; focus ring around the whole card.

### 11.4 Input

Text field with built-in label, hint and error. Renders `<label>` + `<input>` (and `<textarea>` with `multiline`).

| Prop | Purpose |
|---|---|
| `label` | Visible label (required; `visuallyHiddenLabel` only for the search field, which has a visible search icon and placeholder) |
| `hint` | Help text, linked with `aria-describedby` |
| `error` | Error text in `--color-danger` with `triangle-alert`, linked with `aria-describedby`; sets `aria-invalid="true"` and a `--color-danger` border |
| `iconStart` | Lucide name (Search) |
| `type`, `inputMode`, `autoComplete` | Native attributes |

- `--color-surface`, 1 px `--color-border` (3.85:1 on paper, 3.58:1 on cream), `--radius-lg`, min-height 44 px, `--text-body` (16 px, prevents iOS zoom).
- Placeholder in `--color-text-muted`; placeholders are examples, never the label.
- `:focus-visible` ring as §9.3.

### 11.5 Icon

`<Icon name="chevron-right" size={20} />`. Renders an inline SVG with `aria-hidden="true"` unless `label` is given, in which case it gets `role="img"` and `aria-label`. Color is `currentColor`.

### 11.6 Banner

Inline message block (replaces v1.0 InfoBanner, the error variant of ErrorState for small errors, and Toast).

| `tone` | Background / text and icon | Default icon | Live region |
|---|---|---|---|
| `info` | attention-soft / text, icon attention | `info` | none (static) |
| `warning` | attention-soft / text, icon attention | `triangle-alert` | none (static) |
| `success` | success-soft / text, icon success | `check` | `role="status"` when shown after an action |
| `error` | danger-soft / text, icon danger | `triangle-alert` | `role="alert"` when shown after an action |

- Optional `title` (bold, tone color), body in `--text-body-sm` `--color-text`, optional action (link or `ghost` Button), optional dismiss (`x`, `aria-label="Zatvori"`).
- Tokens: `--radius-md`, padding `--space-3`.
- Admin save confirmations use a `success` Banner at the top of the form instead of an auto-dismissing Toast: toasts that disappear after ~3 s fail 2.2.1 for slow readers and are easy to miss with a screen reader.

### 11.7 Skeleton

Placeholder while server data streams in (React Suspense fallbacks).

- `--color-surface-neutral`, radius matching the replaced element (`--radius-lg` for cards, `--radius-sm` for text lines).
- Pulse: opacity 0.5 → 1 over `--duration-slow`; static under reduced motion.
- Skeletons are `aria-hidden`; the loading container has `aria-busy="true"` and one visually hidden "Učitavam…" text.

### 11.8 EmptyState

Centered block for "nothing here".

- Props: `icon` (Lucide name, 24 px, `--color-text-muted`), `title` (`--text-heading`), `description` (`--text-body`, `--color-text-muted`), optional `action` (Button `secondary` or a link).
- Vertical padding `--space-8`. Never an empty page (ES-06): there is always a next step.

---

## 12. Project-local components

Built in the app with CSS Modules (`components/public/<Name>/<Name>.tsx` + `<Name>.module.css`; admin pieces in `components/admin/`) from Osnova components and semantic tokens. Each is a candidate for Osnova only when a second project needs it ([ADR 0010](decisions/0010-build-osnova-as-package.md)).

### 12.1 SectionLabel

Eyebrow heading for page sections ("KORACI", "POTREBNA DOKUMENTA", "ORGANIZACIJA"). Renders a real heading (`h2` or `h3`, prop `level`) styled `--text-eyebrow`, `--color-accent-text` (5.77:1 on cream), uppercase via CSS (`text-transform`) so screen readers read the normal-case text.

### 12.2 BackLink

`<a>` with `arrow-left` + label of the destination ("Početna", the life event title). `--text-caption` weight 600, `--color-text-muted`; 44 px tall hit area. Always a real link to a known URL (never `history.back()`), so it works when the page was opened directly.

### 12.3 EventIcon

Icon tile for a life event: 40 px in lists, 48 px on the detail page; `--radius-md`; `--color-accent-soft` background with `--color-accent-text` icon. Decorative (`aria-hidden`); the title next to it names the event. (The mockup's white-on-amber large tile is dropped: 3.00:1 is too close to the limit for a 20 px glyph.)

### 12.4 LifeEventCard (was HomeEventCard)

Link card for a life event on Home, Search results and the institution page.

- EventIcon (40 px) · title (`--text-heading`) + meta line (`--text-data`, `--color-text-muted`: "4 procedure · ~2 nedelje", from `procedure_count` and `life_events.estimated_duration`; the duration part is omitted when empty) · `chevron-right`.
- Card base, compact padding, min-height 64 px.

### 12.5 MetaRow

Summary strip on the life event page: items with an icon and `--text-data` text ("4 procedure", "~2 nedelje"). `--color-surface`, `--radius-lg`, padding `--space-3` / `--space-4`, gap `--space-4`, wraps on narrow screens. Rendered as a `<dl>` so each value has a term ("Broj procedura", "Okvirno trajanje", visually hidden).

### 12.6 PhaseIndicator (signature element)

Shows order and dependency as a path of phases. Used on the life event page and the checklist.

- Structure: an ordered list (`<ol>`) of phases; each phase is a list item with a heading and its cards.
- Path line: 3 px, `--radius-full`, `--color-border-subtle`; the current phase uses `--color-accent-decorative` at 35% opacity (decorative only).
- Marker: 24 px circle with the phase number in `--text-caption` weight 800. Current phase: `--color-accent` fill, text-on-accent (6.21:1). Other phases: `--color-surface-neutral` fill, `--color-text` (11.76:1). (v1.0 had white digits on clay-dark, ~1.5:1.)
- Label: "Faza N" (`--text-caption` weight 800) and a subtitle (`--text-caption` weight 500, `--color-text-muted`):
  - Phase 1: "možeš odmah, paralelno"
  - Phase N > 1: "posle procedura od kojih zavise"

  v1.0 said "kreni kad završiš Fazu 1", which is wrong: a phase-3 procedure may depend on only one earlier procedure, not the whole previous phase. Each card names its own dependencies instead (ProcedureCard, CheckCard).
- "Current phase" = the lowest phase that still has a procedure not marked `done` in the checklist; on the life event page without checklist data it is phase 1.
- Grouping: phase(p) = 1 if p has no dependencies, else 1 + max(phase of its dependencies) (longest path in the dependency graph). Only dependencies on published procedures in this life event count; the API already filters the others out (see 08, life event page).

### 12.7 ProcedureCard

Link card for a procedure inside a life event.

- Title (`--text-heading`) · meta line: organization name (`--text-caption`, `--color-text-muted`) · method Badges ("Online" success, "Lično" accent, "Poštom" attention) · cost (`--text-data`, right-aligned on wide screens, wraps under on narrow).
- If the procedure has dependencies: a line "Zavisi od: {naslov}, {naslov}" (`--text-caption`, `--color-text-muted`).
- If stale: a `warning` Badge "Proveri podatke".
- Cost text follows `procedures.cost_type`: `free` → "Besplatno"; `fixed` → formatted amount, e.g. "1.500 din" (`cost_amount` arrives as a decimal string and is formatted with `Intl.NumberFormat('sr-Latn-RS')`, never parsed into a float for arithmetic); `variable` → "Cena varira"; `unknown` → "Cena nepoznata". Never "Besplatno" for a missing amount ([ADR 0008](decisions/0008-extend-domain-model.md)).

### 12.8 StepCard

One numbered step on the procedure page. Rendered as an item of an `<ol>` so numbering is semantic.

- Left: 28 px square, `--radius-md`, `--color-accent-soft` fill, step number in `--color-accent-text` weight 800 (5.08:1), `aria-hidden` (the list provides the number).
- Right: title (`--text-body` weight 700), description (`--text-body-sm`, `--color-text-muted`), optional link (`--color-accent-text`, underlined, `external-link` icon, opens in a new tab with visually hidden "(otvara se u novom tabu)").

### 12.9 DocumentRow

One required or optional document on the procedure page.

- Name (`--text-body-sm`, grows) + optional note (`--text-caption`, muted) + Badge "Obavezno" (accent) or "Opciono" (neutral).
- No checkbox: nothing looks interactive that is not. A per-document "I have it" checkbox is added only if the owner wants per-document tracking (see Open questions). Rows are a `<ul>` separated by 1 px `--color-border-subtle` (decorative).

### 12.10 InstitutionCard

Organization details on the procedure and institution pages.

- Name (`--text-heading` weight 800) + kind Badge ("Državna institucija", "Banka", "Poslodavac", "Organizacija", from `institutions.kind`, [ADR 0008](decisions/0008-extend-domain-model.md)).
- Info rows as a `<dl>`: icon (16 px, muted, `aria-hidden`) + term (weight 600) + value (`--text-body-sm`): Adresa (`map-pin`, `institutions.address`), Radno vreme (`clock`), Telefon (`phone`, `tel:` link), Email (`mail`, `mailto:` link), Sajt (`globe`, external link). Missing values are omitted, not shown as empty rows.

### 12.11 SearchField

Search form: `<form role="search">` with Osnova `Input` (`type="search"`, `iconStart="search"`, visually hidden label "Pretraži", placeholder "Npr. pasoš, prijava adrese, karton") and a submit Button ("Traži"; icon-only on narrow screens with `aria-label`). Submitting navigates to `/pretraga?q=…` (08). Works without JavaScript.

### 12.12 CategoryFilter (was CategoryChip)

Category filter on Home.

- A group of links or toggle buttons (`aria-pressed`) labelled "Kategorije". Each chip: pill, `--text-caption` weight 700, min-height 44 px, padding `--space-2` / `--space-4`.
- Default: `--color-surface` fill, `--color-text` label, 1 px `--color-border`. Selected: `--color-accent` fill, text-on-accent, plus `aria-pressed="true"` (state is not color-only: the selected chip also shows a `check` icon).
- Wraps onto multiple lines instead of hiding a horizontal scroll without a scrollbar (hidden horizontal scroll hid categories from keyboard and mouse users).

### 12.13 ProgressBar

Checklist progress: native `<progress max={total} value={done}>` styled with CSS, plus visible text "1 / 4 završeno" (`--text-data`). Track `--color-surface-neutral`, fill `--color-accent` (4.88:1 against the track), height 8 px, `--radius-full`. The value is passed as the element's attribute; no inline width styles.

### 12.14 CheckCard

A procedure in the checklist with its status. Replaces the v1.0 one-tap cycle `todo → in-progress → done → todo`, where a stray tap erased "done".

- Layout: status circle (24 px, `aria-hidden`) · title as a link to the procedure page (`--text-body` weight 700) · organization (`--text-caption`, muted) · status control.
- **Status control**: a `<fieldset>` with `<legend>` = procedure title (visually hidden) and three radio buttons rendered as a segmented control: "Nije počelo", "U toku", "Završeno". Each segment ≥ 44 px tall; arrow keys move between options (native radio behavior). One explicit choice per change; nothing cycles.
- Status circle: `todo` empty with 2 px `--color-border`; `in_progress` 2 px `--color-attention` border with left half `--color-attention-fill`; `done` `--color-success` fill with white `check`.
- **Blocked** (a dependency is not `done`): 1.5 px dashed `--color-border` instead of the shadow, `lock` icon in place of the circle, and the text "Zavisi od: {naslov} (još nije završeno)" in `--text-caption` `--color-text`. No opacity reduction. The status control stays enabled (ES-04): choosing "U toku" or "Završeno" on a blocked card shows an inline `warning` Banner under the card, "Ova procedura zavisi od {naslov}, koja još nije završena. Možeš da nastaviš, ali proveri redosled." (UF-07). The Banner disappears when the dependency is marked done.
- Status changes are announced through one polite live region for the page ("Prijava prebivališta: Završeno. 2 / 4 završeno.").

### 12.15 ChatMessage

One message in the AI chat. The conversation is a `role="log"` list.

- `assistant`: `--color-surface`, `--color-text`, left-aligned, `--radius-xl` with a 4 px bottom-left corner, `--shadow-sm`. May contain ChatRelatedCards and a link to the matched life event.
- `user`: `--color-accent` fill, text-on-accent (6.21:1; v1.0 was 3.00), right-aligned, 4 px bottom-right corner.
- `--text-body`, line-height 1.55, max-width 88% (100% under 360 px).
- Pending state: an assistant bubble with three dots and visually hidden "Asistent piše odgovor…"; static under reduced motion.
- Each message has a visually hidden author prefix ("Ti:", "Asistent:") for screen readers.

### 12.16 ChatRelatedCard

Link card for a procedure the assistant used, inside an assistant message. The AI chat response carries only `procedures[{id, slug, title}]` (03), so the card shows the procedure title (`--text-body` weight 700) and a `chevron-right`; details live on the procedure page. `--color-surface-sunken` (cream) background inside the paper bubble, 1 px `--color-border-subtle`, `--radius-md`, min-height 44 px. Links to `/procedura/[slug]`.

### 12.17 ChatComposer (was ChatInputBar)

Sticky composer at the bottom of the chat page.

- `<form>` with an Osnova `Input` (`multiline`, auto-growing to 4 lines, label "Tvoje pitanje", visually hidden) and a 44 px round primary icon Button (`arrow-up`, `aria-label="Pošalji pitanje"`).
- Under the field, always visible, `--text-caption` muted: "Ne upisuj lične podatke (JMBG, broj dokumenta, telefon)." ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
- Character counter appears from 900 / 1000 characters, announced politely.
- Enter sends, Shift+Enter adds a line. Send is disabled while the trimmed message is shorter than 3 characters or a request is pending.
- `--shadow-md`, 1 px `--color-border-subtle` top divider; the page reserves its height with `scroll-padding-bottom` (§9.3). On mobile it stays above the on-screen keyboard (`position: sticky; bottom: 0` inside the scrolling page, not `position: fixed`).

### 12.18 ErrorState

Full-section error: `triangle-alert` (24 px, `--color-danger`) + title (`--text-heading`, `--color-text`) + message (`--text-body`) + Button `secondary` with `rotate-cw` "Pokušaj ponovo". Built from EmptyState's layout with the danger icon; `role="alert"` only when it replaces content after a user action. Small inline errors use Banner `error` instead.

### 12.19 Admin form pieces

The admin needs a Select, Checkbox, Radio group, ConfirmDialog and a sortable list, which are not in Osnova's first scope. They are proposed to Osnova as the second scope (generic, any project needs them). Until that release, admin screens use native `<select>`, `<input type="checkbox">`, `<input type="radio">` and `<dialog>` styled with CSS Modules and tokens in `components/admin/`, and are replaced when Osnova ships them. Sortable lists reorder with "Pomeri gore" / "Pomeri dole" buttons; drag-and-drop, if added, is only an extra (2.5.7).

---

## 13. Accessibility checklist (WCAG 2.2 AA)

Every screen in 08 is checked against this list; Playwright flows ([ADR 0009](decisions/0009-testing-stack.md)) include an automated axe check on each main page.

| Criterion | How this system meets it |
|---|---|
| 1.1.1 Non-text content | Decorative icons `aria-hidden`; icon-only buttons have Serbian labels |
| 1.3.1 Info and relationships | Real headings, lists (`ol` for steps and phases), `dl` for meta, `fieldset`/`legend` for status choice, `label` for every input |
| 1.4.1 Use of color | Every colored state has text and/or shape (§3.4) |
| 1.4.3 / 1.4.11 Contrast | §3.3 table, all pairs pass |
| 1.4.4 / 1.4.10 / 1.4.12 Resize, reflow, text spacing | `rem` type, 320 px layouts, no fixed text heights (§4.2, §9.1) |
| 2.1.1 Keyboard | Native elements; segmented status control is a radio group; reorder via buttons |
| 2.3.3 / reduced motion | §8 |
| 2.4.1 Bypass blocks | "Preskoči na sadržaj" skip link |
| 2.4.3 / 2.4.7 / 2.4.11 Focus order, visible, not obscured | §9.3 |
| 2.5.7 Dragging movements | No drag-only interaction |
| 2.5.8 Target size | 44×44 px (§9.2) |
| 3.1.1 Language of page | `<html lang="sr-Latn">` |
| 3.3.1 / 3.3.3 Error identification and suggestion | Input `error` text tied with `aria-describedby`; admin forms show an error summary linking to each field (08) |
| 4.1.3 Status messages | Polite live regions for checklist changes, search result counts and AI answers; Banner `role="status"`/`alert` after actions |

---

## 14. Voice and copy

- Informal "ti" everywhere, including errors and admin ("Pokušaj ponovo", not "Pokušajte") ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- Latin script in UI and content ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- Short, concrete sentences; say what to do next. No legal language, no blame ("Nismo uspeli da učitamo…", not "Greška 500").
- Gender-inclusive forms where a verb agrees with the user: "Dostigao/la si…".
- Emoji are not used in UI chrome ("Dobar dan 👋" becomes "Dobar dan"): screen readers read them aloud and older devices may not render them.

---

## Open questions

1. **Osnova token names.** The `--color-*`, `--space-*`, `--radius-*`, `--text-*`, `--shadow-*`, `--duration-*` names are this project's proposal for Osnova's first token contract. Confirm or rename when the Osnova repository is created; only `theme.css` changes.
2. **Type scale.** Default: body raised from 14 px to 16 px and meta from 11–12 px to 13–14 px. Confirm against the mockup's density on a real phone.
3. **DocumentRow checkbox.** Default: removed (it was a dead control). If the owner wants "I have this document" ticks, they need their own localStorage field, which [ADR 0011](decisions/0011-content-and-copy-defaults.md) does not cover.
4. **Admin form controls.** Default: Select, Checkbox, Radio group, ConfirmDialog proposed to Osnova as the second scope; native, locally styled stand-ins in `components/admin/` until then.
5. **Dark theme.** Out of scope for v1. The semantic tokens allow it later; it needs its own contrast table.

---

## Changes from v1.0

- Rewritten in English; UI copy stays Serbian (ADR 0001, ai-instructions decision 0005).
- Tailwind config and shadcn variable mapping removed; tokens are CSS custom properties consumed through Osnova and CSS Modules (ADR 0001, ADR 0010).
- Palette corrected for WCAG 2.2 AA: added `-strong` text/fill variants and `line-strong`, darkened `ink-muted`, replaced `#8A6A1F`, `#B5851F` and `rust`; contrast table with computed ratios added (ADR 0001; analysis §8).
- "WCAG out of scope" removed; accessibility checklist, focus, touch-target and reduced-motion rules added (ADR 0001).
- Plus Jakarta Sans, Inter and JetBrains Mono replaced by system font stacks; type scale moved to `rem` and raised for readability and iOS input zoom (Osnova rule; analysis §8).
- Spacing token names no longer tied to Tailwind class names.
- Icons go through Osnova `Icon` with current Lucide names (`triangle-alert` instead of the deprecated `alert-triangle`); life event emoji replaced by Lucide names (Osnova rule; emoji rendering on old devices).
- Components split into Osnova first scope (Button, Badge, Card, Input, Icon, Banner, Skeleton, EmptyState) and project-local components (ADR 0010).
- Checklist one-tap status cycle replaced by an explicit three-option choice; blocked cards no longer use 60% opacity (analysis §8).
- Phase subtitle "kreni kad završiš Fazu 1" corrected; each card names its own dependencies (analysis §8).
- Status labels fixed to "Nije počelo" / "U toku" / "Završeno" and enum `todo | in_progress | done` (ADR 0011).
- Cost display follows `cost_type`; a missing amount is never shown as "Besplatno" (ADR 0008).
- InstitutionCard gains address and organization kind (ADR 0008).
- Toast replaced by Banner with live-region roles (auto-dismiss fails 2.2.1).
- Category chips wrap instead of a horizontal scroll with a hidden scrollbar.
- Chat send button enlarged to 44 px; PII notice added to the composer (ADR 0007).
- Mockup tab bar and bottom-sheet references removed (web only, ADR 0002).

---

## Appendix A. Contrast script

Run with `python3` to reproduce §3.3. Add a row for every new pair.

```python
def luminance(hex_color):
    h = hex_color.lstrip('#')
    def channel(c):
        c = int(c, 16) / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(h[i:i + 2]) for i in (0, 2, 4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast(fg, bg):
    hi, lo = sorted((luminance(fg), luminance(bg)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)

PAIRS = [  # (foreground, background, required ratio)
    ('#2B2622', '#FBF6ED', 4.5),  # ink on cream
    ('#FFFFFF', '#A04617', 4.5),  # text-on-accent on accent
    ('#8C8073', '#FFFFFF', 3.0),  # border on surface
    # ... one line per row of the table in §3.3
]

for fg, bg, need in PAIRS:
    ratio = contrast(fg, bg)
    print(f"{fg} on {bg}: {ratio:.2f} {'pass' if ratio >= need else 'FAIL'}")
```
