> **Status: frozen, out of scope for v1.** See [ADR 0002](../decisions/0002-web-only-v1.md). Kept as written (v1.0, Serbian) for a future mobile phase; versions, design rules and API shapes here are outdated and must be revisited against the current docs before use.

# Architecture – Administrativni Asistent Mobile (v1.5)

**Verzija:** 1.0  
**Datum:** Jun 2026  
**Status:** Za implementaciju  
**Platforma:** iOS + Android (React Native + Expo)

-----

## Instrukcije za AI

- Ova arhitektura je finalna za v1.5 – React Native + Expo je izbor za development speed
- Offline-first je ključan aspekt – AsyncStorage je storage backend
- Sve API logike se direktno preuzimaju od web verzije (`03-api-contract.yaml`)
- Ne dodavaj nove tehnologije bez eksplicitnog zahteva
- Deployment je samo nadev devices (Expo Go) i EAS Preview – nema App Store/Google Play u v1.5

-----

## 1. Pregled sistema

```
┌─────────────────────────────────────────────────┐
│          KORISNIK NA MOBILNOM UREĐAJU           │
│        (iOS ili Android, Expo Go aplikacija)    │
└─────────────────┬───────────────────────────────┘
                  │ Bluetooth/WiFi/Cellular
┌─────────────────▼───────────────────────────────┐
│                                                 │
│         REACT NATIVE + EXPO APPLICATION         │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Navigation (React Navigation)           │  │
│  │  ├─ Bottom Tab Navigator                 │  │
│  │  │  ├─ Home (Life Events)               │  │
│  │  │  ├─ Search                           │  │
│  │  │  └─ AI Chat                          │  │
│  │  └─ Stack Navigator (Life Event detail) │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Local Storage (AsyncStorage)            │  │
│  │  - Checklist stanja                      │  │
│  │  - Procedure cache                       │  │
│  │  - Session cache                         │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
└─────────────────┬────────────────┬─────────────┘
                  │                │
      ┌───────────▼────────┐  ┌────▼─────────────────┐
      │   SUPABASE         │  │  ANTHROPIC API       │
      │   (PostgreSQL,     │  │                      │
      │    Auth, RLS)      │  │  AI Asistent         │
      │                    │  │  (server-side proxy) │
      └────────────────────┘  └──────────────────────┘
```

**Napomena:** Web server (Vercel) je proxy za AI pozive – mobilna aplikacija poziva Supabase direktno za podatke i web server za AI.

-----

## 2. Stack odluke

|Sloj            |Tehnologija                                                |Razlog                                               |
|----------------|-----------------------------------------------------------|-----------------------------------------------------|
|Framework       |React Native                                               |JavaScript u production-u, swift development cycle   |
|Build tool      |Expo                                                       |Zero-config, instant development (Expo Go), EAS build|
|Navigacija      |React Navigation 6+                                        |Industry standard, bottom tabs + stack support       |
|HTTP zahtevi    |Fetch API / axios                                          |Fetch je ugrađen, axios opciono                      |
|Lokalno čuvanje |AsyncStorage (+ SQLite budući)                             |Jednostavno, performantno za v1.5                    |
|State management|Zustand ili Context API                                    |Zustand je lakši od Redux za malu aplikaciju         |
|Stil            |React Native StyleSheet                                    |Native styling, nema CSS/Tailwind                    |
|Tipski sistem   |TypeScript                                                 |Isti kao web, type safety                            |
|Autentifikacija |Supabase Auth (@supabase/supabase-js)                      |Ista kao web, JWT sa AsyncStorage persistence        |
|Font loading    |expo-font                                                  |Plus Jakarta Sans, Inter, JetBrains Mono             |
|SVG/Ikone       |react-native-svg + Feather icons (ili expo-linear-gradient)|Lightweight, performance                             |

-----

## 3. Folder struktura

