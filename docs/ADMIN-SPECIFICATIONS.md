# Admin Panel Screen Specifications – Administrativni Asistent

**Verzija:** 1.0  
**Datum:** Jun 2026  
**Napomena:** Detalji admin panela za sekcije UF-08 do UF-10 iz user flows

---

## 1. ADMIN DASHBOARD – Početna stranica admina

**Usklađenost:** UF-10 zaključak, admin hub

### 1.1 Purpose

Administrator se loguje u admin panel i vidi dashboard sa brzim pristupom svim upravljačkim sekcijama, kao i warningima o zastarelom sadržaju i nedavnim AI upitima.

### 1.2 Components

- **TopBar** – Logo, admin username, logout dugme (desno)
- **Sidebar navigacija** – Linkovi ka svim admin sekcijama
  - Životni događaji
  - Procedure
  - Institucije
  - Dokumenta
  - AI upiti
  - Upozorenja o zastarelosti
- **Dashboard grid** sa card-ovima:
  - **Stats card:** Broj objavljenih procedura, životnih događaja, institucija
  - **Recent activity:** Poslednje 5 izmena (ko je menjao šta i kada)
  - **Stale procedures warning:** Broj procedura starijih od 6 meseci
  - **Unanswered queries:** Broj AI upita bez odgovora
- **Quick actions:**
  - "+ Nova procedura"
  - "+ Novi životni događaj"
  - "+ Nova institucija"

### 1.3 Actions

|Akcija                              |Trigger              |Rezultat                                           |
|------------------------------------|---------------------|---------------------------------------------------|
|Tap na sidebar link                 |Klikne na sekciju    |Navigacija na tu sekciju (lista, CRUD forme)       |
|Tap na Quick Action dugme           |Klikne na "+ Nova…"  |Otvara formu za kreiranje nove stavke              |
|Tap na stale warning card           |Klikne na broj       |Navigacija na "Upozorenja" sekciju (presortirana) |
|Tap na unanswered queries card      |Klikne na broj       |Navigacija na "AI upiti" sekciju (nesortirana)    |
|Tap na recent activity red          |Klikne na red        |Navigacija na detalj te stavke (procedure, event)  |
|Logout                              |Klikne "Odjava"      |Redirect na login stranicu                         |

### 1.4 Validations

- Admin mora biti autentifikovan (JWT token iz Supabase Auth)
- Samo admin korisnici mogu pristupiti (`role = admin` u bazi, opciono)
- Stats su live – ne keširano, fetch se iz baze pri svakom učitavanju

### 1.5 API Calls

|Endpoint                  |Metoda|Kada                             |Šta se dohvata                     |
|--------------------------|------|----------------------------------|-----------------------------------|
|`/admin/life-events`      |GET   |Na inicijalno učitavanje ekrana   |Broj svih events (count)           |
|`/admin/procedures`       |GET   |Na inicijalno učitavanje ekrana   |Broj svih procedura (count)        |
|`/admin/institutions`     |GET   |Na inicijalno učitavanje ekrana   |Broj svih institucija (count)      |
|`/admin/stale-procedures` |GET   |Na inicijalno učitavanje ekrana   |Broj zastalelih procedura (count)  |
|`/admin/ai-queries`       |GET   |Na inicijalno učitavanje ekrana   |Broj neodgovorenih upita (count)   |
|`/admin/audit-log`        |GET   |Na inicijalno učitavanje ekrana   |Poslednje 5 izmena                 |

### 1.6 Permissions

- **Administrator:** Može videti sve statistike i brze pristupe
- **Gost:** Nema pristupa admin panelu (redirect na login)

### 1.7 Loading State

- Skeleton card-ove dok se podaci učitavaju
- Prikazati "Učitavanja…" text dok je u toku

### 1.8 Success State

- Svi brojevi su vidljivi i relevantni
- Recent activity lista je sortirana po vremenu (najnovija prvo)
- Quick action dugmići su vidljivi i klikljivi

---

## 2. LIFE EVENTS MANAGEMENT – Upravljanje životnim događajima

**Usklađenost:** UF-15, UF-17

### 2.1 Life Events List

**Purpose:** Admin vidi sve životne događaje (draft, published, archived) i može ih ažurirati ili arhivirati.

**Components:**
- **Filters:** Status (All / Draft / Published / Archived), Category filter
- **Search bar:** Pretraga po nazivu/slug-u
- **Table/List:**
  - Naslov | Kategorija | Status Badge | Broj procedura | Poslednja izmena | Akcije (Edit, Archive, Delete Draft)

**Actions:**
- Edit → otvara formu (UF-16 detalji)
- Archive → menja status u archived (soft delete)
- Delete → briše draft (samo draft se može obrisati, published se archive-a)

**API:** `GET /admin/life-events`, `PUT /admin/life-events/{id}`, `PATCH /admin/life-events/{id}` (status change)

---

### 2.2 Life Event Create/Edit Form

