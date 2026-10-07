# 0005. Keep documents owned by a single procedure

- Status: Accepted
- Date: 2026-10-05

## Context
00 §5.7 and the Word spec 4.10 describe documents created on their own and linked to procedures (a catalog). The schema has `documents.procedure_id` (1:N).

## Options
1. **Catalog** (N:M with `is_required` on the link): one edit updates every procedure.
2. **Per procedure** (current schema): simpler model and admin UI; the same document is repeated and maintained per procedure.

## Decision
Option 2.

## Why
The owner prefers the simpler model for v1.

## Consequences
- 00 §5.7 and the admin flow are reworded: documents are created and edited inside the procedure form.
- Repeated documents (e.g. "Lična karta") can drift between procedures; the admin keeps them consistent by hand.
- Moving to a catalog later is a data migration (deduplicate by name), not a rewrite of the public pages.
