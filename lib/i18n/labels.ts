// All UI copy, Serbian (Latin script, informal "ti"), English keys (05 §2).
// The copy of record is in docs/08-screen-specifications.md and, for API
// error messages, docs/03-api-contract.yml.
export const labels = {
  // Global public layout (08 §0.6).
  layout: {
    appName: "Kako sa državom",
    skipToContent: "Preskoči na sadržaj",
    askAssistant: "Pitaj asistenta",
    askAssistantShort: "Asistent",
    mainNavigation: "Glavna navigacija",
    disclaimer:
      "Informacije su informativne. Za zvanične podatke proveri kod nadležne institucije.",
    opensInNewTab: "(otvara se u novom tabu)",
    loading: "Učitavam…",
  },
  // SearchField (06 §12.11, 08 P1/P2).
  search: {
    label: "Pretraži",
    placeholder: "Npr. pasoš, prijava adrese, karton",
    submit: "Traži",
    tooShort: "Upiši bar 2 slova.",
  },
  // P1 Home (08 P1).
  home: {
    eyebrow: "Dobar dan",
    title: "Šta ti se dešava?",
    intro:
      "Plastično objašnjavamo papirologiju u Srbiji, korak po korak: šta ti treba, koliko košta i koji je rok. Kad zapne, pitaj pametnog pomoćnika: odgovara samo iz uputstava objavljenih ovde. Nismo državna služba.",
    categories: "Kategorije",
    allCategories: "Sve",
    shownCount: {
      one: "Prikazan {count} životni događaj",
      few: "Prikazana {count} životna događaja",
      other: "Prikazano {count} životnih događaja",
    },
    emptyTitle: "Još nema objavljenih životnih događaja.",
    emptyDescription:
      "Radimo na sadržaju. U međuvremenu možeš da pitaš asistenta.",
    notFoundTitle: "Ne nalaziš svoju situaciju?",
    searchLink: "Pretraži",
    loading: "Učitavam životne događaje…",
  },
  // P3 Life event (08 P3) and the shared cards (06 §12).
  lifeEvent: {
    openChecklist: "Otvori checklist",
    procedureCountTerm: "Broj procedura",
    durationTerm: "Okvirno trajanje",
    questionTitle: "Imaš pitanje o ovome?",
    phases: "Faze",
    phaseTitle: "Faza {number}",
    phaseFirst: "možeš odmah, paralelno",
    phaseLater: "posle procedura od kojih zavise",
    dependsOn: "Zavisi od: {titles}",
    stale: "Proveri podatke",
    notFound: "Ovaj životni događaj ne postoji ili više nije dostupan.",
    loading: "Učitavam životni događaj…",
  },
  // P4 Checklist (08 P4, 06 §12.14).
  checklistPage: {
    title: "Checklist: {title}",
    progress: "{done} / {total} završeno",
    storageInfo:
      "Napredak se čuva lokalno u ovom pretraživaču i nije sinhronizovan između uređaja.",
    storageInfoMore:
      "Ako obrišeš podatke pretraživača ili koristiš privatni prozor, napredak se gubi.",
    storageBlocked:
      "Pretraživač ne dozvoljava čuvanje. Napredak će se izgubiti kad zatvoriš stranicu.",
    blockedBy: "Zavisi od: {titles} (još nije završeno)",
    blockedWarning:
      "Ova procedura zavisi od {titles}, koja još nije završena. Možeš da nastaviš, ali proveri redosled.",
    announcement: "{title}: {status}. {done} / {total} završeno.",
    reset: "Poništi napredak",
    resetQuestion:
      "Da li želiš da vratiš sve procedure ovog događaja na „Nije počelo”?",
    resetConfirm: "Poništi",
    resetCancel: "Odustani",
    resetDone: "Napredak je poništen. 0 / {total} završeno.",
    loading: "Učitavam checklist…",
  },
  // Count forms by Serbian plural category (pluralize in format.ts).
  procedureCount: {
    one: "{count} procedura",
    few: "{count} procedure",
    other: "{count} procedura",
  },
  // Full-page states (08 §0.5, P8).
  errors: {
    pageTitle: "Nismo uspeli da učitamo stranicu.",
    retry: "Pokušaj ponovo",
    home: "Početna",
    notFoundTitle: "Ova stranica ne postoji.",
    notFoundDescription:
      "Možda je adresa pogrešno upisana ili sadržaj više nije dostupan.",
  },
  // Shared display rules for public screens (08 §0.7).
  checklist: {
    todo: "Nije počelo",
    in_progress: "U toku",
    done: "Završeno",
  },
  methods: {
    can_online: "Online",
    can_in_person: "Lično",
    can_by_mail: "Poštom",
  },
  // A missing amount never means "Besplatno" (ADR 0008).
  cost: {
    free: "Besplatno",
    fixed: "{amount} din",
    variable: "Cena varira",
    unknown: "Cena nepoznata",
  },
  institutionKind: {
    government: "Državna institucija",
    bank: "Banka",
    employer: "Poslodavac",
    other: "Organizacija",
  },
  apiErrors: {
    badRequest: "Proveri parametre zahteva.",
    searchTooShort: "Unesi bar 2 karaktera za pretragu.",
    unauthorized: "Prijavi se da nastaviš.",
    forbidden: "Nemaš pristup ovoj akciji.",
    notFound: "Nismo pronašli ono što tražiš.",
    conflict: "Ovaj podatak je već zauzet.",
    dependencyExists: "Ova zavisnost već postoji.",
    circularDependency: "Ova zavisnost bi napravila krug između procedura.",
    validation: "Proveri označena polja.",
    internal: "Došlo je do greške. Pokušaj ponovo.",
    invalidJson: "Telo zahteva nije ispravan JSON.",
    // {minutes} is filled with minutesLabel() (03 TooManyRequests).
    rateLimited:
      "Iskoristio si {limit} pitanja za ovaj sat. Pokušaj ponovo za {minutes}.",
    aiUnavailable:
      "Asistent trenutno nije dostupan. Pokušaj ponovo kasnije ili pronađi svoj životni događaj na početnoj strani.",
  },
  ai: {
    // The fixed answer when the content does not cover the question (07 §2.4).
    noInformation:
      "Nemam tu informaciju u bazi znanja. Preporučujem da proveriš direktno kod nadležne institucije.",
    // Placeholders that replace personal data in chat messages (ADR 0007).
    redacted: {
      jmbg: "[JMBG]",
      phone: "[TELEFON]",
      email: "[EMAIL]",
      document_number: "[BROJ DOKUMENTA]",
    },
  },
  // Field messages in a 422 `details` list (03 ValidationError).
  validation: {
    required: "Ovo polje je obavezno.",
    invalidType: "Vrednost nije odgovarajućeg tipa.",
    empty: "Ovo polje ne sme biti prazno.",
    tooShort: "Vrednost je prekratka.",
    tooLong: "Vrednost je predugačka.",
    tooSmall: "Vrednost je premala.",
    tooBig: "Vrednost je prevelika.",
    invalidFormat: "Vrednost nije u ispravnom formatu.",
    invalidValue: "Vrednost nije dozvoljena.",
    stepsRequired: "Procedura mora imati najmanje jedan korak.",
    institutionsRequired: "Poveži bar jednu organizaciju.",
    methodRequired: "Izaberi bar jedan način: online, lično ili poštom.",
    costAmountRequired: "Unesi iznos za fiksnu cenu.",
    costAmountForbidden: "Iznos se unosi samo za fiksnu cenu.",
    noteWithoutInstitution:
      "Napomena se odnosi na organizaciju koja nije povezana.",
    duplicateSortOrder: "Redosled se ponavlja.",
    duplicateItem: "Stavka se ponavlja.",
    selfDependency: "Procedura ne može zavisiti od same sebe.",
    newLifeEventDraft: "Novi životni događaj može biti samo nacrt.",
    atLeastOneField: "Pošalji bar jedno polje.",
    lifeEventNeedsProcedure:
      "Objavljen životni događaj mora imati bar jednu objavljenu proceduru.",
    unknownCategory: "Kategorija ne postoji.",
    unknownProcedure: "Procedura ne postoji.",
    unknownInstitution: "Organizacija ne postoji.",
    procedureNotInEvent: "Procedura nije u ovom životnom događaju.",
    chatRolesAlternate: "Poruke moraju naizmenično biti tvoje i asistentove.",
    chatLastFromUser: "Poslednja poruka mora biti tvoje pitanje.",
    chatQuestionTooShort: "Pitanje mora imati bar 3 karaktera.",
  },
} as const;
