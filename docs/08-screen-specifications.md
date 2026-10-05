# 08 – Screen Specifications

- Version: 2.0
- Date: 2026-10-05
- Supersedes: 08-screen-specifications.md v1.0 (June 2026)
- Related: [00 – Product spec](00-product-spec.md), [02 – User flows](02-user-flows.md), [03 – API contract](03-api-contract.yml), [04 – Architecture](04-architecture.md), [06 – Design system](06-design-system.md)

## How to use this document

- Every screen a guest or the administrator sees in v1 is specified here. v1 is a **responsive web app only** ([ADR 0002](decisions/0002-web-only-v1.md)); there are no native-app screens.
- Structure per screen: **Route → Purpose → Layout and components → Data → Actions → Rules and validation → States → Accessibility and responsive notes**.
- Components are Osnova components (Button, Badge, Card, Input, Icon, Banner, Skeleton, EmptyState) or project-local components from [06 §12](06-design-system.md), styled with CSS Modules and tokens only.
- Data: every read and write goes through the REST API in [03](03-api-contract.yml) ([ADR 0003](decisions/0003-full-rest-api.md)), base path `/api/v1`. Server components call the same service layer the route handlers use (no HTTP round trip to themselves); client components call the HTTP endpoints. Endpoints below are written relative to `/api/v1`.
- UI copy is Serbian, Latin script, informal "ti" ([ADR 0011](decisions/0011-content-and-copy-defaults.md)). Copy in this document is the default text; change it here first.
- References: UF-xx = [02](02-user-flows.md), PR-xx and ES-xx = [00](00-product-spec.md) §6–§7.

---

## 0. Shared rules

### 0.1 Route map

Public ([ADR 0011](decisions/0011-content-and-copy-defaults.md); no catch-all slug at the root):

| Route | Screen | Rendering |
|---|---|---|
| `/` | P1 Home | Server, cached, on-demand revalidation |
| `/pretraga?q=` | P2 Search results | Server, dynamic per query |
| `/dogadjaj/[slug]` | P3 Life event | Server, cached |
| `/dogadjaj/[slug]/checklist` | P4 Checklist | Server shell (cached) + client state from localStorage |
| `/procedura/[slug]` | P5 Procedure | Server, cached |
| `/institucija/[slug]` | P6 Organization | Server, cached |
| `/ai` | P7 AI assistant | Server shell + client chat |
| not found / error | P8 System pages | `not-found.tsx`, `error.tsx` |

Admin (all under `/admin`, dynamic, never cached):

| Route | Screen |
|---|---|
| `/login` | A1 Sign in |
| `/admin` | A2 Dashboard (inside the A0 admin shell) |
| `/admin/dogadjaji`, `/admin/dogadjaji/novi`, `/admin/dogadjaji/[id]` | A3 Life events list, A4 Life event form (procedures, order, dependencies) |
| `/admin/procedure`, `/admin/procedure/nova`, `/admin/procedure/[id]` | A5 Procedures list, A6 Procedure form (steps, documents, organizations) |
| `/admin/institucije`, `/admin/institucije/nova`, `/admin/institucije/[id]` | A7 Organizations list and form |
| `/admin/kategorije` | A8 Categories |
| `/admin/sinonimi` | A9 Synonyms |
| `/admin/upiti` | A10 AI queries |
| `/admin/upozorenja` | A11 Stale procedures |
| `/admin/izmene` | A12 Change history (audit log) |

### 0.2 Visibility of content

- Guests see only `published` content, enforced by RLS on the anon key ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)); the service layer also filters, but RLS is the guarantee.
- A life event is public only if it is `published` and has at least one published procedure (PR-04).
- A procedure is public only if it is `published` **and** linked to at least one published life event (PR-05, [ADR 0011](decisions/0011-content-and-copy-defaults.md)). This applies to `/procedura/[slug]`, search results and AI answers. Otherwise the route returns 404.
- An organization is public if it is `published`; its page lists only public procedures.
- The administrator sees public pages exactly like a guest. Drafts are previewed only in the admin forms.
- Dependencies on procedures that are not public are filtered out by the API, so a public procedure can never be blocked by something the user cannot see.

### 0.3 Stale warning

A procedure is stale when `last_verified_at` is null **or** older than 6 months (PR-07, ES-01, [ADR 0011](decisions/0011-content-and-copy-defaults.md)). The API returns `is_stale` and `last_verified_at`; the UI never recomputes it.

| Case | Banner `warning` text |
|---|---|
| Verified, older than 6 months | Title "Podaci možda nisu ažurni". Body "Poslednja provera: {d. MMMM yyyy.}. Pre nego što kreneš, proveri na zvaničnom sajtu." + link "Zvanični sajt" (`official_link`, if set) |
| Never verified | Title "Podaci još nisu provereni". Body "Pre nego što kreneš, proveri na zvaničnom sajtu." + same link |

Shown at the top of the procedure page (P5), as a `warning` Badge "Proveri podatke" on ProcedureCard (P3) and in the admin lists (A5, A11).

### 0.4 Caching and freshness

- Public pages are cached and tagged per entity (`life-event:{id}`, `procedure:{id}`, `institution:{id}`, `categories`, `catalog`). Every admin save calls on-demand revalidation for the affected tags, so a published change is visible on the next request (UF-09: "the checklist immediately reflects the new dependency"). There is no time-based ISR window.
- The checklist state lives only in the browser; the procedures and dependencies it uses come from the cached life event data.

### 0.5 Errors and API states

| Situation | UI |
|---|---|
| 404 | P8 not-found page with the right copy for the entity |
| 5xx or network failure on a server-rendered page | `error.tsx` boundary: ErrorState "Nismo uspeli da učitamo stranicu." + "Pokušaj ponovo" (calls `reset()`) + link "Početna" |
| Network failure on a client request (search-as-you-type is not used; AI chat, admin saves) | Inline Banner `error`, input content preserved |
| 401 on admin | Redirect to `/login?next={path}` |
| 403 on admin | Banner `error` "Nemaš pristup ovoj akciji." |
| 429 / 503 on AI | See P7 |

Errors go to Sentry with route and entity id as context; request bodies on `/ai/chat` are never sent ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)). Technical details are never shown to the user.

### 0.6 Global layout (public)

