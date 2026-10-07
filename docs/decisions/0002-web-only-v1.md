# 0002. Ship v1 as a responsive web app only

- Status: Accepted
- Date: 2026-10-05

## Context
00 §11 puts a mobile app out of scope for v1; 08 §9 places React Native in v2.0; 09–11 describe a "v1.5, ready to implement" Expo app with outdated versions (Expo 51, RN 0.73) and invalid code.

## Options
1. **Web only**: one product to finish; mobile docs frozen.
2. **Web and mobile in parallel**: roughly double the work, against an API that does not exist yet.

## Decision
Option 1. 09, 10 and 11 move to `docs/future/` and are not implementation input.

## Why
00 already decided this, and a mobile client needs a stable API first.

## Consequences
- When mobile returns, 09–11 are rewritten against current Expo and the REST API from 0003, not patched.
- Offline-first concerns (11) do not apply to v1 beyond the local checklist.
