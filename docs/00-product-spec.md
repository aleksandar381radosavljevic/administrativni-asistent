# Administrativni Asistent – Product Specification

- **Version:** 1.1
- **Date:** 2026-10-05
- **Status:** In review
- **Supersedes:** 00-product-spec.md v1.0 (June 2026) and the Word export "Funkcionalna specifikacija v1.0". This Markdown file is the single source of truth ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).

---

## Instructions for AI agents

When implementing anything in this system:

- Use only the entities and business rules defined in this document and in [01-domain-model.md](01-domain-model.md).
- Do not introduce new entities or change business rules without an explicit request; propose options and record the decision as an ADR in [decisions/](decisions/).
- Every procedure, step, document and institution comes from the database. Nothing is hardcoded.
- The interface language is Serbian, Latin script, informal "ti" ([ADR 0011](decisions/0011-content-and-copy-defaults.md)). UI copy examples in this document are quoted in Serbian.
- ADRs in [decisions/](decisions/) override this document where they conflict.

---

## 1. Purpose of this document

This is the functional specification of Administrativni Asistent v1. It describes users, functional and non-functional requirements, business rules, edge cases, the permission model and integrations, precisely enough to implement without further clarification. Features planned for later versions are listed in [§11](#11-out-of-scope-for-v1).

## 2. Product overview

### 2.1 Idea

A responsive web application that explains Serbian administrative procedures to citizens in plain, everyday language.

The user does not need to know the official name of a procedure. It is enough to know what is happening in their life. The app explains what to do, in what order, where to go, what to bring, and how much it costs and how long it takes.

### 2.2 Goals

1. Reduce unnecessary trips to the counter caused by incomplete paperwork.
2. Save the time users spend researching across different websites and institutions.
3. Make it clear and prominent what can be done online and what must be done in person.
4. Guide the user step by step through every procedure, with a progress checklist.
5. Be a source users can trust because content is researched by hand and updated regularly.

### 2.3 How it differs from existing services

| Existing services (eUprava and similar) | Administrativni Asistent |
|---|---|
| Official language: "Promena mesta prebivališta" | The user's language: "Selim se" |
| Information scattered across institutions | Everything in one place, summarized |
| Formal descriptions without clear steps | Step by step, with a checklist |
| Hard to tell what is online vs in person | Clearly marked for every procedure |
| No AI help | AI assistant for free-form questions |

### 2.4 Scope of v1

v1 is a **responsive web app only**. A native mobile app is future work; the mobile documents live in `docs/future/` and are not implementation input ([ADR 0002](decisions/0002-web-only-v1.md)).

v1 includes:

- Life events grouped by category.
- Procedures with steps, documents, costs and processing times.
- Dependencies between procedures within a life event.
- Online / in person / by mail indicator per procedure.
- An AI assistant that answers only from the database.
- Free-text search.
- A checklist without registration, stored in the browser.
- An admin panel for managing all content.
- WCAG 2.2 AA contrast and keyboard access ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)).

---

## 3. Users

### 3.1 Guest (citizen)

The only end user in v1. Not registered and does not need to be.

- A Serbian citizen facing a concrete life situation.
- Not familiar with administrative procedures or official terminology.
- Wants a fast, clear answer without searching several websites.
- Uses the app on a phone or a desktop computer. The audience includes pensioners and people under stress using a phone outdoors, which is why accessibility is in scope.

### 3.2 Administrator

Internal user responsible for creating and updating content. Not an end user of the app but the editor of its knowledge base.

- Creates, edits and archives life events, procedures, institutions and documents.
- Personally researches and verifies the accuracy of every procedure step.
- Updates content regularly and records the date of the last verification.
- Reviews users' AI questions to find missing content.

Admin access is granted manually by setting `app_metadata.role = 'admin'` on the Supabase Auth user. There is no self sign-up ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).

---

## 4. Functional areas and use cases

### 4.1 Life events

- UC-01: The user searches the app with free text.
- UC-02: The user picks a life event from a list grouped by category.
- UC-03: The user sees which procedures to complete and in what order.
- UC-04: The user sees which procedures can run in parallel and which wait for another one.

### 4.2 Procedures

- UC-05: The user opens a procedure and reads its steps.
- UC-06: The user sees what to bring (documents), how much it costs and how long it takes.
- UC-07: The user sees whether the procedure can be done online, in person or by mail.
- UC-08: The user sees institution details: address, working hours, contact, website.

