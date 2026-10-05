# Coding Standards – Administrativni Asistent

**Version:** 2.0
**Date:** 2026-10-05

---

## How this document relates to ai-instructions

The base rules come from the shared [ai-instructions](https://github.com/aleksandar381radosavljevic/ai-instructions) layers `core`, `stacks/react` and `design/osnova` ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)). They reach the agent as the generated block in `AGENTS.md` and are not repeated here. They already cover, among other things:

- working agreement, ADRs in `docs/decisions/`, scoped changes, definition of done (`core`);
- CSS Modules only, design tokens, semantic HTML, keyboard access, effects, data fetching outside UI components, user-facing test queries (`stacks/react`);
- Osnova components first, theming through tokens only, `Icon` with Lucide names, WCAG AA, system font stack (`design/osnova`).

This document adds only what is specific to this project. If something here seems to contradict a shared rule, the shared rule wins unless an ADR says otherwise; report the conflict.

---

## 1. Language: Serbian vs English

| What | Language | Example |
|---|---|---|
| Code: variables, functions, types, components | English | `getLifeEventBySlug`, `ProcedureCard` |
| File and folder names | English | `ProcedureCard.tsx`, `lib/search/` |
| Database: tables, columns, enums | English | `life_events`, `can_online`, `content_status` |
| API: paths, JSON keys | English | `/api/v1/life-events`, `{ "status": "published" }` |
| Code comments, commit messages, docs, ADRs | English | `// Reject a dependency that would create a cycle` |
| **UI copy: labels, buttons, headings, messages** | **Serbian, Latin script** | `"Sačuvaj proceduru"`, `"Nije počelo"` |
| **Content from the database** | **Serbian, Latin script** | `"Selim se"`, `"Prijava prebivališta"` |
| **AI assistant answers** | **Serbian, Latin script** | |

Rule of thumb: if it is in code, the database or the API, it is English. If the end user sees it on screen, it is Serbian.

UI copy addresses the user informally ("ti"): "Pokušaj ponovo", "Proveri", not "Pokušajte", "Proverite" ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).

---

## 2. UI copy lives in one file

v1 is Serbian only, but every piece of UI copy goes through `lib/i18n/labels.ts` instead of being hard-coded in JSX, so adding a language later is mechanical.

- Flat-ish object, English keys, Serbian values, `as const`.
- Placeholders in braces, filled by a small `format(label, values)` helper.
- Database content is never put in this file; it is already Serbian in the database.

```ts
// lib/i18n/labels.ts
export const labels = {
  checklist: {
    todo: 'Nije počelo',
    in_progress: 'U toku',
    done: 'Završeno',
  },
  procedure: {
    staleWarning: 'Poslednja provera: {date}. Pre nego što kreneš, proveri na zvaničnom sajtu.',
    neverVerified: 'Podaci još nisu provereni.',
  },
  cost: {
    free: 'Besplatno',
    variable: 'Cena varira',
    unknown: 'Cena nepoznata',
  },
} as const;
```

Values are illustrative; the copy of record is in `08-screen-specifications.md`. Checklist status keys match the stored values `todo | in_progress | done` exactly. Cost labels follow `procedures.cost_type` (`free | fixed | variable | unknown`); a missing `cost_amount` never means "Besplatno" ([ADR 0008](decisions/0008-extend-domain-model.md)).

---

## 3. Naming

### 3.1 Files and folders

| Kind | Convention | Example |
|---|---|---|
| React component | PascalCase, styles co-located | `ProcedureCard.tsx` + `ProcedureCard.module.css` |
| Next.js special files | Next.js convention | `page.tsx`, `layout.tsx`, `route.ts` |
| Other modules (services, utilities, hooks) | kebab-case | `format-date.ts`, `life-events.ts`, `use-checklist.ts` |
| Folders | kebab-case | `lib/ai/`, `components/admin/` |
| Tests | next to the file, `.test.ts(x)` | `redact.test.ts` |

