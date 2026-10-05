# SQL tests

`schema_smoke.sql` checks RLS, audit triggers, dependency and publish rules, the AI tables and search ([ADR 0009](../../docs/decisions/0009-testing-stack.md)). It runs in one transaction, rolls back, prints `PASS: ...` per check and stops at the first `FAIL`.

Against the local Supabase stack (`supabase start`, schema loaded as a migration): `psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f supabase/tests/schema_smoke.sql`

Against a plain PostgreSQL 16 database (no Supabase): `psql -d <db> -v ON_ERROR_STOP=1 -f supabase/tests/bare_postgres_stubs.sql -f docs/01-domain-model.sql -f supabase/tests/schema_smoke.sql` (the stubs create the `anon`/`authenticated`/`service_role` roles and `auth.uid()`/`auth.jwt()`; never run them on Supabase).
