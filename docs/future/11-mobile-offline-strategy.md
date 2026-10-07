> **Status: frozen, out of scope for v1.** See [ADR 0002](../decisions/0002-web-only-v1.md). Kept as written (v1.0, Serbian) for a future mobile phase; versions, design rules and API shapes here are outdated and must be revisited against the current docs before use.

# Mobile Offline Strategy – Administrativni Asistent

**Verzija:** 1.0  
**Datum:** Jun 2026  
**Scope:** v1.5 (AsyncStorage) i v2.0 (SQLite, sinhronizacija)

-----

## Instrukcije za AI

- V1.5 koristi **AsyncStorage** – dovoljno za mobile bez internet
- V2.0 dodaje **SQLite** za veće datasets i sinhronizaciju sa serverom
- Checklist je ključna komponenta offline-first – nikad ne sme biti blokirana
- Cache invalidacija je kritična – stare procedure mogu biti zamke
- Sinhronizacija je delayed do v2.0 (registracija)

-----

## 1. Offline-first princip

Aplikacija se ponaša kao:

```
┌─────────────────────────────────────────────┐
│  KORISNIK                                   │
└────────────────┬────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │ ONLINE?          │
        └────────┬─────────┘
                 │
        ┌────────┴────────┐
        │                 │
    YES │                 │ NO
        │                 │
┌───────▼────────┐   ┌───▼──────────────┐
│ Fetch from API │   │ Use local cache  │
│ ↓              │   │ (AsyncStorage)   │
│ Update cache   │   │                  │
│ Update UI      │   │ Warn if stale    │
└────────────────┘   └──────────────────┘
```

**Princip:** Korisnik NIKAD ne biva blokiran jer “nema interneta”. Uvek mogu koristiti prethodnu verziju podataka.

-----

## 2. AsyncStorage架構 (v1.5)

AsyncStorage je key-value store sa persistence na disku. Odličan za:

- Checklist stanja
- Procedure cache
- Life events cache
- Session data

### 2.1 Storage šema

```typescript
// Key structure
type StorageKey =
  | `checklist_${lifeEventId}`        // Checklist stanja
  | `procedure_${procedureId}`        // Procedure detalji
  | `procedures_list`                 // Lista procedura (home)
  | `life_events_${categoryId}`       // Životni događaji po kategoriji
  | `search_cache_${query}`           // Search rezultati
  | `session_${userId}`               // Session (v2.0)
  | `cache_metadata`                  // Metadata o cacheu

// Checklist value
interface ChecklistEntry {
  procedureId: string;
  status: 'todo' | 'in_progress' | 'done';
  updatedAt: number; // Timestamp
}

// Procedure cache value
interface CachedProcedure {
  data: Procedure;
  timestamp: number;
  expiresAt: number;
}

// Cache metadata
interface CacheMetadata {
  [key: string]: {
    timestamp: number;
    expiresAt: number;
    size: number;
  };
}
```

### 2.2 AsyncStorage operacije

