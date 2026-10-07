# Open questions

All open questions left in the docs, deduplicated. Each has a working default, so implementation is not blocked. Settle one by updating the source doc (or writing an ADR) and removing it here.

## Product and content

| # | Question | Current default | Doc |
|---|---|---|---|
| 1 | PR-04: must a life event have a linked **published** procedure to be published? | Yes; events that later lose all visible procedures are hidden | 00 |
| 2 | Keep checklist progress for a procedure removed from an event? | Kept in storage, ignored on display | 02 |
| 3 | Show categories with no public life events? | Hidden | 01 |
| 4 | Is an institution public when no public procedure links to it? | Yes, when published | 01 |
| 5 | Itemized costs (fee plus form)? | Free text in `cost_description` | 01 |
| 6 | Retire or delete categories? | Not possible in v1 (no `status`); create and update only | 03, 08 |
| 7 | Archiving the only organization of a published procedure | Allowed with a warning listing affected procedures | 08 |
| 8 | Synonym target as free text vs a reference to an entity | Free text `maps_to`; A9 "Proveri u pretrazi" link catches breakage | 01, 03, 08 |

## Backend, data and AI

| # | Question | Current default | Doc |
|---|---|---|---|
| 9 | Service role for `ai_rate_limit_hit()` (ADR 0004 names only the insert and scheduled jobs) | Same restricted service-role client in the AI route; confirm or amend ADR 0004 | 04 |
| 10 | AI rate limit size under CGNAT | 10 requests per hashed IP per clock hour, follow-ups count; revisit with real traffic | 01, 03, 04 |
| 11 | AI conversation limits | 20 messages per request, 1000 characters per message | 03 |
| 12 | Model and effort level | Chosen by a 30–50 question eval that still has to be built | 04 |
| 13 | Audit actor for seeds and migrations | `changed_by = NULL` | 01 |
| 14 | Production and staging hostnames | Placeholders until the domain is registered | 03 |
| 15 | Baseline choices (Next.js, Supabase, Postgres FTS, Vercel) as ADR files | Recorded in 04 §2.2 only | 04 |

## Tooling

| # | Question | Current default | Doc |
|---|---|---|---|
| 16 | `package.json` script names | `lint`, `typecheck`, `test`, `test:db`, `test:e2e`, `build` | 05 |
| 17 | Input validation library for route handlers | Undecided (e.g. Zod); needs an explicit decision | 05 |
| 18 | SQL test tool | Plain `psql` scripts as in `supabase/tests/`; pgTAP is the alternative | 05 |
| 19 | `AGENTS.md` does not exist yet | Generate with `npx ai-instructions init`; point it at 07 | 07 |

## UI and design

| # | Question | Current default | Doc |
|---|---|---|---|
| 20 | Osnova token names | This project's proposal; only `theme.css` changes if renamed | 06 |
| 21 | Type scale | Body 16 px, meta 13–14 px; check on a real phone | 06 |
| 22 | Per-document "I have this" checkbox | None | 06 |
| 23 | Admin form controls (Select, Checkbox, Radio group, ConfirmDialog) | Proposed as Osnova's second scope; local stand-ins until then | 06 |
| 24 | Dark theme | Out of scope for v1 | 06 |
| 25 | AI page route | `/ai` (alternative `/asistent`) | 08 |
| 26 | Procedure back link | `?dogadjaj={slug}` query parameter | 08 |
| 27 | AI client timeout | Abort at 25 s, "Još malo…" after 10 s | 08 |
