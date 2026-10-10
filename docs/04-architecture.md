# Architecture – Administrativni Asistent

**Version:** 2.0
**Date:** 2026-10-05

---

## Rules for AI agents

- The decisions in [`docs/decisions/`](decisions/) are binding. This document describes how they fit together; it does not override them.
- Do not introduce new technologies, services or dependencies without an explicit request and an ADR.
- Next.js route handlers are the backend; there is no separate backend application ([ADR 0003](decisions/0003-full-rest-api.md)).
- Supabase (Postgres) is the only data store.
- Every Claude API call runs on the server. API keys, the service role key and the model ID never reach the browser.

---

## 1. System overview

```
┌──────────────────────────────────────────────────────────────┐
│                       USER / BROWSER                         │
│  public pages · checklist (localStorage) · admin UI          │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────┐
│                          VERCEL                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                 NEXT.JS APP (App Router)               │  │
│  │                                                        │  │
│  │  app/(public), app/(admin)   pages (server components) │  │
│  │  app/api/v1/**               route handlers = REST API │  │
│  │            │                                           │  │
│  │            ▼                                           │  │
│  │  lib/services/**   one service layer used by pages     │  │
│  │                    and route handlers                  │  │
│  └─────────┬───────────────────────────────┬──────────────┘  │
└────────────┼───────────────────────────────┼─────────────────┘
             │ anon key / admin JWT /        │ server only
             │ service role (restricted)     │
   ┌─────────▼──────────┐          ┌─────────▼──────────┐
   │      SUPABASE      │          │   ANTHROPIC API    │
   │  Postgres + RLS    │          │   Claude (AI chat) │
   │  Auth (admin only) │          └────────────────────┘
   │  audit triggers    │
   └────────────────────┘          Sentry: errors (scrubbed)
```

---

## 2. Stack

| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 16.x, App Router | SSR/SSG for SEO and speed, route handlers as the backend, first-class on Vercel |
| UI library | React 19.x | Comes with Next.js 16 |
| Language | TypeScript, `strict` | Type safety; types generated from the database |
| Styling | CSS Modules + design tokens | [ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md); no utility-class framework, no CSS-in-JS |
| UI components | Osnova (separate package) + app-specific components | [ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md), [ADR 0010](decisions/0010-build-osnova-as-package.md) |
| Fonts | System font stack | [ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md); no web fonts |
| Accessibility | WCAG 2.2 AA (contrast, keyboard) | [ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md) |
| Backend | Next.js route handlers implementing `03-api-contract.yml` | [ADR 0003](decisions/0003-full-rest-api.md) |
| Database | PostgreSQL (Supabase), RLS on every table | Relations, RLS, managed backups |
| Auth | Supabase Auth, email + password, admin only | No public accounts in v1 |
| AI | Anthropic Claude API via `@anthropic-ai/sdk` | [ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md) |
| Search | Postgres full-text search (`serbian` config) + `pg_trgm`, input normalized by `aa_normalize()` | No extra service; handles Cyrillic input, missing diacritics and typos ([ADR 0011](decisions/0011-content-and-copy-defaults.md)) |
| Error monitoring | Sentry (`@sentry/nextjs`) | Scrubbed per [ADR 0007](decisions/0007-redact-pii-in-ai-chat.md) |
| Tests | Vitest, Playwright, SQL tests on local Supabase | [ADR 0009](decisions/0009-testing-stack.md) |
| Hosting | Vercel | Zero-config for Next.js, preview deployments |

### 2.1 Versions (as of 2026-10-05)

Pin exact versions in `package.json`; this table only records the baseline the docs were written against.

| Package | Baseline |
|---|---|
| `next` | 16.x |
| `react`, `react-dom` | 19.x |
| `typescript` | current stable |
| `@supabase/supabase-js` | 2.x (2.117 at time of writing) |
| `@supabase/ssr` | current |
| `@anthropic-ai/sdk` | 0.131.x |
| `@sentry/nextjs` | 11.x |
| `eslint` | 10.x, flat config (`next lint` was removed in Next.js 16; run ESLint directly) |
| `vitest`, `@playwright/test` | current |