```typescript
// lib/offline-db.ts

export class OfflineDB {
  // ===== CHECKLIST =====
  async getChecklistStatus(lifeEventId: string): Promise<ChecklistEntry[]> {
    const key = `checklist_${lifeEventId}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  async saveChecklistStatus(lifeEventId: string, entries: ChecklistEntry[]) {
    const key = `checklist_${lifeEventId}`;
    await AsyncStorage.setItem(key, JSON.stringify(entries));
    await this.updateMetadata(key);
  }

  async updateChecklistItem(
    lifeEventId: string,
    procedureId: string,
    status: 'todo' | 'in_progress' | 'done'
  ) {
    const entries = await this.getChecklistStatus(lifeEventId);
    const filtered = entries.filter(e => e.procedureId !== procedureId);
    filtered.push({ procedureId, status, updatedAt: Date.now() });
    await this.saveChecklistStatus(lifeEventId, filtered);
  }

  async deleteChecklist(lifeEventId: string) {
    const key = `checklist_${lifeEventId}`;
    await AsyncStorage.removeItem(key);
  }

  // ===== PROCEDURE CACHE =====
  async cacheProcedure(procedure: Procedure, expiryMs: number = 3600000) {
    const key = `procedure_${procedure.id}`;
    const cachedData: CachedProcedure = {
      data: procedure,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    await this.updateMetadata(key, cachedData);
  }

  async getCachedProcedure(procedureId: string): Promise<Procedure | null> {
    const key = `procedure_${procedureId}`;
    const data = await AsyncStorage.getItem(key);

    if (!data) return null;

    const cached: CachedProcedure = JSON.parse(data);

    // Proveri ako je cache istekao
    if (Date.now() > cached.expiresAt) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cached.data;
  }

  // ===== LIFE EVENTS CACHE =====
  async cacheLifeEvents(
    events: LifeEvent[],
    expiryMs: number = 3600000
  ) {
    const key = 'life_events_cache';
    const cachedData: CachedProcedure = {
      data: events,
      timestamp: Date.now(),
      expiresAt: Date.now() + expiryMs,
    };
    await AsyncStorage.setItem(key, JSON.stringify(cachedData));
    await this.updateMetadata(key, cachedData);
  }

  async getCachedLifeEvents(): Promise<LifeEvent[] | null> {
    const key = 'life_events_cache';
    const data = await AsyncStorage.getItem(key);

    if (!data) return null;

    const cached: CachedProcedure = JSON.parse(data);

    if (Date.now() > cached.expiresAt) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return cached.data;
  }

  // ===== METADATA =====
  private async updateMetadata(
    key: string,
    cachedData?: CachedProcedure
  ) {
    let metadata: CacheMetadata = {};
    const metadataStr = await AsyncStorage.getItem('cache_metadata');

    if (metadataStr) {
      metadata = JSON.parse(metadataStr);
    }

    if (cachedData) {
      metadata[key] = {
        timestamp: cachedData.timestamp,
        expiresAt: cachedData.expiresAt,
        size: JSON.stringify(cachedData).length,
      };
    }

    await AsyncStorage.setItem('cache_metadata', JSON.stringify(metadata));
  }

  // ===== CLEANUP =====
  async clearExpiredCache() {
    const metadataStr = await AsyncStorage.getItem('cache_metadata');
    if (!metadataStr) return;

    const metadata: CacheMetadata = JSON.parse(metadataStr);
    const now = Date.now();

    for (const [key, meta] of Object.entries(metadata)) {
      if (now > meta.expiresAt) {
        await AsyncStorage.removeItem(key);
        delete metadata[key];
      }
    }

    await AsyncStorage.setItem('cache_metadata', JSON.stringify(metadata));
  }

  async clearAll() {
    await AsyncStorage.clear();
  }

  async getStorageStats() {
    const metadataStr = await AsyncStorage.getItem('cache_metadata');
    if (!metadataStr) return { total: 0, items: 0 };

    const metadata: CacheMetadata = JSON.parse(metadataStr);
    const total = Object.values(metadata).reduce((sum, m) => sum + m.size, 0);

    return {
      total,
      items: Object.keys(metadata).length,
      totalMB: (total / 1024 / 1024).toFixed(2),
    };
  }
}

export const offlineDB = new OfflineDB();
```

### 2.3 Cache invalidacija strategija

|Tip podataka    |TTL      |Razlog                            |
|----------------|---------|----------------------------------|
|Checklist       |Nikad    |Korisnik ga kontroliše, local-only|
|Procedure detail|1 sat    |Procedure se retko menjaju        |
|Life events     |1 sat    |Events se retko menjaju           |
|Search rezultati|30 minuta|Brže se mogu dodati novi eventi   |
|Categories      |24 sata  |Kategorije se nikad ne menjaju    |

**Implementacija:** Metadata čuva timestamp i expiresAt – na svaki pristup, ako je isteklo, briši cache i fetch novo.

-----

## 3. Checklist – ključna offline komponenta

### 3.1 Checklist lifecycle

```
┌─────────────────────────────────────────────────┐
│ 1. Korisnik otvori Life Event Detail            │
├─────────────────────────────────────────────────┤
│ 2. Učitaj life event sa procedurama (API)       │
├─────────────────────────────────────────────────┤
│ 3. Učitaj checklist stanja iz AsyncStorage      │
├─────────────────────────────────────────────────┤
│ 4. Prikaži Checklist sa status-ima              │
├─────────────────────────────────────────────────┤
│ 5. Korisnik klikne status ikonu                 │
├─────────────────────────────────────────────────┤
│ 6. Ažurira stanje u AsyncStorage (IMMEDIATELY)  │
├─────────────────────────────────────────────────┤
│ 7. Update UI sa novim statusom                  │
├─────────────────────────────────────────────────┤
│ 8. V2.0: Sync sa serverom kada je moguće       │
└─────────────────────────────────────────────────┘
```

**Ključno:** Korisnik NIKAD ne čeka – sve je lokalno prvo, sync je delayed.

### 3.2 Checklist stanja

```typescript
interface ChecklistState {
  lifeEventId: string;
  procedures: ProcedureChecklistStatus[];
}