- Skip link "Preskoči na sadržaj" → `<main id="sadrzaj">`.
- Header: app name (link to `/`), link "Pitaj asistenta" (`message-circle`, to `/ai`). On narrow screens the link keeps an icon and a visible short label "Asistent".
- `<main>` with one `h1` per page; focus moves to the `h1` after client navigation ([06 §9.3](06-design-system.md)).
- Footer: short disclaimer "Informacije su informativne. Za zvanične podatke proveri kod nadležne institucije." and a link to the source of truth for each procedure where shown.
- Container max `72rem`, reading column max `40rem`, side gutter 16 px on phones, 24 px from 640 px ([06 §9.1](06-design-system.md)).

### 0.7 Shared display rules

- **Methods** (`can_online`, `can_in_person`, `can_by_mail`): Badges "Online" (success), "Lično" (accent), "Poštom" (attention), in that order, only those that are true. `can_in_person` means "can be done in person", not "must".
- **Cost** by `cost_type` ([ADR 0008](decisions/0008-extend-domain-model.md)): `free` "Besplatno"; `fixed` formatted `cost_amount` (decimal string from the API, formatted with `Intl.NumberFormat('sr-Latn-RS')`, e.g. "1.500 din"); `variable` "Cena varira"; `unknown` "Cena nepoznata". `cost_description`, when present, is shown under it on P5.
- **Organizations** (`institutions` in data, "organizacije" in UI) show their `kind` label: `government` "Državna institucija", `bank` "Banka", `employer` "Poslodavac", `other` "Organizacija".
- **Dates**: `d. MMMM yyyy.` in Serbian Latin (e.g. "5. oktobar 2026.").
- **External links** open in a new tab with `rel="noopener noreferrer"`, an `external-link` icon and visually hidden "(otvara se u novom tabu)".

---

## P1. Home – `/`

**Flows:** UF-01, entry to UF-02 and UF-03.

### Purpose
Entry point. Lists all public life events grouped by category, with search and a way to the AI assistant.

### Layout and components
- Eyebrow text "Dobar dan" (`--text-eyebrow`, muted) and `h1` "Šta ti se dešava?".
- SearchField ([06 §12.11](06-design-system.md)), submits to `/pretraga?q=`.
- CategoryFilter: "Sve" + one chip per category that has at least one public life event, in `categories.sort_order`.
- Per category: SectionLabel (`h2`) with the category name, then a list (`ul`) of LifeEventCards (EventIcon, title, "N procedure · {estimated_duration}", chevron).
- Below the list: Card with "Ne nalaziš svoju situaciju?" and two links: "Pitaj asistenta" (`/ai`) and "Pretraži" (focuses the SearchField).

### Data
| Endpoint | When | Returns |
|---|---|---|
| `GET /categories` | Server render | Categories with `sort_order` |
| `GET /life-events` | Server render | Public life events with `category`, `icon`, `slug`, `title`, `procedure_count`, `estimated_duration` |

### Actions
| Action | Result |
|---|---|
| Submit search (≥ 2 characters after trim) | Navigate to `/pretraga?q={term}` |
| Submit search (< 2 characters) | Input `error` "Upiši bar 2 slova." Nothing is sent |
| Choose a category chip | Filters the list in place and sets `?kategorija={slug}` in the URL (shareable, works without JS as a link) |
| Choose "Sve" | Removes the filter |
| Open a LifeEventCard | Navigate to `/dogadjaj/[slug]` |

### Rules and validation
- Only public life events (§0.2). Categories with none are hidden, so a category is never empty.
- `estimated_duration` is admin text ([ADR 0008](decisions/0008-extend-domain-model.md)); when empty, the meta shows only the procedure count.

### States
- **Loading:** Skeletons for 2 chips and 4 cards (streamed Suspense fallback).
- **No public life events at all:** EmptyState (`clipboard-list`) "Još nema objavljenih životnih događaja." / "Radimo na sadržaju. U međuvremenu možeš da pitaš asistenta." + link "Pitaj asistenta".
- **Unknown `?kategorija`:** treated as "Sve".
- **Error:** §0.5.

### Accessibility and responsive
- Chip selection is announced via `aria-pressed`; a polite live region says "Prikazano N životnih događaja".
- From 640 px the cards form a 2-column grid; from 1024 px 3 columns. Chips wrap, never scroll hidden.

---

## P2. Search results – `/pretraga?q=`

**Flows:** UF-02 (ES-06, ES-07).

### Purpose
Shows public life events, procedures and organizations that match a free-text term, grouped by type.

### Layout and components
- BackLink "Početna".
- `h1` "Rezultati pretrage".
- SearchField pre-filled with `q`.
- Result count line (polite live region): "Pronađeno N rezultata za „{q}”".
- If the API reports that a synonym was used (`query` differs from `original_query`): `--text-caption` muted line "Prikazujemo rezultate za „{query}”."
- Sections in this order, each only if non-empty: SectionLabel "Životni događaji" → LifeEventCards; "Procedure" → ProcedureCards (without the dependency line); "Organizacije" → link cards with name and kind Badge.

### Data
| Endpoint | When | Parameters | Returns |
|---|---|---|---|
| `GET /search` | Server render on each submitted query | `q` (min 2), `limit` | `query`, `original_query`, `life_events[]`, `procedures[]`, `institutions[]`, `total_count` |

Synonyms are applied inside `/search` (03); the screen never calls a synonyms endpoint. Search accepts Cyrillic and text without diacritics ([ADR 0011](decisions/0011-content-and-copy-defaults.md)): "pasos" and "пасош" find "Pasoš".

### Actions
| Action | Result |
|---|---|
| Submit a new term | Navigate to `/pretraga?q={term}` (a new history entry; Back returns to the previous results) |
| Open a result | `/dogadjaj/[slug]`, `/procedura/[slug]` or `/institucija/[slug]` |
| Clear the field and submit | Input `error` "Upiši bar 2 slova." |

Search runs on submit, not on every keystroke: it keeps the page server-rendered, shareable and usable without JS, and avoids announcing results while the user is typing.

### Rules and validation
- `q` is trimmed; shorter than 2 characters → the page shows the SearchField with the error and no results request.
- Results are ordered by relevance within each group (API).
- Target: response under 1 s (00 §10).

