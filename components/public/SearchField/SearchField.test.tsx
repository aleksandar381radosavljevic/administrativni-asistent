import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { SearchField } from "./SearchField";

describe("SearchField", () => {
  it("is a search landmark that submits the term as q to /pretraga", () => {
    renderWithProviders(<SearchField id="pretraga" defaultValue="pasoš" />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/pretraga");
    expect(screen.getByRole("searchbox", { name: "Pretraži" })).toHaveAttribute(
      "name",
      "q",
    );
  });

  it("shows an error instead of searching for fewer than 2 letters", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SearchField id="pretraga" />);
    const field = screen.getByRole("searchbox", { name: "Pretraži" });

    await user.type(field, " a ");
    await user.click(screen.getByRole("button", { name: "Traži" }));

    expect(field).toHaveAccessibleDescription("Upiši bar 2 slova.");
    expect(field).toBeInvalid();
    expect(field).toHaveFocus();

    await user.type(field, "b");
    expect(field).not.toBeInvalid();
  });
});
