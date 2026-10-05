# 0011. Content and copy defaults

- Status: Proposed
- Date: 2026-10-05

## Context
The docs leave several small product choices open or contradictory.

## Decision
- **Address form**: informal "ti" everywhere, matching the warm tone of the design system (today mixed with "Pokušajte").
- **Script**: UI and content in Latin script; search accepts Cyrillic and text without diacritics (Postgres `serbian` config converts Cyrillic; add `unaccent`).
- **PR-05**: a procedure not linked to any published life event is not shown publicly, including search and direct URLs (the .md version wins over the Word version).
- **Checklist**: tracked per procedure, not per step (the .md wins). One versioned localStorage format: `{ v: 1, items: { [procedureId]: { status, updatedAt } } }` with `todo | in_progress | done`.
- **Routes**: `/dogadjaj/[slug]`, `/procedura/[slug]`, `/institucija/[slug]`, `/dogadjaj/[slug]/checklist`; no catch-all slug at the root.
- **Never-verified procedures** (`last_verified_at` null) show the stale warning.
- **Source of truth**: Markdown in `docs/`; Word and Pages exports are removed.

## Why
Each of these has a reasonable default, and leaving them open would make implementation guess.

## Consequences
- Accepted unless the owner objects; each item can be revisited individually.