### States
- **Loading:** Skeleton cards under the field.
- **No results (ES-06):** EmptyState (`search`) "Nismo našli ništa za „{q}”." / "Probaj drugu reč, pogledaj kategorije ili pitaj asistenta." with actions: link "Pitaj asistenta" (`/ai?pitanje={q}`, pre-fills the composer) and link "Sve kategorije" (`/`). Never an empty page.
- **Error:** Banner `error` "Pretraga trenutno ne radi. Pokušaj ponovo." with the field still usable.

---

## P3. Life event – `/dogadjaj/[slug]`

**Flows:** end of UF-01, UF-04 entry, UF-05 entry.

### Purpose
Shows all procedures of one life event, grouped into phases by dependency, so the user sees what can be done now and in parallel and what waits for something else (PR-08, PR-09, PR-11).

### Layout and components
- BackLink to the category view: "{Kategorija}" → `/?kategorija={slug}`.
- EventIcon (48 px), `h1` title, description (`--text-body`, muted).
- MetaRow: `list-checks` "N procedure", `clock` "{estimated_duration}" (omitted if empty).
- Button `primary` "Otvori checklist" (`iconStart="list-checks"`) → `/dogadjaj/[slug]/checklist`.
- PhaseIndicator: phases ([06 §12.6](06-design-system.md)), each with ProcedureCards in `life_event_procedures.sort_order` within the phase. Each card shows organization, methods, cost, "Zavisi od: …" if it has dependencies, and the stale Badge.
- Under the list: Card "Imaš pitanje o ovome?" + link "Pitaj asistenta".

### Data
| Endpoint | Returns |
|---|---|
| `GET /life-events/{slug}` | `LifeEventDetail`: `id`, `title`, `description`, `icon`, `estimated_duration`, `category`, and `procedures[]` (`ProcedureInEvent`: `procedure_id`, `slug`, `title`, `sort_order`, method flags, `cost_type`, `cost_amount`, `processing_time`, `is_stale`, `depends_on[]`, `institutions[{name, slug, kind}]` for the ProcedureCard and CheckCard meta line), limited to public procedures and public dependencies |

Phase computation is a pure function in the app (unit-tested, [ADR 0009](decisions/0009-testing-stack.md)): phase = 1 for no dependencies, otherwise 1 + the highest phase among its dependencies.

### Actions
| Action | Result |
|---|---|
| Open a ProcedureCard | `/procedura/[slug]?dogadjaj={eventSlug}` (the parameter only drives the back link on P5) |
| "Otvori checklist" | `/dogadjaj/[slug]/checklist` |

### Rules and validation
- 404 if the life event is not public (§0.2).
- Procedures that are not public are not listed and not counted.
- If the user already has checklist progress for these procedures (localStorage, P4), the cards show a small status Badge ("U toku", "Završeno") after hydration; the server HTML does not depend on it.

### States
- **Loading:** Skeletons for the header, MetaRow and 3 cards.
- **Not found:** P8 "Ovaj životni događaj ne postoji ili više nije dostupan." + link "Početna".
- **Error:** §0.5.

### Accessibility and responsive
- Phases are an `ol`; each phase heading (`h2`) reads "Faza 1, možeš odmah, paralelno".
- From 1024 px: two columns, phases on the left, an aside with MetaRow, the checklist button and the assistant card on the right (sticky).

---

## P4. Checklist – `/dogadjaj/[slug]/checklist`

**Flows:** UF-05, UF-06, UF-07 (PR-16, PR-17, PR-18, ES-04, ES-11, ES-12).

### Purpose
Lets the user track their own progress through the procedures of a life event, per procedure ([ADR 0011](decisions/0011-content-and-copy-defaults.md)), without an account.

### Layout and components
- BackLink "{naziv događaja}" → `/dogadjaj/[slug]`.
- `h1` "Checklist: {naziv događaja}".
- ProgressBar "{done} / {total} završeno".
- Banner `info` (static, not dismissible): "Napredak se čuva lokalno u ovom pretraživaču i nije sinhronizovan između uređaja." Second line: "Ako obrišeš podatke pretraživača ili koristiš privatni prozor, napredak se gubi." (PR-18, ES-11, ES-12)
- PhaseIndicator with CheckCards ([06 §12.14](06-design-system.md)): status circle, title link to `/procedura/[slug]?dogadjaj={eventSlug}`, organization, three-option status control; blocked cards show `lock` and "Zavisi od: {naslov} (još nije završeno)".
- Button `ghost` "Poništi napredak" at the end → confirmation dialog "Da li želiš da vratiš sve procedure ovog događaja na „Nije počelo”?" ("Poništi" / "Odustani").

### Data
| Source | Content |
|---|---|
| `GET /life-events/{slug}` (server, same as P3) | Procedures and public dependencies |
| `localStorage` | Checklist state (below) |

**localStorage format** (the only format; versioned):

```ts
// key: "aa:checklist"
type ChecklistState = {
  v: 1;
  items: {
    [procedureId: string]: {
      status: 'todo' | 'in_progress' | 'done';
      updatedAt: string; // ISO 8601
    };
  };
};
```

- One key for the whole app, keyed by procedure id. A procedure shared by several life events (PR-06) has one status everywhere: once you did "Prijava prebivališta", it is done in every event that contains it.
- A procedure with no entry is `todo`. Entries for procedures no longer in the event are ignored (not deleted, they may belong to another event).
- Unknown `v` or unparsable JSON: the data is kept under `aa:checklist:backup` and the checklist starts empty; Sentry gets a warning without the content.
- All reads and writes go through one checklist hook/service (unit-tested, [ADR 0009](decisions/0009-testing-stack.md)); components never touch `localStorage` directly. A `storage` event listener keeps two open tabs in sync.

### Actions
| Action | Result |
|---|---|
| Choose a status in a CheckCard | State saved immediately with a new `updatedAt`; ProgressBar and blocked markers update; live region: "{naslov}: {status}. {done} / {total} završeno." |
| Choose "U toku"/"Završeno" on a blocked card | Allowed (ES-04). Inline Banner `warning` under the card: "Ova procedura zavisi od {naslov}, koja još nije završena. Možeš da nastaviš, ali proveri redosled." (UF-07) |
| Mark a dependency "Završeno" | Dependent cards lose the blocked style; their warning Banners disappear (UF-06 step 3) |
| Change "Završeno" back | Allowed at any time (UF-06 A1) |
| Reload the page | State restored from localStorage (PR-17) |
| "Poništi napredak" + confirm | Sets this event's procedures to `todo` (other events' procedures untouched) |