```
administrativni-asistent-mobile/
│
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx              ← Bottom tab layout (3 taba)
│   │   ├── index.tsx                ← Home screen (Life Events lista)
│   │   ├── search.tsx               ← Search screen
│   │   └── ai.tsx                   ← AI Chat screen
│   │
│   ├── (stack)/
│   │   ├── _layout.tsx              ← Stack navigator za deep screens
│   │   ├── life-event/[id].tsx      ← Life Event detalji
│   │   ├── procedure/[id].tsx       ← Procedure detalji
│   │   └── checklist/[id].tsx       ← Checklist za event
│   │
│   └── _layout.tsx                  ← Root layout (Expo Router)
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx               ← Base button (primary, secondary, ghost)
│   │   ├── Card.tsx                 ← Base card sa shadow
│   │   ├── Badge.tsx                ← Status/metoda badge
│   │   ├── SearchBar.tsx            ← Search input
│   │   ├── PhaseIndicator.tsx       ← Vertikalna putanja (faze zavisnosti)
│   │   ├── CheckCard.tsx            ← Checklist red (todo/in-progress/done/blocked)
│   │   ├── ProcedureCard.tsx        ← Procedure u listi (kratka kartice)
│   │   ├── StepCard.tsx             ← Numerisan korak procedure
│   │   ├── DocumentRow.tsx          ← Jedan dokument sa checkbox-om
│   │   ├── InstitutionCard.tsx      ← Institucija sa kontaktima
│   │   ├── ChatMessage.tsx          ← AI/user poruka u chatu
│   │   ├── InfoBanner.tsx           ← Upozorenja/info/error poruke
│   │   ├── ProgressBar.tsx          ← Progress za checklist
│   │   ├── HomeEventCard.tsx        ← Event u listi na početnoj
│   │   └── Skeleton.tsx             ← Loading placeholder
│   │
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── LifeEventDetailScreen.tsx
│   │   ├── ProcedureDetailScreen.tsx
│   │   ├── ChecklistScreen.tsx
│   │   └── AiChatScreen.tsx
│   │
│   └── layout/
│       ├── SafeAreaView.tsx         ← Wrapper za safe area (notch handling)
│       └── TabBar.tsx               ← Custom bottom tab bar (ako treba customization)
│
├── lib/
│   ├── supabase.ts                  ← Supabase client + auth context
│   ├── offline-db.ts                ← AsyncStorage wrapper
│   ├── cache.ts                     ← Cache management (procedure, life-events)
│   │
│   ├── theme/
│   │   ├── colors.ts                ← Design tokeni (boje)
│   │   ├── spacing.ts               ← Spacing konstante (4px skala)
│   │   ├── typography.ts            ← Font sizes, weights, line-heights
│   │   └── index.ts                 ← Centralizovani export
│   │
│   ├── api/
│   │   ├── life-events.ts           ← GET /life-events
│   │   ├── procedures.ts            ← GET /procedures
│   │   ├── search.ts                ← GET /search
│   │   ├── ai.ts                    ← POST /ai/chat
│   │   └── index.ts                 ← Centralizovani HTTP client
│   │
│   └── hooks/
│       ├── useChecklist.ts          ← Checklist state (AsyncStorage)
│       ├── useSearch.ts             ← Search sa caching
│       ├── useOffline.ts            ← Offline status detector
│       ├── useProcedure.ts          ← Procedure fetch + cache
│       └── useAuth.ts               ← Supabase auth status
│
├── types/
│   ├── index.ts                     ← Svi TypeScript tipovi (preuzmi od web-a)
│   └── navigation.ts                ← Navigation prop tipovi
│
├── utils/
│   ├── format.ts                    ← Format datuma, cene, vremena
│   ├── constants.ts                 ← Globalne konstante
│   └── helpers.ts                   ← Utility funkcije
│
├── assets/
│   └── fonts/
│       ├── PlusJakartaSans_800Bold.ttf
│       ├── Inter_400Regular.ttf
│       └── JetBrainsMono_600SemiBold.ttf
│
├── app.json                         ← Expo konfiguracija (name, version, icon, splash)
├── package.json
├── tsconfig.json
├── .env.example                     ← Environment varijable template
└── README.md                        ← Development setup instructions
```

**Napomena:** `app/` folder koristi Expo Router (file-based routing, kao Next.js), ne obavezno React Navigation ručno. Ali React Navigation je pouzdan izbor.

-----

## 4. Supabase + Auth setup

### 4.1 Supabase konfiguracija za mobile

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database';

