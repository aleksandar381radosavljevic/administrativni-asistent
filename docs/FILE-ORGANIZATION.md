# 📁 FILE ORGANIZATION GUIDE

## Šta da Radiš Posle Raspakovanja `.tar` Fajla

### ✅ Fajlovi koji Ostaju u ROOT (Ne Pomeraj)
```
.env.example
.eslintrc.json
.gitignore
package.json
tsconfig.json
tailwind.config.ts
next.config.js
postcss.config.js
prettier.config.js
globals.css
middleware.ts
seed-data.json
01-domain-model.sql
```

### 📁 STRANICE (Javne)

| Iz Fajla | U Folder | Opis |
|----------|----------|------|
| `page-home.tsx` | `app/(public)/page.tsx` | Početna stranica |
| `page-search.tsx` | `app/(public)/search/page.tsx` | Pretraga |
| `page-life-event-detail.tsx` | `app/(public)/[slug]/page.tsx` | Detalji događaja |
| `page-procedure-detail.tsx` | `app/(public)/procedure/[slug]/page.tsx` | Detalji procedure |
| `page-checklist.tsx` | `app/(public)/[slug]/checklist/page.tsx` | Checklist |

### 📁 STRANICE (Admin)

**Iz `admin-layout-and-pages.tsx`:**

```
// 1. Pronađi sekciju "// app/(admin)/layout.tsx"
   → Kopiraj u app/(admin)/layout.tsx

// 2. Pronađi sekciju "// app/(admin)/login/page.tsx"
   → Kopiraj u app/(admin)/login/page.tsx

// 3. Pronađi sekciju "// app/(admin)/admin/page.tsx"
   → Kopiraj u app/(admin)/admin/page.tsx
```

**Iz `admin-crud-pages.tsx`:**
```
// Pronađi sekcije:
"// app/(admin)/admin/life-events/page.tsx" → app/(admin)/admin/life-events/page.tsx
"// app/(admin)/admin/life-events/new/page.tsx" → app/(admin)/admin/life-events/new/page.tsx
"// app/(admin)/admin/life-events/[id]/edit/page.tsx" → app/(admin)/admin/life-events/[id]/edit/page.tsx
"// app/(admin)/admin/procedures/page.tsx" → app/(admin)/admin/procedures/page.tsx
```

**Iz `admin-institutions-pages.tsx`:**
```
"// app/(admin)/admin/institutions/page.tsx" → app/(admin)/admin/institutions/page.tsx
"// app/(admin)/admin/institutions/new/page.tsx" → app/(admin)/admin/institutions/new/page.tsx
"// app/(admin)/admin/institutions/[id]/edit/page.tsx" → app/(admin)/admin/institutions/[id]/edit/page.tsx
```

**Iz `admin-procedures-pages.tsx`:**
```
"// app/(admin)/admin/procedures/new/page.tsx" → app/(admin)/admin/procedures/new/page.tsx
"// app/(admin)/admin/procedures/[id]/edit/page.tsx" → app/(admin)/admin/procedures/[id]/edit/page.tsx
```

**Iz `admin-monitoring-pages.tsx`:**
```
"// app/(admin)/admin/ai-queries/page.tsx" → app/(admin)/admin/ai-queries/page.tsx
"// app/(admin)/admin/warnings/page.tsx" → app/(admin)/admin/warnings/page.tsx
```

### 📁 API ROUTES

| Iz Fajla | U Folder |
|----------|----------|
| `api-search-route.ts` | `app/api/search/route.ts` |
| `api-ai-chat-route.ts` | `app/api/ai/chat/route.ts` |

### 📁 KOMPONENTE

**Iz `components-ui-base.tsx` (13 komponenti):**
```
// Kopiraj CIJELI fajl u:
components/ui/index.tsx
// ILI rasporedi po komponentama:
components/ui/button.tsx
components/ui/card.tsx
components/ui/input.tsx
... itd.
```

**Iz `components-public.tsx` (11 komponenti):**
```
// Kopiraj CIJELI fajl ili rasporedi po komponentama:
components/public/SearchBar.tsx
components/public/HomeEventCard.tsx
components/public/ProcedureCard.tsx
components/public/StepCard.tsx
components/public/ChecklistItem.tsx
components/public/ChatMessage.tsx
components/public/PhaseIndicator.tsx
components/public/EmptyState.tsx
components/public/ErrorState.tsx
components/public/InstitutionCard.tsx
components/public/CategoryChips.tsx
```

**Iz `components-admin-forms.tsx` (4 forme):**
```
// Rasporedi:
components/admin/LifeEventForm.tsx
components/admin/ProcedureForm.tsx
components/admin/InstitutionForm.tsx
components/admin/DependencyModal.tsx
// ILI kopiraj kao index.tsx sa svim komponentama
components/admin/index.tsx
```