**Components:**
- **Inputs:** Title, Description, Icon (emoji picker ili text), Slug (auto-generate iz title-a)
- **Dropdown:** Category
- **Status radio:** Draft / Published / Archived
- **Procedures section:** Multi-select list svih procedura, sortable redosled (drag-drop)
- **Form actions:** Sačuvaj / Otkaži / Preview

**Validations (PR-04):**
- Title je obavezan
- Slug mora biti jedinstvena
- Kategorija je obavezna
- Procedure list mora imati najmanje jednu proceduru pre nego što se status promeni u "published"

**Save logic:**
- Kreira life_event zapis
- Kreira life_event_procedures veze (relacije sa procedurama i sort_order)
- Loguje akciju u audit_log

---

## 3. PROCEDURES MANAGEMENT – Upravljanje procedurama

**Usklađenost:** UF-08, UF-09

### 3.1 Procedures List

**Purpose:** Admin vidi sve procedure i može ih ažurirati, definisati zavisnosti, ili arhivirati.

**Components:**
- **Filters:** Status, stale warning (procedures > 6 meseci)
- **Search bar:** Pretraga po nazivu
- **Table:**
  - Naslov | Institucija | Metoda (Online/Lično/Poštom) | Status | Poslednja provera | Akcije (Edit, Dependencies, Archive)

**Actions:**
- Edit → otvara formu (UF-08 detalji)
- Dependencies → otvara modal sa zavisnostima za tu proceduru
- Archive → menja status

**API:** `GET /admin/procedures`, `PUT /admin/procedures/{id}`, `PATCH /admin/procedures/{id}`

---

### 3.2 Procedure Create/Edit Form

**Components:**

**Osnovna sekcija:**
- Title, Slug (auto-generate)
- Description, Status

**Metode obavljanja:**
- ☐ Online
- ☐ Lično
- ☐ Poštom
(Minimalno jedna mora biti označena - PR-03)

**Troškovi:**
- Cost amount (number), Cost description (text)

**Vreme obrade:**
- Processing time (npr. "7-15 radnih dana")

**Linkovi:**
- Official link (URL)
- Form link (URL)

**Koraci sekcija:**
- Dodaj / Uredi / Ukloni korak
- Numerisani redosled (drag-drop sortable)
- Za svaki korak: Naslov, Opis, Link URL (opciono), Link label (opciono)
- Minimum jedan korak (PR-01)

**Dokumenta sekcija:**
- Dodaj / Uredi / Ukloni dokument
- Za svaki: Naziv, Opis, Obavezno/Opciono checkbox, Note
- Sortable

**Institucije sekcija:**
- Multi-select institucija iz baze
- Minimum jedna institucija (PR-02)

**Datum provere:**
- Last verified at (date picker) - automatski setovano na TODAY pri svakom save-u ako je checkbox "Ažuriraj datum provere" označen

**Form actions:** Sačuvaj / Otkaži / Preview

**Validations:**
- Title obavezan
- Bar jedna metoda obavezna (PR-03)
- Bar jedan korak (PR-01)
- Bar jedna institucija (PR-02)
- Cost amount mora biti broj ili prazan
- Svi linkovi moraju biti validni URL-ovi

**Save logic:**
- Kreira ili update-a procedure zapis
- Kreira steps, documents, procedure_institutions relacije
- Loguje u audit_log

---

### 3.3 Dependencies Modal (za proceduru)

**Purpose:** Admin definiše zavisnosti između procedura unutar životnog događaja.

**Komponente:**
- **Life event dropdown:** Odaberi događaj za koji postavi zavisnosti
- **Procedure:** Prikaz trenutne procedure
- **Depends on:** Multi-select lista drugih procedura iz iste life_events
- **Add dependency button:** Dodaj novu zavisnost
- **Existing dependencies:** Lista sa mogućnošću delete-a

**Validations (PR-10):**
- Sistem proverava kružne zavisnosti pre save-a
- Ako bi unos kreirao ciklus, prikazati error: "Kružna zavisnost detektovana"

**API:** `POST /admin/procedures/{id}/dependencies`, `DELETE /admin/procedures/{id}/dependencies`

---

## 4. INSTITUTIONS MANAGEMENT – Upravljanje institucijama

**Usklađenost:** UF-19

### 4.1 Institutions List

**Components:**
- **Search:** Po nazivu
- **Table:**
  - Naziv | Website | Telefon | Status | Akcije (Edit, Archive)

**Actions:**
- Edit → forma
- Archive → status change

**API:** `GET /admin/institutions`, `PUT /admin/institutions/{id}`, `PATCH /admin/institutions/{id}`

---

### 4.2 Institution Create/Edit Form

**Components:**
- Title (obavezan, unikatan)
- Slug (auto-generate)
- Description
- Website (URL)
- Phone
- Email
- Working hours (text – npr. "08:00-15:30, od ponedjeljka do petka")
- Status (Draft / Published / Archived)

**Form actions:** Sačuvaj / Otkaži

---

## 5. DOCUMENTS MANAGEMENT – Upravljanje dokumentima

### 5.1 Documents List (opciono, može biti inline u Procedure CRUD)

**Alternativa:** Dokumenta se kreiraju/menjaju samo kao deo Procedure forme (verovatno bolje za UX).

---