### 2.2 Baseline choices

These were ADR-01, -02, -03 and -05 in v1.0 of this document. They still hold and are kept here as context until they are recorded as files in `docs/decisions/` (see Open questions).

| Choice | Rejected alternative | Why |
|---|---|---|
| Next.js as both frontend and backend | Separate ASP.NET / Spring Boot backend | One deployment; v1 has little business logic |
| Supabase (managed Postgres) | Self-hosted Postgres on AWS RDS | Auth, RLS, backups and a dashboard without operations work |
| Postgres full-text search | Algolia, Meilisearch | Small data set, no extra service or cost |
| Vercel | AWS (EC2, ECS, Lambda) | Too much operations work for a solo project |

---

## 3. Frontend

### 3.1 Project structure

```
/
├── app/
│   ├── (public)/                      public pages, no auth
│   │   ├── page.tsx                   home: categories and life events
│   │   ├── dogadjaj/[slug]/
│   │   │   ├── page.tsx               life event detail
│   │   │   └── checklist/page.tsx     checklist for the event
│   │   ├── procedura/[slug]/page.tsx  procedure detail
│   │   ├── institucija/[slug]/page.tsx
│   │   ├── pretraga/page.tsx          search results
│   │   ├── ai/page.tsx                AI assistant
│   │   └── login/page.tsx             admin sign-in (public URL, no auth layout)
│   ├── (admin)/                       admin pages, auth required
│   │   └── admin/
│   │       ├── page.tsx               dashboard
│   │       ├── dogadjaji/  procedure/  institucije/
│   │       ├── kategorije/  sinonimi/
│   │       ├── upiti/                 AI queries (UF-10)
│   │       ├── upozorenja/            stale procedures
│   │       └── izmene/                audit log
│   ├── api/
│   │   ├── v1/                        route handlers mirroring 03-api-contract.yml
│   │   │   ├── categories/  life-events/  procedures/  institutions/
│   │   │   ├── search/
│   │   │   ├── ai/chat/
│   │   │   └── admin/**
│   └── theme.css                      Osnova theme overrides (`--color-*`, `--space-*` from 06)
├── components/
│   ├── public/                        app-specific public components (PhaseIndicator, CheckCard)
│   └── admin/                         app-specific admin components (forms, tables)
├── lib/
│   ├── services/                      data access and business logic, shared by pages and handlers
│   ├── supabase/                      the three server clients (§5.2)
│   ├── ai/                            catalog builder, redaction, prompts, Claude client
│   ├── search/
│   ├── auth/                          admin verification for route handlers
│   ├── hooks/                         client hooks (useChecklist)
│   └── i18n/labels.ts                 all UI copy
├── types/database.ts                  generated by `supabase gen types`
├── supabase/
│   ├── migrations/
│   └── tests/                         SQL tests (RLS, cycles, triggers)
├── e2e/                               Playwright tests
└── docs/
    ├── decisions/                     ADRs
    └── future/                        frozen mobile docs (ADR 0002)
```

Component files are PascalCase with a co-located `Name.module.css`; see `05-coding-standards.md`.

Routes follow [ADR 0011](decisions/0011-content-and-copy-defaults.md): no catch-all slug at the root, so `/admin`, `/login`, `/pretraga` and `/ai` cannot collide with content.

### 3.2 Rendering and caching

| Page | Strategy | Notes |
|---|---|---|
| Home (categories, life events) | Static, tagged cache | Rebuilt on publish |
| Life event detail | Static per slug, tagged cache | |
| Procedure detail | Static per slug, tagged cache | Stale warning computed at render from `last_verified_at` |
| Institution detail | Static per slug, tagged cache | |
| Search (`/pretraga`) | Dynamic (per request) | |
| AI assistant (`/ai`) | Static shell + client component | Calls `POST /api/v1/ai/chat`; history only in component state |
| Login (`/login`) | Dynamic | Server action sign-in |
| Checklist | Server-rendered event data + client component for state | State lives in `localStorage` only |
| Admin | Dynamic, never cached | Always fresh data |

