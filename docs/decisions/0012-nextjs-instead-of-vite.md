# 0012. Use Next.js App Router instead of the Vite default

- Status: Accepted
- Date: 2026-10-06

## Context
The ai-instructions `new-project` skill scaffolds new apps with Vite and React. That default fits a plain frontend app. This project is full-stack: it needs a REST API (0003), server-only secrets for Anthropic and Supabase (0004, 0006), a server-side rate limit and redaction step (0007), and server-rendered public pages that search engines can index. The owner clarified the intent of the shared rules on 2026-10-06: Vite + React is the standard for frontend apps; the general rules (core, React, Osnova design) apply to every project.

## Options
1. **Next.js App Router**: pages, route handlers and server-only code in one project, deployed to Vercel.
2. **Vite + React SPA plus a separate backend**: follows the skill literally, but adds a second service, a second deploy and CORS, and public pages render only in the browser.

## Decision
Option 1, chosen by the owner on 2026-10-06. Everything else from `new-project` still applies: Osnova with a project theme, `npx ai-instructions init`, the contrast check, and a project setup ADR.

## Why
Every server-side requirement above already lives in route handlers in the docs (03, 04). A separate backend would duplicate auth, deploy and config for no product gain.

## Consequences
- The `stacks/react` rules apply unchanged; Next-specific conventions (server vs client components, route handlers, `proxy.ts`) live in 04 and 05.
- Osnova's React package ships with a `'use client'` banner so server components can import it.
- The `new-project` skill should say when a full-stack framework replaces the Vite default; proposed as a change to ai-instructions.