### Rules and validation
- A procedure is **blocked** when at least one of its public dependencies in this life event is not `done`.
- Status names and labels: `todo` "Nije počelo", `in_progress` "U toku", `done` "Završeno".
- Nothing about the checklist is sent to the server.

### States
- **Before hydration:** the server renders the full list with every card in `todo` and the controls disabled (`aria-busy` on the list); after hydration the stored state is applied. No skeleton flash for content that is already known.
- **localStorage unavailable** (blocked storage, some private modes): Banner `warning` replaces the info Banner: "Pretraživač ne dozvoljava čuvanje. Napredak će se izgubiti kad zatvoriš stranicu." The checklist works in memory.
- **Not found:** as P3.
- **Error loading the life event:** §0.5. (There is no "show stale local data" mode: without the procedure list there is nothing to show.)

### Accessibility and responsive
- Each status control is a radio group with the procedure title as legend; arrow keys move between options.
- On narrow screens the status control sits under the title, full width, three equal segments; from 640 px it sits on the right.

---

## P5. Procedure – `/procedura/[slug]`

**Flows:** UF-04 (PR-01, PR-02, PR-03, PR-07, ES-01).

### Purpose
Everything needed to complete one procedure: steps, documents, cost, processing time, methods, organizations with contacts, official links, and how fresh the data is.

### Layout and components
- BackLink: if `?dogadjaj={slug}` names a public life event that contains this procedure → "{naziv događaja}"; otherwise "Početna".
- Stale Banner (§0.3) when `is_stale`, above the title.
- `h1` title; organization names line (`--text-caption`, muted).
- Facts row (`dl`): methods Badges; `banknote` cost (§0.7); `clock` "Rok: {processing_time}".
- Description (`--text-body`).
- SectionLabel "KORACI" → `ol` of StepCards (step link opens in a new tab).
- SectionLabel "POTREBNA DOKUMENTA" → `ul` of DocumentRows, required first, then by `sort_order` ([ADR 0005](decisions/0005-documents-per-procedure.md): documents belong to this procedure).
- SectionLabel "ORGANIZACIJA" (or "ORGANIZACIJE" for more than one) → InstitutionCard per organization, each with a link "Sve procedure ove organizacije" → `/institucija/[slug]`; the link-row `note` from `procedure_institutions`, if any, under the card.
- SectionLabel "ZVANIČNI LINKOVI" → "Zvanični sajt" (`official_link`), "Obrazac" (`form_link`), each only if set.
- "Deo životnih događaja": links to each public life event containing this procedure (PR-06), each with "Otvori checklist".
- Meta line at the bottom: "Poslednja provera: {datum}" or "Još nije provereno".

### Data
| Endpoint | Returns |
|---|---|
| `GET /procedures/{slug}` | `ProcedureDetail`: method flags, `cost_type`, `cost_amount` (decimal string), `cost_description`, `processing_time`, `official_link`, `form_link`, `last_verified_at`, `is_stale`, `steps[]`, `documents[]`, `institutions[]` (`ProcedureInstitution`: organization with `address`, `kind`, contacts, plus the per-link `note` from `procedure_institutions`), `life_events[{slug, title}]` (public only) for the back link and the "Deo životnih događaja" section |

### Actions
| Action | Result |
|---|---|
| Step link, official link, form link, organization website | New tab |
| Phone / email | `tel:` / `mailto:` |
| Organization link | `/institucija/[slug]` |
| Life event link / "Otvori checklist" | `/dogadjaj/[slug]` / `/dogadjaj/[slug]/checklist` |

### Rules and validation
- 404 unless public (§0.2, PR-05).
- PR-01..PR-03 are enforced on save in the admin and in the database; the public page does not render placeholders for "no steps" or "no organization". If the API ever returns such data, the section is omitted and Sentry gets a warning.

### States
- **Loading:** Skeletons for title, facts row, 3 steps, 3 documents, one organization card.
- **Not found:** P8 "Ova procedura ne postoji ili više nije dostupna."
- **Error:** §0.5.

### Accessibility and responsive
- From 1024 px: main column (description, steps, documents) and an aside (facts, organizations, official links, life events).
- The stale Banner is static (no live region): it is part of the page, read in order.

---

## P6. Organization – `/institucija/[slug]`

**Flows:** reached from P2, P5 (00 §5.6).

### Purpose
Contact details of one organization and the public procedures it handles.

### Layout and components
- BackLink "Početna".
- `h1` name + kind Badge; description.
- InstitutionCard details (address, working hours, phone, email, website) without repeating the name.
- If `kind` is `government`, a note under the card: "Radno vreme i adresa važe za centralu. Za najbližu ispostavu koristi zvanični lokator na sajtu institucije." (branch offices are one institution in v1, [ADR 0008](decisions/0008-extend-domain-model.md)).
- SectionLabel "PROCEDURE" → list of ProcedureCards (public only).

### Data
| Endpoint | Returns |
|---|---|
| `GET /institutions/{slug}` | Organization fields incl. `address`, `kind`, and `procedures[]` (public only) |

### States
- **No public procedures:** EmptyState "Za ovu organizaciju još nema objavljenih procedura." + link "Početna".
- **Not found:** P8 "Ova organizacija ne postoji ili više nije dostupna."
- **Loading / error:** as P5.

---

## P7. AI assistant – `/ai`

**Flows:** UF-03 (PR-12..PR-15, ES-08..ES-10).

### Purpose
Answers questions in free language using only the app's content, and points to the right procedures. Supports follow-up questions within the visit.

### Layout and components
- `h1` "Pitaj asistenta".
- Intro (`--text-body-sm`, muted): "Odgovaram samo na osnovu sadržaja ove aplikacije. Ne dajem pravne savete."
- Conversation: `role="log"` list of ChatMessages ([06 §12.15](06-design-system.md)). The first message is a fixed assistant greeting (not from the API): "Zdravo! Opiši šta ti se dešava, na primer „Preselio/la sam se u Beograd, šta treba da uradim?”"
- Assistant messages may contain: a link card to `matched_life_event` ("Pogledaj: {naslov}" → `/dogadjaj/[slug]`) and ChatRelatedCards for `procedures[]` (title → `/procedura/[slug]`).
- Button `ghost` "Novi razgovor" above the composer (visible once there is at least one exchange).
- ChatComposer (sticky) with the PII note "Ne upisuj lične podatke (JMBG, broj dokumenta, telefon)."

