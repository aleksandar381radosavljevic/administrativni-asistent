# Domain model: Administrativni Asistent

- Version: 1.1
- Date: 2026-10-05
- DDL: [01-domain-model.sql](01-domain-model.sql), a documented copy of the migration [`supabase/migrations/20261006120000_initial_schema.sql`](../supabase/migrations/20261006120000_initial_schema.sql). A unit test keeps the two identical; change both together.
- Tests: [supabase/tests/schema_smoke.sql](../supabase/tests/schema_smoke.sql)

## Rules for AI agents

- `procedures` is the central entity. Everything else references or extends it.
- Life events, institutions and procedures are never deleted. They move to `status = 'archived'`. Steps, documents, synonyms and link rows can be deleted by an admin, and every delete is audited.
- A procedure is referenced from several life events through `life_event_procedures`. It is never copied.
- Circular dependencies in `procedure_dependencies` are rejected by the database.
- RLS is on for every table. The public sees only published content, and a procedure only when it is published **and** linked to a published life event (PR-05).
- Admins write with their own JWT (`app_metadata.role = 'admin'`), never with the service role ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).
- Changing the model needs the owner's explicit approval. Update this document, the `.sql` file, the API contract (03) and the smoke test together.

## Principles

| Principle | How it is enforced | Why |
|---|---|---|
| Central entity: `procedures` | All content hangs off procedures | One place to keep each procedure correct |
| Soft delete for content | No DELETE privilege on `life_events`, `institutions`, `procedures`, `categories`; FKs have no `ON DELETE CASCADE` from content | Citizens' bookmarks and the audit trail stay valid |
| No duplicates | Procedures are linked to events, not copied | One edit updates every event (PR-06) |
| Dependencies stay inside one event and have no cycles | Composite FKs plus a trigger with a recursive CTE | Two independent checks; the app cannot forget them |
| Publish rules live in the database | Deferred constraint triggers | Holds no matter which route or script writes |
| Every content change is audited | Triggers write `audit_log` with `auth.uid()` | The database records who changed what, even if a route has a bug |
| Personal data is minimized | Redacted AI text, salted IP hash, 90-day retention | PR-15 and [ADR 0007](decisions/0007-redact-pii-in-ai-chat.md) |

## Entities

Common columns: every table has `id uuid` (PK, `gen_random_uuid()`) unless it is a link table, plus `created_at` and `updated_at` (`timestamptz`, NOT NULL). A trigger sets `updated_at` on every update. Every `slug` must match `^[a-z0-9]+(-[a-z0-9]+)*$` (lowercase ASCII, hyphens), so URLs never contain diacritics.

### categories

Groups life events for navigation. No status; a category is public while it contains at least one published life event. Admins create and edit categories but do not delete them (the API has no delete).

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| name | varchar(100) | NN, UQ | Category name |
| slug | varchar(100) | NN, UQ | URL identifier |
| icon | varchar(100) | | Lucide icon name in kebab-case, rendered by Osnova `Icon` (e.g. `id-card`) |
| sort_order | integer | NN, default 0 | Display order |
| created_at, updated_at | timestamptz | NN | |

### life_events

A life situation in the citizen's words ("Selim se"). Ordered container for procedures. Public route: `/dogadjaj/[slug]`, checklist at `/dogadjaj/[slug]/checklist`.

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| category_id | uuid | FK → categories, NN | |
| title | varchar(200) | NN | Everyday language, not official terms |
| description | text | | Short description for lists |
| icon | varchar(100) | | Lucide icon name in kebab-case, rendered by Osnova `Icon` (e.g. `house`); see 06 §10.2 |
| slug | varchar(200) | NN, UQ | |
| estimated_duration | text | | Admin-entered total, e.g. "~2 nedelje" ([ADR 0008](decisions/0008-extend-domain-model.md)). Not computed, because `processing_time` is free text |
| status | content_status | NN, default draft | Publishing requires at least one linked published procedure (PR-04) |
| sort_order | integer | NN, default 0 | Order within the category |
| created_at, updated_at | timestamptz | NN | |
| search_vector | tsvector | generated | Normalized title (weight A) and description (B) |

