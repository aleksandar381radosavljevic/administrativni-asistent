# SQL tests

`schema_smoke.sql` checks RLS, audit triggers, dependency and publish rules, the AI tables and search ([ADR 0009](../../docs/decisions/0009-testing-stack.md)). It runs in one transaction, rolls back, prints `PASS: ...` per check and stops at the first `FAIL`. It expects an empty schema (no seed), because it counts rows.

`seed_check.sql` checks the generated test seed (`supabase/seed.sql`, [ADR 0015](../../docs/decisions/0015-seed-data-is-test-only.md)): every record is marked `[TEST]`, published content is visible to anon, search finds it. Read-only.

Run both through `npm run test:db` (see `scripts/test-db.sh`):

- Local Supabase stack (`supabase start`): `npm run test:db -- --supabase`. Resets the database without the seed, runs the smoke test, resets with the seed, runs the seed check.
- Plain PostgreSQL 16 database (no Supabase; CI uses this): `TEST_DB_URL=postgresql://... npm run test:db`. Loads `bare_postgres_stubs.sql`, every file in `supabase/migrations/`, runs the smoke test, then loads the seed and runs the seed check. The stubs create the `anon`/`authenticated`/`service_role` roles and `auth.uid()`/`auth.jwt()`; never run them on Supabase. Roles are cluster-wide, so use a fresh cluster for each run.
