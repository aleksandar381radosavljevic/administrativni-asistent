import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { TrustStrip } from "./TrustStrip";

describe("TrustStrip", () => {
  it("lists the three promises", () => {
    renderWithProviders(<TrustStrip />);

    expect(
      screen.getByRole("region", { name: "Kako radimo" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "Korak po korak. Šta, gde i kojim redom.",
      "Cena i trajanje. Za svaki postupak.",
      "Zvanični izvori. Uz link na svaki.",
    ]);
  });
});