### institutions

An organization responsible for procedures. Despite the table name, it covers government bodies, banks, employers and others; the UI calls them organizations ([ADR 0008](decisions/0008-extend-domain-model.md)). Branch offices (e.g. police stations) are not modeled in v1: the procedure links to the official office locator. Public route: `/institucija/[slug]`.

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| name | varchar(200) | NN, UQ | Full name |
| slug | varchar(200) | NN, UQ | |
| kind | institution_kind | NN, default government | `government \| bank \| employer \| other` |
| description | text | | |
| address | text | | Head office address, free text |
| website | varchar(500) | | |
| phone | varchar(50) | | |
| email | varchar(200) | | |
| working_hours | text | | Free text |
| status | content_status | NN, default draft | |
| created_at, updated_at | timestamptz | NN | |
| search_vector | tsvector | generated | Normalized name (A) and description (B) |

### procedures (central entity)

One concrete administrative procedure. Public route: `/procedura/[slug]`.

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| title | varchar(200) | NN | Citizen's wording |
| description | text | | What the procedure involves |
| slug | varchar(200) | NN, UQ | |
| can_online | boolean | NN, default false | Can be completed online |
| can_in_person | boolean | NN, default true | Can be completed in person |
| can_by_mail | boolean | NN, default false | Can be completed by mail |
| cost_type | cost_type | NN, default unknown | `free \| fixed \| variable \| unknown` ([ADR 0008](decisions/0008-extend-domain-model.md)) |
| cost_amount | numeric(10,2) | ≥ 0 | RSD. Required for `fixed`, NULL for every other type. The API sends it as a decimal string ("5800.00") |
| cost_description | text | | Explains variable costs, or several items (fee plus form) |
| processing_time | varchar(200) | | Free text, e.g. "do 15 dana" |
| official_link | varchar(500) | | Official source |
| form_link | varchar(500) | | Form download |
| status | content_status | NN, default draft | |
| last_verified_at | timestamptz | | Last admin check. NULL or older than 6 months → stale warning (PR-07, [ADR 0011](decisions/0011-content-and-copy-defaults.md)) |
| created_at, updated_at | timestamptz | NN | |
| created_by | uuid | FK → auth.users, ON DELETE SET NULL | Set by trigger from `auth.uid()` |
| updated_by | uuid | FK → auth.users, ON DELETE SET NULL | Set by trigger from `auth.uid()` |
| search_vector | tsvector | generated | Normalized title (A) and description (B) |

Checks:
- `can_online OR can_in_person OR can_by_mail` (PR-03).
- `(cost_type = 'fixed') = (cost_amount IS NOT NULL)`. Why: the UI shows "Besplatno" only for `free`; an unknown cost must never look free.

### steps

Ordered steps of a procedure. A published procedure needs at least one (PR-01).

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| procedure_id | uuid | FK → procedures, NN | |
| sort_order | integer | NN; UQ with procedure_id (deferred) | Position. Deferred unique so a reorder can swap positions in one transaction |
| title | varchar(300) | NN | Short step title |
| description | text | NN | What to do |
| link_url | varchar(500) | | Optional link (e.g. booking page) |
| link_label | varchar(200) | | Link text |
| created_at, updated_at | timestamptz | NN | |

### documents

Documents the citizen prepares. Each document belongs to one procedure and is edited inside the procedure form ([ADR 0005](decisions/0005-documents-per-procedure.md)).

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| procedure_id | uuid | FK → procedures, NN | |
| name | varchar(300) | NN | e.g. "Lična karta" |
| description | text | | Where to get it, what it must contain |
| is_required | boolean | NN, default true | true = required, false = optional |
| note | text | | e.g. original only, not older than 6 months |
| sort_order | integer | NN; UQ with procedure_id (deferred) | |
| created_at, updated_at | timestamptz | NN | |

### synonyms

Jargon mapped to a standard term for search (ES-07), e.g. "karton" → "izvod iz matične knjige rođenih". Admin has full CRUD.

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| term | varchar(200) | NN, unique after normalization | What users type. "Karton", "karton" and "картон" are one synonym |
| maps_to | varchar(200) | NN | Standard term searched in its place. Should reuse words from the target's title |
| created_at, updated_at | timestamptz | NN | |
| search_vector | tsvector | generated | Normalized term |

