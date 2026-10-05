# 0009. Test with Vitest, Playwright and SQL tests against local Supabase

- Status: Accepted
- Date: 2026-10-05

## Context
The core rules require behavior tests; the project docs define none. The riskiest code is in the database (RLS, cycle checks, triggers), and both RLS and cycle checks were reproduced as bugs in the original schema.

## Options
1. **Vitest + Playwright + SQL tests.**
2. **Vitest + SQL tests**, no end-to-end.
3. **Vitest only.**

## Decision
Option 1. Vitest for logic (dependency phases, checklist state, redaction), SQL tests run against the local Supabase stack for RLS, cycles and audit triggers, Playwright for the three main flows (find an event, follow a procedure, use the checklist).

## Why
The largest risks live in the database and in flows across pages, not in pure functions.

## Consequences
- CI starts a local Supabase stack for SQL and Playwright tests.
- Every RLS policy and trigger ships with a test that proves an anonymous user cannot read drafts or write anything.