## 6. AI QUERIES MONITORING – Pregled AI upita

**Usklađenost:** UF-21, UF-10

### 6.1 AI Queries List

**Purpose:** Admin pregleda sve upite korisnika (bez ličnih podataka) i identifikuje sadržaj koji nedostaje.

**Components:**
- **Filters:** 
  - Was answered (Yes / No / All)
  - Date range (od/do)
- **Search:** Po query_text
- **Table:**
  - Query text (tekst iz chata, prvih 50 karaktera, sa tooltip-om za puni tekst)
  - Was answered (Yes / No)
  - Matched event (ako je pronađen event, prikazati link)
  - Created at
  - Akcije (View full, Link to event)

**Sorting:** Po datumu (najnoviji prvi)

**Actions:**
- View full → prikazuje kompletan tekst upita u modal-u
- Link to event → otvara event detalj ako je pronađen

**API:** `GET /admin/ai-queries` sa filter parametrima

---

## 7. STALE PROCEDURES WARNINGS – Upozorenja o zastarelosti

**Usklađenost:** UF-22, UF-20

### 7.1 Stale Procedures List

**Purpose:** Admin vidi procedure koje su starije od 6 meseci bez provere (PR-07) i brzo ih ažurira.

**Components:**
- **Automatic refresh:** Lista se osvežava svakih 5 minuta (opciono)
- **Table:**
  - Naslov procedure | Institucija | Poslednja provera (datum) | Dana od provere | Akcije (Edit procedure, Mark as verified)

**Sorting:** Po datumu (najstarije prvo)

**Actions:**
- Edit procedure → otvara procedure CRUD formu
- Mark as verified → update-a `last_verified_at` na TODAY (bez otvaranja forme)

**API:** `GET /admin/stale-procedures`, `PATCH /admin/procedures/{id}` (samo last_verified_at polje)

---

## 8. ADMIN AUTH – Login i autentifikacija

### 8.1 Login Page

**Purpose:** Samo administratori se mogu logovati.

**Components:**
- **Email input**
- **Password input**
- **Login button**
- **Error message** (ako su kredencijali pogrešni)

**Flow:**
1. Admin unese email i lozinku
2. Poziva se Supabase Auth sa `signInWithPassword(email, password)`
3. Ako je uspešno, setuje JWT token u cookies (secure, httpOnly)
4. Redirect na `/admin` dashboard

**API:** Supabase Auth (built-in)

**Napomena:** Samoprijava je onemogućena - pristup se dodeljuje ručno.

---

## 9. MIDDLEWARE & PROTECTION

### 9.1 Admin Route Protection

```typescript
// app/(admin)/layout.tsx - Server Component
// Proverava JWT token i redirect-a ako nije autentifikovan

import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  const supabase = createServerClient()
  const { data } = await supabase.auth.getUser()
  
  if (!data?.user) {
    redirect('/admin/login')
  }
  
  return <>{children}</>
}
```

---

## 10. ADMIN PERMISSION MODEL

|Akcija                       |Gost|Admin|
|-----------------------------|----|----|
|Pregled published sadržaja   |Da  |Da  |
|Pregled draft/archived       |Ne  |Da  |
|Kreiraj/uredi/archive sadržaj|Ne  |Da  |
|Brisanje sadržaja            |Ne  |Ne  |
|Pregled AI upita             |Ne  |Da  |
|Pregled audit log-a          |Ne  |Da  |

---

## 11. ADMIN STYLES & CONSISTENCY

- Isti design system kao javni deo (boje, tipografija, komponente)
- Admin forme koriste `card-base` sa padding-om `p-6`
- Dugmići za akcije: `btn-primary` (Save), `btn-secondary` (Cancel), `btn-destructive` (Delete/Archive)
- Table/List header-e koriste `section-label`
- Error poruke koriste `InfoBanner` (error varijanta)
- Success poruke koriste Toast (success varijanta)

---

## 12. ERROR HANDLING & VALIDATION

- **Client-side validacije** - real-time feedback u formama
- **Server-side validacije** - sve se proverava na serverskom API-ju
- **Business rule checks** - PR-01, PR-02, PR-03, PR-10 se primenjuju na save-u
- **Circular dependency check** - detektuje pre unosa

---

## 13. AUDIT LOGGING

Svaka akcija (create, update, archive) se loguje u `audit_log` tabelu:

```sql
{
  entity_type: 'procedures',
  entity_id: uuid,
  action: 'create' | 'update' | 'archive',
  changed_by: admin_user_id,
  changed_at: NOW(),
  diff: { old_values: {}, new_values: {} }
}
```

Admin može pregledi audit log na dashboard-u (poslednje 10 izmena).

---

## 14. FUTURE ENHANCEMENTS (v2+)

- [ ] Bulk edit (više procedura odjednom)
- [ ] Scheduling (planiranje objavljivanja)
- [ ] Content versioning (verzije procedura)
- [ ] Admin roles & granular permissions (super-admin, editor, viewer)
- [ ] Notifications na email kada se procedure stariju od 6 meseci
- [ ] Advanced analytics (statistics dashboard)
