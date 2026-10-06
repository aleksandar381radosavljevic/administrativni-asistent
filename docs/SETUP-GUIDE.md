# Administrativni Asistent - Setup Guide

## 📁 Folder Structure

```
administrativni-asistent/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public routes (no auth layout)
│   │   ├── layout.tsx            # Public layout
│   │   ├── page.tsx              # Home page
│   │   ├── [slug]/               # Life event detail
│   │   │   └── page.tsx
│   │   ├── procedure/
│   │   │   └── [slug]/
│   │   │       └── page.tsx
│   │   ├── search/
│   │   │   └── page.tsx
│   │   └── ai/
│   │       └── page.tsx
│   ├── (admin)/                  # Admin routes (protected)
│   │   ├── layout.tsx            # Admin layout with auth check
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── admin/
│   │       ├── page.tsx          # Dashboard
│   │       ├── events/
│   │       ├── procedures/
│   │       ├── institutions/
│   │       ├── queries/
│   │       └── warnings/
│   └── api/                      # API Routes (backend)
│       ├── ai/
│       │   └── chat/
│       │       └── route.ts
│       ├── search/
│       │   └── route.ts
│       └── admin/
│           ├── procedures/
│           │   └── route.ts
│           └── [...routes].ts
├── components/
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── public/                   # Public-facing components
│   │   ├── ProcedureCard.tsx
│   │   ├── ChecklistItem.tsx
│   │   ├── StepCard.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ...
│   └── admin/                    # Admin-specific components
│       ├── ProcedureForm.tsx
│       ├── LifeEventForm.tsx
│       └── ...
├── lib/
│   ├── i18n/
│   │   └── labels.ts             # All UI text (Serbian)
│   ├── supabase/
│   │   ├── client.ts             # Supabase client (anon)
│   │   ├── server.ts             # Supabase server (service role)
│   │   └── middleware.ts         # Auth middleware
│   ├── ai/
│   │   ├── context-builder.ts    # Build context for Claude
│   │   └── system-prompt.ts      # AI system instructions
│   ├── search/
│   │   ├── full-text.ts          # PostgreSQL FTS
│   │   └── synonyms.ts           # Synonym mapping
│   ├── hooks/
│   │   ├── useChecklist.ts
│   │   ├── useAuth.ts
│   │   └── ...
│   └── utils/
│       ├── format-date.ts
│       ├── cn.ts                 # Class name utility
│       └── constants.ts
├── types/
│   ├── database.ts               # Generated from Supabase
│   ├── procedures.ts
│   ├── life-events.ts
│   └── api.ts
├── public/                       # Static assets
│   ├── icons/
│   └── fonts/
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Actions deploy
├── .env.example                  # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── globals.css
├── postcss.config.js             # Tailwind PostCSS config
├── prettier.config.js            # Code formatting
├── .eslintrc.json                # Linting rules
├── README.md                      # Project README
├── seed-data.json                # Initial seed data
├── 01-domain-model.sql           # Database schema
└── docs/                         # Documentation (from project files)
    ├── 00-product-spec.md
    ├── 01-domain-model.md
    ├── ... (all project docs)
```

## 🚀 Quick Start

### 1. Setup Node.js i projektne zavisnosti

```bash
# Kloniraj/kreiraj projekat
git clone <repository> administrativni-asistent
cd administrativni-asistent

# Instaliraj zavisnosti
npm install

# Proverite da su SVE zavisnosti instalirane
npm ls
```

### 2. Supabase - Kreiraj projekat

1. Idi na https://supabase.com
2. Kreiraj novi projekat (odaberi EU region - Frankfurt)
3. Čekaj da se inicijalizuje (~5 min)
4. Idi u projekat Settings → API → Kopiraj:
   - `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon/public key)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key - ČUVA SE BEZBEDNO)

### 3. Postavi environment varijable

```bash
# Kreiraj .env.local iz template-a
cp .env.example .env.local

