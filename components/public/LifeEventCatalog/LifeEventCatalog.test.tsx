import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { groupByCategory } from "@/lib/domain/categories";
import type { LifeEventSummary } from "@/lib/services/schemas";
import { category, lifeEventList } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { LifeEventCatalog } from "./LifeEventCatalog";

const documents = {
  id: "10000000-0000-4000-8000-000000000001",
  name: "[TEST] Lični dokumenti",
  slug: "licni-dokumenti",
  icon: null,
  sort_order: 1,
};
const moving = lifeEventList.data[0];
const passport: LifeEventSummary = {
  ...moving,
  id: "30000000-0000-4000-8000-000000000001",
  title: "[TEST] Istekao mi je pasoš",
  slug: "istekao-mi-je-pasos",
  icon: "plane",
  estimated_duration: null,
  procedure_count: 1,
  category: documents,
};
const groups = groupByCategory([category, documents], [moving, passport]);

describe("LifeEventCatalog", () => {
  it("lists every category with its life events, in category order", () => {
    renderWithProviders(<LifeEventCatalog groups={groups} selected={null} />);

    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([documents.name, category.name]);
    expect(screen.getByRole("link", { name: moving.title })).toHaveAttribute(
      "href",
      "/dogadjaj/selim-se-na-novu-adresu",
    );
    expect(screen.getByText("2 procedure · ~2 nedelje")).toBeInTheDocument();
    expect(screen.getByText("1 procedura")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Prikazana 2 životna događaja",
    );
  });

  it("shows only the selected category and marks its chip", () => {
    renderWithProviders(
      <LifeEventCatalog groups={groups} selected={documents} />,
    );

    expect(
      screen.getByRole("link", { name: passport.title }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: moving.title }),
    ).not.toBeInTheDocument();
    const chips = screen.getByRole("list", { name: "Kategorije" });
    expect(
      screen.getByRole("link", { name: documents.name, current: true }),
    ).toHaveAttribute("href", "/?kategorija=licni-dokumenti");
    expect(chips).toContainElement(
      screen.getByRole("link", { name: "Sve", current: false }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Prikazan 1 životni događaj",
    );
  });
});