Public route segments are Serbian because they are part of the user-visible URL: `/dogadjaj/[slug]`, `/procedura/[slug]`, `/institucija/[slug]`, `/dogadjaj/[slug]/checklist`, `/pretraga`, `/ai`, `/login` ([ADR 0011](decisions/0011-content-and-copy-defaults.md)). Everything else is English.

### 3.2 Identifiers

| Kind | Convention | Example |
|---|---|---|
| Variables, functions | camelCase | `getProcedureBySlug`, `isStale` |
| Components, types, interfaces | PascalCase | `ChecklistItem`, `LifeEventDetail` |
| Fixed constants | SCREAMING_SNAKE_CASE | `STALE_THRESHOLD_MONTHS`, `AI_RATE_LIMIT_PER_HOUR` |
| Enum values | snake_case, same as the database | `draft`, `published`, `in_progress` |
| Boolean variables and props | `is` / `has` / `can` prefix | `isLoading`, `hasDependency` |
| Props interface | component name + `Props` | `ProcedureCardProps` |

### 3.3 Database fields stay snake_case in TypeScript

Entity types come from the generated `types/database.ts` and keep the database's snake_case names (`can_online`, `last_verified_at`, `cost_type`). The API contract uses the same names. Do not add a camelCase mapping layer: it doubles the vocabulary and drifts.

```ts
import type { Tables } from '@/types/database';

type Procedure = Tables<'procedures'>;   // procedure.can_online, procedure.cost_type
```

---

## 4. TypeScript

- `"strict": true`; no `any` (use `unknown` and narrow).
- Database types are generated (`supabase gen types typescript`) into `types/database.ts` after every migration. Never edit that file by hand.
- Request and response types match `03-api-contract.yml`; validate untrusted input at the route handler boundary.
- Money (`cost_amount`) is a decimal string end to end. Never convert it to `number`; format it for display with a helper that works on the string.
- `interface` for object shapes (props, DTOs), `type` for unions, aliases and utility types.

---

## 5. Next.js and data access

- Server components are the default; add `'use client'` only for interactivity, hooks or browser APIs.
- Data access lives in `lib/services/`. Route handlers and pages both call services; components that render UI receive data through props ([ADR 0003](decisions/0003-full-rest-api.md)).
- Route handlers stay thin: validate, authorize, call a service, map to the contract.
- Supabase clients come only from `lib/supabase/` and are `server-only` modules:
  - anon client for public reads;
  - user client (admin JWT) for every admin read and write;
  - service role client only in the AI route: the `ai_queries` insert and the `ai_rate_limit_hit()` call ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md), `04-architecture.md` §5.2). The 90-day purge runs in `pg_cron` and needs no app code.
- Admin route handlers verify the JWT and the `app_metadata.role = 'admin'` claim themselves; never rely on `proxy.ts` (middleware) for authorization.
- Admin write handlers invalidate the cache tags they affect (`04-architecture.md` §3.2).
- No environment variable holding a secret or the model ID may use the `NEXT_PUBLIC_` prefix.
- Client hooks go in `lib/hooks/` with a `use` prefix (`useChecklist`). The checklist reads and writes one `localStorage` key, `aa:checklist`, with the versioned shape `{ v: 1, items: { [procedureId]: { status, updatedAt } } }`, and ignores or migrates anything else. Items are keyed by procedure, so a procedure has one status across all life events; never key by life event.
- One exported component per file, named like the file.

---

## 6. Styling

The shared `stacks/react` and `design/osnova` rules apply in full. Project specifics:

- The project theme is `app/theme.css`: it overrides Osnova tokens using the token names and values in `06-design-system.md` (`--color-*`, `--space-*`). No other file defines colors, spacing or font stacks.
- Text uses the dark token variants; the soft variants are for backgrounds only (they fail AA as text color).
- App-specific components that Osnova does not have (`PhaseIndicator`, `CheckCard`) live in `components/public/` (admin ones in `components/admin/`), built from Osnova tokens and primitives ([ADR 0010](decisions/0010-build-osnova-as-package.md)). If a second project needs one, propose moving it to Osnova.
- No emoji as icons; use `Icon` with a Lucide name.

