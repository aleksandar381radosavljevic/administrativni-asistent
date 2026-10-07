# 0001. Apply all ai-instructions layers to this project

- Status: Accepted
- Date: 2026-10-05

## Context
The original docs (04, 06) chose Tailwind, shadcn/ui and three Google web fonts, and put WCAG out of scope. The shared ai-instructions rules (core, stacks/react, design/osnova) require CSS Modules, Osnova components, the system font stack and WCAG AA contrast. The existing code uses Tailwind 3, which would need a rewrite to v4 anyway. Measured contrast of the current palette: most colored text is 2.5–3.2:1 (AA needs 4.5:1).

## Options
1. **All layers** (core, stacks/react, design/osnova): one standard across projects; UI work depends on Osnova existing (see 0011).
2. **Core only**, keep Tailwind/shadcn with a recorded deviation: fastest, but diverges from the owner's standard.
3. **Core + stacks/react without Osnova**: rules discipline without the Osnova dependency.

## Decision
Option 1. `.ai-instructions.json` lists `core`, `stacks/react`, `design/osnova`.

## Why
The owner wants one way of building UI across projects, and this project is the first real consumer that shapes Osnova.

## Consequences
- Tailwind, shadcn/ui and Google Fonts are removed; styling is CSS Modules with design tokens only.
- WCAG AA contrast and keyboard access are in scope for v1 (supersedes "WCAG out of scope" in 00 §11 and 06 §1). Palette tokens must be corrected: dark variants for text, soft variants stay for backgrounds.
- Plus Jakarta Sans, Inter and JetBrains Mono are dropped in favor of the system font stack.
- Project docs move to English (ai-instructions decision 0005); UI copy stays Serbian.
- ADRs live in `docs/decisions/`; the ADR-01..08 sections inside 04 and 09 are replaced by these files.