Caching uses Next.js Cache Components ([ADR 0017](decisions/0017-cache-components.md)): `cacheComponents` is on, data is dynamic by default, and the public read functions in `lib/services` cache their database reads with `use cache`. Pages and route handlers share these functions (§4.1), so they share the cache.

- **Cached**: `listCategories`, `listLifeEvents`, `listProcedures`, `listInstitutions`, `getLifeEventBySlug`, `getProcedureBySlug`, `getInstitutionBySlug` and the AI catalog (§4.3). Not cached: search, admin reads, and anything per user.
- **Tags** (`lib/cache/tags.ts`): lists and the catalog carry `catalog`; a found detail carries its entity tag (`life-event:<id>`, `procedure:<id>`, `institution:<id>`); a slug that matches nothing carries `catalog`, so publishing or renaming content replaces the cached 404.
- **Invalidation**: every admin write handler expires the affected tags plus `catalog` with `revalidateTag(tag, { expire: 0 })` (`lib/cache/revalidate.ts`), so the next request reads fresh data; UF-09 requires that a new dependency shows up in the checklist at once. `updateTag` is not used because it works only in Server Actions and the writes come from route handlers; the recommended `"max"` profile is not used because it serves stale content once more.
- **Lifetime**: `cacheLife("hours")` in every cached scope, so a time-based refresh after one hour stays as a safety net.
- **Rules**: a cached scope gets only plain arguments, uses the cookie-less anon client and never reads cookies or headers. Values that depend on today (the stale warning, PR-07) are computed outside the cache from the cached `last_verified_at`.
- **Route handlers**: public `GET` handlers run at request time and read through the cached services. `GET /api/v1/categories` reads nothing from the request, so it calls `connection()`; otherwise it would be prerendered at build time, and the build must not need Supabase or its secrets.

Checklist state uses the shape from [ADR 0011](decisions/0011-content-and-copy-defaults.md), stored under a single `localStorage` key, `aa:checklist`:

```ts
{ v: 1, items: { [procedureId]: { status: 'todo' | 'in_progress' | 'done', updatedAt: string } } }
```

Items are keyed by procedure, not by life event, so a procedure has one status everywhere: marking "Prijava prebivališta" done in one life event shows it done in every event that includes it. The checklist page for an event shows only that event's procedures from the shared store.

---

## 4. Backend (route handlers)

### 4.1 One API for everything

All reads and writes go through the REST API in `03-api-contract.yml` ([ADR 0003](decisions/0003-full-rest-api.md)):

- Route handlers live under `app/api/v1/` and are thin: parse and validate input, check auth, call `lib/services`, map the result to the contract.
- Pages (server components) call the same `lib/services` functions directly instead of making HTTP calls to their own app. The contract and the pages therefore cannot drift: there is one implementation.
- Browsers never talk to Supabase directly. The database schema is not a public API.
- Money is a decimal string in every request and response (for example `"1530.00"`); it is never converted to a JavaScript number.

### 4.2 Admin authorization

Admin protection has two independent layers ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)):

1. **Route handler**: every `/api/v1/admin/**` handler verifies the caller's JWT server-side (Supabase `auth.getUser()` or `auth.getClaims()`, never an unverified session read) and checks `app_metadata.role = 'admin'`. It returns 401 without a valid token and 403 for a non-admin.
2. **Database**: the handler forwards the admin's JWT to Supabase; RLS write policies require the admin claim, and triggers write `audit_log` with `auth.uid()`.

The Next.js proxy (`proxy.ts`, formerly middleware) only redirects unauthenticated visitors from `/admin/*` to `/login`. It is a convenience, not a security boundary (CVE-2025-29927 showed why).

### 4.3 AI chat (`POST /api/v1/ai/chat`)

Retrieval uses the content catalog in a cached system prompt ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md)). Per request:

