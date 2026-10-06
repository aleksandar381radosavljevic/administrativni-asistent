/**
 * Administrativni Asistent - UI Labels
 * Sav UI tekst na srpskom jeziku, centralizovan na jednom mestu.
 * Razlog: ako se u v2 uvede višejezičnost, ekstrakcija je mehanička.
 * 
 * Konvencija: ključevi na engleskom, vrednosti na srpskom
 */

export const labels = {
  // ─────────────────────────────────────────────────────────────────────────
  // NAVIGACIJA I OPŠTE
  // ─────────────────────────────────────────────────────────────────────────
  back: "← Nazad",
  search: "Pretraži…",
  loading: "Učitavanja…",
  retry: "Pokušaj ponovo",
  close: "Zatvori",
  send: "Pošalji",

  // ─────────────────────────────────────────────────────────────────────────
  // POČETNA STRANICA
  // ─────────────────────────────────────────────────────────────────────────
  home: {
    greeting: "Dobar dan 👋",
    prompt: "Šta ti se dešava?",
    searchPlaceholder: "Pretraži… npr. pasoš, selidba",
    filterAll: "Sve",
    noEvents: "Nema dostupnih procedura u ovom trenutku. Pokušajte ponovo kasnije.",
    noCategoryEvents: "Nema životnih događaja u ovoj kategoriji.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PRETRAGA
  // ─────────────────────────────────────────────────────────────────────────
  searching: {
    resultsFor: "Rezultati za:",
    noResults:
      "Nema rezultata za '{query}'. Pokušajte sa drugim pojmom ili pregledate kategorije.",
    searching: "Pretraživanje…",
    error: "Greška pri pretrazi. Pokušajte ponovo.",
    backToHome: "Nazad na početnu",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ŽIVOTNI DOGAĐAJ
  // ─────────────────────────────────────────────────────────────────────────
  lifeEvent: {
    procedures: "procedure",
    weeks: "nedelje",
    days: "dana",
    openChecklist: "Otvori checklist",
    error: "Životni događaj nije pronađen ili greška pri učitavanju.",
    errorAction: "Nazad na početnu",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CHECKLIST
  // ─────────────────────────────────────────────────────────────────────────
  checklist: {
    title: "Checklist",
    progress: "završeno",
    notStarted: "Nije početo",
    inProgress: "U toku",
    completed: "Završeno",
    localNote:
      "📱 Napredak se čuva lokalno u ovom pretraživaču i nije sinhronizovan između uređaja.",
    phase: "Faza",
    canStartNow: "· možeš odmah, paralelno",
    waitForPrevious: "· kreni kad završiš",
    blockedWarning: "Zavisi od:",
    noError: "Nema dostupnih procedura za ovaj događaj.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROCEDURA
  // ─────────────────────────────────────────────────────────────────────────
  procedure: {
    steps: "KORACI",
    documents: "POTREBNA DOKUMENTA",
    institution: "INSTITUCIJA",
    staleWarning:
      "Poslednja provera: {date}. Preporučujemo da proverite zvanični izvor.",
    free: "Besplatno",
    cost: "Cena",
    time: "Vreme",
    online: "Online",
    inPerson: "Lično",
    byMail: "Poštom",
    required: "obavezno",
    optional: "opciono",
    scheduleOnline: "Zakaži termin online →",
    officialSite: "Zvanični sajt",
    form: "Formular",
    workingHours: "Radno vreme",
    address: "Adresa",
    phone: "Telefon",
    email: "Email",
    website: "Sajt",
    noSteps: "Nema dostupnih koraka.",
    noInstitution: "Institucija nije dostupna.",
    error: "Procedura nije pronađena ili greška pri učitavanju.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // AI CHAT
  // ─────────────────────────────────────────────────────────────────────────
  ai: {
    title: "AI Asistent",
    greeting:
      "Zdravo! Pitaj me bilo šta o administrativnim procedurama – odgovaram na osnovu naše baze. 🙂",
    placeholder: "Postavi pitanje…",
    noAnswer:
      "Nemam tu informaciju u bazi znanja. Preporučujem da proverite direktno kod nadležne institucije.",
    noLegalAdvice:
      "Ne mogu davati pravne savete. Molim vas da se obratite nadležnoj instituciji.",
    rateLimitWarning:
      "Previše zahteva. Pokušajte ponovo za nekoliko minuta.",
    timeout: "Asistent je odgovorio sporim – pokušajte ponovo.",
    error: "Greška pri slanju poruke. Pokušajte ponovo.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GREŠKE
  // ─────────────────────────────────────────────────────────────────────────
  errors: {
    networkError: "Proverite vašu internet konekciju.",
    serverError: "Došlo je do greške. Pokušajte ponovo.",
    notFound: "Traženi resurs nije pronađen.",
    unauthorized: "Autentifikacija je potrebna za ovu akciju.",
    validationError: "Validacija nije prošla.",
    formErrors: {
      required: "Ovo polje je obavezno.",
      minLength: "Minimum {min} karaktera.",
      maxLength: "Maksimum {max} karaktera.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN PANEL (opciono za v1, ali struktuirano za v2)
  // ─────────────────────────────────────────────────────────────────────────
  admin: {
    dashboard: "Admin panel",
    lifeEvents: "Životni događaji",
    procedures: "Procedure",
    institutions: "Institucije",
    documents: "Dokumenta",
    queries: "AI upiti",
    warnings: "Upozorenja",
    saved: "Sačuvano",
    published: "Objavljeno",
    archived: "Arhivirano",
    draft: "Nacrt",
    delete: "Briši",
    edit: "Uredi",
    create: "Kreiraj",
    staleWarnings: "Procedure starije od 6 meseci bez provere",
    noStaleItems: "Sav sadržaj je ažuran.",
    unansweredQueries: "Pitanja bez odgovora",
    noQueries: "Nema otvorenih upita bez odgovora.",
    circularDependency:
      "Unos bi kreirao kružnu zavisnost između procedura.",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STATUSNI PORUKE
  // ─────────────────────────────────────────────────────────────────────────
  status: {
    loading: "Učitavanja…",
    saving: "Čuvanja…",
    success: "Uspešno!",
    error: "Greška",
    warning: "Upozorenje",
    info: "Informacija",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BADGE LABELS (mali teksti za oznake)
  // ─────────────────────────────────────────────────────────────────────────
  badges: {
    online: "Online",
    inPerson: "Lično",
    byMail: "Poštom",
    free: "Besplatno",
    required: "obavezno",
    optional: "opciono",
    phase1: "Faza 1",
    phase2: "Faza 2",
    phase3: "Faza 3",
    phase4: "Faza 4",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SEKCIJE (eyebrow labels)
  // ─────────────────────────────────────────────────────────────────────────
  sections: {
    steps: "KORACI",
    documents: "POTREBNA DOKUMENTA",
    institution: "INSTITUCIJA",
    institutions: "INSTITUCIJE",
  },
} as const;

// Type for autocompletion
export type Labels = typeof labels;
