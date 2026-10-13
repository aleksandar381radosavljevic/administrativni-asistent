import { describe, expect, it } from "vitest";
import { format, minutesLabel, pluralize } from "./format";

describe("format", () => {
  it("fills placeholders by name", () => {
    expect(
      format("Pokušaj za {minutes}, ima {count}.", {
        minutes: "5 minuta",
        count: 2,
      }),
    ).toBe("Pokušaj za 5 minuta, ima 2.");
  });

  it("leaves a placeholder without a value visible", () => {
    expect(format("Za {minutes}", {})).toBe("Za {minutes}");
  });
});

describe("minutesLabel", () => {
  it.each([
    [1, "1 minut"],
    [2, "2 minuta"],
    [5, "5 minuta"],
    [11, "11 minuta"],
    [21, "21 minut"],
    [25, "25 minuta"],
    [60, "60 minuta"],
  ])("%i", (minutes, expected) => {
    expect(minutesLabel(minutes)).toBe(expected);
  });
});

describe("pluralize", () => {
  const forms = {
    one: "{count} procedura",
    few: "{count} procedure",
    other: "{count} procedura (mn.)",
  };

  it.each([
    [1, "1 procedura"],
    [21, "21 procedura"],
    [2, "2 procedure"],
    [4, "4 procedure"],
    [22, "22 procedure"],
    [0, "0 procedura (mn.)"],
    [5, "5 procedura (mn.)"],
    [11, "11 procedura (mn.)"],
    [12, "12 procedura (mn.)"],
  ])("%i → %s", (count, expected) => {
    expect(pluralize(forms, count)).toBe(expected);
  });
});
