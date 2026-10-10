import { describe, expect, it } from "vitest";
import { format, minutesLabel } from "./format";

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