### Data
| Endpoint | When | Body | Returns |
|---|---|---|---|
| `POST /ai/chat` | On send | `messages[]`: the conversation so far, `{ role: 'user' \| 'assistant', content }`, last item is the new user message | `answer`, `was_answered`, `matched_life_event` (nullable `{id, slug, title}`), `procedures[{id, slug, title}]`, `redaction{applied, kinds}` |

- The client keeps the conversation in memory in a provider mounted in the public layout, so it survives navigating to a procedure and back within the visit; it is lost on reload or when the tab closes (00 §5.5: no memory between sessions). It is never written to localStorage or sessionStorage.
- The client sends at most the limits set in 03 (default 20 messages, 1000 characters each); older messages are dropped from the request first, not from the screen.
- Server side ([ADR 0006](decisions/0006-ai-retrieval-via-catalog-in-prompt.md), [ADR 0007](decisions/0007-redact-pii-in-ai-chat.md)), for context only: rate limit by salted IP hash → redact PII in all messages → pick relevant life events/procedures from the cached catalog → answer from loaded details with structured output (`was_answered`) → store the redacted question in `ai_queries`.

### Actions
| Action | Result |
|---|---|
| Type ≥ 3 characters (trimmed) | Send enabled |
| Send (button or Enter) | User bubble appears at once; pending assistant bubble; composer cleared and disabled until the answer or an error |
| Answer arrives | Assistant bubble replaces the pending one; its text is announced (polite live region, answer only); focus stays in the composer |
| `redaction.applied` true | Under the user's bubble, `--text-caption` muted: "Sakrili smo lične podatke iz tvoje poruke pre slanja ({vrste})." where kinds map to "JMBG", "telefon", "email", "broj dokumenta" |
| Open a related card | Navigates; the conversation is still there on return |
| "Novi razgovor" | Clears the conversation (no confirmation; nothing is lost that the server keeps) |
| `/ai?pitanje={text}` (from P2 no-results) | Composer pre-filled, not sent automatically |

### Rules and validation
- Message length 3–1000 characters after trim; the counter appears from 900. Over 1000: send disabled and the counter turns into an error "Pitanje može imati najviše 1000 znakova."
- One request at a time.
- `was_answered: false` answers are shown like any other answer; the API text already says the information is missing (PR-13, copy in [07](07-ai-instructions.md)).
- The assistant never claims to have saved anything about the user.

### States
| State | UI |
|---|---|
| Empty (first visit) | Greeting + composer + three example question chips ("Selim se, šta treba da prijavim?", "Kako da izvadim pasoš?", "Šta mi treba za upis deteta u vrtić?") that fill the composer |
| Pending | Pending bubble "Asistent piše odgovor…"; after 10 s the text changes to "Još malo…" |
| Timeout (no answer after 25 s, request aborted) | Banner `error` above the composer: "Odgovor kasni više nego obično. Pokušaj ponovo." + Button "Pošalji ponovo" (resends the same messages). The user bubble stays |
| 429 `rate_limited` | Banner `warning`: "Dostigao/la si broj pitanja za ovaj sat. Pokušaj ponovo za {N} min." where N = ceil(`retry_after_seconds` / 60). Composer disabled until then; a timer re-enables it. Suggest link "Pretraži" |
| 503 `ai_unavailable` (budget reached or provider down) | Banner `info`: "Asistent trenutno nije dostupan. Pokušaj ponovo kasnije ili pronađi svoj životni događaj na početnoj strani." + link "Početna". Composer disabled for this visit |
| 400 | Banner `error` "Pitanje nije prihvaćeno. Proveri dužinu i pokušaj ponovo." |
| Other error / network | Banner `error` "Nešto nije u redu. Pokušaj ponovo." + "Pošalji ponovo" |

### Accessibility and responsive
- The log is not a live region itself (it would re-read history); a separate polite region announces only the newest answer.
- The sticky composer never hides the focused element (`scroll-padding-bottom`); on phones it stays above the keyboard.
- From 1024 px the conversation column is max `48rem`, centered.

---

## P8. System pages

| Page | Content |
|---|---|
| Not found (`not-found.tsx`) | `h1` "Stranica nije pronađena", entity-specific text from the screen that called `notFound()`, links "Početna" and "Pitaj asistenta". HTTP 404 |
| Error boundary (`error.tsx`) | ErrorState "Nismo uspeli da učitamo stranicu." + "Pokušaj ponovo" + "Početna". Reports to Sentry |
| Global error (`global-error.tsx`) | Same text, minimal markup (no layout) |

---

## Admin

### A0. Admin shell (all `/admin/*`)

- **Access:** only users with JWT `app_metadata.role = 'admin'` ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)). The admin layout checks the session on the server and redirects to `/login?next=…` if missing; a signed-in non-admin sees "Nemaš pristup administraciji." with a "Odjavi se" button. Middleware may redirect early as a convenience but is not the check; every admin route handler verifies the role again, and RLS enforces it in the database.
- **Writes** go through `/api/v1/admin/*` with the admin's own JWT; the database audit trigger records every change ([ADR 0004](decisions/0004-admin-writes-with-user-jwt.md)).
- **Navigation** (`nav` landmark, current page `aria-current="page"`): Pregled, Životni događaji, Procedure, Organizacije, Kategorije, Sinonimi, AI upiti, Upozorenja, Istorija izmena; then the signed-in email and "Odjavi se". From 1024 px a persistent left sidebar; below, a "Meni" button that opens the same list.
- **Content never gets deleted, only archived** (00 §8). Link rows (procedure ↔ life event, dependency, procedure ↔ organization) and synonyms are deleted and audited.
- **Forms** (shared pattern):
  - Osnova Input for text; native select/checkbox/radio stand-ins until Osnova ships them ([06 §12.19](06-design-system.md)).
  - On submit with errors: an error summary Banner `error` at the top, "Ispravi sledeće:" with links to each field, focused; each field shows its own error. Server validation errors map to the same fields.
  - On success: Banner `success` "Sačuvano." (`role="status"`) at the top; the form stays open.
  - Leaving with unsaved changes asks "Imaš nesačuvane izmene. Da li želiš da odeš bez čuvanja?".
  - Slugs are generated from the title on create (Serbian Latin to ASCII: č/ć→c, š→s, ž→z, đ→dj) and editable; a changed slug on a published item shows a warning "Promena adrese će pokvariti postojeće linkove." 
  - Status changes: "Objavi", "Vrati u nacrt", "Arhiviraj" (Button `danger`, confirmation dialog). Archiving is reversible ("Vrati iz arhive" → draft).
  - Reordering uses "Pomeri gore" / "Pomeri dole" buttons (keyboard and touch friendly).