### audit_log

Append-only history of content changes, written only by triggers.

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| entity_type | varchar(100) | NN | Table name (`procedures`, `life_event_procedures`, ...) |
| entity_id | uuid | NN | Row id. For `life_event_procedures` and `procedure_dependencies` the life event id; for `procedure_institutions` the procedure id |
| action | audit_action | NN | `create \| update \| archive \| delete` |
| changed_by | uuid | | `auth.uid()` of the admin. NULL only for changes by the database owner (migrations, seeds). No FK, so history survives a deleted account |
| changed_at | timestamptz | NN, default now() | |
| diff | jsonb | | `{"field": {"old": ..., "new": ...}}` for changed fields. Insert has `old: null`, delete has `new: null`. `updated_at` and `search_vector` are left out |

### ai_queries

Questions sent to the AI assistant, stored only after redaction ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)). The AI route inserts with the service role; admins read them in the admin panel (UF-10). Rows older than 90 days are deleted daily.

| Field | Type | Constraint | Description |
|---|---|---|---|
| id | uuid | PK | |
| query_text | text | NN, 1–2000 chars, no run of 13 digits | Text **after** best-effort redaction of JMBG, phone numbers, emails and document numbers. The 13-digit check is a backstop, not the redaction. The API caps a chat message at 1000 characters (03), well inside this limit |
| was_answered | boolean | NN, default false | From the model's structured output ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md)) |
| matched_event_id | uuid | FK → life_events, ON DELETE SET NULL | Event the question matched, if any |
| created_at | timestamptz | NN | |

No IP address or IP hash is stored with the question, so a question cannot be linked back to a client.

### ai_rate_limits

Hourly AI request counter per client. Why a table: in-memory counters on serverless instances are per instance and reset on cold start, so they limit nothing.

| Field | Type | Constraint | Description |
|---|---|---|---|
| ip_hash | text | PK part, `^[0-9a-f]{64}$` | Salted SHA-256 (HMAC with a daily-rotating salt, see 04 §4.4) of the client IP, lowercase hex. The check rejects raw IPs |
| window_start | timestamptz | PK part | `date_trunc('hour', now())` |
| count | integer | NN, ≥ 0 | Requests in this window |

`public.ai_rate_limit_hit(p_ip_hash text, p_limit int) returns boolean` does one atomic upsert and returns `true` while the client is within the limit, `false` once over it. Only the service role can execute it or touch the table.

## Link tables (N:M)

### life_event_procedures

| Field | Type | Constraint | Description |
|---|---|---|---|
| life_event_id | uuid | PK, FK → life_events | |
| procedure_id | uuid | PK, FK → procedures | |
| sort_order | integer | NN; UQ with life_event_id (deferred) | Position inside the event (PR-08) |

### procedure_institutions

| Field | Type | Constraint | Description |
|---|---|---|---|
| procedure_id | uuid | PK, FK → procedures | |
| institution_id | uuid | PK, FK → institutions | |
| note | text | | e.g. "online preko portala MUP-a, lično u PU" |

A published procedure needs at least one institution (PR-02).

### procedure_dependencies

Dependencies between procedures inside one life event (PR-09). A dependency is advice, not a block: the checklist warns when a citizen marks a procedure whose dependency is not done (ES-04).

| Field | Type | Constraint | Description |
|---|---|---|---|
| life_event_id | uuid | PK | |
| procedure_id | uuid | PK | The dependent procedure |
| depends_on_id | uuid | PK | The procedure to finish first |

- `(life_event_id, procedure_id)` and `(life_event_id, depends_on_id)` are FKs to `life_event_procedures`, so both procedures must be in the same event. Removing a procedure from an event removes its dependencies in that event (cascade, audited).
- `procedure_id <> depends_on_id`.
- A trigger rejects cycles (PR-10, ES-05) with SQLSTATE `23514` and the message prefix `circular dependency`; the API maps it to 409 `circular_dependency` (03).

