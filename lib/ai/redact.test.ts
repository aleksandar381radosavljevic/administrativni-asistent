import { describe, expect, it } from "vitest";
import { redactMessages, redactText } from "./redact";

describe("redactText", () => {
  it("leaves an ordinary question untouched", () => {
    const question =
      "Preselio sam se iz Novog Sada u Beograd 2024. godine, šta treba da uradim?";
    expect(redactText(question)).toEqual({ text: question, kinds: [] });
  });

  describe("JMBG", () => {
    it.each([
      ["moj JMBG je 0101990710006", "moj JMBG je [JMBG]"],
      ["JMBG: 0101990-710006.", "JMBG: [JMBG]."],
      ["matični broj 0101990 710006 i", "matični broj [JMBG] i"],
      ["мој ЈМБГ је 0101990710006", "мој ЈМБГ је [JMBG]"],
    ])("masks %j", (input, expected) => {
      expect(redactText(input)).toEqual({ text: expected, kinds: ["jmbg"] });
    });

    it("never leaves a 13-digit run, which ai_queries would reject", () => {
      const { text } = redactText("broj računa 1234567890123456789");
      expect(text).not.toMatch(/\d{13}/);
    });
  });

  describe("phone numbers", () => {
    it.each([
      "+381 64 123 4567",
      "+381641234567",
      "+381 (0)64 123-4567",
      "00381 64 1234567",
      "064 123 4567",
      "064/123-4567",
      "064 123 45 67",
      "064-123-45-67",
      "0641234567",
      "063 123456",
      "011 123 4567",
      "011/3234-567",
      "(011) 123-4567",
      "021 456789",
    ])("masks %s", (phone) => {
      expect(redactText(`Pozovi me na ${phone} posle 17h.`)).toEqual({
        text: "Pozovi me na [TELEFON] posle 17h.",
        kinds: ["phone"],
      });
    });

    it("masks the number but keeps a year in front of it", () => {
      expect(redactText("od 1990 064 1234567").text).toBe("od 1990 [TELEFON]");
    });

    it("keeps a trailing count that is not part of the number", () => {
      expect(redactText("zvao sam 064 123 4567 2 puta").text).toBe(
        "zvao sam [TELEFON] 2 puta",
      );
    });

    it.each([
      "Rok je 01.10.2026.",
      "Rok je 01/10/2026",
      "Taksa je 1500 dinara",
      "Šalter 12, red 3",
      "Poštanski broj 11000",
      "PR-12 i PR-13",
    ])("does not mask dates, amounts or short numbers: %s", (input) => {
      expect(redactText(input)).toEqual({ text: input, kinds: [] });
    });
  });

  describe("email addresses", () => {
    it.each([
      ["pera.peric@gmail.com", "[EMAIL]"],
      ["Piši na marko_m+ai@posta.co.rs.", "Piši na [EMAIL]."],
      ["ana.ćirić@firma.rs", "[EMAIL]"],
    ])("masks %s", (input, expected) => {
      expect(redactText(input)).toEqual({ text: expected, kinds: ["email"] });
    });
  });

  describe("document numbers", () => {
    it.each([
      ["broj lične karte 012345678", "broj lične karte [BROJ DOKUMENTA]"],
      ["licna karta br. 012345678", "licna karta br. [BROJ DOKUMENTA]"],
      ["LK: 012 345 678", "LK: [BROJ DOKUMENTA]"],
      ["pasoš broj 012345678", "pasoš broj [BROJ DOKUMENTA]"],
      ["pasos 012345678", "pasos [BROJ DOKUMENTA]"],
      ["vozačka dozvola 123456789", "vozačka dozvola [BROJ DOKUMENTA]"],
      ["saobraćajna AB1234567", "saobraćajna [BROJ DOKUMENTA]"],
      ["број пасоша 012345678", "број пасоша [BROJ DOKUMENTA]"],
      ["лична карта 012345678", "лична карта [BROJ DOKUMENTA]"],
    ])("masks %j", (input, expected) => {
      expect(redactText(input)).toEqual({
        text: expected,
        kinds: ["document_number"],
      });
    });

    it("masks a letter-prefixed number without a keyword", () => {
      expect(redactText("imam AB1234567 kod sebe").text).toBe(
        "imam [BROJ DOKUMENTA] kod sebe",
      );
    });

    it("reports a JMBG written after a document keyword as a JMBG", () => {
      expect(redactText("dokument 0101990710006")).toEqual({
        text: "dokument [JMBG]",
        kinds: ["jmbg"],
      });
    });

    it("does not mask a question about documents", () => {
      const question = "Koja dokumenta su potrebna za pasoš za 2 deteta?";
      expect(redactText(question)).toEqual({ text: question, kinds: [] });
    });
  });

  it("masks several kinds in one message and lists each kind once", () => {
    const result = redactText(
      "JMBG 0101990710006, tel 064 123 4567, mejl a@b.rs, 065 765 4321",
    );
    expect(result.text).toBe(
      "JMBG [JMBG], tel [TELEFON], mejl [EMAIL], [TELEFON]",
    );
    expect(result.kinds).toEqual(["jmbg", "phone", "email"]);
  });
});

describe("redactMessages", () => {
  it("redacts every message and reports the kinds found", () => {
    const result = redactMessages([
      { role: "user", content: "Moj mejl je pera@example.com" },
      { role: "assistant", content: "Javiću ti se na 064 123 4567." },
      { role: "user", content: "Može li online?" },
    ]);
    expect(result.messages).toEqual([
      { role: "user", content: "Moj mejl je [EMAIL]" },
      { role: "assistant", content: "Javiću ti se na [TELEFON]." },
      { role: "user", content: "Može li online?" },
    ]);
    expect(result.redaction).toEqual({
      applied: true,
      kinds: ["phone", "email"],
    });
  });

  it("reports no redaction when nothing was masked", () => {
    expect(
      redactMessages([{ role: "user", content: "Kako da izvadim pasoš?" }])
        .redaction,
    ).toEqual({ applied: false, kinds: [] });
  });
});