```
1. Validate the body: messages[] (conversation history held by the client;
   the server keeps no chat state): at most 20 messages, 1–1000 characters
   each (03 AiChatRequest; ai_queries.query_text allows up to 2000).
2. Rate limit: 10 requests per hashed IP per clock hour (§4.4). On excess: 429.
3. Redact personal data in every user message (§7.4).
4. Step 1 – select: system prompt = fixed instructions + content catalog
   (titles, slugs, synonyms of all published life events and procedures),
   marked for prompt caching. Structured output returns the relevant
   life event and procedure IDs.
5. Drop any returned ID that is not in the catalog; load the details
   (description, steps, documents, institutions, cost) of the rest
   through lib/services with the anon client, published content only.
6. Step 2 – answer: system prompt = fixed answer instructions + loaded
   details. Structured output returns { answer, was_answered,
   matched_event_id }.
7. Insert into ai_queries (service-role client): query_text (redacted last
   user message), matched_event_id, was_answered. No IP is stored here.
8. Return { answer, was_answered, matched_life_event, procedures,
   redaction } as in 03 AiChatResponse.
```

`was_answered` comes from structured output, never from parsing the answer text.

The catalog is built from the database, ordered deterministically (by ID), and cached with `use cache` under the `catalog` tag (§3.2), which every admin write expires. Its content changes only when content is published, archived or renamed; the hourly time-based refresh rebuilds the same bytes, so the cached prompt prefix stays byte-identical between requests. Nothing volatile (dates, request IDs) goes into the system prompt.

### 4.4 Rate limiting

- 10 AI requests per client per clock hour (fixed window starting at the full hour), checked before any Anthropic call.
- Stored in Postgres, not in memory: serverless instances do not share memory, so an in-memory counter does not limit anything.
- Key: an HMAC-SHA-256 of the IP address (lowercase hex, as `ai_rate_limits.ip_hash` requires) with a secret salt that rotates daily (`AI_RATE_LIMIT_SALT` + date). The raw IP is never stored or logged ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
- Implementation: one atomic upsert per request on `ai_rate_limits (ip_hash, window_start)` through `public.ai_rate_limit_hit(p_ip_hash, p_limit)`, called with the service-role client (§5.2); windows before the current hour are deleted by the daily purge job (§4.5). `ai_queries` stores no IP or IP hash.
- Response on excess: HTTP 429 with `Retry-After` (seconds until the next full hour) and a Serbian message that matches the hourly window, for example "Iskoristio si 10 pitanja za ovaj sat. Pokušaj ponovo za 25 minuta." (03 `TooManyRequests`).

### 4.5 Scheduled jobs

Scheduled jobs run inside Postgres with `pg_cron`, as scheduled by `01-domain-model.sql`; they need no app endpoint and no service role key:

| Job | Schedule | What it does |
|---|---|---|
| `purge-expired-ai-data` | daily, 03:17 | Calls `private.purge_expired_ai_data()`: deletes `ai_queries` older than 90 days ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)) and `ai_rate_limits` windows before the current hour |

Enable `pg_cron` in the Supabase project before applying the migration; without it the migration only prints a notice and the job must be created before production.

---

## 5. Database

### 5.1 Supabase configuration

- **Region:** EU (Frankfurt), for GDPR / ZZPL and latency.
- **Plan:** Pro for production. The free tier pauses a project after 7 days of inactivity and has no backups, which is incompatible with the uptime target. Staging may use the free tier.
- **Backups:** daily, automatic (Pro).
- **RLS:** enabled on every table, including `ai_queries` and `audit_log`. Child tables (steps, documents, link tables) are readable only when their parent is published.
- **Sign-ups:** disabled. Admin accounts are created by hand and get `app_metadata.role = 'admin'` set manually.

### 5.2 Supabase clients

All three clients are server-only modules (`import 'server-only'`) in `lib/supabase/`.

