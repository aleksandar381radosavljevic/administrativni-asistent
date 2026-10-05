# User Flows – Administrativni Asistent

- **Version:** 1.1
- **Date:** 2026-10-05
- **Status:** In review
- **Supersedes:** 02-user-flows.md v1.0 (June 2026) and the Word export "User Flows v1.0". This Markdown file is the single source of truth ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).

---

## Instructions for AI agents

- Each flow defines the exact order of actions between actors.
- Alternative scenarios are part of every flow. Do not implement only the happy path.
- Links between flows are in the matrix at the end of this document.
- UF-01 to UF-07 are for the unregistered user; UF-08 to UF-10 are only for an authenticated administrator.
- Business rules (PR-xx) and edge cases (ES-xx) are defined in [00-product-spec.md](00-product-spec.md). UI copy is Serbian, Latin script, informal "ti".

---

## Actors

| Actor | Description |
|---|---|
| User | A citizen using the app without registration |
| Administrator | Internal user who enters and maintains content; JWT `app_metadata.role = 'admin'` ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)) |
| System | The application and the AI assistant, reacting to users and administrators |

---

## Flow list

| ID | Name | Actor | Group |
|---|---|---|---|
| UF-01 | Find a life event from the list | User | Finding information |
| UF-02 | Find information by search | User | Finding information |
| UF-03 | Ask the AI assistant | User | Finding information |
| UF-04 | View a procedure | User | Finding information |
| UF-05 | Open and use the checklist | User | Tracking progress |
| UF-06 | Mark a procedure's progress | User | Tracking progress |
| UF-07 | Run into a blocked procedure | User | Tracking progress |
| UF-08 | Create a procedure | Administrator | Content management |
| UF-09 | Define dependencies between procedures | Administrator | Content management |
| UF-10 | Review AI questions and stale-content warnings | Administrator | Content management |

"Visible procedure" below means a procedure that is published and linked to at least one published life event (PR-05).

---

## Group 1 – Finding information

### UF-01 – Find a life event from the list

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user opens the app and wants the procedures for their life situation |
| **Preconditions** | The app is available. At least one published life event exists |
| **Outcome (success)** | The user sees the procedures for the chosen event and understands what to do |

**Main flow:**

1. **User** opens the app.
   → System shows the home page with categories and life events.
2. **User** looks through the categories and picks one (e.g. "Preseljenje i adresa").
   → System shows the life events in that category.
3. **User** picks the life event that matches their situation (e.g. "Selim se na novu adresu").
   → System opens `/dogadjaj/[slug]`.
4. **System** shows the event's visible procedures in order, the dependencies between them, and the event's estimated duration (`life_events.estimated_duration`).
5. **User** picks a procedure to read the details.
   → System opens `/procedura/[slug]` with steps, documents, cost and institutions (UF-04).

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | The user cannot find a matching event in the list | The user switches to search (UF-02) or the AI assistant (UF-03) |
| A2 | A life event has no visible procedures | The event is not shown in the list (PR-04) |
| A3 | The user opens an event URL that is draft, archived or unknown | System shows a not-found page with links to the home page and search |

---

### UF-02 – Find information by search

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user knows what they want but not where it is in the navigation, or uses an informal term |
| **Preconditions** | The app is available |
| **Outcome (success)** | The user sees relevant results and picks the right item |

**Main flow:**

1. **User** types a term into the search field (e.g. "pasoš", "karton", "papiri za auto").
   → System matches synonyms and slang to standard names. Cyrillic input and text without diacritics (e.g. "pasos") are matched too ([ADR 0011](decisions/0011-content-and-copy-defaults.md)).
2. **System** shows results in under 1 second, grouped by type: life events, procedures, institutions. Only public content is returned (PR-05).
3. **User** picks an item.
   → System opens its page.

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | No results | System shows a helpful message and suggests the AI assistant or the category list. Never an empty page (ES-06) |
| A2 | The user types a synonym (e.g. "karton") | Results are shown as if the standard term had been typed (ES-07) |

---

### UF-03 – Ask the AI assistant

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user wants an answer in plain language without navigating |
| **Preconditions** | The AI assistant is available |
| **Outcome (success)** | The user gets a concrete answer from the database, or a clear statement that the information does not exist |

**Main flow:**

1. **User** opens the AI assistant chat.
   → System shows the message input.
