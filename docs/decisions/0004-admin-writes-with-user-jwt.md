# 0004. Admin routes write with the admin's JWT, enforced by RLS and audited by triggers

- Status: Accepted
- Date: 2026-10-05

## Context
The schema has no write policies and no admin role. 04 uses the service role key on the server, which bypasses RLS; audit writes would then have no `auth.uid()` while `audit_log.changed_by` is NOT NULL. 04 relies on Next.js middleware for admin protection, which has had an auth bypass (CVE-2025-29927).

## Options
1. **Admin JWT**: routes forward the caller's token; RLS checks an admin claim; a DB trigger writes the audit log.
2. **Service role**: code checks the admin and writes the audit log; all protection lives in application code.

## Decision
Option 1. Admin role is `app_metadata.role = 'admin'`, set manually (no self sign-up). RLS write policies require it. Triggers on content tables write `audit_log` with `auth.uid()`.

## Why
Two independent layers: a bug in a route cannot write past RLS, and every change is audited by the database itself.

## Consequences
- Public reads use the anon key under RLS, never the service role.
- The service role is limited to the AI route's `ai_queries` insert and scheduled jobs.
- Route handlers still verify the admin; middleware is only a redirect convenience.
- `audit_log` gets RLS: admin read-only, no UPDATE or DELETE for any role.