| Client | Key | Used for |
|---|---|---|
| Anon | anon key | All public reads, under RLS (published content only) |
| User | anon key + the admin's JWT | All admin reads and writes; RLS enforces the admin claim; triggers audit |
| Service role | service role key | Only the AI route: the `ai_queries` insert and the `ai_rate_limit_hit()` call ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)). ADR 0004 names the insert and scheduled jobs; the rate-limit call is an extension of the same AI-route usage, because `ai_rate_limit_hit()` is granted to `service_role` only. The scheduled purge runs in `pg_cron` and does not use it. |

Public pages never use the service role: a bug in a query must not be able to show draft content.

### 5.3 Search

The `public.search_content(q, max_results)` RPC in `01-domain-model.sql`, called by `GET /api/v1/search` with the anon client:

- Input and indexed text go through `public.aa_normalize()` (Cyrillic to Latin, `đ` to `dj`, no diacritics, lowercase), so `pasos`, `pasoš` and `пасош` match the same rows; then the `serbian` stemmer builds the full-text vectors.
- `pg_trgm` word similarity on titles and names tolerates typos and partial words.
- Synonyms live in the `synonyms` table (`term`, `maps_to`); a query that matches a `term` also searches its `maps_to`, so jargon ("papiri za auto") finds the entity. There is no public synonyms endpoint.
- Search covers published `life_events`, `procedures` and `institutions` under RLS, ranked by full-text rank plus trigram similarity, and the handler returns grouped results.
- A procedure not linked to any published life event is excluded (PR-05, [ADR 0011](decisions/0011-content-and-copy-defaults.md)).

---

## 6. Authentication

- **Provider:** Supabase Auth, email + password, admin only.
- **Session:** handled by `@supabase/ssr` in httpOnly cookies; tokens refresh automatically.
- **Admin role:** JWT `app_metadata.role = 'admin'`, set manually.
- **Login:** a server action on `/login` signs in with the anon client; the browser never receives a Supabase key.
- **API callers:** admin route handlers accept the token from the session cookie (web admin UI) or an `Authorization: Bearer` header (contract clients), and verify it the same way.
- **Sign-up:** disabled.

---

## 7. AI integration

### 7.1 Configuration

- **Model:** chosen by a small eval of 30–50 real citizen questions ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md)). Current candidates:
  - `claude-sonnet-5-5`: $2 / $10 per million input / output tokens.
  - `claude-opus-5-5`: $4 / $20 per million input / output tokens.
