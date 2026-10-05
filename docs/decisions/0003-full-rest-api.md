# 0003. Serve all data through the REST API defined in the API contract

- Status: Accepted
- Date: 2026-10-05

## Context
04 says pages talk to Supabase directly and only `/api/ai/chat` and `/api/search` are custom. 03 defines a full REST API (`/v1`, public and admin) with a staging server. The two contradict each other.

## Options
1. **Direct Supabase from server components** plus two routes: least code, no layer protecting the schema.
2. **Full REST per 03**: stable contract for future clients, most code.
3. **Hybrid**: typed query layer now, REST later.

## Decision
Option 2. Every read and write goes through Next.js route handlers implementing 03; pages consume the same handlers' service layer.

## Why
The owner wants one contract that a future mobile client can use without exposing the database schema as a public API.

## Consequences
- 03 must be fixed before implementation: `messages[]` history in AI chat, admin endpoints for synonyms, categories and the audit log, 403 responses, a path-based DELETE for dependencies (no DELETE body), money as a decimal string, a rate-limit message that matches the hourly window.
- A staging environment (separate Supabase project and Vercel preview) is required, as 03 already lists.
- Clients never receive the service role key; the anon key is used only by the server.