interface ProcedureChecklistStatus {
  procedureId: string;
  status: 'todo' | 'in_progress' | 'done';
  completedAt?: number; // Timestamp kada je završeno
  updatedAt: number;    // Poslednja promena
}
```

### 3.3 Korisničko iskustvo (offline)

**Scenario 1: Korisnik je online**

```
1. Otvori Checklist
2. AsyncStorage ima stara stanja iz pre 2 sata
3. Prikaži sa ažuriranim podacima
4. Korisnik menja status (todo → done)
5. AsyncStorage se ODMAH ažurira
6. V2.0: Sync sa serverom asinkrono
```

**Scenario 2: Korisnik postaje offline usred korišćenja**

```
1. Otvori Checklist (internet radi)
2. Menja status: procedure A (todo → in_progress)
3. AsyncStorage se ažurira
4. Internet padne
5. Korisnik može da nastavi sa procedurama
6. Može da označi procedure kao završene (lokalno)
7. Kada se vrati internet, može sinhronizovati (v2.0)
```

**Scenario 3: Korisnik je offline od početka**

```
1. Otvori app
2. Internet nema
3. Može da otvori prethodno otvorene Life Events (iz cachea)
4. Može da koristi checklist (AsyncStorage je lokalan)
5. Procedure detalji: ako je pre otvorio procedure, koristi cache
6. Search, AI chat: greška (zahtevaju server)
```

-----

## 4. SQLite (za v2.0)

### 4.1 SQLite vs AsyncStorage trade-offs

|Kriterijum        |AsyncStorage (v1.5)|SQLite (v2.0)      |
|------------------|-------------------|-------------------|
|Setup kompleksnost|Nema, built-in     |Kompleksniji setup |
|Skalabilnost      |Do ~5-10 MB        |Teorijski unlimited|
|Query mogućnosti  |Nema (key-value)   |Full SQL           |
|Sinhronizacija    |Manual (custom)    |Bolja integracija  |
|Performance       |Brzo za male data  |Brže za veće data  |
|Bundle size       |0 KB               |+1-2 MB            |

**Za v1.5:** AsyncStorage je dovoljno – ima samo ~100-200 procedura.  
**Za v2.0:** SQLite je bolji jer omogućava offline синхронizaciju sa serverom.

### 4.2 SQLite scheма (v2.0)

```sql
-- Offline baza (replicira delove Supabase baze)
CREATE TABLE life_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  status TEXT,
  sync_status TEXT, -- 'synced' | 'pending' | 'conflict'
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE procedures (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  can_online BOOLEAN,
  can_in_person BOOLEAN,
  can_by_mail BOOLEAN,
  cost_amount REAL,
  processing_time TEXT,
  status TEXT,
  sync_status TEXT,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE checklist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  life_event_id TEXT NOT NULL,
  procedure_id TEXT NOT NULL,
  status TEXT NOT NULL, -- 'todo' | 'in_progress' | 'done'
  sync_status TEXT,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(life_event_id, procedure_id),
  FOREIGN KEY(life_event_id) REFERENCES life_events(id),
  FOREIGN KEY(procedure_id) REFERENCES procedures(id)
);