- **Model ID:** read from the server-only env var `ANTHROPIC_MODEL`. Never a `NEXT_PUBLIC_` variable: it is not secret, but it has no reason to be in the browser bundle.
- **Sampling:** do not send `temperature`, `top_p` or `top_k`. Both candidates reject non-default values (the v1.0 "temperature 0" is gone). Consistency comes from structured output and the prompt.
- **Effort:** set `output_config.effort` explicitly per step (the two candidates have different defaults); the eval picks the level. Start with `low` for step 1.
- **Structured output:** `output_config.format` with a JSON schema for both steps (or the SDK's `messages.parse()` helper). Not the deprecated `output_format`, and not assistant prefill (rejected by current models).
- **Prompt caching:** `cache_control` on the system block that holds the catalog. Verify with `usage.cache_read_input_tokens` in staging; zero across repeated requests means something in the prefix changes.
- **`max_tokens`:** large enough for thinking plus the answer; start at 4096 per step and tune with the eval.
- **Stop reasons:** `refusal` and `max_tokens` are treated as unanswered: the user gets the fallback message and `was_answered = false`.
- **Response language:** Serbian, Latin script, informal "ti" (set in the system prompt).

### 7.2 System prompt structure

Instructions are written in English; the fixed user-facing sentence stays Serbian.

```
You are an administrative assistant that helps citizens of Serbia.
Answer ONLY from the content provided below. Do not use outside knowledge.
Do not give legal advice or interpret regulations.
If the content does not contain the answer, reply exactly:
"Nemam tu informaciju u bazi znanja. Preporučujem da proveriš direktno
kod nadležne institucije."
Answer in Serbian, Latin script, addressing the user informally ("ti").

[step 1] CONTENT CATALOG: {catalog}        ← cached, rebuilt on publish
[step 2] PROCEDURE DETAILS: {details}
```

### 7.3 Spending limit and unavailability

- Monthly spending limit in the Anthropic console; start at $50/month and raise it deliberately based on real usage.
- When the limit is reached or the API fails, the route returns 503 and the UI shows: "Asistent trenutno nije dostupan. Pokušaj ponovo kasnije ili pronađi svoj životni događaj na početnoj strani." `08-screen-specifications.md` must include this state.

### 7.4 Personal data

Per [ADR 0007](decisions/0007-redact-pii-in-ai-chat.md):

- Before the Anthropic call **and** before the `ai_queries` insert, user messages are redacted: JMBG (13 digits), phone numbers, email addresses and document numbers are replaced with placeholders such as `[JMBG]`.
- Redaction is pattern-based and best-effort; the docs promise no more than that (PR-15).
- `ai_queries` keeps redacted text for 90 days, then the daily `pg_cron` purge job deletes it (§4.5).
- Chat content is never written to logs or Sentry.

---

## 8. Error monitoring

- **Tool:** Sentry via `@sentry/nextjs`, server and client.
- **Tracked:** server errors, route handler errors, client errors.
- **Not sent:**
  - Request bodies of `/api/v1/ai/chat`: `beforeSend` drops `event.request.data` for that route, and breadcrumbs never contain chat text.
  - Session Replay: not enabled (no replay integration).
  - Default PII: `sendDefaultPii: false`, so no IP addresses or cookies.
- Application logs follow the same rule: no chat text, no raw IPs.

---

## 9. Deployment

### 9.1 Vercel

- Framework preset: Next.js; build command from `package.json` (`next build`).
- Environment variables are set per environment in the Vercel dashboard; never committed.
- Every push to `main` deploys production; every other branch and pull request gets a preview deployment.

### 9.2 Environments

| Environment | Branch | App URL | Supabase project |
|---|---|---|---|
| Production | `main` | `administrativniasistent.rs` | production (Pro, Frankfurt) |
| Staging | any non-`main` branch / PR (Vercel preview) | Vercel preview URL; `staging.administrativniasistent.rs` for the latest staging build | staging (separate project) |
| Local / CI | – | `localhost` | local Supabase stack (`supabase start`), also used by SQL and Playwright tests ([ADR 0009](decisions/0009-testing-stack.md)) |

Migrations in `supabase/migrations/` are applied to staging first, then production. Staging has its own keys; production keys are never used outside production.

### 9.3 Environment variables

All variables are server-only. None of them uses the `NEXT_PUBLIC_` prefix except the client Sentry DSN.

```
# Supabase (server only; the browser never talks to Supabase)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        ← only lib/supabase/service-role client

# Anthropic
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=                  ← chosen by eval; never NEXT_PUBLIC_

# AI rate limiting
AI_RATE_LIMIT_SALT=

# Sentry
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=           ← a DSN is not a secret
SENTRY_AUTH_TOKEN=                ← build time only, for source maps
```

`.env*` files are git-ignored and denied to AI agents by the generated `.claude/settings.json`.

---

## 10. Security summary

| Requirement | Implementation |
|---|---|
| HTTPS | Vercel, automatic |
| Keys on the server | No secret or model ID in `NEXT_PUBLIC_` variables; Supabase clients are `server-only` modules |
| RLS | On every table; public reads use the anon key; drafts invisible, including child rows |
| Admin writes | Admin JWT + RLS write policies + route handler check ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)) |
| Audit | DB triggers write `audit_log` with `auth.uid()`; `audit_log` is admin read-only, no UPDATE or DELETE for any role |
| Service role | Only the AI route: `ai_queries` insert and `ai_rate_limit_hit()` |
| Personal data in AI chat | Best-effort redaction before the API call and the insert; 90-day retention ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)) |
| IP addresses | Only a salted, daily-rotated hash |
| Rate limiting | 10 AI requests / hashed IP / hour, in Postgres |
| Monitoring | Sentry without AI request bodies, without Session Replay |
| Spending | Monthly limit in the Anthropic console |