### 4.3 Checklist

- UC-09: The user opens the checklist for a chosen life event.
- UC-10: The user marks progress per procedure: "Nije počelo" / "U toku" / "Završeno" (`todo` / `in_progress` / `done`).
- UC-11: The user sees a warning when marking a procedure whose dependency is not done.

### 4.4 AI assistant

- UC-12: The user asks a question in plain language.
- UC-13: The system recognizes the life event or procedure and answers from the database.
- UC-14: The system says it has no information when the data is not in the database.

### 4.5 Administrator

- UC-15: The admin creates a life event.
- UC-16: The admin creates a procedure with all its elements, including its documents.
- UC-17: The admin links a procedure to a life event and sets its order.
- UC-18: The admin defines dependencies between procedures.
- UC-19: The admin creates and edits an institution.
- UC-20: The admin records the date of a procedure's last verification.
- UC-21: The admin reviews users' AI questions.
- UC-22: The admin reviews stale-content warnings.
- UC-23: The admin manages categories and search synonyms.
- UC-24: The admin reviews the audit log.

The admin endpoints for UC-23 and UC-24 are defined in [03-api-contract.yml](03-api-contract.yml) ([ADR 0003](decisions/0003-full-rest-api.md)).

---

## 5. Functional requirements by module

### 5.1 Life events

**List** (home page):

- All published life events, grouped by category.
- Each event shows: title, short description, icon, number of procedures, and estimated total duration (`life_events.estimated_duration`, free text entered by the admin, e.g. "~2 nedelje") ([ADR 0008](decisions/0008-extend-domain-model.md)).
- An event is listed only if it has at least one visible procedure (see PR-04).

**Detail** (`/dogadjaj/[slug]`):

- The event's procedures in their defined order.
- A visual view of dependencies: what can start now and what waits for another procedure.
- Procedures without dependencies are clearly marked as doable in parallel.
- A link to the event's checklist (`/dogadjaj/[slug]/checklist`).

**Initial categories:**

- Lična dokumenta
- Preseljenje i adresa
- Vozila i saobraćaj
- Deca i obrazovanje
- Posao i firma
- Potvrde, prava i penzija

**Initial set of life events (20):**

1. Istekla mi je lična karta
2. Izgubio/la sam ličnu kartu
3. Istekao mi je pasoš
4. Selim se na novu adresu
5. Prijavljujem boravište
6. Kupujem auto
7. Prodajem auto
8. Registrujem vozilo
9. Kupujem prvu nekretninu
10. Prebacujem ili prijavljujem prebivalište zbog stana/kuće
11. Otvaram firmu
12. Otvaram paušalnu radnju
13. Zatvaram firmu ili preduzetničku radnju
14. Upisujem dete u vrtić
15. Upisujem dete u osnovnu školu
16. Upisujem dete u srednju školu
17. Upisujem se na fakultet ili studiram
18. Tražim posao / prijavljujem se na NSZ
19. Treba mi uverenje o nekažnjavanju
20. Odoh u penziju / rešavam PIO stvari

---

### 5.2 Procedures

The procedure is the central entity. It holds everything the user needs to get through an administrative process on their own. Public page: `/procedura/[slug]`.

**Every procedure contains:**

| Element | Description |
|---|---|
| Title | Name in the user's language |
| Description | Short summary of what the procedure involves |
| Institution(s) | One or more institutions or organizations where it is done |
| Method | Online / in person / by mail; at least one is required |
| Steps | Numbered steps with a description and an optional link |
| Documents | Documents to bring, each marked required or optional; owned by this procedure ([ADR 0005](decisions/0005-documents-per-procedure.md)) |
| Cost | Cost type (`free`, `fixed`, `variable`, `unknown`), amount when fixed, and a description |
| Processing time | Approximate time, free text |
| Official links | Link to the official source and to the form |
| Last verified | Date the admin last verified the content |

**Steps:**

- Each step has an order number, a title, a description and an optional link (e.g. online booking).
- Steps are shown numbered, in their defined order.
- Steps are not tracked individually in the checklist; the checklist tracks whole procedures ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).

**Cost display:**