CREATE TABLE sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'insert' | 'update' | 'delete'
  payload JSON NOT NULL,
  created_at TIMESTAMP,
  synced_at TIMESTAMP
);

-- Indeksi za performance
CREATE INDEX idx_checklist_life_event ON checklist(life_event_id);
CREATE INDEX idx_checklist_status ON checklist(status);
CREATE INDEX idx_sync_queue_synced_at ON sync_queue(synced_at);
```

### 4.3 SQLite helper funkcije (v2.0)

```typescript
// lib/offline-db-sqlite.ts (budućnost)
import * as SQLite from 'expo-sqlite';

export class SQLiteDB {
  private db: SQLite.SQLiteDatabase | null = null;

  async init() {
    this.db = await SQLite.openDatabaseAsync('administrativni-asistent.db');
    await this.createTables();
  }

  private async createTables() {
    // Kreiraj sve tabele
  }

  async saveChecklist(lifeEventId: string, entries: ChecklistEntry[]) {
    if (!this.db) throw new Error('DB not initialized');

    for (const entry of entries) {
      await this.db.runAsync(
        `INSERT OR REPLACE INTO checklist (life_event_id, procedure_id, status, updated_at)
         VALUES (?, ?, ?, ?)`,
        [lifeEventId, entry.procedureId, entry.status, entry.updatedAt]
      );
    }
  }

  async getChecklist(lifeEventId: string): Promise<ChecklistEntry[]> {
    if (!this.db) throw new Error('DB not initialized');

    const result = await this.db.getAllAsync(
      `SELECT procedure_id, status, updated_at FROM checklist WHERE life_event_id = ?`,
      [lifeEventId]
    );

    return result as ChecklistEntry[];
  }

  async syncChecklist(userId: string) {
    // Sinhronizuj sa serverom
    // Pripremi payload od pending stavki
    // POST ka /api/sync/checklist
    // Označi kao synced
  }
}
```

-----

## 5. Network detection & Sync trigger

### 5.1 Network status

```typescript
// lib/hooks/useNetworkStatus.ts
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isWifi, setIsWifi] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
      setIsWifi(state.type === 'wifi');
    });

    return () => unsubscribe();
  }, []);

  return { isOnline, isWifi };
}
```

### 5.2 Sync strategija (v2.0)

```typescript
// lib/sync.ts (budućnost)
export class SyncManager {
  async syncWhenOnline(userId: string) {
    // Čeka do internet dostupnosti
    const unsubscribe = NetInfo.addEventListener(async state => {
      if (!state.isConnected) return;

      // Sync checklist
      await this.syncChecklist(userId);

      // Sync other data
      await this.syncProfile(userId);

      unsubscribe();
    });
  }

