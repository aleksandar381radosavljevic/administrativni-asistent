# API Routes Implementation Guide

**Verzija:** 1.0  
**Datum:** Jun 2026

---

## 📦 Što je Kreirano - Faza 3

### API Routes
1. **`app/api/search/route.ts`** – Full-text search sa sinonima mapiranjem
2. **`app/api/ai/chat/route.ts`** – Claude API sa kontekstom iz baze

### Supabase Utilities
3. **`lib/supabase/client.ts`** – Client-side klijent (anon ključ)
4. **`lib/supabase/server.ts`** – Server-side klijent (service role ključ)
5. **`lib/supabase/middleware.ts`** – Auth middleware za zaštitu ruta

### Type Definitions
6. **`types/api.ts`** – Svi TypeScript tipovi za API zahteve/odgovore

### Utilities
7. **`lib/utils/api.ts`** – Error handling, validacija, formatiranje
8. **`lib/utils/cn.ts`** – Class name kombinovanje (Tailwind)
9. **`lib/utils/constants.ts`** – Konstante

---

## 🚀 Instalacija & Setup

### 1. Kreiraj folder strukturu

```bash
mkdir -p app/api/search
mkdir -p app/api/ai/chat
mkdir -p lib/supabase
mkdir -p lib/utils
mkdir -p types
```

### 2. Kopiraš fajlove

Svaki fajl koji je kreiran treba da ide na njegovu lokaciju:

```
api-search-route.ts          → app/api/search/route.ts
api-ai-chat-route.ts         → app/api/ai/chat/route.ts
lib-supabase-clients.ts      → Razdvoji u:
                               - lib/supabase/client.ts
                               - lib/supabase/server.ts
                               - lib/supabase/middleware.ts
types-api.ts                 → types/api.ts
lib-utils-api.ts             → Razdvoji u:
                               - lib/utils/api.ts
                               - lib/utils/cn.ts
                               - lib/utils/constants.ts
```

### 3. Instaliraj dodatne zavisnosti

```bash
# Za cn() utility
npm install clsx tailwind-merge
```

### 4. Dodaj middleware na root nivoa

Kreiraj fajl na root-u projekta:

```bash
# Kreiraj middleware.ts u root foldera (ne u app/)
touch middleware.ts
```

Sadržaj - vidiš u **lib-supabase-clients.ts** sekcija `middleware.ts (root nivoa)`

### 5. Ažuriraj tsconfig.json

Dodaj path alias ako ga nemaš:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 🔄 Kako Funkcionišu API Routes

### Search Route

**Endpoint:** `GET /api/search?q=pasoš`

**Tok:**
1. ✅ Preuzmete query string parametar `q`
2. ✅ Validira dužinu (2-100 karaktera)
3. ✅ Mapira sinonime (ako postoji u bazi)
4. ✅ Poziva tri paralelne pretrage (life_events, procedures, institutions)
5. ✅ Vraća grupirane rezultate

**Primer zahteva:**
```bash
curl "http://localhost:3000/api/search?q=pasoš"
```

**Primer odgovora:**
```json
{
  "query": "pasoš",
  "original_query": "pasoš",
  "life_events": [
    {
      "id": "event-003",
      "title": "Istekao mi je pasoš",
      "slug": "istekao-pasosh",
      "icon": "🛂",
      "status": "published"
    }
  ],
  "procedures": [
    {
      "id": "proc-005",
      "title": "Pasoš",
      "slug": "pasosh",
      "can_online": false,
      "can_in_person": true,
      "can_by_mail": false,
      "cost_amount": 3000,
      "processing_time": "7-15 radnih dana",
      "status": "published"
    }
  ],
  "institutions": [],
  "total_count": 2
}
```

---

### AI Chat Route

**Endpoint:** `POST /api/ai/chat`

**Tok:**
1. ✅ Preuzmete JSON body sa `message`
2. ✅ Validira dužinu (3-1000 karaktera)
3. ✅ Proverava rate limit (10 upita/IP/sat)
4. ✅ Pronalazi top 5 relevantnih procedura iz baze
5. ✅ Gradi kontekst za AI (procedure + opis)
6. ✅ Poziva Claude API sa kontekstom
7. ✅ Loguje upit u `ai_queries` tabelu (anonimno)
8. ✅ Vraća odgovor sa povezanim procedurama

**Primer zahteva:**
```bash
curl -X POST "http://localhost:3000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "Preselio sam se iz Novog Sada u Beograd, šta trebam da uradim?"}'
```

**Primer odgovora:**
```json
{
  "answer": "Za preseljenje na novu adresu, prvi korak je prijava prebivališta u MUP-u. Trebat će vam lična karta i dokaz o pravu korišćenja stana...",
  "was_answered": true,
  "matched_life_event": {
    "id": "event-004",
    "title": "Selim se na novu adresu",
    "slug": "selim-se-na-novu-adresu"
  },
  "related_procedures": [
    {
      "id": "proc-001",
      "title": "Prijava prebivališta",
      "slug": "prijava-prebivalista",
      "can_online": false,
      "can_in_person": true,
      "can_by_mail": false,
      "cost_amount": 0,
      "processing_time": "1 dan"
    }
  ]
}
```

---

## 🔐 Security Considerations

### API Route Bezbednost