- `free` is shown as free; `fixed` shows the amount; `variable` and `unknown` say so explicitly.
- An empty amount is never shown as free. Showing "Besplatno" for an unknown cost misleads the user ([ADR 0008](decisions/0008-extend-domain-model.md)).

**Dependencies:**

- A procedure can depend on one or more other procedures within the same life event.
- A dependency means the procedure should not start until the other one is done.
- Procedures without dependencies can be done in parallel.
- The system rejects circular dependencies.
- A dependency on a procedure that is not publicly visible is ignored on public pages, so a user is never blocked by something they cannot see.

**Stale-content warning:**

- A procedure shows a warning with the last verification date when it was last verified more than 6 months ago, **or has never been verified** (`last_verified_at` is null) ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- The warning recommends checking the official source.
- Warnings are computed automatically; nobody tracks them by hand.

---

### 5.3 Search

- Free-text search across life events, procedures and institutions, available to everyone.
- Supports synonyms and slang (e.g. "karton", "papiri za auto").
- Accepts Cyrillic input and text typed without diacritics (e.g. "пасош" and "pasos" find "pasoš") ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- Returns results in under 1 second.
- When there are no results, shows a helpful message with next steps. Never an empty page.

---

### 5.4 Checklist

- Opened for a chosen life event at `/dogadjaj/[slug]/checklist`.
- Lists all of the event's visible procedures with a status: "Nije počelo" / "U toku" / "Završeno".
- Progress is tracked **per procedure**, not per step ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
- A procedure with an unfinished dependency is visually marked as blocked and shows a warning, but the user can still change its status.
- Stored in the browser's `localStorage` under the single key `aa:checklist`, without registration, in one versioned format:
  `{ v: 1, items: { [procedureId]: { status: 'todo' | 'in_progress' | 'done', updatedAt } } }`.
  A procedure with no entry is `todo`.
- Progress survives a page reload.
- The user is told up front that progress is stored only in this browser and is not synced between devices.

---

### 5.5 AI assistant

**Core behavior:**

- Chat interface available without registration.
- Recognizes the life event or procedure from free text, including unexpected phrasing.
- Answers only from database content, never from outside knowledge, and never invents procedures or steps.
- Supports follow-up questions within one conversation: the browser keeps the conversation in memory and sends it with each question; the server stores no conversation ([ADR 0003](decisions/0003-full-rest-api.md)).
- How content is retrieved is defined in [ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md).

**Boundary behavior:**

- Not in the database → "Nemam tu informaciju u bazi znanja. Preporučujem da proveriš direktno kod nadležne institucije."
- Legal advice or interpretation of regulations → the assistant says it cannot give legal advice and points to the responsible institution.
- Personal data in the chat (JMBG, phone number, email, document number) → masked by best-effort pattern redaction before the text is sent to the model or stored ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
- Assistant unavailable (rate limit reached, monthly budget exhausted, provider error) → the user sees a clear message and is pointed to search and the category list.

**Limits:**

- Does not remember conversations between sessions (closing or reloading the chat clears it).
- Cannot change database content.
- Answers only in Serbian.

---

### 5.6 Institutions

- The model calls them institutions; the UI calls them organizations, because they include banks and employers as well as government bodies (`institutions.kind`: `government | bank | employer | other`) ([ADR 0008](decisions/0008-extend-domain-model.md)).
- Public page `/institucija/[slug]`: name, description, address, website, phone, email, working hours.
- Lists the procedures linked to the institution.
- A procedure can be linked to several institutions, and an institution to several procedures.
- Institutions with many branch offices (e.g. MUP police stations) are one institution in v1; the procedure links to the official office locator.

---

### 5.7 Admin panel

All admin writes go through the API with the admin's own session, are enforced by RLS and are written to the audit log by the database ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).

**Life events:**

- Create and edit; no deletion, only archiving.
- Status: Nacrt / Objavljeno / Arhivirano.
- Fields: title, description, category, icon, estimated duration.
- Link procedures and set their order.
- Publishing is refused if PR-04 is not met.

**Procedures:**

- Create and edit; no deletion, only archiving.
- Status: Nacrt / Objavljeno / Arhivirano.
- Manage steps and their order (drag-and-drop or manual sorting).
- Manage the procedure's documents inside the procedure form: name, description, note, required/optional, order. Documents are created and edited only as part of a procedure; there is no separate document catalog ([ADR 0005](decisions/0005-documents-per-procedure.md)).
- Enter cost (type, amount, description), processing time, methods, official links.
- Define dependencies, protected against circular dependencies.
- Link to one or more institutions.
- Record the last verification date.

