> **Status: frozen, out of scope for v1.** See [ADR 0002](../decisions/0002-web-only-v1.md). Kept as written (v1.0, Serbian) for a future mobile phase; versions, design rules and API shapes here are outdated and must be revisited against the current docs before use.

# Mobile Screen Specifications – Administrativni Asistent

**Verzija:** 1.0  
**Datum:** Jun 2026  
**Platforma:** React Native (iOS + Android, Expo)

-----

## Instrukcije za AI

- Svaki ekran je detaljan sa komponentama, akcijama, validacijama, API pozivima
- React Native komponente koriste StyleSheet ili inline styles, ne CSS/Tailwind
- Safe area handling je obaveza za iOS (notch, home indicator)
- Touch targets su minimum 48pt (Apple) / 48dp (Android)
- Sve reference na UF flowove, business rules, API contract su citati iz dokumentacije
- Offline stanja su eksplicitno definisana (AsyncStorage cache)

-----

## 1. HOME SCREEN – Početna stranica (Life Events lista)

**Usklađenost:** UF-01 (Pronalaženje životnog događaja iz liste)

### 1.1 Purpose

Korisnik otvara aplikaciju i vidi sve životne događaje grupisane po kategorijama. Svaki događaj pokazuje ikonu (emoji), naziv, kratko određenje šta treba, i broj procedura. Korisnik može kliknuti na event da ide na detalje.

### 1.2 Layout struktura

```
┌─────────────────────────────────────┐
│ Status bar (iOS notch/Android)      │
├─────────────────────────────────────┤
│ Dobar dan 👋                        │ ← display tipografija (24pt, weight 800)
│ Šta ti se dešava?                   │ ← bodySm tipografija (13pt)
├─────────────────────────────────────┤
│ 🔍 Pretraži... npr. pasoš            │ ← SearchBar
├─────────────────────────────────────┤
│ KATEGORIJE (horizontal scroll)      │
│ [Sve] [Lična dokumenta] [Preseljenje]│ ← CategoryChip
├─────────────────────────────────────┤
│ PRESELJENJE I ADRESA                │ ← SectionLabel (eyebrow)
│ ┌─────────────────────────────────┐ │
│ │ 🏠 Selim se na novu adresu      │ │ ← HomeEventCard
│ │    4 procedure · ~2 nedelje → │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 📋 Prijavljujem boravište       │ │
│ │    2 procedure · ~3 dana → │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ LIČNA DOKUMENTA                     │
│ ┌─────────────────────────────────┐ │
│ │ 🪪 Istekla mi je lična karta    │ │
│ │    1 procedura · 1 dan → │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
│ (ScrollView, beskonačan scroll)     │
└─────────────────────────────────────┘
```

### 1.3 Komponente

- **SafeAreaView** (root) – notch handling
- **ScrollView** – vertikalni scroll
- **SectionLabel** “Dobar dan 👋” + podnaslov
- **SearchBar** – unos za pretragu (50pt height, debounce 300ms)
- **CategoryChip** (horizontalni scroll) – aktivni chip ima amber boja
- **SectionLabel** – naziv kategorije (“PRESELJENJE I ADRESA”, itd.)
- **HomeEventCard** – red sa emoji, naslov, meta (broj procedura, vreme), strelica
- **EmptyState** – ako nema životnih događaja
- **Skeleton** – tokom učitavanja

### 1.4 Responsive design

```
iPhone SE (320pt)       iPhone 14 (390pt)      iPad (768pt)
┌──────────────┐        ┌────────────┐         ┌─────────────────────┐
│ Title        │        │ Title      │         │ Title   Search Bar  │
│ [Chip1]      │        │ [Chip1][2] │         │ [Chip1] [Chip2] [3] │
│ [Chip2]      │        │ [Chip3]    │         │ [Chip4] [Chip5] [6] │
│ [Chip3]      │        │            │         │                     │
│              │        │ Card       │         │ Card      Card      │
│ Card Card    │        │ Card       │         │ Card      Card      │
└──────────────┘        └────────────┘         └─────────────────────┘

Navigation: Bottom tabs se prilagođavaju
- iPhone: 3 taba sa ikonama + labele
- iPad: 3 taba + drawer navigation (opciono)
```

