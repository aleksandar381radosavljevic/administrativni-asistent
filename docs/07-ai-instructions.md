# AI Instructions – Administrativni Asistent

**Version:** 2.0
**Date:** 2026-10-05

---

## Purpose

Instructions for AI coding assistants (Claude Code and others) working on this repository. They sit on top of two layers:

1. **Base layer: [ai-instructions](https://github.com/aleksandar381radosavljevic/ai-instructions)**, layers `core`, `stacks/react` and `design/osnova` ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)). They arrive as the generated block in `AGENTS.md` (`CLAUDE.md` imports `AGENTS.md`). Working agreement, definition of done, React and Osnova rules come from there and are not repeated here.
2. **Project layer: this document**, linked from the "This project" section of `AGENTS.md`. It maps the project docs and lists the domain rules an agent cannot infer from the code.

Read this document at the start of every task.

These are instructions for the agent that writes code. The rules for the in-app AI assistant (the feature) are in §2.4 and `04-architecture.md` §7.

---

## 1. What to read

| # | Document | When |
|---|---|---|
| 1 | `07-ai-instructions.md` | Always, first |
| 2 | `00-product-spec.md` | Always: business rules (PR-xx), edge cases (ES-xx), scope |
| 3 | [`decisions/`](decisions/) | Before changing anything an ADR covers; ADRs override the other docs |
| 4 | `01-domain-model.md` / `01-domain-model.sql` | Anything touching data, entities, relations, RLS |
| 5 | `02-user-flows.md` | Implementing a user flow, main and alternative paths |
| 6 | `03-api-contract.yml` | Implementing or calling an endpoint |
| 7 | `04-architecture.md` | Stack, structure, data access, AI, deployment |
| 8 | `05-coding-standards.md` | Naming, language, project-specific code rules, tests |
| 9 | `06-design-system.md` | Tokens, theme, component visuals |
| 10 | `08-screen-specifications.md` | Building a screen |

Read only what the task needs beyond 1 and 2.

`docs/future/` (the frozen mobile docs 09–11) is **not** implementation input ([ADR 0002](decisions/0002-web-only-v1.md)).

---

## 2. Project rules

These hold for the whole project unless the user explicitly asks for a change.

### 2.1 Data and content

- Use only the entities and fields in `01-domain-model.md`. Do not add tables, columns, enums or link tables without an explicit decision.
- Do not change business rules PR-01..PR-18 or PR-DB-01..PR-DB-11 without an explicit request.
- `procedures` is the central entity. A procedure is reused across life events through `life_event_procedures`, never copied.
- Content entities are never deleted; they move through `status` (`draft | published | archived`). Link rows (event–procedure, dependencies, procedure–institution) may be deleted, and every change is audited by database triggers.
- Documents belong to a single procedure and are edited inside the procedure form ([ADR 0005](decisions/0005-documents-per-procedure.md)).
- Circular dependencies in `procedure_dependencies` are rejected by the database, not only by the UI.
- Use the shared names exactly: `institutions.address`, `institutions.kind` (`government | bank | employer | other`, shown as "organizations"), `procedures.cost_type` (`free | fixed | variable | unknown`), `life_events.estimated_duration` ([ADR 0008](decisions/0008-extend-domain-model.md)).
- A procedure not linked to any published life event is not shown publicly, including search and direct URLs (PR-05, [ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- A procedure with `last_verified_at` null shows the stale warning.

### 2.2 Content comes from the database

- Life events, procedures, steps, documents, institutions, categories and synonyms come from the database. Never hard-code them in components, seeds for production, or prompts.
- The only hard-coded text is UI copy, through `lib/i18n/labels.ts`.
- Do not write content (procedure titles, descriptions, steps). The administrator enters it through the admin panel.

### 2.3 Access and security

- All data goes through the route handlers and `lib/services` ([ADR 0003](decisions/0003-full-rest-api.md)). The browser never talks to Supabase.
- Public reads use the anon key under RLS; only published content and child rows of published parents are visible.
- Admin is JWT `app_metadata.role = 'admin'`. Admin route handlers verify it, then write with the admin's JWT so RLS and audit triggers apply ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)). `proxy.ts` (middleware) is never the authorization check.
- The service role key is used only in the AI route: the `ai_queries` insert and the `ai_rate_limit_hit()` call (`04-architecture.md` §5.2). The 90-day purge runs in `pg_cron`.
- `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` never appear in client code or `NEXT_PUBLIC_` variables.
- Never open, print or copy `.env*` files or secrets.

### 2.4 The in-app AI assistant (the feature)

- Answers only from database content: the catalog picks IDs, the server loads published details, the model answers from them ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md)).
- If the content does not cover the question, it answers: "Nemam tu informaciju u bazi znanja. Preporučujem da proveriš direktno kod nadležne institucije."
- No legal advice or interpretation of regulations.
- Personal data is redacted (best effort) before the Anthropic call and before storage; `ai_queries` is deleted after 90 days; chat text never goes to logs or Sentry ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
- `was_answered` comes from structured output (`output_config.format`), never from parsing text.
- Do not send `temperature` or other sampling parameters; the model ID comes from `ANTHROPIC_MODEL`.
- Rate limit: 10 requests per hashed IP per clock hour, stored in `ai_rate_limits` (no IP or IP hash in `ai_queries`).

### 2.5 Stack

- Next.js 16 App Router, React 19, TypeScript, Supabase, Anthropic Claude API, Sentry, Vercel (`04-architecture.md` §2).
- Styling: CSS Modules, Osnova components and tokens, system font stack, WCAG 2.2 AA. No CSS framework or third-party UI kit, no web fonts, no emoji icons ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)).
- Public UI waits for the first Osnova release; database, API and admin logic do not ([ADR 0010](decisions/0010-build-osnova-as-package.md)).
- Do not add a technology, library or service without an explicit decision and an ADR.