**Institutions:**

- Create and edit; no deletion, only archiving.
- Fields: name, kind, description, address, website, phone, email, working hours.

**Categories and synonyms:**

- Create and edit categories (name, icon, order).
- Create, edit and remove search synonyms.

**AI questions:**

- List of all (redacted) user questions.
- Most frequent questions.
- Questions the assistant could not answer from the database.
- Questions older than 90 days are deleted automatically ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).

**Stale-content warnings:**

- List of procedures verified more than 6 months ago or never verified, each with its title and last verification date.
- One click from the list to the procedure's edit form.

**Audit log:**

- Read-only list of changes: who, when, which entity, what changed.

---

## 6. Business rules

| ID | Rule |
|---|---|
| PR-01 | Every procedure has at least one step. |
| PR-02 | Every procedure is linked to at least one institution. |
| PR-03 | Every procedure has at least one method: online, in person or by mail. |
| PR-04 | A life event can be published only when it has at least one linked published procedure. A published event whose linked procedures are all unpublished is hidden from public pages. |
| PR-05 | A procedure can exist without a life event, but it is shown publicly only when it is published **and** linked to at least one published life event. This applies to event pages, search, the AI assistant, institution pages and direct URLs ([ADR 0011](decisions/0011-content-and-copy-defaults.md)). |
| PR-06 | The same procedure can belong to several life events. It is referenced, not copied. |
| PR-07 | The admin records the date of every verification. A procedure verified more than 6 months ago, or never verified, shows a stale warning to users. |
| PR-08 | Procedures within a life event have a defined order, shown to the user. |
| PR-09 | A procedure can depend on one or more other procedures within the same life event. |
| PR-10 | The system rejects circular dependencies between procedures. |
| PR-11 | Procedures without dependencies can be done in parallel and are shown that way. |
| PR-12 | The AI uses only database content, never outside knowledge. |
| PR-13 | When the information is not in the database, the system says so clearly and recommends the official source. |
| PR-14 | The AI gives no legal advice and no interpretation of regulations. |
| PR-15 | Personal data typed into the AI chat is masked by best-effort redaction before it is sent to the model or stored; stored questions are deleted after 90 days ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)). |
| PR-16 | The checklist is stored in the browser's `localStorage`, without registration. |
| PR-17 | Checklist progress survives a page reload. |
| PR-18 | The user is told that progress is stored locally and not synced between devices. |

---

## 7. Edge cases

| ID | Situation | System behavior |
|---|---|---|
| ES-01 | The institution changed its rules and the procedure has not been updated. | Stale warning with the last verification date and a recommendation to check the official source. |
| ES-02 | An institution changes its contact details or working hours, or is temporarily closed. | The admin updates the institution independently of its procedures, without touching steps. |
| ES-03 | The same procedure belongs to several life events. | It is referenced everywhere; no duplicates in the database. |
| ES-04 | The user marks a procedure whose dependency is not done. | Warning that names the dependency; no technical block. |
| ES-05 | The admin enters a circular dependency (A→B, B→A). | The system rejects it with a message about the circular dependency. |
| ES-06 | Search returns no results. | Helpful message with next steps (AI assistant, category list). Never an empty page. |
| ES-07 | The user searches with slang ("karton", "papiri za auto"). | Synonyms map to the standard names and relevant results are returned. |
| ES-08 | The user asks the AI about an existing topic in an unexpected way. | The AI tries to match the question to content before saying it has no information. |
| ES-09 | The user asks the AI for legal advice. | The AI says it cannot give legal advice and points to the responsible institution. |
| ES-10 | The user types personal data (JMBG, phone number, email, document number) into the chat. | Best-effort redaction before the model call and before storage (PR-15). |
| ES-11 | The user clears site data or uses a private/incognito window. | Checklist progress is lost (`localStorage` is cleared with site data). The user was told in advance. |
| ES-12 | The user opens the checklist on another device. | Progress is not synced. This is clearly stated in the interface. |
| ES-13 | A procedure's dependency is unpublished or archived. | The dependency is ignored on public pages; the procedure is not shown as blocked. |
| ES-14 | The AI assistant is unavailable (rate limit, budget, provider error). | Clear message; the user is pointed to search and the category list. |