**Search Route:**
- ✅ RLS je aktivna - anon klijent vidi samo `published` sadržaj
- ✅ Nema rate limitinga (može se dodati ako je potrebno)
- ✅ Inputi su validovani (dužina, karakteri)

**AI Chat Route:**
- ✅ Rate limiting: 10 upita/IP/sat (in-memory store za dev, trebalo bi Redis za prod)
- ✅ Antropic ključ je server-sideOnly (nikad na klijentu)
- ✅ Lični podaci se ne loguju (samo query_text bez konteksta)
- ✅ Spending limit je postavljen u Anthropic konzoli (~$50/mesec)

### Zaštita Baze

- ✅ RLS politike su aktivne (vidiš u `01-domain-model.sql`)
- ✅ Service role ključ se koristi SAMO na serveru (`SUPABASE_SERVICE_ROLE_KEY`)
- ✅ Anon ključ se koristi na klijentu (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

---

## 🧪 Testiranje API-ja

### Testiranje lokalnog servera

**Preduslovi:**
1. ✅ Supabase projekat je pokrenut sa bazom
2. ✅ `npm run dev` je pokrenut
3. ✅ Environment varijable su postavljene (`.env.local`)

### Korišćenje cURL

```bash
# Test Search
curl "http://localhost:3000/api/search?q=pasoš"

# Test AI Chat
curl -X POST "http://localhost:3000/api/ai/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"Šta trebam za pasoš?"}'
```

### Korišćenje Postman-a ili Thunder Client-a

1. Kreiraj GET zahtev na `http://localhost:3000/api/search`
2. Dodaj query param: `q=pasoš`
3. Klikni "Send"

---

## 🚨 Common Issues & Troubleshooting

### "RLS policy violation"

**Problem:** Dobijam grešku pri pretrazi

**Rešenje:**
- Proverite da je anon ključ ispravan u `.env.local`
- Proverite da su procedure objavljene (`status = 'published'`)
- Ponovite SQL skriptu iz `01-domain-model.sql` ako je bilo problema sa RLS

### "ANTHROPIC_API_KEY not found"

**Problem:** AI Chat vraća grešku

**Rešenje:**
- Proverite da je ključ ispravan u `.env.local`
- Proverite da je ključ u varijabli `ANTHROPIC_API_KEY` (bez `NEXT_PUBLIC_` prefiksa!)
- API ključ bi trebalo da počinje sa `sk-ant-`

### "Rate limit exceeded"

**Problem:** Dobijam `429 Too Many Requests` posle 10 upita

**Rešenje:**
- Čekaj 1 sat (ili očisti rate limit store u kodu)
- Za produkciju, zameni in-memory store sa Redis-om

### "Search vraća prazne rezultate"

**Problem:** Pretraga ne pronalazi procedure

**Rešenje:**
- Proverite da su procedure u bazi (`SELECT * FROM procedures`)
- Proverite da su objavljene (`status = 'published'`)
- Učitajte seed data iz `seed-data.json`

---

## 📝 Next Steps - Faza 4

Sada možete početi sa **Javnim Komponentama** koje koriste ove API-je:

### Home Page (`app/(public)/page.tsx`)
```typescript
import { createSupabaseClient } from '@/lib/supabase/client';

export default async function Home() {
  const supabase = createSupabaseClient();
  const { data: lifeEvents } = await supabase
    .from('life_events')
    .select('*')
    .eq('status', 'published');
  
  // Render home sa life_events listom
}
```

### Search Results (`app/(public)/search/page.tsx`)
```typescript
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (query) {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then(r => r.json())
        .then(setResults);
    }
  }, [query]);

  // Render rezultate
}
```

### AI Chat (`app/(public)/ai/page.tsx`)
```typescript
'use client';

import { useState } from 'react';

export default function AiPage() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState(null);

  const handleSend = async () => {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setResponse(data);
  };

  // Render AI chat
}
```

---

## 🎯 Checklist Faze 3

- ✅ Kreiraj folder strukturu (`app/api`, `lib`, `types`)
- ✅ Kopiraš API route fajlove
- ✅ Instaliraj dodatne zavisnosti (`clsx`, `tailwind-merge`)
- ✅ Dodaj middleware.ts na root
- ✅ Ažuriraj tsconfig.json sa path alias-ima
- ✅ Testiraj search API sa cURL
- ✅ Testiraj AI chat API sa cURL
- ✅ Verifikuj rate limiting
- ✅ Verifikuj RLS (anon klijent vidi samo published)
- ✅ Kreni sa Fazom 4 - Javne komponente

---

## 📚 Dokumentacija

**Detaljne specifikacije su dostupne u:**
- `03-api-contract.yaml` – OpenAPI specifikacija za sve endpoint-e
- `04-architecture.md` – Arhitekturne odluke (sekcija 4.2 - Custom API Routes)
- `07-ai-instructions.md` – AI instrukcije za razvoj

---

## 💬 Support

Ako naiđeš na problem:
1. Proverite `SETUP-GUIDE.md` sekciju "Common Issues"
2. Proverite `.env.local` da su sve varijable postavljene
3. Logujte greške u browser console (F12)
4. Kopirajte error iz terminal-a gde je `npm run dev` pokrenut

---

Happy coding! 🚀