### 1.5 Akcije

|Akcija              |Trigger            |Rezultat                                         |
|--------------------|-------------------|-------------------------------------------------|
|Tap na CategoryChip |Klikne na chip     |Filtrira HomeEventCard-ove na izabranu kategoriju|
|Tap na HomeEventCard|Klikne na event red|Navigacija na LifeEventDetailScreen (stack push) |
|Tap na SearchBar    |Klikne na input    |Prebacuje se na SearchScreen (bottom tab)        |
|Scroll gore         |Korisnik skrolira  |Prikaz više kategorija                           |
|Osvežavanje ekrana  |Swipe-down refresh |Refetch life-events i kategorija                 |

### 1.6 API Calls

|Endpoint     |Metoda|Kada                    |Parametri         |Šta se dohvata               |
|-------------|------|------------------------|------------------|-----------------------------|
|`life-events`|GET   |Na inicijalno učitavanje|`status=published`|Lista događaja sa procedurama|
|`categories` |GET   |Na inicijalno učitavanje|–                 |Sve kategorije sa sort_order |

**Pseudokod:**

```typescript
export function HomeScreen() {
  const [lifeEvents, setLifeEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      // Cache check prvo
      const cachedEvents = await offlineDB.getCachedLifeEvents();
      if (cachedEvents) {
        setLifeEvents(cachedEvents);
      } else {
        // Fetch sa serverom
        const events = await supabase
          .from('life_events')
          .select('*')
          .eq('status', 'published')
          .order('sort_order');
        setLifeEvents(events);
        await offlineDB.cacheLifeEvents(events);
      }

      // Kategorije (uvek fetch, male su)
      const cats = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');
      setCategories(cats);
    } catch (error) {
      // Ako je offline, koristi cache
      // Prikaži InfoBanner sa greškom
    } finally {
      setLoading(false);
    }
  }

  const filtered = selectedCategory
    ? lifeEvents.filter(e => e.category_id === selectedCategory.id)
    : lifeEvents;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.cream }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
          <Text style={[typography.display]}>Dobar dan 👋</Text>
          <Text style={[typography.bodySm, { color: colors['ink-muted'] }]}>
            Šta ti se dešava?
          </Text>
        </View>

        {/* SearchBar */}
        <SearchBar onPress={() => navigate('search')} />

        {/* CategoryChips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ paddingHorizontal: spacing.lg, marginVertical: spacing.md }}
        >
          <CategoryChip
            label="Sve"
            active={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
          />
          {categories.map(cat => (
            <CategoryChip
              key={cat.id}
              label={cat.name}
              active={selectedCategory?.id === cat.id}
              onPress={() => setSelectedCategory(cat)}
            />
          ))}
        </ScrollView>

        {/* Life Events */}
        {loading && <Skeleton count={3} />}
        {!loading && filtered.length === 0 && <EmptyState />}
        {filtered.map(event => (
          <HomeEventCard
            key={event.id}
            event={event}
            onPress={() => navigate('life-event', { id: event.id })}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
```

### 1.7 States

**Loading:**

- Skeleton za svaki HomeEventCard
- Skeleton za CategoryChips

**Error:**

- InfoBanner sa porukom “Greška pri učitavanju. Pokušajte ponovo.”
- Offline: Prikaži cached podatke sa InfoBanner-om “Offline modus – prikazani su prethodni podaci.”

**Empty:**

- EmptyState: “Nema dostupnih životnih događaja. Pokušajte ponovo kasnije.”

**Success:**

- Svi podaci su vidljivi, nema grešaka

-----

## 2. SEARCH SCREEN – Pretraga

**Usklađenost:** UF-02 (Pronalaženje informacije pretragom)

### 2.1 Purpose

Korisnik unosi pojam u SearchBar. Aplikacija pretražuje bazu (life_events, procedures, institutions) i prikazuje rezultate grupisane po tipu. Sinonimi se automatski mapiraju.

### 2.2 Layout