2. **User** types a question in plain language (e.g. "Preselio sam se iz Novog Sada u Beograd, šta treba da uradim?").
3. **System** masks personal data in the text (best-effort redaction) before anything leaves the request ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
4. **System** identifies the matching life events or procedures from the catalog of visible content, then loads their details ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md)).
5. **System** answers only from the loaded content, with the relevant procedures, steps and links to their pages and institutions.
6. **System** stores the redacted question with whether it was answered and the matched event, for UF-10.
7. **User** reads the answer and may ask a follow-up.
   → The browser sends the conversation so far with the new question; the system answers from the same database content. The server keeps no conversation ([ADR 0003](decisions/0003-full-rest-api.md)).

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | The information is not in the database | System answers: "Nemam tu informaciju u bazi znanja. Preporučujem da proveriš direktno kod nadležne institucije." It does not make anything up (PR-12, PR-13) |
| A2 | The user asks for legal advice or an interpretation of the law | System says it cannot give legal advice and points to the responsible institution (PR-14, ES-09) |
| A3 | The user types personal data (JMBG, phone number, email, document number) | The data is masked before the model call and before storage, on a best-effort basis (PR-15, ES-10) |
| A4 | The question is about an existing topic but phrased unexpectedly | System tries to match it to content before saying it has no information (ES-08) |
| A5 | Rate limit reached, monthly budget exhausted or provider error | System shows a clear message that the assistant is unavailable right now and points to search and the category list (ES-14) |
| A6 | The user reloads the page or closes the chat | The conversation is gone; the next question starts fresh (5.5 "does not remember between sessions") |

---

### UF-04 – View a procedure

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user found a procedure and wants all the details |
| **Preconditions** | The procedure is visible: published and linked to at least one published life event (PR-05) |
| **Outcome (success)** | The user knows what to do, what to bring, where to go, and how much it costs and how long it takes |

**Main flow:**

1. **User** opens `/procedura/[slug]`, directly or from a life event, search or the AI assistant.
2. **System** shows: title, description, steps, documents (required/optional), cost, processing time, online / in person / by mail indicator, institutions with address, working hours and contact, and official links.
3. **System** shows the stale-content warning with the last verification date and a recommendation to check the official source if the procedure was last verified more than 6 months ago or never verified (PR-07).
4. **User** reads the steps and prepares the documents.
5. **User** opens an official link or a booking link if needed.
   → System opens the external link in a new tab.

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | Last verified more than 6 months ago, or never verified | Warning with the last verification date (or that it has not been verified) and a recommendation to check the official source (PR-07, ES-01) |
| A2 | The procedure is linked to several institutions | System shows every linked institution with its contact details |
| A3 | The cost type is `variable` or `unknown` | System says so explicitly; it never shows "Besplatno" unless the cost type is `free` ([ADR 0008](decisions/0008-extend-domain-model.md)) |
| A4 | The procedure is not visible (draft, archived, or not linked to a published event) | System shows a not-found page (PR-05) |

---

## Group 2 – Tracking progress

### UF-05 – Open and use the checklist

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user wants to track progress through the procedures of a life event |
| **Preconditions** | The life event is published and has at least one visible procedure |
| **Outcome (success)** | The user sees a checklist of all the event's procedures and can track progress without registering |

**Main flow:**

1. **User** opens the life event page and picks "Otvori checklist".
   → System opens `/dogadjaj/[slug]/checklist`.
2. **System** reads saved progress from `localStorage` and shows every visible procedure in order. Procedures without a saved entry are "Nije počelo".
3. **System** marks procedures with an unfinished dependency as blocked. Dependencies on procedures that are not visible are ignored (ES-13).
4. **System** shows the note: "Napredak se čuva lokalno u ovom pretraživaču i nije sinhronizovan između uređaja." (PR-18)
5. **User** updates statuses (UF-06). Each change is saved immediately, so progress survives a reload (PR-16, PR-17).

Storage format, under the single `localStorage` key `aa:checklist` ([ADR 0011](decisions/0011-content-and-copy-defaults.md)):

```ts
{ v: 1, items: { [procedureId]: { status: 'todo' | 'in_progress' | 'done', updatedAt } } }
```

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | The user cleared site data or uses a private/incognito window | Progress is gone; the checklist starts empty. The user was told in advance (ES-11) |
| A2 | The user opens the checklist on another device | Progress is not synced; the note from step 4 makes this clear (ES-12, PR-18) |
| A3 | Saved progress refers to a procedure no longer in the event | The entry is ignored on display |
| A4 | `localStorage` is unavailable or the saved data is unreadable | The checklist still works for the current visit and says progress cannot be saved |

---

### UF-06 – Mark a procedure's progress

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user started or finished a procedure and wants to record it |
| **Preconditions** | The checklist is open |
| **Outcome (success)** | The procedure's status is updated and saved locally |

**Main flow:**

1. **User** sets a procedure's status to "U toku".
   → System updates the status on screen and saves it to `localStorage` with `updatedAt`.
2. **User** later sets the status to "Završeno".
   → System marks the procedure as done and saves it.
3. **System** unblocks procedures that were waiting only on this one.