// Iz .env
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Kreiraj client sa AsyncStorage za persistence
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper za RLS queries (javni podaci samo)
export async function getPublishedLifeEvents() {
  const { data, error } = await supabase
    .from('life_events')
    .select('*')
    .eq('status', 'published')
    .order('sort_order');
  
  if (error) throw error;
  return data;
}

export async function getPublishedProcedure(slug: string) {
  const { data, error } = await supabase
    .from('procedures')
    .select('*, steps(*), documents(*), institutions(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  
  if (error) throw error;
  return data;
}
```

### 4.2 Environment varijable

```bash
# .env.example
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_API_URL=https://api.administrativniasistent.rs/v1
```

**Napomena:** `EXPO_PUBLIC_` prefiks omogućava pristup klijenta ovim varijablama (sigurne su, jer su javne).

-----

## 5. Offline-first arhitektura

### 5.1 AsyncStorage strategija (v1.5)

```typescript
// lib/offline-db.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineDB {
  // Checklist storage
  async saveChecklistStatus(lifeEventId: string, status: ChecklistEntry[]) {
    const key = `checklist_${lifeEventId}`;
    await AsyncStorage.setItem(key, JSON.stringify(status));
  }

  async getChecklistStatus(lifeEventId: string): Promise<ChecklistEntry[]> {
    const key = `checklist_${lifeEventId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  // Procedure cache (za offline čitanje)
  async cacheProcedure(procedure: Procedure) {
    const key = `procedure_${procedure.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(procedure));
  }

  async getCachedProcedure(procedureId: string): Promise<Procedure | null> {
    const key = `procedure_${procedureId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  // Life events cache
  async cacheLifeEvents(events: LifeEvent[]) {
    const key = 'life_events_cache';
    const timestamp = Date.now();
    await AsyncStorage.setItem(
      key,
      JSON.stringify({ events, timestamp })
    );
  }

  async getCachedLifeEvents(): Promise<LifeEvent[] | null> {
    const key = 'life_events_cache';
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;

    const { events, timestamp } = JSON.parse(data);
    const oneHourAgo = Date.now() - 3600000;

    // Cache je validan ako je stariji < 1 sat
    if (timestamp > oneHourAgo) {
      return events;
    }

    // Inače, cache je zastareo
    return null;
  }

  // Session management
  async saveSession(session: Session) {
    await AsyncStorage.setItem('session', JSON.stringify(session));
  }

  async getSession(): Promise<Session | null> {
    const data = await AsyncStorage.getItem('session');
    return data ? JSON.parse(data) : null;
  }

  async clearAll() {
    await AsyncStorage.clear();
  }
}

export const offlineDB = new OfflineDB();
```

### 5.2 Cache invalidacija

Strategija:

- **Checklist:** Nikad ne expajra (korisnik ga kontroliše, local-only)
- **Procedure:** Cache 1 sat (refresh-a kada ponovo otvori app)
- **Life Events:** Cache 1 sat
- **Search resultati:** Cache 30 minuta

```typescript
// lib/cache.ts
const CACHE_EXPIRY = {
  PROCEDURE: 3600000,      // 1 sat
  LIFE_EVENTS: 3600000,    // 1 sat
  SEARCH: 1800000,         // 30 minuta
} as const;

export async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  expiryMs: number
): Promise<T> {
  const cached = await AsyncStorage.getItem(key);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < expiryMs) {
      return data; // Cache još validan
    }
  }

  // Fetch novi podaci
  const data = await fetcher();
  await AsyncStorage.setItem(
    key,
    JSON.stringify({ data, timestamp: Date.now() })
  );

  return data;
}
```

### 5.3 Offline detection

```typescript
// lib/hooks/useOffline.ts
import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return isOffline;
}
```

-----

## 6. Navigacijska struktura

### 6.1 Bottom Tab Navigator (glavni UI)

```typescript
// app/(tabs)/_layout.tsx
import { BottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = BottomTabNavigator();

export default function TabsLayout() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.amber,
        tabBarInactiveTintColor: colors['ink-muted'],
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.clay,
          borderTopWidth: 1,
        },
      }}
    >
      <Tab.Screen
        name="index"
        options={{
          title: 'Početna',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="search"
        options={{
          title: 'Pretraga',
          tabBarIcon: ({ color }) => <SearchIcon color={color} />,
        }}
      />
      <Tab.Screen
        name="ai"
        options={{
          title: 'AI Asistent',
          tabBarIcon: ({ color }) => <ChatIcon color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
```

### 6.2 Stack Navigator (detalji stranice)

```typescript
// app/(stack)/_layout.tsx
import { StackNavigator } from '@react-navigation/native-stack';

const Stack = StackNavigator();

export default function StackLayout() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: colors.ink,
        headerStyle: {
          backgroundColor: colors.cream,
        },
      }}
    >
      <Stack.Screen name="life-event/[id]" options={{ title: '' }} />
      <Stack.Screen name="procedure/[id]" options={{ title: '' }} />
      <Stack.Screen name="checklist/[id]" options={{ title: 'Checklist' }} />
    </Stack.Navigator>
  );
}
```

-----

## 7. API komunikacija

Svi API zahtevi koriste istu logiku kao web verzija (`03-api-contract.yaml`), ali preko Supabase SDK ili direktan HTTP.

### 7.1 Direktni Supabase pozivi (preporučeno)

```typescript
// lib/api/life-events.ts
import { supabase } from '@/lib/supabase';

export async function fetchPublishedLifeEvents() {
  const { data, error } = await supabase
    .from('life_events')
    .select('*, life_event_procedures(*), procedures(*)')
    .eq('status', 'published')
    .order('sort_order');

  if (error) throw error;
  return data;
}

export async function fetchLifeEventDetail(slug: string) {
  const { data, error } = await supabase
    .from('life_events')
    .select('*, life_event_procedures(*, procedures(*)), procedure_dependencies(*)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (error) throw error;
  return data;
}
```

### 7.2 Hybrid za AI chat (preko web servera)

AI zahtevi moraju biti server-side (API ključ nije sigurna na klijentu), pa koristiš web API:

```typescript
// lib/api/ai.ts
export async function sendAiMessage(message: string) {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/ai/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) throw new Error('AI request failed');
  return response.json();
}
```

### 7.3 Search (direktan ili preko API-ja)

```typescript
// lib/api/search.ts - opcija 1: direktan Supabase FTS
export async function searchPublished(query: string) {
  const { data, error } = await supabase
    .rpc('search_all', { search_query: query });
  
  if (error) throw error;
  return data;
}

// Ili opcija 2: preko web API-ja
export async function searchViaApi(query: string) {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/search?q=${encodeURIComponent(query)}`
  );
  if (!response.ok) throw new Error('Search failed');
  return response.json();
}
```

**Preporuka:** Direktan Supabase je brži za mobile.

-----

## 8. Performance & Size optimization

### 8.1 Code splitting

```typescript
// components/screens/HeavyScreen.tsx
import { lazy, Suspense } from 'react';

