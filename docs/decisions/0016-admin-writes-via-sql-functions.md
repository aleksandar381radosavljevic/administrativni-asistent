# 0016. Multi-table admin writes through SQL functions

- Status: Accepted
- Date: 2026-10-09

## Context
Saving a procedure writes the procedure row and its full lists of steps, documents and institution links; setting a life event's procedures replaces a whole list. PostgREST runs every request in its own transaction, so a route handler that issues these writes one by one cannot make them atomic. The deferred publish rules (PR-01, PR-02, PR-04) and the deferred unique `sort_order` constraints are checked at commit, so a half-applied save either fails midway and leaves partial data, or briefly publishes a procedure without steps. ADR 0004 requires admin writes to run with the admin's JWT under RLS, with audit written by triggers.

## Options
1. **SQL functions (`SECURITY INVOKER`) called over RPC**: one call is one transaction; RLS, the write guard and the audit triggers apply as for direct writes, because the function runs as the calling admin.
2. **Sequential writes from the route handler with compensating rollback**: logic stays in TypeScript, but it is not atomic, other readers can see intermediate states, and a crash between writes leaves partial data.
3. **Direct Postgres connection from the server (e.g. `postgres.js` with a transaction)**: real transactions in TypeScript, but the connection does not carry the admin's JWT, so it bypasses RLS and audit attribution, which contradicts ADR 0004 and adds a database credential to the app.

## Decision
Option 1, chosen by the owner on 2026-10-09. Migration `20261007120000_admin_write_functions.sql` adds `admin_save_procedure`, `admin_set_life_event_procedures` and the read-only `admin_ai_query_stats`. Single-row writes (categories, institutions, synonyms, life event fields) stay as direct table writes.

## Why
It is the only option that is both atomic and keeps ADR 0004 intact: no service role key, no extra credential, RLS and audit unchanged. The cost is business logic in PL/pgSQL, which the SQL tests on local Supabase cover.

## Consequences
- Functions are `SECURITY INVOKER` with `search_path = ''`; only `authenticated` may execute them. A `SECURITY DEFINER` admin function needs its own ADR.
- Steps and documents have no ids in the API contract (03), so the function matches them by `sort_order`; unchanged rows produce no audit entry.
- Function changes ship as new migrations and are documented in `docs/01-domain-model.sql` comments and covered in `supabase/tests/schema_smoke.sql`.
- Errors raised inside functions (P0002 not found, cycle, check and foreign key violations) map to HTTP codes in `lib/api/errors.ts` like direct writes.
