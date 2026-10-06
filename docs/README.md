# 🇷🇸 Administrativni Asistent

**Web aplikacija koja građanima Srbije objašnjava administrativne procedure jednostavnim, svakodnevnim jezikom.**

> Korisnik ne treba da poznaje zvanične nazive procedure. Dovoljno je da zna šta mu se u životu dešava. Aplikacija mu objašnjava šta treba da uradi, kojim redosledom, gde da ode, šta da ponese i koliko će ga to koštati i trajati.

**Verzija:** 1.0 | **Status:** Ready for Development | **Jezik:** Srpski (frontend), Engleski (kod)

---

## 📋 Što je uključeno u ovoj kolekciji fajlova

### ✅ Dokumentacija (iz `/mnt/project/`)
1. **00-product-spec.md** – Kompletan opis proizvoda, funkcionalnosti, poslovnih pravila
2. **01-domain-model.md** – Domain model sa svim entitetima i relacijama
3. **02-user-flows.md** – Detaljni user flow-ovi za sve akcije
4. **03-api-contract.yaml** – OpenAPI specifikacija sa svim endpoint-ima
5. **04-architecture.md** – Tehnička arhitektura (Next.js, Supabase, Claude API)
6. **05-coding-standards.md** – Konvencije koda, imenovanja, lokalizacije
7. **06-design-system.md** – Kompletni design system (boje, tipografija, komponente)
8. **07-ai-instructions.md** – Centralne AI instrukcije za razvoj
9. **08-screen-specifications.md** – Detalji svake stranice (public side)
10. **vizuelni-pravac.html** – Interaktivni mockup sa primeri

### ✨ Novo kreirano za Fazu 0

| Fajl | Opis |
|------|------|
| **01-domain-model.sql** | PostgreSQL schema sa 10+ tabela, indeksi, RLS politike |
| **package.json** | Next.js 14, TypeScript, Tailwind, shadcn/ui, Supabase, Anthropic |
| **tsconfig.json** | TypeScript sa strict mode-om |
| **tailwind.config.ts** | Design system tokeni mapirati |
| **globals.css** | Tailwind direktive i bazni stilovi |
| **.env.example** | Sve potrebne environment varijable |
| **.gitignore** | Node.js + Next.js specifičan |
| **next.config.js** | Next.js konfiguracija sa sigurnosnim header-ima |
| **postcss.config.js** | PostCSS za Tailwind |
| **prettier.config.js** | Code formatting |
| **.eslintrc.json** | Linting rules |
| **lib/i18n/labels.ts** | Sav UI tekst na srpskom (centralizovan) |
| **seed-data.json** | Inicijalni podaci za 20 životnih događaja + procedure + institucije |
| **.github/workflows/deploy.yml** | GitHub Actions za automatic deploy na Vercel |
| **SETUP-GUIDE.md** | Detaljni vodič za lokalnu instalaciju i setup |
| **ADMIN-SPECIFICATIONS.md** | Kompletne specifikacije admin panela (novo!) |

---

## 🚀 Quick Start (5 minuta)

### 1. Kloniraj i instaliraj
```bash
npm install
```

### 2. Kreiraj Supabase projekat
- Idi na https://supabase.com
- Kreiraj novi projekat (EU region - Frankfurt)
- Kopiraj ključeve

### 3. Postavi environment varijable
```bash
cp .env.example .env.local
# Uredi .env.local i unesi Supabase + Anthropic ključeve
```

### 4. Kreiraj bazu
- Idi u Supabase console → SQL Editor
- Kopiraš kompletan sadržaj **01-domain-model.sql**
- Klikneš "Run"

### 5. Kreni server
```bash
npm run dev
```