## Enum types

| Enum | Values | Notes |
|---|---|---|
| content_status | `draft`, `published`, `archived` | Draft: in preparation. Published: public. Archived: withdrawn, kept |
| audit_action | `create`, `update`, `archive`, `delete` | `archive` = status changed to archived. `delete` = step, document, synonym or link row removed |
| institution_kind | `government`, `bank`, `employer`, `other` | |
| cost_type | `free`, `fixed`, `variable`, `unknown` | |

## Relationships

| From | Cardinality | To | Note |
|---|---|---|---|
| categories | 1 : N | life_events | |
| life_events | N : M | procedures | Through `life_event_procedures` |
| procedures | N : M | institutions | Through `procedure_institutions` |
| procedures | 1 : N | steps | At least one when published |
| procedures | 1 : N | documents | Zero or more |
| procedures | N : M | procedures | Through `procedure_dependencies`, scoped to a life event |
| ai_queries | N : 1 | life_events | Optional match |
| audit_log | N : 1 | auth.users | Logical link only (no FK) |

## Public visibility

Applies to `anon` and to signed-in non-admins. Implemented as RLS policies; visibility helpers are `SECURITY DEFINER` functions in the `private` schema so policies can check related tables without recursing into their policies.

| Table | Visible when |
|---|---|
| categories | It has at least one published life event |
| life_events | `status = 'published'` |
| procedures | Published **and** linked to at least one published life event (PR-05). Applies to direct URLs and search too |
| institutions | `status = 'published'` |
| steps, documents | Their procedure is visible |
| life_event_procedures | Event published and procedure visible |
| procedure_institutions | Procedure visible and institution published |
| procedure_dependencies | Event published and **both** procedures visible. Why: the checklist must never wait on a procedure the citizen cannot see |
| synonyms | Always (search vocabulary, no draft state) |
| audit_log, ai_queries, ai_rate_limits | Never |

## Writes, roles and audit

Roles follow [ADR 0004](decisions/0004-admin-writes-with-user-jwt.md).

| Role | Content tables | audit_log | ai_queries | ai_rate_limits |
|---|---|---|---|---|
| anon | Read public rows | None | None | None |
| authenticated, not admin | Read public rows | No rows | No rows | None |
| admin (`app_metadata.role = 'admin'`) | Read all; insert and update all; delete only steps, documents, synonyms, link rows | Read | Read | None |
| service_role | Read only; content writes rejected | None | Insert, select | Through `ai_rate_limit_hit` and the purge job |

- `private.is_admin()` is a `STABLE` SQL function reading `auth.jwt() -> 'app_metadata' ->> 'role'`. Policies call it as `(SELECT private.is_admin())`, so it runs once per statement. `app_metadata` is set server-side only; there is no self sign-up for admins.
- TRUNCATE is revoked from API roles, because TRUNCATE ignores RLS. Supabase grants it by default.
- A `BEFORE` trigger on every content table rejects writes from `anon`, `authenticated` or `service_role` without an admin JWT. Why: RLS already stops anon and non-admins, but the service role bypasses RLS, and this keeps it out of content.
- An `AFTER` trigger on every content table writes one `audit_log` row per changed row, with `auth.uid()` as `changed_by`. No-op updates are not logged.
- `audit_log` has no INSERT, UPDATE or DELETE privilege for any API role, and a trigger rejects UPDATE, DELETE and TRUNCATE even for the table owner.

## Business rules in the database