The user picks a status explicitly; a single accidental tap must not erase a "Završeno" status.

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | The user marked a procedure as done by mistake | The user can change the status back; nothing blocks it. Procedures that depend on it become blocked again |
| A2 | The procedure has an unfinished dependency | Continue with UF-07 |

---

### UF-07 – Run into a blocked procedure

| | |
|---|---|
| **Actor** | User |
| **Trigger** | The user tries to change the status of a procedure whose dependency is not done |
| **Preconditions** | The checklist is open. The procedure has an unfinished visible dependency |
| **Outcome (success)** | The user knows which procedure comes first |

**Main flow:**

1. **User** tries to change the status of a blocked procedure.
2. **System** shows a warning that names the dependency, e.g. "Ova procedura zavisi od procedure „Prijava prebivališta“, koja još nije završena."
3. **System** lets the user continue; the warning is informational, there is no technical block (ES-04).
4. **User** completes the dependency and marks it "Završeno".
   → System unblocks the procedure.
5. **User** changes the original procedure's status without a warning.

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | The user knowingly changes the status despite the warning | Allowed; the status is saved (ES-04) |

---

## Group 3 – Content management (administrator)

All admin actions use the admin's own session; the route handler checks the admin role, RLS enforces it, and a database trigger writes the audit log ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)). After a save, public pages reflect the change on the next request (on-demand revalidation).

### UF-08 – Create a procedure

| | |
|---|---|
| **Actor** | Administrator |
| **Trigger** | The admin has researched a procedure and wants to enter it |
| **Preconditions** | The admin is signed in. At least one institution exists |
| **Outcome (success)** | The procedure is created with all its elements and linked to institutions and, optionally, life events |

**Main flow:**

1. **Administrator** opens the admin panel and picks "Dodaj proceduru".
   → System shows the procedure form.
2. **Administrator** enters title, description, methods (online / in person / by mail), cost (type, amount when fixed, description), processing time and official links.
   → System checks that at least one method is selected (PR-03) and that an amount is present when the cost type is `fixed`.
3. **Administrator** adds steps: title, description and an optional link for each.
   → System checks that there is at least one step (PR-01).
4. **Administrator** adds documents in the same form: name, description, note, required/optional ([ADR 0005](decisions/0005-documents-per-procedure.md)).
5. **Administrator** links the procedure to one or more institutions.
   → System checks that at least one is linked (PR-02).
6. **Administrator** picks a status: Nacrt or Objavljeno.
7. **Administrator** enters the last verification date. If left empty, the procedure counts as never verified and shows the stale warning once visible (PR-07).
8. **Administrator** saves.
   → System creates the procedure; the audit log records who created it and when.
9. **Administrator** optionally links the procedure to a life event and sets its order.
   → The procedure appears in that event. It becomes public only when it is published and the event is published (PR-05).

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | Saving without a step | Refused: "Procedura mora imati najmanje jedan korak." (PR-01) |
| A2 | Saving without an institution | Refused: "Poveži bar jednu organizaciju." (PR-02) |
| A3 | Saving without a method | Refused: "Označi bar jedan način obavljanja." (PR-03) |
| A4 | Cost type `fixed` without an amount | Refused: "Upiši iznos, npr. 1500 ili 1500,50." |
| A5 | Editing an existing procedure | The same form opens with current data. On save, the change is written to the audit log |
| A6 | Published but not linked to any published event | Saved; the form says the procedure is not public until it is linked to a published life event (PR-05) |

---

### UF-09 – Define dependencies between procedures

| | |
|---|---|
| **Actor** | Administrator |
| **Trigger** | The admin wants to record that one procedure must be finished before another starts |
| **Preconditions** | Both procedures are linked to the same life event |
| **Outcome (success)** | The dependency is saved and the checklist shows the dependent procedure as blocked until the other is done |

**Main flow:**

1. **Administrator** opens the life event in the admin panel.
   → System shows the event's procedures.
2. **Administrator** picks the procedure that gets a dependency.
   → System shows its dependencies section.
3. **Administrator** picks the procedure it depends on. Only procedures in the same event are offered (PR-09).
4. **Administrator** saves.
   → The database checks for a cycle and rejects it if one would form (PR-10). Otherwise the dependency is stored in `procedure_dependencies` and audited.
5. **System** confirms. The public event page and checklist show the new dependency on the next page load.

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | The dependency would create a cycle (e.g. A→B, B→A, or longer) | Refused with a clear message about the circular dependency (PR-10, ES-05) |
| A2 | The admin wants a procedure from another life event | Not offered; dependencies apply only within one event (PR-09) |
| A3 | The admin removes a dependency | The link row is removed and audited; the checklist no longer blocks the procedure |
| A4 | A procedure is removed from the event | Its dependencies within that event are removed too, and audited |

---

### UF-10 – Review AI questions and stale-content warnings