const LazyAiChat = lazy(() => import('./AiChatScreen'));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <LazyAiChat />
    </Suspense>
  );
}
```

### 8.2 Image optimization

```typescript
// Ne koristi HTTP za slike, koristi emoji ili SVG za ikone
<Text style={{ fontSize: 28 }}>🏠</Text>  // Event ikone

// Ako moraš slike, koristi FastImage (caching)
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: url, priority: FastImage.priority.normal }}
  style={{ width: 200, height: 200 }}
  resizeMode={FastImage.resizeMode.contain}
/>
```

### 8.3 Bundle size

- Koristiti `expo-modules-core` umesto svih Expo modula
- Procenjeni final bundle: **3–4 MB** (za Android), **5–6 MB** (za iOS)

-----

## 9. Local development workflow

### 9.1 Setup (prvi put)

```bash
# 1. Instaliraj Node.js 18+
node --version  # trebam v18+

# 2. Kreiraj Expo projekat
npx create-expo-app administrativni-asistent-mobile
cd administrativni-asistent-mobile

# 3. Instaliraj zavisnosti
npm install

# 4. Konfiguruj .env
cp .env.example .env.local
# Uredi .env.local sa Supabase URL i ključem

# 5. Instaliraj Expo Go aplikaciju na telefon (App Store / Google Play)

# 6. Start dev server
npx expo start

# 7. Scan QR kod sa Expo Go aplikacijom na telefonu
# Automatski hot reload pri svakoj promeni koda
```

### 9.2 Daily development

```bash
# Start development server
npx expo start

