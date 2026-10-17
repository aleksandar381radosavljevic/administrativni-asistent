import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ExampleLinks } from "./ExampleLinks";

describe("ExampleLinks", () => {
  it("links each example straight to its life event", () => {
    renderWithProviders(
      <ExampleLinks
        lifeEvents={[
          { id: "1", slug: "treba-mi-pasos", title: "Treba mi pasoš" },
          { id: "2", slug: "kupujem-auto", title: "Kupujem auto" },
        ]}
      />,
    );

    const list = screen.getByRole("list", { name: "Na primer:" });
    expect(list).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Treba mi pasoš" }),
    ).toHaveAttribute("href", "/dogadjaj/treba-mi-pasos");
  });

  it("renders nothing without examples", () => {
    const { container } = renderWithProviders(<ExampleLinks lifeEvents={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