| ID | Rule | Enforcement |
|---|---|---|
| PR-DB-01 | A published procedure has at least one step (PR-01) | Deferred constraint trigger, checked at commit |
| PR-DB-02 | A published procedure has at least one institution (PR-02) | Deferred constraint trigger |
| PR-DB-03 | At least one of `can_online`, `can_in_person`, `can_by_mail` (PR-03) | CHECK |
| PR-DB-04 | A published life event has at least one linked **published** procedure (PR-04). Also blocks removing or archiving its last one | Deferred constraint triggers on `life_events`, `procedures`, `life_event_procedures` |
| PR-DB-05 | No circular dependencies (PR-10) | `BEFORE INSERT OR UPDATE` trigger, recursive CTE, `pg_advisory_xact_lock` per life event so two concurrent inserts cannot each add half a cycle |
| PR-DB-06 | Dependencies stay inside one life event (PR-09) | Composite FKs to `life_event_procedures` |
| PR-DB-07 | `audit_log` is append-only | No privileges plus a rejecting trigger |
| PR-DB-08 | Life events, institutions, procedures and categories are never deleted | No DELETE privilege; archive instead |
| PR-DB-09 | RLS on every table; public sees only visible content | Policies above |
| PR-DB-10 | Fixed cost has an amount; other cost types do not | CHECK |
| PR-DB-11 | `ai_queries` older than 90 days are deleted | `private.purge_expired_ai_data()`, daily pg_cron job `purge-expired-ai-data` |

Why deferred: an admin route can create an event, link procedures and publish it in one transaction, or replace an event's whole procedure list, without tripping the rule halfway through. Rule violations raise SQLSTATE `23514` with a hint; the API returns them as validation errors (422), except a dependency cycle, which is 409.

## Search

Decided in [ADR 0011](decisions/0011-content-and-copy-defaults.md): content is in Latin script, and search accepts Cyrillic and text without diacritics.

- `public.aa_normalize(text)` converts Cyrillic to Latin, `đ` to `dj`, strips diacritics with `unaccent`, and lowercases. So `pasoš`, `pasos`, `пасош` and `ПАСОШ` become the same token, and `rodjenih` equals `rođenih`.
- Why normalize before the `serbian` configuration instead of adding `unaccent` to it: the serbian stemmer transliterates Cyrillic but outputs diacritics, and a filtering dictionary such as `unaccent` cannot run after the stemmer. Normalizing first makes all inputs identical before stemming.
- `search_vector` columns (generated) on `life_events`, `procedures`, `institutions` and `synonyms` use `to_tsvector('serbian', aa_normalize(...))`, GIN-indexed.
- `pg_trgm` trigram indexes on normalized titles catch typos and partial words.
- `public.search_content(q text, max_results int default 20)` returns `(kind, id, slug, title, rank)` with `kind` in `life_event | procedure | institution`. It combines full-text match, trigram word similarity and synonyms: a query that hits a synonym's `term` also searches its `maps_to`. It runs as `SECURITY INVOKER`, so results pass through the caller's RLS and never include drafts or unlinked procedures. Maximum 50 results.
- The AI assistant does not use this search for retrieval ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md)).

## AI data and retention

- The AI route redacts personal data before the Anthropic call and before the insert. Redaction is best-effort ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
- Rate limiting uses `ai_rate_limits` with a salted IP hash, never the raw IP. The limit value is configured in the AI route.
- `private.purge_expired_ai_data()` deletes `ai_queries` older than 90 days and rate-limit windows before the current hour. The schema schedules it daily at 03:17 with pg_cron when the extension is available. On Supabase, enable pg_cron under Database > Extensions before applying the migration; otherwise the migration prints a notice and the job must be created before production.

## Indexes

| Table | Columns | Reason |
|---|---|---|
| life_events | status; (category_id, status) | Public list grouped by category |
| life_events, procedures, institutions, synonyms | `search_vector` (GIN) | Full-text search |
| life_events, procedures, institutions, synonyms | `aa_normalize(title/name/term)` (GIN trigram) | Typo-tolerant search |
| synonyms | `aa_normalize(term)` unique | One synonym per normalized term |
| procedures | status; `last_verified_at NULLS FIRST` | Stale list, never-verified first |
| steps, documents, life_event_procedures | (parent, sort_order) unique | Ordered display |
| life_event_procedures | procedure_id | Visibility check and "used in events" |
| procedure_institutions | institution_id | Institution page |
| procedure_dependencies | (life_event_id, depends_on_id) | Second composite FK |
| audit_log | (entity_type, entity_id); changed_at | History per entity, timeline |
| ai_queries | (was_answered, created_at); created_at; matched_event_id | Admin filter, retention |
| ai_rate_limits | window_start | Cleanup |