```
┌─────────────────────────────────────┐
│ Status bar                          │
├─────────────────────────────────────┤
│ ← Početna  [Pretraži...] ⌫          │ ← Header sa BackButton
├─────────────────────────────────────┤
│ Rezultati za: "pasoš"               │ ← Title sa pojmom
├─────────────────────────────────────┤
│ ŽIVOTNI DOGAĐAJI                    │ ← SectionLabel
│ ┌─────────────────────────────────┐ │
│ │ 🪪 Istekla mi je lična karta    │ │ ← HomeEventCard
│ │    1 procedura · 1 dan → │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ PROCEDURE                           │
│ ┌─────────────────────────────────┐ │
│ │ Isteka lične karte              │ │ ← ProcedureCard (kratka)
│ │ MUP · Lično · besplatno         │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ INSTITUCIJE                         │
│ ┌─────────────────────────────────┐ │
│ │ Ministarstvo unutrašnjih poslova│ │ ← InstitutionCard (kratka)
│ │ mup.gov.rs                      │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
└─────────────────────────────────────┘
```

### 2.3 Komponente

- **SafeAreaView**
- **Header** sa BackButton i SearchBar (fiksiran na vrhu)
- **SectionLabel** “Rezultati za: {pojam}”
- **HomeEventCard** (grupisano po tipu)
- **ProcedureCard** (kratka verzija)
- **InstitutionCard** (kratka verzija)
- **EmptyState** – ako nema rezultata
- **ActivityIndicator** – tokom pretrage

### 2.4 Akcije

|Akcija           |Trigger                  |Rezultat                              |
|-----------------|-------------------------|--------------------------------------|
|Unos u SearchBar |Korisnik tipka ≥2 znaka  |Debounce 300ms → poziva `/search` API |
|Tap na rezultat  |Klikne na event/procedure|Navigacija na detalje (push na stack) |
|Tap na BackButton|Klikne strelica          |Povratak na Home (pop sa stack-a)     |
|Brisanje teksta  |Korisnik obriše sve      |SearchBar postaje prazan, prikaži Home|

### 2.5 API Calls

|Endpoint |Metoda|Parametri          |Šta se vraća                             |
|---------|------|-------------------|-----------------------------------------|
|`/search`|GET   |`q` (string, min 2)|{ life_events, procedures, institutions }|

**Mapiranje sinonima:** Server-side pre pretrage (ako sinonim postoji, mapira se na standardan pojam).

### 2.6 Code structure

