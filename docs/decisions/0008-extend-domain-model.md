# 0008. Extend the domain model with address, cost type, event duration and organization type

- Status: Accepted
- Date: 2026-10-05

## Context
The mockup and screen specs show data the model lacks: institution address, a total duration per life event ("~2 nedelje"), and non-government parties ("Banka", "Poslodavac"). An empty `cost_amount` is shown as "Besplatno" even when the cost is unknown.

## Options
1. **All four additions.**
2. **Address, cost type and duration only.**
3. **No change**; hide the missing data in the UI.

## Decision
Option 1:
- `institutions.address` (text).
- `procedures.cost_type` enum `free | fixed | variable | unknown`; `cost_amount` is required only for `fixed`.
- `life_events.estimated_duration` (text, entered by the admin; not computed from free-text processing times).
- `institutions` gains `kind` enum `government | bank | employer | other`; the UI calls them organizations.

## Why
All four are visible in the agreed mockup, and a wrong "free" label misleads the citizen, which defeats goal #1 of the product.

## Consequences
- 01 (.md and .sql), 03 and 08 are updated together.
- Branch offices (e.g. MUP police stations) are still one institution in v1; the procedure links to the official office locator. Revisit if users ask.