## Testing

[supabase/tests/schema_smoke.sql](../supabase/tests/schema_smoke.sql) is the start of the SQL test suite from [ADR 0009](decisions/0009-testing-stack.md). It runs in one rolled-back transaction and proves, among other things: anon cannot read drafts, steps or documents of hidden procedures, `ai_queries`, `audit_log` or `ai_rate_limits`; anon and non-admins cannot write; admin writes are audited with the admin's id; cycles, cross-event dependencies and publishing an empty event are rejected; the service role cannot write content; retention and the rate limit work; `pasos` and `пасош` find "Izdavanje pasoša". Every new policy or trigger needs a check there. How to run it: [supabase/tests/README.md](../supabase/tests/README.md).

## Open questions

Defaults chosen here; each can be changed without touching the rest of the model.

1. **Synonym target.** `maps_to` is free text, as in the API contract, so renaming a procedure can make a synonym stop matching. Alternative: point a synonym at a life event or procedure id. Default: free text; the admin synonym screen should show what each synonym currently finds.
2. **Empty categories** are hidden from the public. Alternative: show every category. Default: hide, so the home page never shows an empty group.
3. **Institutions** are public when published, even if no public procedure links to them. Default kept because institution pages are useful on their own (ES-02).
4. **Rate-limit window** is a fixed hour per salted IP hash. Mobile carriers in Serbia use CGNAT, so many users can share one IP; the limit value and salt rotation are set in the AI route (see 04).
5. **Multi-item costs** (fee plus form) are described in `cost_description`, not as separate rows. Revisit if admins need itemized totals.
6. **Audit actor for seeds.** Changes run by the database owner have `changed_by = NULL`. Alternative: a dedicated system user id. Default: NULL, documented on the column.

## Changes from v1.0

- Rewritten in English; UI examples stay Serbian ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)).
- Enabled RLS on `ai_queries` and `audit_log`; anon could read, write and delete both.
- Replaced `USING (true)` on steps, documents and link tables with checks on the parent's visibility; draft steps were public.
- Public procedures now require a published life event (PR-05, [ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- Hid dependencies on non-public procedures, which left checklists blocked forever.
- Added admin write policies via `private.is_admin()` on `app_metadata.role` ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)); v1.0 had none.
- Added audit triggers with `auth.uid()`; `changed_by` is nullable only for owner-run migrations, and `audit_log` is append-only by privileges and trigger.
- Revoked TRUNCATE and unneeded privileges from API roles, because Supabase grants them by default.
- Blocked content writes by the service role ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).
- Implemented cycle prevention as a trigger with an advisory lock; v1.0 had only a commented-out CTE.
- Added composite FKs so dependencies stay inside their life event.
- Enforced PR-04 (and PR-01/PR-02 at publish time) with deferred constraint triggers; v1.0 enforced none.
- Removed `ON DELETE CASCADE` from content parents and stated which rows can be deleted; this resolves the conflict between PR-DB-06 and the API's link deletes.
- Added `delete` to `audit_action` for removed child and link rows.
- Added the `updated_at` trigger; the column never changed before.
- Set `procedures.created_by` and `updated_by` by trigger.
- Added `institutions.address`, `institutions.kind`, `procedures.cost_type` and `life_events.estimated_duration` ([ADR 0008](decisions/0008-extend-domain-model.md)).
- Fixed the `can_in_person` comment ("can", not "must").
- Defined NULL `last_verified_at` as stale ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- Added unique `sort_order` per event, procedure steps and documents.
- Added slug format checks.
- Made synonyms unique after normalization.
- Added Cyrillic and no-diacritic search: `aa_normalize`, serbian stemmer, `pg_trgm` and `search_content` ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- `ai_queries` stores only redacted text, adds a 13-digit backstop check, renames `matched_event` to `matched_event_id` and has 90-day retention ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
- Added `ai_rate_limits` with a salted IP hash and an atomic `ai_rate_limit_hit`, replacing the in-memory limit.
- Added indexes for foreign keys, search and retention.
- Added the SQL smoke test ([ADR 0009](decisions/0009-testing-stack.md)).