  private async syncChecklist(userId: string) {
    // Preuzmi pending stavke iz SQLite
    const pending = await this.getPendingChecklistItems(userId);

    // POST ka serveru
    const response = await fetch(`${API_URL}/sync/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ items: pending }),
    });

    // Update status
    if (response.ok) {
      await this.markAsSynced(pending);
    }
  }
}
```

-----

## 6. Offline UI indicators

### 6.1 Offline banner

```typescript
// components/ui/OfflineBanner.tsx
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <InfoBanner
      variant="warning"
      message="📱 Offline – prikazani su prethodni podaci. Sinhronizacija kada je internet dostupan."
      icon="WiFiOff"
    />
  );
}
```

### 6.2 Stale cache indicator

```typescript
// Kada je cache stariji od 1 sata
<InfoBanner
  variant="info"
  message="⚠️ Ovi podaci možda nisu najnoviji. Osvežite kada je dostupan internet."
  action={
    <Button label="Osvežite" onPress={() => refetch()} variant="ghost" size="sm" />
  }
/>
```

### 6.3 Pending sync indicator (v2.0)

```typescript
// Kada ima stavki čekajući sinhronizaciju
{hasPendingSync && (
  <InfoBanner
    variant="info"
    message="↻ Sinhronizovanje u toku..."
    loading
  />
)}
```

-----

## 7. Offline data freshness policy

### 7.1 Cache age kategorije

```
Age              Status               UI Treatment
───────────────────────────────────────────────────
< 10 minutes     Fresh                Koristi direktno
10-60 minutes    Fresh enough         Prikaži bez upozorenja
1-6 sati         Potentially stale    Prikaži sa Info banner-om
> 6 sati         Stale                Prikaži sa Warning banner-om
+ 6 meseci (procedure) | VERY stale   Procedure detail: warning
```

### 7.2 Implementacija

```typescript
function getCacheStatus(timestamp: number): 'fresh' | 'stale' | 'very-stale' {
  const ageMs = Date.now() - timestamp;
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1) return 'fresh';
  if (ageHours < 6) return 'stale';
  return 'very-stale';
}

function getCacheBannerMessage(status: string, age: number) {
  if (status === 'fresh') return null;
  if (status === 'stale')
    return `⏱️ Ovi podaci su od pre ${age.toFixed(1)} sati. Osvežite kada je dostupan internet.`;
  return `⚠️ Ovi podaci su veoma stari. Molim vas osvežite.`;
}
```

-----

## 8. Storage management

### 8.1 Storage limit

AsyncStorage na:

- iOS: Nema hard limit (do dostupne memorije)
- Android: Nema hard limit (do dostupne memorije)

**Preporuka:** Čuvaj samo do ~5-10 MB (~ 50-100 procedura sa svim detaljima).

### 8.2 Cleanup strategija

```typescript
// Automatski cleanup stare cache-a
export async function cleanupOldCache() {
  await offlineDB.clearExpiredCache();

  // Ili, ako je korišćenje >= 10 MB:
  const stats = await offlineDB.getStorageStats();
  if (stats.total > 10 * 1024 * 1024) {
    // Obriši najmanje recently used stavke
    await offlineDB.clearOldestProcedures(percentage: 20);
  }
}

// Pokreni na app startup
useEffect(() => {
  cleanupOldCache();
}, []);
```

-----

## 9. Conflict resolution (v2.0)

Kada korisnik uređuje stavke offline i server ima drugačije podatke:

### 9.1 Last-write-wins strategija

```typescript
// Korisnik-a promena je novija → primeni je
// Server promena je novija → prepiši korisnikov unos
// Korisnik je obavestern o konfliktu

interface SyncConflict {
  table: string;
  record_id: string;
  local_version: any;
  server_version: any;
  local_timestamp: number;
  server_timestamp: number;
}

function resolveConflict(conflict: SyncConflict) {
  if (conflict.local_timestamp > conflict.server_timestamp) {
    return conflict.local_version; // Koristi lokalnu
  } else {
    return conflict.server_version; // Koristi serversku
  }
}
```

### 9.2 Conflict notification

```typescript
// Ako je server verzija novija
<InfoBanner
  variant="warning"
  message="Neko drugi je promenio ove podatke. Vaše promenе su zamenene novijom verzijom."
  action={
    <Button label="Vidim" onPress={() => dismissBanner()} variant="ghost" />
  }
/>
```

-----

## 10. Development workflow – offline testiranje

### 10.1 Simulacija offline moda

```typescript
// lib/hooks/useOffline.ts
const FORCE_OFFLINE = false; // Set to true za testiranje

export function useOffline() {
  const [isOffline, setIsOffline] = useState(FORCE_OFFLINE);

  useEffect(() => {
    if (FORCE_OFFLINE) return; // Skip network detection ako je forced

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return isOffline;
}
```

### 10.2 Testiranje cache-a

```bash
# Expo console-a
# 1. Otvori app
# 2. Naviguj na Home (učitaj life events)
# 3. Naviguj na procedure (učitaj detalj)
# 4. Disconnect internet (airplane mode)
# 5. Osvežavaj app – trebalo bi da koristi cache
# 6. Otvori checklist – trebalo bi da radi
# 7. Meni status – trebalo bi da se čuva lokalno
```

-----

## 11. Roadmap offline features

### V1.5 (sada)

- ✅ Checklist offline storage (AsyncStorage)
- ✅ Procedure cache (AsyncStorage, 1h TTL)
- ✅ Life events cache (AsyncStorage, 1h TTL)
- ✅ Offline UI indicators
- ✅ Network status detection

### V2.0 (registracija)

- 🔲 SQLite za veće datasets
- 🔲 Checklist sinhronizacija sa serverom
- 🔲 Favorites/bookmarks sinhronizacija
- 🔲 Conflict resolution (last-write-wins)
- 🔲 Background sync (kada je korisnik offline, queue stavke za sync kasnije)

### V3.0+ (budućnost)

- 🔲 Full offline mode (sve procedure dostupne bez interneta)
- 🔲 Selective sync (korisnik bira šta da cache-uje)
- 🔲 Differential sync (samo izmene, ne čeli dataset)

-----

## 12. Debugging offline issues

### 12.1 Common problems

|Problem                            |Uzrok                           |Rešenje                                |
|-----------------------------------|--------------------------------|---------------------------------------|
|Checklist se gubi nakon osvežavanja|AsyncStorage nije inicijalizovan|Čekaj na AsyncStorage init pre render-a|
|Cache je predugačka                |Nisu brisite stare stavke       |Pokreni cleanup, podesi TTL niže       |
|Offline banner se ne prikazuje     |Network detection nije radi     |Proveri NetInfo permissions (Android)  |
|Data nije sinhronizovan (v2.0)     |Sync manager nije pokrenuo      |Proveri ako je korisnik registrovan    |

### 12.2 Logging

```typescript
// lib/offline-db.ts - dodaj logging
async saveChecklistStatus(lifeEventId: string, entries: ChecklistEntry[]) {
  const key = `checklist_${lifeEventId}`;
  await AsyncStorage.setItem(key, JSON.stringify(entries));

  // Log za debugging
  console.log(`[OFFLINE] Saved checklist ${lifeEventId}:`, entries);
  console.log(`[OFFLINE] Entry count: ${entries.length}`);
}
```

### 12.3 React Native Debugger

```bash
# Pokreni React Native Debugger
react-native-debugger

# U Expo aplikaciji: Shake phone → "Debug Remote JS"
# Tada se AsyncStorage može pregledati u debugger-u
```

-----

## 13. Security offline podataka

### 13.1 AsyncStorage nije šifrovan

**Napomena:** AsyncStorage čuva podatke kao plaintext. V1.5 je OK jer nema ličnih podataka, samo javni podaci (procedure, događaji).

### 13.2 Za v2.0 sa registracijom

```typescript
// Koristi react-native-keychain za sensitive data
import * as Keychain from 'react-native-keychain';

async function saveCredentials(username: string, password: string) {
  await Keychain.setGenericPassword(username, password);
}

async function getCredentials() {
  const credentials = await Keychain.getGenericPassword();
  return credentials;
}
```

### 13.3 SQLite šifrovanje (v2.0)

```typescript
// Koristi encrypted SQLite
// https://github.com/journeyapps/sqlcipher
// V2.0 može koristiti sqlcipher za encryption at rest
```

-----

## 14. Performance monitoring

### 14.1 Cache hit rate

```typescript
let cacheHits = 0;
let cacheMisses = 0;

async function getCachedProcedure(id: string) {
  const cached = await AsyncStorage.getItem(`procedure_${id}`);
  if (cached) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  
  // Report
  console.log(`Cache hit rate: ${cacheHits / (cacheHits + cacheMisses) * 100}%`);
}
```

### 14.2 Storage usage monitoring

```typescript
// Na app startup, prikaži stats (dev mode samo)
useEffect(() => {
  if (!__DEV__) return;

  offlineDB.getStorageStats().then(stats => {
    console.log(`[STORAGE] Total: ${stats.totalMB} MB, Items: ${stats.items}`);
  });
}, []);
```

-----

## 15. References

|Dokument                     |Sekcija|Korišćeno za              |
|-----------------------------|-------|--------------------------|
|`09-mobile-architecture.md`  |§5     |Offline-first arhitektura |
|`10-mobile-specifications.md`|§8     |Offline states na ekranima|
|`06-design-system.md`        |–      |InfoBanner komponente     |