---

## 7. Tests

Per [ADR 0009](decisions/0009-testing-stack.md). Every behavior change ships with a test at the right level:

| Level | Tool | Location | Covers |
|---|---|---|---|
| Logic | Vitest | next to the source, `*.test.ts` | dependency phases (topological order), checklist state and storage format, PII redaction, cost display, stale check |
| Database | SQL tests on the local Supabase stack | `supabase/tests/` | every RLS policy (anon cannot read drafts or child rows of drafts, cannot write anything), cycle rejection, audit triggers, `audit_log` immutability |
| Flows | Playwright | `e2e/` | find a life event, follow a procedure, use the checklist |

- Every new RLS policy or trigger comes with a SQL test in the same change.
- Component tests query by role, label or text, never by CSS class.
- Tests never call the real Anthropic API; mock the client at the `lib/ai/` boundary.
- Run tests only through `package.json` scripts.

---

## 8. Git

### 8.1 Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), in English:

```
feat: add procedure dependency cycle check
fix: show stale warning for never-verified procedures
docs: add ADR for catalog-based AI retrieval
test: cover anon access to draft steps
```

Types: `feat`, `fix`, `docs`, `refactor`, `style`, `test`, `chore`.

### 8.2 Branches

```
main                            production, auto-deploy
feature/checklist-local-storage preview deployment on staging data
fix/dependency-cycle-check
```

---

## 9. Formatting and linting

- **Prettier**, default configuration.
- **ESLint 10** with a flat config (`eslint.config.mjs`): Next.js's ESLint config plus `typescript-eslint` recommended. Run it through the `lint` script; `next lint` no longer exists in Next.js 16.
- No custom rules until there is a concrete reason, recorded in the commit that adds them.

---

## 10. Decisions

Significant decisions are ADRs in [`docs/decisions/`](decisions/), written with the `adr` skill. Read the relevant ADR before changing what it covers.

---

## Open questions

1. **Script names.** Default: `lint`, `typecheck`, `test` (Vitest), `test:db` (SQL tests), `test:e2e` (Playwright), `build`. Fix them when `package.json` is created.
2. **Input validation library** for route handlers (for example Zod) is not decided; it is a new dependency and needs an explicit decision.
3. **SQL test tool**: plain SQL scripts or pgTAP (Supabase's `supabase test db` uses pgTAP). ADR 0009 says "SQL tests" only. Default: plain `psql` scripts, as in `supabase/tests/schema_smoke.sql`.

---

## Changes from v1.0

- Added the ai-instructions base layer and removed rules it already covers (ADR 0001).
- Removed the Tailwind and shadcn/ui section; styling now defers to CSS Modules and Osnova rules plus project theme specifics (ADR 0001, 0010).
- Resolved the file-naming contradiction: components PascalCase with co-located `.module.css`, other modules kebab-case.
- Resolved `canOnline` vs `can_online`: database fields stay snake_case from generated types, no mapping layer.
- Fixed checklist labels to "Nije počelo" / "U toku" / "Završeno" keyed by `todo | in_progress | done` (ADR 0011).
- Switched UI copy examples to informal "ti" (ADR 0011).
- Added cost labels per `cost_type` and the never-verified label (ADR 0008, 0011).
- Added data-access rules: service layer, three Supabase clients, handler-side admin checks (ADR 0003, 0004).
- Added money-as-decimal-string rule.
- Defined checklist storage as the single key `aa:checklist`, one status per procedure across events.
- Added a test section per ADR 0009; v1.0 had none.
- Updated ESLint to v10 flat config; `next lint` was removed in Next.js 16.
- Fixed the API contract reference from `.yaml` to `.yml`.
- Translated to English.