- **Lists** (shared pattern): a `table` with caption, sortable column headers as buttons (`aria-sort`), filters above it, pagination ("Prethodna" / "Sledeća", 25 per page). Below 640 px rows render as stacked cards.
- **Status Badges:** `draft` "Nacrt" (neutral), `published` "Objavljeno" (success), `archived` "Arhivirano" (danger).

### A1. Sign in – `/login`

- `h1` "Prijava za administratore". Fields: Email (`autocomplete="email"`), Lozinka (`autocomplete="current-password"`, show/hide toggle). Button "Prijavi se".
- Supabase Auth email + password; there is no sign-up and no public link to this page (00 §8: access granted manually).
- Errors: wrong credentials → "Email ili lozinka nisu tačni." (no hint which); too many attempts → "Previše pokušaja. Sačekaj nekoliko minuta."; network → "Prijava trenutno ne radi. Pokušaj ponovo."
- Success → `next` (only same-origin `/admin` paths) or `/admin`.

### A2. Dashboard – `/admin`

Overview Cards, each a link:
- "Upozorenja": number of stale procedures (§0.3) → A11.
- "AI upiti bez odgovora": count of `was_answered = false` → A10 filtered.
- "Nacrti": number of draft life events and procedures → A3/A5 filtered.
- "Poslednje izmene": the 5 latest audit entries → A12.

Data: `GET /admin/stale-procedures?limit=1` (count), `GET /admin/ai-queries?was_answered=false&limit=1` (count from pagination total over the 90-day retention window), `GET /admin/life-events?status=draft`, `GET /admin/procedures?status=draft`, `GET /admin/audit-log?limit=5`. Each card loads independently; a failed card shows a small Banner `error` without breaking the page.

### A3. Life events list – `/admin/dogadjaji`

- Columns: Naziv, Kategorija, Status, Broj procedura, Izmenjeno. Filters: status (Svi / Nacrt / Objavljeno / Arhivirano), category, text filter on the title.
- Button `primary` "Novi životni događaj" → `/admin/dogadjaji/novi`.
- Row → `/admin/dogadjaji/[id]`.
- Data: `GET /admin/life-events` (all statuses).
- Empty: "Još nema životnih događaja." + the create button. Filtered empty: "Nijedan događaj ne odgovara filterima." + "Poništi filtere".

### A4. Life event form – `/admin/dogadjaji/novi`, `/admin/dogadjaji/[id]`

**Flows:** 00 §5.7, UF-09.

Sections:

1. **Osnovno:** Naziv (required, ≤ 200), Slug (required, unique), Opis, Kategorija (required, select), Ikonica (select of the curated Lucide names with a preview, [06 §10.2](06-design-system.md)), Okvirno trajanje (`estimated_duration`, free text, hint "Npr. „~2 nedelje”. Prikazuje se korisnicima."), Redosled (`sort_order`), Status.
2. **Procedure** (existing events only): ordered list of linked procedures (title, status Badge, stale Badge) with "Pomeri gore/dole" and "Ukloni iz događaja"; "Dodaj proceduru" opens a searchable picker of procedures not yet linked. Saving the section sends the full ordered list.
3. **Zavisnosti** (existing events with ≥ 2 procedures; UF-09): for each procedure, "Zavisi od:" with the current dependencies as removable chips and "Dodaj zavisnost" (select offering only other procedures of this event, PR-09, UF-09 A2). Each add/remove saves immediately; adding offers only procedures already linked to this event (save the procedure list first).
4. **Pregled faza:** read-only PhaseIndicator preview of the current order and dependencies, including drafts (marked "Nacrt"), so the admin sees what the public will get once published.

Data:

| Action | Endpoint |
|---|---|
| Load | `GET /admin/life-events/{id}`, `GET /admin/procedures` for the picker, `GET /categories` |
| Create / update fields | `POST /admin/life-events`, `PUT /admin/life-events/{id}` |
| Status change | `PATCH /admin/life-events/{id}` |
| Save procedure list and order | `PUT /admin/life-events/{id}/procedures` |
| List dependencies | `GET /admin/life-events/{id}/dependencies` |
| Add dependency | `POST /admin/life-events/{id}/dependencies` with `{ procedure_id, depends_on_id }` (409 on a cycle) |
| Remove dependency | `DELETE /admin/life-events/{id}/dependencies/{procedure_id}/{depends_on_id}` (path-based, no body) |

Rules:
- Publishing requires at least one linked **published** procedure (PR-04): otherwise "Objavi" is disabled with the hint "Dodaj bar jednu objavljenu proceduru pre objavljivanja."
- Removing a procedure from the event also removes its dependencies in this event; the confirmation says so: "Ukloniti „{naslov}” iz događaja? Uklanjaju se i njene zavisnosti u ovom događaju."
- A dependency that would create a cycle is rejected by the database (PR-10, ES-05); the API's conflict error shows next to the select: "Ova zavisnost bi napravila krug: {A} → {B} → {A}. Nije sačuvana." (cycle path if the API returns it, otherwise without it).
- A procedure cannot depend on itself (not offered).
- After any save, public pages for this event are revalidated (§0.4).

States: loading Skeleton for the form; 404 → "Ovaj životni događaj ne postoji." + link to the list; errors per the form pattern.

### A5. Procedures list – `/admin/procedure`

- Columns: Naziv, Status, Organizacije, Životni događaji (count; "0" shows Badge `attention` "Nije javno": not linked to a published event, PR-05), Poslednja provera (date or "Nikad"), Zastarelo (Badge).
- Filters: status, organization, "Samo zastarele", text.
- Button `primary` "Nova procedura".
- Data: `GET /admin/procedures`.

