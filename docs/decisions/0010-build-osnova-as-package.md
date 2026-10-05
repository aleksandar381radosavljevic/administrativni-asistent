# 0010. Build Osnova as a separate package before the UI

- Status: Accepted
- Date: 2026-10-05

## Context
0001 requires Osnova components, tokens and the `Icon` component. Osnova is not published yet (ai-instructions `rules/design/osnova.md` and decisions 0006–0007 describe it as a future monorepo).

## Options
1. **Use an existing Osnova**: none is published.
2. **Build Osnova as its own package** now, driven by this project's needs.
3. **Build components locally** and extract later.

## Decision
Option 2.

## Why
The owner wants a real shared design system from the start, not a later extraction.

## Consequences
- A separate Osnova repository (monorepo per Osnova decision 0001) is created; this app consumes it with its own theme.
- The first Osnova scope is what this app needs: tokens, Button, Badge, Card, Input, Icon, Banner, Skeleton, EmptyState; app-specific pieces (PhaseIndicator, CheckCard) stay in the app unless a second project needs them.
- Public UI work starts after the first Osnova release; database, API and admin logic do not wait.
- How projects consume Osnova (npm package, git tag) is still open in the ai-instructions README and must be settled when the repository is created.
