import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { lifeEventList } from "@/test/fixtures";
import { renderWithProviders } from "@/test/render";
import { FeaturedStickers } from "./FeaturedStickers";

const moving = lifeEventList.data[0];
const passport = {
  ...moving,
  id: "30000000-0000-4000-8000-000000000001",
  title: "[TEST] Istekao mi je pasoš",
  slug: "istekao-mi-je-pasos",
  icon: "plane",
  estimated_duration: null,
};

describe("FeaturedStickers", () => {
  it("lists the featured life events as links under the Izdvojeno heading", () => {
    renderWithProviders(
      <FeaturedStickers
        items={[
          { lifeEvent: moving, tone: "category-1" },
          { lifeEvent: passport, tone: "category-2" },
        ]}
      />,
    );

    const section = screen.getByRole("region", { name: "Izdvojeno" });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(
      within(section).getByRole("link", { name: moving.title }),
    ).toHaveAttribute("href", "/dogadjaj/selim-se-na-novu-adresu");
    expect(
      within(section).getByRole("heading", { level: 3, name: passport.title }),
    ).toBeInTheDocument();
  });

  it("always shows the duration, and names each link by its title only", () => {
    renderWithProviders(
      <FeaturedStickers items={[{ lifeEvent: moving, tone: "category-1" }]} />,
    );

    expect(screen.getByText("~2 nedelje")).toBeVisible();
    expect(
      screen.getByRole("link", { name: moving.title }),
    ).not.toHaveTextContent("Pokaži korake");
  });

  it("tags each sticker with its area tone, for the hero's field color", () => {
    renderWithProviders(
      <FeaturedStickers
        items={[
          { lifeEvent: moving, tone: "category-1" },
          { lifeEvent: passport, tone: "category-2" },
        ]}
      />,
    );

    const tones = screen
      .getAllByRole("listitem")
      .map((item) => item.getAttribute("data-tone"));
    expect(tones).toEqual(["category-1", "category-2"]);
  });
});