---

## 8. Permission model

| Action | Guest | Administrator |
|---|---|---|
| View published events, procedures and institutions | Yes | Yes |
| Search | Yes | Yes |
| Use the AI assistant | Yes | Yes |
| Use the checklist | Yes | Yes |
| View draft and archived content | No | Yes |
| Create and edit events, procedures, institutions, documents, categories, synonyms | No | Yes |
| Archive and reactivate content | No | Yes |
| Delete content entities | No | No |
| View AI questions | No | Yes |
| View stale-content warnings | No | Yes |
| View the audit log | No | Yes |

**Notes:**

- Content entities (life events, procedures, institutions) are never deleted, only archived. Archived content stays in the database and can be reactivated.
- Link rows (procedure ↔ event, procedure ↔ institution, dependencies) and a procedure's own steps and documents can be removed by the admin; every removal is audited.
- Admin authentication: Supabase Auth. Admin role: JWT `app_metadata.role = 'admin'`, granted manually; no self sign-up.
- Authorization is checked in the route handler and by RLS. Middleware is only a redirect convenience, never the protection ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).

---

## 9. Integrations

### 9.1 Supabase

- Admin authentication (Supabase Auth).
- PostgreSQL database for all content.
- Row Level Security on every table. Public reads use the anon key under RLS; admin writes use the admin's JWT ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).

### 9.2 Anthropic Claude API

- Powers the AI assistant.
- Called only from the server; the API key is never exposed to the client.
- Context contains only database content.
- User text is redacted before it is sent ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).

### 9.3 Sentry

- Error monitoring. Request bodies on the AI route are dropped and Session Replay is off ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).

### 9.4 Out of scope for v1

- eUprava API: not public or reliable; reconsider later.
- Email notifications: no registered users.
- Analytics platform: Supabase data is enough for v1.
- Payments: no monetization.

---

## 10. Non-functional requirements

### 10.1 Performance and availability

| Requirement | Target |
|---|---|
| Page load | < 2 seconds |
| Search response | < 1 second |
| AI assistant response | < 10 seconds |
| Availability | 99% uptime |
| Interface language | Serbian, Latin script |
| Devices | Phone and desktop (responsive web) |
| Browsers | Chrome, Firefox, Safari, Edge (last 2 versions) |
| Accessibility | WCAG 2.2 AA contrast (4.5:1 text, 3:1 UI and focus), full keyboard access ([ADR 0001](decisions/0001-apply-all-ai-instructions-layers.md)) |

Hosting is Vercel. The 99% target needs a paid Supabase plan in production: the free tier pauses inactive projects and has no backups.

### 10.2 Security

- Only administrators can change content.
- HTTPS on every environment.
- API keys and the Supabase service role key never reach the client. The service role is used only in the AI route, for the `ai_queries` insert and the rate-limit counter ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md); see [04 §5.2](04-architecture.md#52-supabase-clients)).
- RLS on every table; anonymous users can read only published content and write nothing.
- Admin access granted manually.
- Rate limiting stores a salted hash of the IP address, never the raw IP ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).

### 10.3 Audit

- Every content change is logged by a database trigger: who changed it, when, and what changed.
- The audit log is readable only by administrators and is append-only for every role.

### 10.4 Content maintainability

- The admin can update every part of a procedure without technical help or access to the code.
- Stale-content warnings are automatic.
- Published changes are visible on public pages right after saving (on-demand revalidation), not after a cache timeout.

---

## 11. Out of scope for v1

Deliberately excluded; planned for later versions:

| Feature | Reason |
|---|---|
| User registration | Adds complexity without proportional value in v1; the checklist works without it |
| Checklist sync between devices | Requires registration |
| Email notifications | No registered users |
| Favorites | Requires registration |
| Native mobile app | Responsive web covers v1; see `docs/future/` ([ADR 0002](decisions/0002-web-only-v1.md)) |
| Notifications about procedure changes | Requires registration |
| Automatic link checking | Manual verification is enough in v1 |
| Full WCAG audit | v1 meets AA contrast and keyboard access; a full audit comes later |
| Multiple languages | Serbian only in v1 |
| eUprava integration | API is not public |
| Analytics platform | Supabase is enough for v1 |
| Shared document catalog | Documents are per procedure in v1 ([ADR 0005](decisions/0005-documents-per-procedure.md)) |
| Branch offices per institution | One institution plus a link to the official locator ([ADR 0008](decisions/0008-extend-domain-model.md)) |

