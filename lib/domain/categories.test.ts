import { describe, expect, it } from "vitest";
import { groupByCategory, selectedCategory } from "./categories";

const documents = { id: "c1", slug: "dokumenta", sort_order: 2 };
const housing = { id: "c2", slug: "stanovanje", sort_order: 1 };
const empty = { id: "c3", slug: "prazna", sort_order: 0 };

const passport = { title: "Pasoš", category: { id: "c1" } };
const idCard = { title: "Lična karta", category: { id: "c1" } };
const moving = { title: "Selim se", category: { id: "c2" } };

describe("groupByCategory", () => {
  it("orders groups by category sort order and keeps event order", () => {
    const groups = groupByCategory(
      [documents, housing],
      [passport, moving, idCard],
    );
    expect(groups).toEqual([
      { category: housing, lifeEvents: [moving] },
      { category: documents, lifeEvents: [passport, idCard] },
    ]);
  });

  it("leaves out categories without life events", () => {
    const groups = groupByCategory([empty, housing], [moving]);
    expect(groups.map((g) => g.category.slug)).toEqual(["stanovanje"]);
  });
});

describe("selectedCategory", () => {
  const groups = groupByCategory([documents, housing], [passport, moving]);

  it("finds the category by slug", () => {
    expect(selectedCategory(groups, "dokumenta")).toBe(documents);
  });

  it.each([
    undefined,
    "",
    "nepostojeca",
    "prazna",
    ["dokumenta", "stanovanje"],
  ])("treats %j as all categories", (param) => {
    expect(selectedCategory(groups, param)).toBeNull();
  });
});