---

## 11. Decisions

Architecture decisions are recorded as ADRs in [`docs/decisions/`](decisions/), not in this document. The ones that shape this architecture:

- [0001](decisions/0001-apply-all-ai-instructions-layers.md) – CSS Modules, Osnova, system fonts, WCAG AA
- [0002](decisions/0002-web-only-v1.md) – web only in v1
- [0003](decisions/0003-full-rest-api.md) – all data through route handlers
- [0004](decisions/0004-admin-writes-with-user-jwt.md) – admin JWT, RLS, audit triggers, restricted service role
- [0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md) – catalog in a cached system prompt
- [0007](decisions/0007-redact-pii-in-ai-chat.md) – PII redaction, Sentry scrubbing, hashed IPs
- [0009](decisions/0009-testing-stack.md) – Vitest, Playwright, SQL tests
- [0010](decisions/0010-build-osnova-as-package.md) – Osnova as a separate package
- [0017](decisions/0017-cache-components.md) – Cache Components, `use cache` with tags for public reads

---

## Open questions

1. **Service role scope.** ADR 0004 names only the `ai_queries` insert and scheduled jobs. The rate-limit counter (`ai_rate_limit_hit()`) also needs a write the anon role must not have; default: it runs through the same restricted service-role client in the AI route. Confirm, or amend ADR 0004.
2. **Rate limit and CGNAT.** Serbian mobile carriers share IPs (CGNAT), so 10 per IP per hour can block many users at once, and every follow-up question counts. Revisit with real traffic.
3. **Backfill baseline ADRs.** The choices in §2.2 (Next.js, Supabase, Postgres FTS, Vercel) are not yet ADR files.
4. **Model and effort.** Chosen by the eval; the eval set itself still has to be built.

---

## Changes from v1.0

- Pages no longer call Supabase directly; all data goes through route handlers and a shared service layer (ADR 0003).
- Public reads use the anon key; admin writes use the admin's JWT; service role restricted to the AI route's `ai_queries` insert and rate limit (ADR 0004).
- Middleware is no longer the admin protection; handlers and RLS are (ADR 0004, CVE-2025-29927).
- Replaced top-3–5 FTS retrieval with catalog-in-prompt, two structured-output steps and prompt caching (ADR 0006).
- Removed `claude-sonnet-4-6` and temperature 0; model chosen by eval, ID in a server-only env var (ADR 0006).
- Added redaction, 90-day retention, Sentry body scrubbing, no Session Replay, salted IP hash (ADR 0007).
- Replaced in-memory rate limiting, which does not work on serverless, with a Postgres counter; the 90-day purge runs in `pg_cron`.
- Tailwind, shadcn/ui and `components/ui` replaced by CSS Modules and Osnova (ADR 0001, 0010).
- Routes changed from `/[slug]` and `/procedure/[slug]` to `/dogadjaj/[slug]`, `/procedura/[slug]`, checklist under `/dogadjaj/[slug]/checklist` (ADR 0011).
- Fixed ISR conflict with UF-09 by adding on-demand tag revalidation on admin writes.
- Added staging and local environments (ADR 0003, 0009) and the Supabase Pro requirement for production.
- Updated versions from Next.js 14 / React 18 to Next.js 16 / React 19; noted ESLint flat config.
- Search uses `search_content()` with `aa_normalize()`, `pg_trgm` and synonym expansion (ADR 0011).
- Added admin sections for categories, synonyms and audit log (ADR 0003).
- Added the "assistant unavailable" state for the spending limit.
- Added public pages `/ai` and `/login` (moved out of the admin group) next to `/pretraga`, per 08.
- Checklist stored under one key `aa:checklist`, one status per procedure across all life events, instead of one key per event.
- Moved ADR-01..05 out of this document into `docs/decisions/` (ADR 0001); translated to English.
