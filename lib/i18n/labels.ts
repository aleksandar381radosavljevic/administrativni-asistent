// All UI copy, Serbian (Latin script, informal "ti"), English keys (05 §2).
// The copy of record is in docs/08-screen-specifications.md and, for API
// error messages, docs/03-api-contract.yml.
export const labels = {
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
  },
} as const;