# Uredi .env.local i unesi Supabase ključeve
nano .env.local
```

Minimalno trebaju:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Kreiraj bazu podataka

```bash
# Primeni SQL skriptu u Supabase SQL editor-u:
# 1. Idi u Supabase console → SQL Editor
# 2. Kreiraj novi query
# 3. Kopiraš kompletan sadržaj iz `01-domain-model.sql`
# 4. Klikneš "Run"

# Ili koristi Supabase CLI (ako imaš instaliran):
supabase db push  # Ako imaš local supabase setup
```

### 5. Generiši TypeScript tipove iz baze

```bash
# Instaliraj Supabase CLI ako nemaš
npm install -g @supabase/cli

# Generiši tipove
npx supabase gen types typescript --project-id <your-project-id> > types/database.ts

# Ili koristi `npm run db:types` ako si ga dodao u package.json
npm run db:types
```

### 6. Učitaj seed data (opciono)

```bash
# Seed data je u seed-data.json
# Trebak ćeš ga učitati kroz Supabase SQL ili programski

# Za početak, možeš ručno uneti nekoliko kategorija i institucija kroz Supabase console
```

### 7. Kreni razvojni server

```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000) - trebalo bi da vidiš pocetnu stranicu (prazna jer nema podataka).

---

## 🔧 Development Workflow

### Type checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Formatting koda
```bash
npm run format
```

### Build za produkciju
```bash
npm run build
npm start
```

---

## 📦 Anthropic API Setup

1. Idi na https://console.anthropic.com
2. Kreiraj API ključ
3. Postavi ga u `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-xxx
   ```
4. Postavi spending limit u Anthropic konzoli (~$50/mesec za start)

---

## 🔐 GitHub Secrets (za CI/CD)

Ako koristiš GitHub Actions (`.github/workflows/deploy.yml`), trebaš da postavi Secret-e:

1. Idi u GitHub → Settings → Secrets and variables → Actions
2. Dodaj:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `VERCEL_TOKEN` (iz Vercel account)
   - `VERCEL_ORG_ID` (iz Vercel)
   - `VERCEL_PROJECT_ID` (iz Vercel)

---

## 📚 Key Files Explanation

| File | Purpose |
|------|---------|
| `01-domain-model.sql` | PostgreSQL schema sa RLS |
| `.env.example` | Template za environment varijable |
| `tailwind.config.ts` | Design system tokeni |
| `globals.css` | Tailwind direktive i bazni stilovi |
| `lib/i18n/labels.ts` | Sav UI tekst na srpskom |
| `seed-data.json` | Inicijalni podaci za bazu |
| `package.json` | Zavisnosti i npm scripts |

---

## 🐛 Common Issues

### Greška: "Cannot find module '@supabase/supabase-js'"
- Rešenje: `npm install` ponovo da instalira sve zavisnosti

### Greška: "RLS policy violation"
- Rešenje: RLS je aktivna i korisnik nije autentifikovan. Kreni sa `anon` ključem koji se nalazi u `.env.local`

### Greška: "ANTHROPIC_API_KEY not found"
- Rešenje: Proveri da je API ključ ispravan u `.env.local`

### TypeScript greške sa `database.ts`
- Rešenje: Regeneriši sa `npm run db:types` nakon izmene baze

---

## 📖 Next Steps

1. ✅ Setup je gotov - server je pokrenut
2. 🎨 Počni sa komponentama (`components/public/`)
3. 🔧 Implementiraj API routes (`app/api/`)
4. 🧪 Testiraj sa localhost
5. 🚀 Deploy na Vercel

---

## 📞 Kontakt i podrška

Dokumentacija je dostupna u `/docs` foldera:
- `00-product-spec.md` – Specifikacija
- `01-domain-model.md` – Domain model
- `02-user-flows.md` – User flow-ovi
- `03-api-contract.yaml` – API specifikacija
- `04-architecture.md` – Arhitektura
- `05-coding-standards.md` – Coding standards
- `06-design-system.md` – Design system
- `07-ai-instructions.md` – AI instrukcije
- `08-screen-specifications.md` – Screen specs

---

Happy coding! 🚀