### A6. Procedure form – `/admin/procedure/nova`, `/admin/procedure/[id]`

**Flows:** UF-08 (PR-01, PR-02, PR-03), UF-10 steps 5–6.

Sections, saved together with one `PUT` (steps, documents and organization links are sent as full lists; 03):

1. **Osnovno:** Naziv (required), Slug (required, unique), Opis, Status.
2. **Način obavljanja** (`fieldset`, PR-03): checkboxes Online / Lično / Poštom; at least one. Error: "Označi bar jedan način obavljanja."
3. **Troškovi i rok:** Vrsta troška radio (Besplatno / Fiksan iznos / Promenljivo / Nepoznato → `cost_type`); Iznos u dinarima (`cost_amount`, shown and required only for "Fiksan iznos", `inputMode="decimal"`, accepts "1500", "1500,00" or "1.500,00" and is sent as a decimal string "1500.00"; error "Upiši iznos, npr. 1500 ili 1500,50."); Opis troška (`cost_description`, e.g. "Taksa 1.000 din + obrazac 500 din"); Rok obrade (`processing_time`, text).
4. **Linkovi:** Zvanični sajt (`official_link`), Obrazac (`form_link`); must be `https://` URLs.
5. **Koraci** (PR-01): ordered list; each step has Naslov (required), Opis (required), Link (optional URL) and Tekst linka (required when a link is set); "Dodaj korak", "Pomeri gore/dole", "Ukloni korak". At least one step: "Procedura mora imati najmanje jedan korak."
6. **Potrebna dokumenta** ([ADR 0005](decisions/0005-documents-per-procedure.md)): ordered list; each has Naziv (required), Opis, Obavezno/Opciono, Napomena. Hint: "Isti dokument u drugim procedurama menja se posebno u svakoj."
7. **Organizacije** (PR-02): searchable multi-select of organizations (published and draft; draft ones marked "Nacrt" with the hint that the procedure will not show contacts until it is published), each with an optional Napomena. At least one: "Poveži bar jednu organizaciju."
8. **Provera sadržaja:** "Poslednja provera: {datum}" or "Nikad", and Button `secondary` "Označi kao provereno danas" (`PATCH`, saves only `last_verified_at = now`; it does not save other unsaved edits, so it is disabled while the form has unsaved changes, hint "Prvo sačuvaj izmene."). After success the stale Badge disappears and A11 no longer lists it (UF-10 step 6).
9. **Životni događaji** (read-only): events that contain this procedure, with links to A4. If none and status is published: Banner `warning` "Procedura nije vezana ni za jedan objavljen životni događaj, pa nije vidljiva korisnicima (PR-05)."

Data:

| Action | Endpoint |
|---|---|
| Load | `GET /admin/procedures/{id}`, `GET /admin/institutions` for the picker |
| Create / save | `POST /admin/procedures`, `PUT /admin/procedures/{id}` |
| Status change, mark verified | `PATCH /admin/procedures/{id}` (`status` or `last_verified_at`) |

Rules:
- Client validation mirrors the server; the database CHECKs and triggers are the final word (PR-01..03).
- Removing a step or document from the list removes it on save; the change is in the audit log.
- Save failure keeps everything typed.

### A7. Organizations – `/admin/institucije`, `/admin/institucije/nova`, `/admin/institucije/[id]`

- List columns: Naziv, Vrsta (`kind` label), Status, Broj procedura. Filters: status, kind, text. Button "Nova organizacija".
- Form fields: Naziv (required, unique), Slug, Vrsta (required: Državna institucija / Banka / Poslodavac / Organizacija), Opis, Adresa (`address`), Radno vreme (multiline), Telefon, Email, Sajt (`https://`), Status.
- Archiving an organization linked to published procedures shows, in the confirmation, the list of those procedures and "Ove procedure će ostati bez prikazanih kontakt podataka ove organizacije." Procedures for which it is the only organization are marked "jedina organizacija" (see Open questions).
- Data: `GET/POST /admin/institutions`, `GET/PUT/PATCH /admin/institutions/{id}`.
- ES-02: editing an organization updates every procedure page that shows it (revalidation by tag).

### A8. Categories – `/admin/kategorije`

- One page: ordered list of categories with Naziv, Slug, Ikonica, Broj životnih događaja.
- Inline edit: "Izmeni" turns the row into a small form (Naziv required and unique, Slug, Ikonica); "Sačuvaj" / "Odustani".
- "Pomeri gore/dole" changes `sort_order` (saved immediately).
- "Nova kategorija" adds a form row at the end.
- No delete or archive in v1 (categories have no status); a category with no public events is simply hidden on Home.
- Data: list from `GET /categories` (categories have no status, so the public list is complete), `POST /admin/categories`, `PUT /admin/categories/{id}` (also used for `sort_order`).
- Empty: "Još nema kategorija. Dodaj prvu pre nego što napraviš životni događaj."

### A9. Synonyms – `/admin/sinonimi`

**Flows:** ES-07; maintained so search finds jargon ("karton", "papiri za auto").

- Table: Izraz (`term`), Standardni pojam (`maps_to`), Dodato. Filter by text in either column (`q`).
- "Novi sinonim" opens a form: Izraz (required, unique; compared case-, script- and diacritic-insensitively, so "Karton", "karton" and "картон" are the same; error "Ovaj izraz već postoji."), Standardni pojam (`maps_to`, required, hint "Koristi reči iz naslova procedure ili događaja na koji izraz treba da vodi, npr. „izvod iz matične knjige rođenih”.").
- Each row and the form have a link "Proveri u pretrazi" → `/pretraga?q={maps_to}` in a new tab, so the admin sees what the synonym actually finds. `maps_to` is text, not a reference (01, 03): renaming a procedure can make a synonym stop matching, and this link is how the admin notices.
- Row actions: "Izmeni", "Obriši" (confirmation "Obrisati sinonim „{izraz}”?"). Synonyms are lookup rows, so they are deleted, and the deletion is audited.
- Data: `GET /admin/synonyms?q=`, `POST /admin/synonyms`, `PUT /admin/synonyms/{id}`, `DELETE /admin/synonyms/{id}`.
- Empty: "Još nema sinonima. Dodaj reči koje ljudi koriste umesto zvaničnih naziva, npr. „karton”."

