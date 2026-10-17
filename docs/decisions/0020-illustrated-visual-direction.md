# 0020. Illustrated visual direction with in-house SVG illustrations

- Status: Accepted
- Date: 2026-10-16

## Context
The home page (P1) reads like a catalog or an admin list rather than a service that invites people in: the headline is barely larger than the card titles, the area above the fold is a form plus a dense grid, every card has the same weight, several life events share one generic icon, the monospace meta row ("1 procedura · 1 do 2 nedelje") feels like a data table, and the category chips repeat the section headings. The warm palette, the informal "ti" ([ADR 0011](0011-content-and-copy-defaults.md)) and the life-event entry point work and stay.

Reference products: Diia (Ukraine; D&AD 2022, Red Dot) for a friendly government-service look, and LifeSG (Singapore) for services grouped by life event with the most common ones first.

## Options
1. **Warm guide**: keep the current look and rebuild the composition only.
2. **Public service** (GOV.UK style): text and lists, no cards or decoration. Most sober, least inviting.
3. **Illustrated friend**: an illustration per life event and category, a color per category, large display type.

For the illustrations: (a) in-house SVG drawn in code, (b) Open Peeps (CC0) plus in-house scenes, (c) a commissioned illustrator (estimated USD 1,500–7,000 for 10–27 pieces from a local freelancer).

For the design system: keep Osnova and extend it, or build a new design system for this app.

For the top of the home page, three concepts: A, a dotted-paper background with a dashed route through life-event "stops"; B, life events as tilted, taped stickers on a dark background; C, the answer to "Šta ti se dešava?" as a large sentence, with the whole background taking the selected category's color.

## Decision
Option 3 with in-house SVG illustrations (a), chosen by the owner on 2026-10-16. Osnova stays; the gaps go into Osnova.

The top of the home page combines B and C (owner's choice, 2026-10-16): the stickers from B on C's light background. Hovering or focusing a sticker straightens it, shows its duration and "Pokaži korake", and tints the background, the greeting and the word "dešava?" in that category's color. A wave at the bottom leads into the cream of the rest of the page. On small screens the stickers become a horizontally scrolling row.

## Why
The owner wants the app to attract people who land on it by chance; option 3 does that most. In-house SVG works now, takes its colors from theme tokens so contrast stays checkable, and carries no license; the illustration slots stay the same, so a commissioned set can replace it later without layout changes. Osnova is not the problem (the weaknesses are composition and app-level choices), and a second design system for one app would double the maintenance.

## Consequences
- Osnova gains: category color tokens (a soft tint and a deep color per category, each deep color at least 4.5:1 on its tint and on white), a display font token `--font-display` (`ui-rounded` first, then the system stack, so still no web fonts per [ADR 0001](0001-apply-all-ai-instructions-layers.md)), a larger display step in the type scale, and a component for an illustrated tile.
- Illustrations are decorative (`aria-hidden`), live in the app as SVG components, and use only theme tokens for fill colors.
- The category chips on P1 become links to category sections instead of filters; the monospace meta row and the procedure count on cards go away. 06 and 08 (P1) are updated with the implementation.
- New copy in the concept (three trust lines, the assistant example, footer links) is a proposal for the content owner, not part of this decision.
- The color change on hover is decoration, never the only cue: every sticker is a plain link, the selected one also gets an outline in its category color, and motion respects `prefers-reduced-motion`.
- Concept, confirmed by the owner on 2026-10-16: https://claude.ai/artifact/A6rGiMYn7eHu6pD7eLd4yD.