### 📁 LIB (Utilities & Hooks)

| Iz Fajla | U Folder |
|----------|----------|
| `lib-i18n-labels.ts` | `lib/i18n/labels.ts` |
| `lib-hooks-useChecklist.ts` | `lib/hooks/useChecklist.ts` |
| `lib-utils-api.ts` | `lib/utils/api.ts` |
| `lib-supabase-clients.ts` (rasporedi po fajlovima) | `lib/supabase/` |

**Za `lib-supabase-clients.ts` – rasporedi na 3 fajla:**

```typescript
// lib/supabase/client.ts
// Pronađi sekciju "export function createSupabaseClient()"
// Kopiraj samo tu funkciju

// lib/supabase/server.ts
// Pronađi sekciju "export function createServerSupabaseClient()"
// Kopiraj samo tu funkciju

// lib/supabase/middleware.ts
// Pronađi sekciju za middleware logiku
// Kopiraj samo to
```

### 📁 TYPES

| Iz Fajla | U Folder |
|----------|----------|
| `types-api.ts` | `types/api.ts` |

### 📁 DOKUMENTACIJA

Premesti u `/docs` folder:
```
FINAL-SUMMARY.md
SETUP-GUIDE.md
README.md
ADMIN-SPECIFICATIONS.md
COMPLETION-STATUS.md
API-IMPLEMENTATION-GUIDE.md
```

### 📁 GITHUB ACTIONS

```
.github-workflows-deploy.yml → .github/workflows/deploy.yml
```

---

## 🎯 Brza Instrukcija (Korak po Korak)

### 1. Raspakovaj `.tar` fajl
```bash
tar -xzf administrativni-asistent-v1.tar.gz
cd administrativni-asistent
```

### 2. Kreiraj foldersku strukturu
```bash
# Koristi ove komande:
mkdir -p app/{,\(public\)/,\(public\)/procedure/\[slug\]/,\(public\)/\[slug\]/checklist,\(public\)/search,\(public\)/ai,\(admin\)/{login,admin/{life-events,procedures,institutions,ai-queries,warnings}},api/{search,ai/chat}}
mkdir -p components/{ui,public,admin}
mkdir -p lib/{i18n,hooks,supabase,utils}
mkdir -p types
mkdir -p .github/workflows
mkdir -p docs
```

### 3. Pomeri jednostavne fajlove
```bash
# Stranice
mv page-home.tsx app/\(public\)/page.tsx
mv page-search.tsx app/\(public\)/search/page.tsx
mv page-life-event-detail.tsx app/\(public\)/\[slug\]/page.tsx
mv page-procedure-detail.tsx app/\(public\)/procedure/\[slug\]/page.tsx
mv page-checklist.tsx app/\(public\)/\[slug\]/checklist/page.tsx

# API
mv api-search-route.ts app/api/search/route.ts
mv api-ai-chat-route.ts app/api/ai/chat/route.ts

# Lib
mv lib-i18n-labels.ts lib/i18n/labels.ts
mv lib-hooks-useChecklist.ts lib/hooks/useChecklist.ts
mv lib-utils-api.ts lib/utils/api.ts
mv types-api.ts types/api.ts

# Dokumentacija
mv FINAL-SUMMARY.md SETUP-GUIDE.md README.md ADMIN-SPECIFICATIONS.md COMPLETION-STATUS.md API-IMPLEMENTATION-GUIDE.md docs/

# GitHub
mv .github-workflows-deploy.yml .github/workflows/deploy.yml
```

### 4. Ručno rasporedi Komponente
- **Otvori** `components-ui-base.tsx` u editoru
- **Kopiraj** sve komponente u `components/ui/` (ili kao index.tsx)
- **Isto** za `components-public.tsx` i `components-admin-forms.tsx`

### 5. Ručno rasporedi Admin Stranice
- **Otvori** `admin-layout-and-pages.tsx`
- **Pronađi** sekcije sa `// app/(admin)/...`
- **Kopiraj** u odgovarajuće fajlove

---

## ✅ Verifikacija

Kada završiš, struktura bi trebala da izgleda ovako:

```bash
$ tree -L 2 app/
app/
├── (public)/
│   ├── page.tsx
│   ├── search/
│   ├── [slug]/
│   ├── procedure/
│   └── ai/
├── (admin)/
│   ├── layout.tsx
│   ├── login/
│   └── admin/
└── api/
    ├── search/
    └── ai/

$ tree -L 1 components/
components/
├── ui/
├── public/
└── admin/

$ tree -L 1 lib/
lib/
├── i18n/
├── hooks/
├── supabase/
└── utils/
```

---

## 🎉 Gotovo!

Sada možeš:
```bash
npm install
npm run dev
```

Bilo koji problem? Čitaj `docs/SETUP-GUIDE.md` 📖