| | |
|---|---|
| **Actor** | Administrator |
| **Trigger** | The admin wants to find missing or outdated content |
| **Preconditions** | The admin is signed in |
| **Outcome (success)** | The admin has a clear picture of what to add or update |

**Main flow:**

1. **Administrator** opens "AI upiti".
   → System lists users' questions from the last 90 days, redacted and without any user identifier ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)).
2. **Administrator** reviews the most frequent questions and the unanswered ones.
   → System highlights questions where `was_answered = false`: topics missing from the database.
3. **Administrator** plans new content based on what they saw.
4. **Administrator** opens "Upozorenja".
   → System lists procedures last verified more than 6 months ago or never verified, never-verified first, then oldest first.
5. **Administrator** picks a procedure from the list.
   → System opens the procedure form.
6. **Administrator** checks the content against the official source, updates it, sets the last verification date and saves.
   → The procedure disappears from the warnings list.

**Alternative scenarios:**

| ID | Situation | System behavior |
|---|---|---|
| A1 | No stale procedures | "Sav sadržaj je ažuran." |
| A2 | No unanswered AI questions | "Nema otvorenih pitanja bez odgovora." |

---

## Flow matrix

| ID | Flow | Can lead to |
|---|---|---|
| UF-01 | Pick from list | UF-04, UF-05, UF-02, UF-03 |
| UF-02 | Search | UF-04, UF-01, UF-03 |
| UF-03 | AI assistant | UF-04, UF-01, UF-02 |
| UF-04 | View procedure | UF-05, UF-03 |
| UF-05 | Checklist | UF-06, UF-07, UF-04 |
| UF-06 | Mark progress | UF-05, UF-07 |
| UF-07 | Blocked procedure | UF-06, UF-04 |
| UF-08 | Create procedure | UF-09 |
| UF-09 | Dependencies | UF-08 |
| UF-10 | AI questions and warnings | UF-08 (edit procedure) |

---

## Open questions

1. **Saved progress for a removed procedure (UF-05 A3).** This doc ignores it on display and keeps it in storage, so it returns if the procedure is re-added. Confirm.

Final UI copy (AI-unavailable message, validation messages) lives in [08](08-screen-specifications.md).

---

## Changes from v1.0

- Translated to English; UI copy stays Serbian, Latin script, informal "ti" ("proveriš", "Označi") per ADR 0011.
- Merged Word-only details: system responses in UF-03 step 1, UF-08 step 1, UF-09 steps 1–2; UF-04 "directly or through a life event"; UF-10 step 5 records the new verification date (ADR 0011: Markdown is the single source).
- Named routes `/dogadjaj/[slug]`, `/procedura/[slug]`, `/dogadjaj/[slug]/checklist` (ADR 0011).
- Defined "visible procedure" per PR-05 (.md version) and applied it to search, the event page, the checklist and direct URLs; added not-found alternatives UF-01 A3 and UF-04 A4.
- UF-01 A2 made consistent with the reworded PR-04 in 00.
- Event "time estimate" is now `life_events.estimated_duration` (ADR 0008).
- UF-02: Cyrillic and diacritic-free search (ADR 0011).
- UF-03: added redaction step, catalog-based retrieval, stored redacted question, and client-held `messages[]` history so follow-ups work (ADRs 0003, 0006, 0007); added A5 (assistant unavailable) and A6 (no memory across sessions).
- UF-03 A3: "not stored or logged" replaced with best-effort redaction, which is what the system can actually promise (ADR 0007).
- UF-04: stale warning also for never-verified procedures (ADR 0011); added cost-type display (A3) and institution address (ADR 0008).
- UF-05: per-procedure checklist with the single versioned `localStorage` format; clarified what is saved and when; note drops "vašem" (formal) and matches the 08 banner text; ignored dependencies on non-visible procedures; added A3, A4.
- UF-05 A1: "cookies" replaced with "site data" since the checklist is in `localStorage`.
- UF-06: explicit status choice and re-blocking on undo; status enum `todo | in_progress | done` (ADR 0011).
- UF-07: warning copy names the dependency in proper Serbian.
- UF-08: documents entered in the procedure form (ADR 0005); cost-type validation (ADR 0008); empty verification date means never verified (ADR 0011); added A4 and A6 (published but not public).
- UF-09: cycle check moved from "recursive CTE in the app" to the database, covering longer cycles; "checklist reflects immediately" replaced with on-demand revalidation on save (report §4: ISR 1h contradicted "immediately"); added A3, A4 for removing links.
- UF-10: questions are redacted and kept 90 days (ADR 0007); warnings include never-verified procedures with a defined sort order.
- Group 3 states the admin JWT + RLS + audit trigger model (ADR 0004).
- Flow matrix: UF-03 can also lead to UF-02 (A5 points to search).