# Scan QR sa Expo Go
# Ili pritiski 'w' za web simulator
# Ili pritiski 'a' za Android emulator
# Ili pritiski 'i' za iOS simulator

# Code editing → auto-reload na telefonu
```

### 9.3 Debugovanje

```bash
# React Native debugger
npx react-native-debugger

# Ili direktno u Expo:
# Pritiski Shift+M u Expo server konzoli
# Otvaraš React DevTools u browser-u
```

-----

## 10. Deployment (v1.5 – bez App Store)

### 10.1 Expo Go (dev testing)

Koristiš već za development – instant testiranje na tvom telefonu bez App Store.

### 10.2 EAS Preview (distribuiraj prijateljima bez App Store)

```bash
# 1. Login u Expo
eas login

# 2. Konfiguruj EAS
eas build:configure

# 3. Build preview (interno testiranje)
eas build --platform ios --profile preview
# Ili
eas build --platform android --profile preview

# 4. Rezultat je URL → prosledi prijateljima
# Они otvaraju u Expo Go, ne trebam App Store
```

Prednosti:

- ✅ Testiranje na pravim uređajima
- ✅ Bez App Store/Google Play kompleksnosti
- ✅ Brz turnaround (15–30 minuta)

### 10.3 Proceduara za v2.0 (App Store/Google Play)

Trenutno NEMA. Ako ikad trebešt:

```bash
# iOS (TestFlight, bez punog submission-a)
eas build --platform ios --auto-submit

# Android (Google Play Internal Testing)
eas build --platform android --auto-submit
```

Trebamo:

- Apple Developer account ($99/godišnje)
- Google Play Developer account ($25 jednom)
- App Store certificates, provisioning profiles (EAS handluje)

**Za v1.5:** Nije potrebno.

-----

## 11. App.json konfiguracija

```json
{
  "expo": {
    "name": "Administrativni Asistent",
    "slug": "administrativni-asistent",
    "version": "1.5.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#FBF6ED"
    },
    "ios": {
      "supportsTabletMode": true,
      "bundleIdentifier": "com.administrativniasistent.mobile",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FBF6ED"
      },
      "package": "com.administrativniasistent.mobile",
      "versionCode": 1
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

-----

## 12. Bezbednost

|Zahtev             |Implementacija                                     |
|-------------------|---------------------------------------------------|
|HTTPS              |Sve API zahtevi su HTTPS (Supabase, Vercel)        |
|API ključevi       |EXPO_PUBLIC_* su javni; tajni ključevi u serveru   |
|RLS                |Supabase RLS je aktivan – javni vide samo published|
|Session persistence|JWT se čuva u AsyncStorage automatski              |
|Logout             |await supabase.auth.signOut()                      |
|Offline pristup    |Lokalno čuvan sadržaj nema šifrovanja (v1.5)       |

**Za v2.0 sa registracijom:**

- Biometric authentication
- Šifrovanje AsyncStorage (react-native-keychain)

-----

## 13. Nefunkcionalni zahtevi

|Zahtev           |Vrednost                                  |
|-----------------|------------------------------------------|
|App startup time |< 3 sekunde (od launch ikone do UI-ja)    |
|Screen transition|< 300ms (navigacija između screenova)     |
|API response     |< 2 sekunde (cached lokalnom ako dostupno)|
|Bundle size      |< 5 MB (final, za App Store)              |
|Operativni sistem|iOS 13+, Android 8.0+                     |
|Network          |WiFi, 4G, 3G (sa fallback na cache)       |

-----

## 14. Dependency list (package.json)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-native": "^0.73.0",
    "expo": "^51.0.0",
    "expo-router": "^3.5.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/bottom-tabs": "^6.5.0",
    "@react-navigation/stack": "^6.3.0",
    "@supabase/supabase-js": "^2.40.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "zustand": "^4.4.0",
    "typescript": "^5.3.0",
    "axios": "^1.6.0",
    "expo-font": "^11.10.0",
    "react-native-gesture-handler": "^2.14.0",
    "react-native-reanimated": "^3.5.0",
    "@react-native-community/netinfo": "^11.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-native": "^0.73.0",
    "typescript": "^5.3.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0"
  }
}
```

-----

## 15. Migracija sa web verzije

### 15.1 Šta direktno preuzmiš

```typescript
// types/index.ts – KOPIRAJ DIREKTNO
export interface LifeEvent { /* ... */ }
export interface Procedure { /* ... */ }
export interface Step { /* ... */ }
export interface Institution { /* ... */ }
export type ContentStatus = 'draft' | 'published' | 'archived';
// itd.