Otvori [http://localhost:3000](http://localhost:3000) ✅

---

## 📁 Folder struktura

```
app/                 # Next.js App Router
├── (public)/        # Javne stranice (početna, procedure, checklist, AI chat)
├── (admin)/         # Admin stranice (login, dashboard, CRUD forme)
└── api/             # API Routes (backend logika)

components/
├── ui/              # shadcn/ui komponente
├── public/          # Javne komponente (ChecklistItem, ProcedureCard, itd.)
└── admin/           # Admin komponente (forme, tabele)

lib/
├── i18n/            # Lokalizacija (labels.ts)
├── supabase/        # Supabase klijenti i helperi
├── ai/              # AI context builder
├── search/          # Full-text search i sinonimi
└── hooks/           # Custom React hooks

types/               # TypeScript tipovi (generiše se iz baze)
public/              # Statički assets
docs/                # Sva projektna dokumentacija
```

---

## 🎨 Design System

- **Paleta:** Topla boja sa narandžastom, žutom i sagom
- **Tipografija:** Plus Jakarta Sans (naslovi) + Inter (tekst) + JetBrains Mono (brojevi)
- **Komponente:** 25+ komponenti (Badge, Button, Card, ChecklistItem, ProcedureCard, itd.)
- **Tokens:** Direktno mapirati iz `tailwind.config.ts` (boje, spacing, radius, shadow)

Vidi **06-design-system.md** i **vizuelni-pravac.html** za detaljne specifikacije.

---

## 🗄️ Baza podataka

**PostgreSQL (Supabase)** sa:
- ✅ 10+ tabela (categories, life_events, procedures, steps, documents, institutions, synonyms, audit_log, ai_queries)
- ✅ RLS (Row Level Security) - javni korisnici vide samo `published` sadržaj
- ✅ Indexes za brzu pretragu i query-je
- ✅ Enumi (content_status, audit_action)
- ✅ Trigger-i (update updated_at, check circular dependencies)

SQL je u **01-domain-model.sql** - ready za Supabase.

---

## 🤖 AI Asistent

- **Model:** Claude Sonnet 4.6
- **Provider:** Anthropic API
- **Kontekst:** Top 3-5 relevantnih procedura iz baze (full-text search)
- **Odgovori:** Isključivo iz baze - nikad external knowledge
- **Rate limit:** 10 upita/IP/sat
- **Lični podaci:** Ne čuvaju se

---

## 🔐 Autentifikacija & Sigurnost

- **Supabase Auth** za administratore (email + lozinka)
- **JWT tokeni** - automatski refresh
- **RLS politike** - kontrola pristupa na nivou baze
- **HTTPS** - obavezno
- **API ključevi** - server-side samo, nikad na klijentu
- **Spending limit** - postavljen u Anthropic konzoli

---

## 📊 Nefunkcionalni zahtevi

| Zahtev | Vrednost |
|--------|----------|
| Početna stranica | < 2s |
| Pretraga | < 1s |
| AI odgovor | < 10s |
| Dostupnost | 99% uptime |
| Responsive | Mobile-first, svi uređaji |
| Pretraživači | Chrome, Firefox, Safari, Edge (poslednje 2 verzije) |

---

## 🧪 Development Workflow

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format

# Build za produkciju
npm run build
npm start

# Generiši TypeScript tipove iz baze
npm run db:types
```

---

## 🚀 Deployment

**Vercel** - Automatski deploy pri push-u na `main` branch.

GitHub Actions workflow (`.github/workflows/deploy.yml`) je već konfiguriran.

Trebaju GitHub Secrets:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- Svi environment ključevi (`NEXT_PUBLIC_SUPABASE_URL`, itd.)

---

## 📚 Gdje su specifikacije za svaki dio

| Trebam da znam... | Dokument |
|-------------------|----------|
| Što radi aplikacija? | `00-product-spec.md` |
| Kako su organizovani podaci? | `01-domain-model.md` |
| Kako se koristi? (user flow-ovi) | `02-user-flows.md` |
| API endpoint-i? | `03-api-contract.yaml` |
| Tehnički stack? | `04-architecture.md` |
| Konvencije koda? | `05-coding-standards.md` |
| Design tokeni i komponente? | `06-design-system.md` |
| AI instrukcije za razvoj? | `07-ai-instructions.md` |
| Kako izgledaju stranice? | `08-screen-specifications.md` + `vizuelni-pravac.html` |
| Kako postaviti admin panel? | `ADMIN-SPECIFICATIONS.md` |
| Kako lokallysetup-ovati? | `SETUP-GUIDE.md` |

---

## 🎯 Next Steps

1. **Kloniraj:** `git clone <repo>`
2. **Instaliraj:** `npm install`
3. **Setup:** Prati `SETUP-GUIDE.md`
4. **Kreiraj bazu:** Pokreni `01-domain-model.sql` u Supabase
5. **Kreni server:** `npm run dev`
6. **Počni sa kodom:** Vidi folder strukturu gore

**Preporučeni redosled komponent za razvoj:**
1. Javne komponente (Home, Procedure detail, Checklist, AI Chat)
2. API Routes (search, AI, public endpoints)
3. Admin CRUD forme i stranice
4. Integracija sa Anthropic API-jem

---

## 🐛 Common Issues & Rešenja

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install
```

### "RLS policy violation"
Proveri da je anon ključ ispravan u `.env.local`

### "ANTHROPIC_API_KEY not found"
Proveri da je ključ ispravan i DA NIJE u `NEXT_PUBLIC_` varijabli

### "TypeScript errors sa database.ts"
```bash
npm run db:types
```

---

## 📞 Dokumentacija i podrška

Sve specifikacije su u `/docs` foldera (ovi fajlovi su iz `/mnt/project/`):

- Detaljan product spec
- Domain model sa relacijama
- User flow-ovi sa alternative scenario-ima
- OpenAPI specifikacija
- Arhitekturne odluke (ADR)
- Design system sa 25+ komponenti
- Screen specifications za svaki ekran
- Admin panel specifikacije

---

## 📄 Licence & Kontakt

**Vlasnik:** Administrativni Asistent projekat  
**Status:** Open za razvoj | Verzija 1.0 | Jun 2026

---

## ✨ Features v1.0

- ✅ 20 životnih događaja (kategorije, procedure, zavisnosti)
- ✅ Brojač procedura i filtriranje po statusu
- ✅ Checklist sa localStorage (offline podrška)
- ✅ AI asistent sa full-text search pretraživanjem
- ✅ Admin panel sa CRUD forme za sve entitete
- ✅ Audit logging svake izmene
- ✅ Design system sa 25+ komponenti
- ✅ RLS sigurnost na nivou baze
- ✅ Responsive mobile-first dizajn

---

## 🔄 Verzije & Timeline

| Verzija | Target | Features |
|---------|--------|----------|
| **v1.0** | Jun 2026 | Core features, admin panel, AI asistent |
| **v1.1** | Q3 2026 | WCAG accessibility audit, performance optimizacije |
| **v2.0** | Q4 2026 | User registration, checklist sync, email notifikacije, eUprava API |

---

Happy coding! 🚀

Za bilo koja pitanja, vidi `/docs` fajlove ili kreni sa `SETUP-GUIDE.md`.