```typescript
export function SearchScreen({ route }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ life_events: [], procedures: [], institutions: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults({ life_events: [], procedures: [], institutions: [] });
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [query]);

  async function performSearch() {
    setLoading(true);
    try {
      // Direktan Supabase FTS ili HTTP API
      const data = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/search?q=${encodeURIComponent(query)}`
      ).then(r => r.json());
      setResults(data);
    } catch (err) {
      // Greška
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <TextInput
            style={{ flex: 1, ...inputStyle }}
            placeholder="Pretraži..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {loading && <ActivityIndicator size="large" />}

        {!loading && query.length >= 2 && results.life_events.length === 0 && 
          results.procedures.length === 0 && results.institutions.length === 0 && (
          <EmptyState message={`Nema rezultata za "${query}"`} />
        )}

        {/* Rezultati */}
        {results.life_events.length > 0 && (
          <>
            <SectionLabel>ŽIVOTNI DOGAĐAJI</SectionLabel>
            {results.life_events.map(event => (
              <HomeEventCard key={event.id} event={event} />
            ))}
          </>
        )}

        {/* Procedure */}
        {results.procedures.length > 0 && (
          <>
            <SectionLabel>PROCEDURE</SectionLabel>
            {results.procedures.map(proc => (
              <ProcedureCard key={proc.id} procedure={proc} />
            ))}
          </>
        )}

        {/* Institucije */}
        {results.institutions.length > 0 && (
          <>
            <SectionLabel>INSTITUCIJE</SectionLabel>
            {results.institutions.map(inst => (
              <InstitutionCard key={inst.id} institution={inst} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

-----

## 3. LIFE EVENT DETAIL SCREEN – Životni događaj sa procedurama

**Usklađenost:** UF-01 zaključak, UF-03

### 3.1 Purpose

Korisnik je izabrao životni događaj. Stranica prikazuje sve procedure grupisane po fazama zavisnosti. PhaseIndicator vizuelno pokazuje redosled i zavisnosti. Svaka procedure je u kartici sa institucijom, metodom, cenom.

### 3.2 Layout

```
┌─────────────────────────────────────┐
│ ← {kategorija}  Selim se  [Checklist]│ ← Header sa BackButton i CTA dugme
├─────────────────────────────────────┤
│ 🏠                                  │ ← EventIcon (48pt)
│ Selim se na novu adresu              │ ← display naslov
│ Sve što treba da uradiš kada se      │ ← body tekst
│ preseliš...                          │
│ 📋 4 procedure · ⏱ ~2 nedelje        │ ← MetaRow
├─────────────────────────────────────┤
│ ●─────────────────────────────────  │ ← PhaseIndicator
│ 1 Faza 1 · možeš odmah, paralelno  │
│   ┌─────────────────────────────┐   │
│   │ Prijava prebivališta        │   │ ← ProcedureCard
│   │ MUP · Lično · besplatno     │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ Promena adrese – banka      │   │
│   │ Banka · Online · besplatno  │   │
│   └─────────────────────────────┘   │
│                                     │
│ ●─────────────────────────────────  │
│ 2 Faza 2 · kreni kad završiš Fazu 1│
│   ┌─────────────────────────────┐   │
│   │ Nova lična karta            │   │
│   │ MUP · Lično · 1.500 din     │   │
│   └─────────────────────────────┘   │
│ ...                                 │
└─────────────────────────────────────┘
```

### 3.3 Komponente

- **SafeAreaView**
- **Header** sa BackButton, event naziv, “Otvori checklist” dugme
- **EventIcon** (emoji)
- **h1** event naziv (display)
- **Body tekst** opis događaja
- **MetaRow** (broj procedura, vreme)
- **PhaseIndicator** sa fazama
- **ProcedureCard** po fazi
- **Skeleton** tokom učitavanja

### 3.4 API Calls

|Endpoint           |Metoda|Parametri  |Šta se vraća                            |
|-------------------|------|-----------|----------------------------------------|
|`/life-events/{id}`|GET   |`id` (UUID)|Life event sa procedurama i zavisnostima|

### 3.5 Code structure

```typescript
export function LifeEventDetailScreen({ route }) {
  const { id } = route.params;
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEventDetail();
  }, [id]);

  async function loadEventDetail() {
    try {
      const { data } = await supabase
        .from('life_events')
        .select(`
          *,
          life_event_procedures (
            procedure_id,
            sort_order,
            procedures (*)
          ),
          procedure_dependencies (*)
        `)
        .eq('id', id)
        .eq('status', 'published')
        .single();

      setEvent(data);
    } finally {
      setLoading(false);
    }
  }

  // Grupisuj procedure po fazama (topološko sortiranje zavisnosti)
  const phases = computePhases(event?.procedures, event?.procedure_dependencies);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={headerStyles}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} />
        </TouchableOpacity>
        <Text style={typography.caption}>{event?.category_name}</Text>
        <Button
          label="Checklist"
          variant="secondary"
          size="sm"
          onPress={() => navigation.navigate('checklist', { id })}
        />
      </View>

      <ScrollView>
        <View style={{ alignItems: 'center', paddingTop: spacing.lg }}>
          <Text style={{ fontSize: 48 }}>{event?.icon}</Text>
          <Text style={typography.display}>{event?.title}</Text>
          <Text style={typography.bodySm}>{event?.description}</Text>
        </View>

        <MetaRow
          items={[
            `📋 ${event?.procedures?.length} procedure`,
            `⏱ ~${event?.estimated_time}`,
          ]}
        />

        {/* Faze */}
        {phases.map((phase, idx) => (
          <View key={idx}>
            <PhaseIndicator
              number={idx + 1}
              label={phase.label}
              isActive={idx === 0}
            />
            {phase.procedures.map(proc => (
              <ProcedureCard
                key={proc.id}
                procedure={proc}
                onPress={() => navigate('procedure', { id: proc.id })}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
```

-----

## 4. PROCEDURE DETAIL SCREEN – Procedura sa koracima i dokumentima

**Usklađenost:** UF-04 (Pregled procedure)

### 4.1 Purpose

Korisnik je izabrao proceduru. Stranica prikazuje kompletne detalje: korake (numerisano), potrebna dokumenta, troškove, radno vreme institucije, linkove.

### 4.2 Layout

```
┌─────────────────────────────────────┐
│ ← {event}                           │ ← BackButton
├─────────────────────────────────────┤
│ Prijava prebivališta                 │ ← h1 naslov
│ MUP · Ministarstvo unutrašnjih      │ ← Institucija
│ [Lično] [💰 Besplatno] [⏱ 1 dan]   │ ← Badges
│                                     │
│ Prijavljuješ novu adresu...         │ ← Opis procedure
│                                     │
│ ⚠️ Poslednja provera: 15.03.2026.   │ ← Warning ako je stale
│    Preporučujemo da proverite       │
│    zvanični izvor.                  │
├─────────────────────────────────────┤
│ KORACI                              │
│ ┌─────────────────────────────────┐ │
│ │ 1 Pripremi dokumenta            │ │ ← StepCard
│ │   Lična karta i dokaz o pravu   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 2 Zakaži termin                 │ │
│ │   ... Zakaži termin online →   │ │
│ └─────────────────────────────────┘ │
│ ...                                 │
├─────────────────────────────────────┤
│ POTREBNA DOKUMENTA                  │
│ ☐ Lična karta                [OBV.] │ ← DocumentRow
│ ☐ Dokaz o pravu              [OBV.] │
│ ☐ Saglasnost vlasnika        [OPC.] │
├─────────────────────────────────────┤
│ INSTITUCIJA                         │
│ Ministarstvo unutrašnjih poslova    │
│ 🕐 Pon–Pet 08:00–15:30             │
│ 📍 Bulevar Mihajla Pupina 22       │
│ 🌐 mup.gov.rs                      │
│ ☎️ +381 11 123 4567                │
│ ✉️ info@mup.gov.rs                 │
└─────────────────────────────────────┘
```

### 4.3 Komponente

- **SafeAreaView**
- **h1** naziv procedure
- **Meta red** institucija
- **Badges** (Lično/Online/Poštom, cena, vreme)
- **InfoBanner** (ako je stale)
- **SectionLabel** “KORACI”
- **StepCard** (numerisano)
- **SectionLabel** “POTREBNA DOKUMENTA”
- **DocumentRow**
- **SectionLabel** “INSTITUCIJA”
- **InstitutionCard** (sa linkovima)
- **ScrollView** vertikalni

### 4.4 API Calls

|Endpoint          |Metoda|Parametri  |Šta se vraća                     |
|------------------|------|-----------|---------------------------------|
|`/procedures/{id}`|GET   |`id` (UUID)|Svi detalji procedure sa koracima|

### 4.5 Code structure

```typescript
export function ProcedureDetailScreen({ route }) {
  const { id } = route.params;
  const [procedure, setProcedure] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcedure();
  }, [id]);

  async function loadProcedure() {
    try {
      const { data } = await supabase
        .from('procedures')
        .select('*, steps(*), documents(*), institutions(*)')
        .eq('id', id)
        .eq('status', 'published')
        .single();

      setProcedure(data);
      // Cache za offline
      await offlineDB.cacheProcedure(data);
    } finally {
      setLoading(false);
    }
  }

  const isStale =
    procedure?.last_verified_at &&
    Date.now() - new Date(procedure.last_verified_at).getTime() > 180 * 24 * 60 * 60 * 1000; // 6 meseci

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {loading && <Skeleton count={5} />}

        {procedure && (
          <>
            {/* Header */}
            <View style={{ paddingHorizontal: spacing.lg }}>
              <Text style={typography.display}>{procedure.title}</Text>
              <Text style={[typography.bodySm, { color: colors['ink-muted'] }]}>
                {procedure.institutions[0]?.name}
              </Text>
            </View>

            {/* Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {procedure.can_online && <Badge label="Online" variant="online" />}
              {procedure.can_in_person && <Badge label="Lično" variant="person" />}
              {procedure.can_by_mail && <Badge label="Poštom" variant="mail" />}
              <Badge label={procedure.cost_description || 'Besplatno'} />
              <Badge label={procedure.processing_time} />
            </View>

            {/* Opis */}
            <Text style={[typography.bodySm, { marginVertical: spacing.md }]}>
              {procedure.description}
            </Text>

            {/* Stale warning */}
            {isStale && (
              <InfoBanner
                variant="warning"
                message={`Poslednja provera: ${formatDate(procedure.last_verified_at)}. Preporučujemo da proverite zvanični izvor.`}
              />
            )}

            {/* Koraci */}
            <SectionLabel>KORACI</SectionLabel>
            {procedure.steps
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((step, idx) => (
                <StepCard key={step.id} number={idx + 1} step={step} />
              ))}

            {/* Dokumenta */}
            <SectionLabel>POTREBNA DOKUMENTA</SectionLabel>
            {procedure.documents.map(doc => (
              <DocumentRow key={doc.id} document={doc} />
            ))}

            {/* Institucija */}
            <SectionLabel>INSTITUCIJA</SectionLabel>
            {procedure.institutions.map(inst => (
              <InstitutionCard key={inst.id} institution={inst} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
```

-----

## 5. CHECKLIST SCREEN – Pracenje napretka

**Usklađenost:** UF-05 (Otvaranje checkliste), UF-06 (Označavanje), UF-07 (Blokirane procedure)

### 5.1 Purpose

Korisnik želi da prati napredak kroz procedure. Checklist je lokalno čuvan (AsyncStorage), bez registracije. Korisnik označava procedure kao “nije početo”, “u toku”, “završeno”. Zavisnosti su vizuelno prikazane.

### 5.2 Layout

```
┌─────────────────────────────────────┐
│ ← Selim se na novu adresu           │ ← BackButton
├─────────────────────────────────────┤
│ Checklist                           │ ← Title
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━ 25%     │ ← ProgressBar (1 od 4 završeno)
│ 📱 Napredak se čuva lokalno...     │ ← InfoBanner (localStorage note)
├─────────────────────────────────────┤
│ ●─────────────────────────────────  │ ← PhaseIndicator (Faza 1)
│ 1 Faza 1 · možeš odmah, paralelno  │
│   ┌─────────────────────────────┐   │
│   │ ✓ Prijava prebivališta   Done │  ← CheckCard (done)
│   │   MUP · Lično              │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ ◑ Promena adrese – banka   Prog│  ← CheckCard (in-progress)
│   │   Banka · Online           │   │
│   └─────────────────────────────┘   │
│   ┌─────────────────────────────┐   │
│   │ ○ Prijava nove adrese      Todo│  ← CheckCard (todo)
│   │   Poslodavac · Online      │   │
│   └─────────────────────────────┘   │
│                                     │
│ ●─────────────────────────────────  │ ← PhaseIndicator (Faza 2)
│ 2 Faza 2 · kreni kad završiš Fazu 1│
│   ┌─────────────────────────────┐   │
│   │ 🔒 Nova lična karta        [BL]│  ← CheckCard (blocked)
│   │    Zavisi od: Prijava...   │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 5.3 Komponente

- **SafeAreaView**
- **BackButton** sa event naslovom
- **Title** “Checklist”
- **ProgressBar** sa procentom
- **InfoBanner** sa localStorage porukom
- **PhaseIndicator** sa brojem faze
- **CheckCard** (todo, in_progress, done, blocked)
- **ScrollView**

### 5.4 Akcije

|Akcija          |Trigger               |Rezultat                             |
|----------------|----------------------|-------------------------------------|
|Tap na CheckCard|Klikne na status ikonu|Ciklus: todo → progress → done → todo|
|Tap na CheckCard|Klikne na tekst       |Opciono: otvori Procedure Detail     |

### 5.5 AsyncStorage strategija

```typescript
// Checklist se čuva kao:
// Key: `checklist_{lifeEventId}`
// Value: JSON stringificirano
[
  { procedureId: 'uuid', status: 'done', updatedAt: timestamp },
  { procedureId: 'uuid', status: 'in_progress', updatedAt: timestamp },
  { procedureId: 'uuid', status: 'todo', updatedAt: timestamp },
]
```

### 5.6 Code structure

```typescript
export function ChecklistScreen({ route }) {
  const { id } = route.params; // life_event_id
  const [event, setEvent] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvent();
    loadChecklist();
  }, [id]);

  async function loadEvent() {
    const { data } = await supabase
      .from('life_events')
      .select('*, life_event_procedures(*, procedures(*))')
      .eq('id', id)
      .single();
    setEvent(data);
  }

  async function loadChecklist() {
    const data = await offlineDB.getChecklistStatus(id);
    setChecklist(data);
    setLoading(false);
  }

  async function updateStatus(procedureId, status) {
    const newEntry = { procedureId, status, updatedAt: Date.now() };
    const updated = checklist.filter(e => e.procedureId !== procedureId);
    updated.push(newEntry);
    setChecklist(updated);
    await offlineDB.saveChecklistStatus(id, updated);
  }

  const completed = checklist.filter(e => e.status === 'done').length;
  const total = event?.life_event_procedures?.length || 0;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Text style={typography.title}>Checklist</Text>
        <ProgressBar percentage={percentage} completed={completed} total={total} />
        <InfoBanner
          variant="info"
          message="📱 Napredak se čuva lokalno u ovom pretraživaču i nije sinhronizovan između uređaja."
        />
      </View>

      <ScrollView>
        {/* Faze sa CheckCard-ovim */}
        {event?.phases?.map((phase, idx) => (
          <View key={idx}>
            <PhaseIndicator number={idx + 1} label={phase.label} />
            {phase.procedures.map(proc => {
              const status = checklist.find(e => e.procedureId === proc.id)?.status || 'todo';
              const isBlocked = checkIfBlocked(proc.id, checklist, event.dependencies);

              return (
                <CheckCard
                  key={proc.id}
                  procedure={proc}
                  status={status}
                  isBlocked={isBlocked}
                  onStatusChange={(newStatus) => updateStatus(proc.id, newStatus)}
                  onPress={() => navigate('procedure', { id: proc.id })}
                />
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
```

-----

## 6. AI CHAT SCREEN – AI asistent

**Usklađenost:** UF-03 (Postavljanje pitanja AI asistentu)

### 6.1 Purpose

Korisnik postavlja pitanje slobodnim jezikom. AI asistent prepoznaje životni događaj/proceduru iz baze i vraća odgovor. Ako nema informacije, jasno kaže.

### 6.2 Layout

```
┌─────────────────────────────────────┐
│ AI Asistent                         │ ← Title
├─────────────────────────────────────┤
│ Zdravo! Pitaj me bilo šta o         │ ← ChatMessage (AI, left)
│ administrativnim procedurama... 🙂  │
│                                     │
│                 Preselio sam se...   │ ← ChatMessage (user, right)
│                                     │
│ Za preseljenje na novu adresu...    │ ← ChatMessage (AI, left)
│ ┌───────────────────────────────┐  │
│ │ 🏠 Faza 1                      │  │ ← ChatRelatedCard
│ │ Selim se na novu adresu        │  │
│ │ 4 procedure · ~2 nedelje       │  │
│ └───────────────────────────────┘  │
├─────────────────────────────────────┤
│ ┌──────────────────────────────┐   │
│ │ Postavi pitanje...    [↑ Send]   │ ← ChatInputBar
│ └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 6.3 Komponente

- **SafeAreaView**
- **ScrollView** (chat poruke)
- **ChatMessage** (ai | user varijanta)
- **ChatRelatedCard** (procedure iz baze)
- **ChatInputBar** (input + send button)
- **ActivityIndicator** (loading tokom odgovora)
- **InfoBanner** (rate limit, greške)

### 6.4 Akcije

|Akcija        |Trigger            |Rezultat                              |
|--------------|-------------------|--------------------------------------|
|Unos + Send   |Tap na Send dugme  |POST /ai/chat sa porukom; refresh chat|
|Tap na Related|Klikne na procedure|Navigacija na Procedure Detail        |

### 6.5 Rate limiting

- 10 upita po IP adresi na sat
- Ako se prekorači: InfoBanner sa porukom “Previše zahteva. Pokušajte za nekoliko minuta.”

### 6.6 Code structure

```typescript
export function AiChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: '1',
      role: 'ai',
      content: 'Zdravo! Pitaj me bilo šta...',
      relatedProcedures: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  async function sendMessage() {
    if (input.trim().length < 3 || loading) return;

    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: input },
    ]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/ai/chat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: input }),
        }
      );

      if (response.status === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 5000);
        return;
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: data.answer,
          relatedProcedures: data.related_procedures,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1, paddingHorizontal: spacing.lg }}>
        {messages.map(msg => (
          <View key={msg.id} style={{ marginVertical: spacing.md }}>
            <ChatMessage
              message={msg.content}
              role={msg.role}
              relatedProcedures={msg.relatedProcedures}
            />
          </View>
        ))}
        {loading && <ActivityIndicator size="small" />}
      </ScrollView>

      {rateLimited && (
        <InfoBanner
          variant="warning"
          message="Previše zahteva. Pokušajte za nekoliko minuta."
        />
      )}

      <ChatInputBar value={input} onChange={setInput} onSend={sendMessage} />
    </SafeAreaView>
  );
}
```

-----

## 7. Safe Area & Responsive handling

### 7.1 iOS notch handling

```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function MyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={{ paddingTop: insets.top }}>
      {/* Content */}
    </View>
  );
}
```

### 7.2 Android back button

```typescript
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export function MyScreen() {
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigation.goBack();
        return true;
      });

      return () => backHandler.remove();
    }, [])
  );

  return (/* ... */);
}
```

### 7.3 Keyboard handling

```typescript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
  {/* Chat input bar */}
</KeyboardAvoidingView>
```

-----

## 8. Platform specifičnosti

|Zahtev              |iOS                        |Android                         |
|--------------------|---------------------------|--------------------------------|
|Status bar          |Safe area padding          |Sistemska navigacija bar        |
|Hardware back button|Nema                       |Postoji – hvata u useFocusEffect|
|Bottom navigation   |Safe area za home indicator|Standard bottom nav             |
|Tipkovnica          |KeyboardAvoidingView       |KeyboardAvoidingView            |
|Slider/Swipe        |Native iOS swipe           |Gesture handler (React Native)  |

-----

## 9. Offline states

### 9.1 Kada je offline

**Home screen:**

- Koristi AsyncStorage cache (life_events_cache)
- Prikaži InfoBanner: “Offline modus – prikazani su prethodni podaci”

**Search screen:**

- Pretraga ne radi (nema svežih podataka)
- Prikaži InfoBanner: “Pretraga dostupna samo sa internetom”

**Procedure detail:**

- Koristi AsyncStorage cache (procedure_{id})
- Prikaži upozorenje: “Ovi podaci mogu biti zastareli”

**Checklist:**

- ✅ Radi offline (AsyncStorage je lokalan)
- Kliknuta: “Ažuriranje će biti sinhronizovano kada ste online (v2.0)”

**AI chat:**

- ❌ Ne radi offline
- Prikaži InfoBanner: “AI asistent zahteva internet konekciju”

### 9.2 Implementacija offline detektora

```typescript
// lib/hooks/useOffline.ts
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

## 10. Touch targets & Accessibility (basic)

- **Minimum touch target:** 48pt × 48pt (Apple guidelines)
- **Button padding:** min 12pt vertikalno, 16pt horizontalno
- **Text size:** Minimum 14pt za body tekst (čitljivost)
- **Contrast:** Respektuj design tokene (ink na cream, amber na paper)
- **WCAG A:** Nije u v1.5, ali dizajn je spreman za v2.0

-----

## 11. Navigation map

```
Home (bottom tab) ──┬── Life Event Detail ──┬── Checklist
                   │                        └── Procedure Detail
Search (tab) ──────┴── Procedure Detail
AI Chat (tab) ──────── Related Procedure Detail
```

Sve **back navigacije** koriste `navigation.goBack()` – vraća se tačno odakle je došao korisnik.