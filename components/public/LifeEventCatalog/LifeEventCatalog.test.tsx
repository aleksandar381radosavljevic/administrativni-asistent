import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    renderWithProviders(<LifeEventCatalog groups={groups} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Sve situacije" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent),
    ).toEqual([documents.name, category.name]);
    expect(
      screen.getByRole("heading", { level: 4, name: moving.title }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: moving.title })).toHaveAttribute(
      "href",
      "/dogadjaj/selim-se-na-novu-adresu",
    );
  });

  it("shows the duration and no procedure count", () => {
    renderWithProviders(<LifeEventCatalog groups={groups} />);

    expect(screen.getByText("~2 nedelje")).toBeInTheDocument();
    expect(screen.queryByText(/procedur/)).not.toBeInTheDocument();
  });

  it("links each area to its block, which takes focus", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LifeEventCatalog groups={groups} />);

    const areas = within(screen.getByRole("navigation", { name: "Oblasti" }));
    const link = areas.getByRole("link", { name: documents.name });
    expect(link).toHaveAttribute("href", "#kategorija-licni-dokumenti");

    const block = screen.getByRole("region", { name: documents.name });
    expect(block).toHaveAttribute("id", "kategorija-licni-dokumenti");
    // jsdom does not follow fragment links; the block must accept focus.
    block.focus();
    expect(block).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: passport.title })).toHaveFocus();
  });
});