---

## 12. Glossary

| Term (Serbian UI term) | Definition |
|---|---|
| Life event (životni događaj) | A life situation in the user's words (e.g. "Selim se"). Groups several procedures. |
| Procedure (procedura) | A concrete administrative process (e.g. "Prijava prebivališta"). The central entity. |
| Step (korak) | A single action within a procedure, shown numbered. |
| Document (dokument) | Something the user brings for a procedure; belongs to exactly one procedure. |
| Institution (organizacija) | A government body, bank, employer or other party where a procedure is done. |
| Dependency (zavisnost) | A link between two procedures in a life event: one should not start until the other is done. |
| Checklist | The list of a life event's procedures with per-procedure progress. |
| Draft (nacrt) | Content in preparation; not visible to users. |
| Archived (arhivirano) | Withdrawn content; stays in the database, not visible to users, can be reactivated. |
| Stale (zastarelo) | A procedure last verified more than 6 months ago, or never verified. |
| Synonym (sinonim) | An informal term users type instead of the official name (e.g. "karton" = izvod iz matične knjige). |
| RLS | Row Level Security: database-level access control on individual rows. |

---

## Open questions

1. **PR-04 enforcement detail.** This doc (and the schema's publish check in 01) requires at least one linked published procedure at publish time and hides events that later lose all visible procedures. Confirm, or relax to "at least one linked procedure".

---

## Changes from v1.0

- Translated to English; UI copy stays Serbian, Latin script, informal "ti" (e.g. "proveriš" instead of "proverite") per ADR 0011.
- Merged substance only in the Word export: document purpose, differentiators table, v1 scope list, step links, "archived content can be reactivated", sorting by drag-and-drop, maintainability requirements (§10.4), ES-02 "temporarily closed", ES-10 examples; noted Markdown as the single source of truth (ADR 0011).
- Scope: web only, mobile moved to `docs/future/` (ADR 0002).
- WCAG moved from out of scope to v1 AA contrast and keyboard access (ADR 0001).
- §5.7 documents reworded: created and edited inside the procedure form, no catalog (ADR 0005).
- PR-05 follows the .md version and now covers search, AI, institution pages and direct URLs; the Word "directly published" variant is dropped (ADR 0011).
- Checklist is per procedure, not per step (Word 4.2.2 dropped), with one versioned `localStorage` format and fixed status enum (ADR 0011).
- Stale warning now also applies to never-verified procedures (ADR 0011).
- Public routes named: `/dogadjaj/[slug]`, `/procedura/[slug]`, `/institucija/[slug]`, `/dogadjaj/[slug]/checklist` (ADR 0011).
- Added institution address, kind ("organizations" in the UI), `cost_type`, and life event `estimated_duration`; empty cost no longer means free (ADR 0008).
- PR-15, ES-10 and §9.2 reworded to best-effort redaction with 90-day retention, since raw text was stored and sent (ADR 0007).
- AI follow-up questions made possible by sending conversation history from the client (ADR 0003); retrieval references ADR 0006.
- Admin role, RLS, audit trigger and "middleware is not authorization" made explicit (ADR 0004).
- Added admin use cases and panel sections for categories, synonyms and the audit log, which existed in the model but had no screens (ADR 0003).
- Clarified "never delete": content entities are archived, link rows can be removed and are audited (report §3).
- Dependencies on non-public procedures are ignored publicly, so users are never stuck behind an invisible step; added ES-13.
- Added ES-14 for an unavailable AI assistant (rate limit, budget), which had no defined behavior.
- PR-04 made consistent with UF-01 A2.
- ES-11 says "site data / localStorage" instead of "cookies".
- Search accepts Cyrillic and text without diacritics (ADR 0011).
- Hosting fixed to Vercel (Word said "Vercel or Netlify"); noted that 99% uptime needs a paid Supabase plan.
- Changes become visible on save (on-demand revalidation), matching UF-09 "immediately" instead of a 1-hour cache.
- Added Sentry to integrations with body scrubbing (ADR 0007).
