# 0015. Seed data is test-only

- Status: Accepted
- Date: 2026-10-06

## Context
The prototype ships `seed-data.json` with life events and procedures whose costs, deadlines and addresses are invented or unverified. The first vertical slice needs realistic content.

## Options
1. **Test-only seed**: adapt it to the new schema, mark it fictional, use it locally, in CI and on staging.
2. Verify item by item, then load it into production as initial content.
3. Discard it and write a small new seed.

## Decision
Option 1, chosen by the owner on 2026-10-06.

## Why
Tests get realistic content quickly, and no unverified information reaches citizens. Real content is entered through the admin.

## Consequences
- `supabase/seed.sql` is generated from the seed file; every record is marked as test content (for example a `[TEST]` prefix in titles on staging).
- No migration or deploy step loads the seed into production.
