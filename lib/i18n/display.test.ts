import { describe, expect, it } from "vitest";
import { formatCost, formatDate, procedureMethods } from "./display";

describe("formatCost", () => {
  it.each([
    ["free", null, "Besplatno"],
    ["variable", null, "Cena varira"],
    ["unknown", null, "Cena nepoznata"],
    ["fixed", "1500.00", "1.500 din"],
    ["fixed", "1500.50", "1.500,50 din"],
    ["fixed", "99999999.99", "99.999.999,99 din"],
  ] as const)("%s %s → %s", (costType, amount, expected) => {
    expect(formatCost(costType, amount)).toBe(expected);
  });

  it("never shows a fixed cost without an amount as free", () => {
    expect(formatCost("fixed", null)).toBe("Cena nepoznata");
  });
});

describe("formatDate", () => {
  it("formats in Serbian Latin", () => {
    expect(formatDate("2026-10-05T10:00:00Z")).toBe("5. oktobar 2026.");
  });

  it("uses the Belgrade day near midnight UTC", () => {
    expect(formatDate("2026-10-04T23:30:00Z")).toBe("5. oktobar 2026.");
  });
});

describe("procedureMethods", () => {
  it("keeps the order online, in person, by mail and skips false flags", () => {
    expect(
      procedureMethods({
        can_by_mail: true,
        can_in_person: false,
        can_online: true,
      }),
    ).toEqual(["can_online", "can_by_mail"]);
  });
});
