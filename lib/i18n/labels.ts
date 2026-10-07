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
    circularDependency: "Ova zavisnost bi napravila krug između procedura.",
    validation: "Proveri označena polja.",
    internal: "Došlo je do greške. Pokušaj ponovo.",
  },
} as const;