### 2.6 User flows

- Every flow in `02-user-flows.md` has a main path and alternative paths. Implement both.
- UF-01..UF-07 are public (no auth). UF-08..UF-10 are admin only (auth required in the handler and in RLS).

---

## 3. When the docs do not cover something

1. **Check first.** Look at the ADRs, edge cases ES-01..ES-14 and business rules PR-01..PR-18 before concluding something is missing.
2. **Small implementation choice** (layout detail, helper name, call order): decide using `05-coding-standards.md` and existing code, and mention the choice in one line.
3. **Business logic, data model, API contract, UX flow, or anything hard to reverse**: do not assume. Follow the core working agreement: propose 2–3 options with trade-offs and a recommendation, wait for a decision, then record it as an ADR in `docs/decisions/` if it is significant.
4. **Never** add an entity, column, endpoint or dependency as a silent decision.

If two documents disagree, the ADR wins; if no ADR covers it, ask.

---

## 4. Definition of done (project additions)

The `core` definition of done applies (lint, type-check, tests, build pass; behavior changes have tests; clean diff; final message says what was and was not verified). In addition:

- [ ] Relevant business rules (PR-xx) and edge cases (ES-xx) from `00-product-spec.md` are respected.
- [ ] Main and alternative paths from `02-user-flows.md` are implemented, where relevant.
- [ ] Types come from `types/database.ts` and match `03-api-contract.yml`.
- [ ] Tests at the right level per [ADR 0009](decisions/0009-testing-stack.md); every new RLS policy or trigger has a SQL test.
- [ ] UI copy is Serbian (Latin, "ti") and lives in `lib/i18n/labels.ts`.
- [ ] Code, names, comments and commits are English.
- [ ] UI meets WCAG AA contrast and works by keyboard.
- [ ] Admin handlers verify the admin claim and write with the admin's JWT; public reads never use the service role.
- [ ] No secret, model ID or chat text in client code, logs or Sentry.
- [ ] Admin writes invalidate the affected cache tags.

---

## 5. Never without an explicit request

- Add tables, columns, enums or link tables to the domain model.
- Change the API contract (new endpoints, changed request or response shapes).
- Add libraries, frameworks or services (for example Redis, GraphQL, another auth provider, a CSS framework, a UI kit, a web font).
- Implement anything listed as out of scope in `00-product-spec.md` §11: public accounts, checklist sync, notifications, multiple languages, the mobile app (ADR 0002).
- Change business rules, edge cases or accepted ADRs. A changed decision is a new ADR that supersedes the old one.
- Write content (procedure titles, descriptions, steps) into code or seeds.
- Use the service role key outside the places listed in §2.3.

---

## 6. Quick reference

| Question | Where |
|---|---|
| Business rules for a procedure or event? | `00-product-spec.md` §6 |
| Is X in scope for v1? | `00-product-spec.md` §11, [ADR 0002](decisions/0002-web-only-v1.md) |
| Why was X decided this way? | [`docs/decisions/`](decisions/) |
| Table or column name for X? | `01-domain-model.md` / `.sql` |
| How should this user action play out? | `02-user-flows.md` |
| Request/response format of endpoint X? | `03-api-contract.yml` |
| Which client, key or technology for X? | `04-architecture.md` |
| How to name a file, variable or component; which test? | `05-coding-standards.md` |
| Which token, color or component look? | `06-design-system.md` |
| What does screen X show? | `08-screen-specifications.md` |
| General agent behavior, React and Osnova rules? | `AGENTS.md` (ai-instructions block) |

---

## Open questions

1. **`AGENTS.md` does not exist yet.** Run `npx ai-instructions init` with layers `core,stacks/react,design/osnova`, and put a one-line pointer to this document in its "This project" section. Until then, agents must be told to read this file explicitly.

---

## Changes from v1.0

- Made ai-instructions (`core`, `stacks/react`, `design/osnova`) the base layer via `AGENTS.md` and removed duplicated general rules (ADR 0001).
- Added ADRs, 06 and 08 to the reading list; excluded the frozen mobile docs 09–11 (ADR 0002).
- Replaced Tailwind/shadcn in the stack rule with CSS Modules, Osnova, system fonts, WCAG AA (ADR 0001).
- Replaced "ADR-01..05 in 04 are final" with "ADRs in `docs/decisions/` win".
- Replaced the top-3–5 procedures rule with catalog-based retrieval and structured output (ADR 0006).
- Replaced "personal data is not stored or logged" with best-effort redaction and 90-day retention (ADR 0007).
- Replaced "Bearer token" with the admin claim, user-JWT writes and restricted service role (ADR 0004).
- Clarified that link rows may be deleted and audited while content entities are not.
- Added shared field names from ADR 0008, documents-per-procedure (ADR 0005) and PR-05 / never-verified defaults (ADR 0011).
- Replaced "middleware protects admin routes" in the definition of done with handler and RLS checks (CVE-2025-29927).
- Added tests, WCAG AA and cache invalidation to the definition of done (ADR 0009, 0001).
- Aligned the "when undefined" process with the core working agreement (options, then ADR).
- Fixed the API contract reference from `.yaml` to `.yml`; translated to English.