### A10. AI queries – `/admin/upiti`

**Flows:** UF-10 steps 1–3.

- Banner `info` (static): "Upiti su anonimni. Lični podaci su automatski sakriveni pre čuvanja, ali ne savršeno. Upiti se brišu posle 90 dana." ([ADR 0007](decisions/0007-redact-pii-in-ai-chat.md))
- Tabs (links that set `?prikaz=`): "Bez odgovora" (default, `was_answered = false`), "Svi", "Najčešće teme".
- "Bez odgovora" and "Svi": table with Pitanje (redacted text, full text on expand), Prepoznat događaj (link or "—"), Odgovoreno (Badge), Vreme. Date range filter (default last 30 days).
- "Najčešće teme": life events ordered by the number of questions matched to them in the period, plus a row "Bez prepoznatog događaja" with its count (links to the filtered list). This is the v1 meaning of "najčešća pitanja" (00 §5.7).
- Each unanswered row has the action "Napravi proceduru" → `/admin/procedure/nova` (does not copy the text, to avoid carrying PII into content).
- Data: `GET /admin/ai-queries?was_answered=&from=&to=&limit=&offset=` for the lists; `GET /admin/ai-queries/stats?from=&to=` for "Najčešće teme" (`data[{life_event, count, unanswered_count}]`, grouped by `ai_queries.matched_event_id`; `life_event: null` is the "Bez prepoznatog događaja" row).
- Empty "Bez odgovora": "Nema upita bez odgovora." (UF-10 A2). Empty "Svi": "Nema upita u ovom periodu."

### A11. Stale procedures – `/admin/upozorenja`

**Flows:** UF-10 steps 4–6.

- Table of stale procedures (§0.3): never verified first, then oldest `last_verified_at` first. Columns: Naziv, Status, Poslednja provera ("Nikad" or date + "pre N meseci"), Životni događaji.
- Row action "Otvori i proveri" → A6, scrolled to "Provera sadržaja". There is no "mark verified" in the list: verification should happen after looking at the content.
- Data: `GET /admin/stale-procedures` (includes `last_verified_at IS NULL`).
- Empty: EmptyState (`check`) "Sav sadržaj je ažuran." (UF-10 A1).

### A12. Change history – `/admin/izmene`

**Source:** 00 §10 (audit: who, when, what), [ADR 0004](decisions/0004-admin-writes-with-user-jwt.md).

- Read-only. Nobody can edit or delete entries (RLS).
- Table: Vreme, Administrator (email), Vrsta zapisa (Životni događaj, Procedura, Organizacija, Kategorija, Sinonim, Korak, Dokument, Veza, Zavisnost), Zapis (title if it still resolves, else id; link to its admin page when one exists), Radnja (Kreirano / Izmenjeno / Obrisano / Status: …).
- Expand a row → diff view: a `dl` of changed fields "staro → novo" (long text fields show both versions in two blocks).
- Filters: date range, record type, administrator, and `?zapis={entity_id}` (the A4, A6, A7 forms link here with "Istorija izmena" for their own record).
- Data: `GET /admin/audit-log?entity_type=&entity_id=&changed_by=&from=&to=&limit=&offset=`.
- Empty: "Nema izmena za izabrane filtere."

---

## Open questions

1. **AI route name.** Default `/ai`. Confirm, or rename to `/asistent` for Serbian consistency.
2. **Back link on the procedure page.** Default `?dogadjaj={slug}` query parameter; it only affects the back link and is ignored if invalid.
3. **Synonym target.** 01 and 03 keep `synonyms.maps_to` as free text. A9 mitigates silent breakage with "Proveri u pretrazi". A reference to the target (life event or procedure id) would remove the problem; revisit if broken synonyms show up.
4. **Archiving the only organization of a published procedure.** Default: allowed with a warning listing affected procedures. Alternative: block it to keep PR-02 true for public content.
5. **Category deletion.** Default: not possible in v1.
6. **AI client timeout.** Default 25 s abort, with "Još malo…" after 10 s (00 §10 target is < 10 s for the answer).

---

## Changes from v1.0

- Rewritten in English with Serbian UI copy in informal "ti" (ADR 0001, ADR 0011).
- shadcn/Tailwind references replaced by Osnova and project-local components from 06 (ADR 0001, ADR 0010).
- Routes changed to `/dogadjaj/[slug]`, `/procedura/[slug]`, `/institucija/[slug]`, `/dogadjaj/[slug]/checklist`; `/[slug]` at the root and `/checklist/[id]` removed (ADR 0011).
- Data calls aligned with the REST API under `/api/v1`; pages use the shared service layer; the non-existent `/synonyms` call removed (ADR 0003).
- Organization page (P6) specified; it was only "if it exists".
- Visibility rules fixed: PR-05 applies to direct URLs, search and AI; dependencies on non-public procedures are filtered (ADR 0011; analysis §8).
- Stale warning now also covers never-verified procedures and comes from the API's `is_stale` (ADR 0011).
- Checklist: one versioned localStorage format, per procedure, explicit status choice instead of a cycling tap, correct "browser data" wording instead of "cookies", storage-unavailable state (ADR 0011; analysis §4, §8).
- Phase subtitles corrected; each card names its own dependencies (analysis §8).
- Cost shown by `cost_type`, institution address and kind shown, event duration from `estimated_duration` (ADR 0008).
- AI chat sends `messages[]` history, shows redaction notice, has correct hourly rate-limit and "unavailable" messages, keeps history across in-app navigation but not reloads (ADR 0003, ADR 0006, ADR 0007).
- Server-side AI flow updated from full-text search to catalog-in-prompt with structured `was_answered` (ADR 0006).
- Admin panel fully specified, including dependency editing, synonyms, categories and audit log screens (ADR 0003, ADR 0004, ADR 0005).
- Admin protection described as server checks plus RLS, not middleware (ADR 0004).
- Time-based ISR replaced by on-demand revalidation on admin save (analysis §4, UF-09).
- Search runs on submit at `/pretraga`, resolving the "redirect or filter" ambiguity.
- "WCAG not implemented in v1" removed; accessibility notes per screen added (ADR 0001).
- Mobile-app migration path removed; responsive behavior kept per screen (ADR 0002).
- Wrong references fixed (PR-04 for synonyms, "06-product-spec.md", ".yaml").