// lib/api/ – PRILAGODI
// Web verzija koristi Supabase direktno, mobile takođe,
// ali sa AsyncStorage caching-om na vrhu
```

### 15.2 Design tokeni – MAPIRANJE

```typescript
// Web: Tailwind CSS varijable
// Mobile: TypeScript konstante

// Web: text-amber (Tailwind)
// Mobile: color: colors.amber (konstanta)

// Web: p-4 (16px padding)
// Mobile: padding: spacing.lg (16px)
```

### 15.3 Komponente – ADAPTACIJA

```typescript
// Web: <Button variant="primary">Sačuvaj</Button> (shadcn/ui)
// Mobile: <Button variant="primary" label="Sačuvaj" /> (React Native)

// Logika je ista, samo rendering je drugačiji
// Web koristi CSS, mobile koristi StyleSheet
```

-----

## 16. Roadmap za v2.0 (budućnost)

|Feature                 |Status v1.5|Status v2.0|Napomena                      |
|------------------------|-----------|-----------|------------------------------|
|Registracija            |❌          |✅          |Supabase Auth sa email        |
|Checklist sinhronizacija|❌          |✅          |Server strana checklist       |
|Biometric login         |❌          |✅          |Touch ID, Face ID, Android bio|
|Push notifikacije       |❌          |⏳          |Expo Push ili Firebase        |
|Omiljene procedure      |❌          |✅          |Korisnik save-a procedure     |
|Offline mode (SQLite)   |⏳          |✅          |Kompletniji offline           |
|App Store/Google Play   |❌          |✅          |TestFlight, internal testing  |

-----

## 17. References

|Dokument                |Sekcija|Korišćeno za                               |
|------------------------|-------|-------------------------------------------|
|`00-product-spec.md`    |§4     |User flows UF-01–07 (javni deo)            |
|`01-domain-model.md`    |Cela   |Entiteti, tipovi (direktan reuse)          |
|`03-api-contract.yaml`  |Cela   |API endpoint-i (direktan reuse)            |
|`05-coding-standards.md`|§1–5   |Imenovanje, TypeScript (sa mobile dopunama)|
|`06-design-system.md`   |§2–5   |Design tokeni (mapiranje na React Native)  |
|`07-ai-instructions.md` |Cela   |Globalna pravila (direktan reuse)          |

-----

## 18. Architekturne odluke (ADR)

### ADR-06: React Native + Expo umesto Flutter

**Odluka:** React Native + Expo za mobilnu aplikaciju.  
**Razlog:** TypeScript znanje je ista kao web, Expo ubrzava dev cycle, AsyncStorage je dovoljno za v1.5.  
**Alternativa:** Flutter (brže, ali Dart je novi jezik).  
**Trade-off:** Performance Flutter je bolji, ali React Native je dovoljno za ovu aplikaciju.  
**Odbačeno jer:** Solo developer, time-to-market je kritičan.

### ADR-07: AsyncStorage umesto SQLite za v1.5

**Odluka:** AsyncStorage za offline storage (checklist, cache).  
**Razlog:** Jednostavno, nema setup kompleksnosti, dovoljno za v1.5.  
**Alternativa:** SQLite (bolje za velike datasets).  
**Trade-off:** SQLite je malo brža, AsyncStorage je jednostavnija.  
**Migracijski put:** V2.0 može doći sa SQLite bez promena API-ja.  
**Odbačeno jer:** V1.5 dataset je mali (< 100 procedure), AsyncStorage je dovoljno.

### ADR-08: Expo Router ili React Navigation?

**Odluka:** Expo Router (file-based routing, kao Next.js).  
**Razlog:** Aktualna je, sličnija je web routing-u koji poznaš.  
**Alternativa:** React Navigation (manual).  
**Trade-off:** Expo Router je novija, ali stabilna.  
**Odbačeno jer:** React Navigation je stariji, ali i dalje solid. Expo Router je moderniji.

Na kraju: Preporuka je **Expo Router** jer je sličan Next.js.