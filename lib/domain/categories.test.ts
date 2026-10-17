import { describe, expect, it } from "vitest";
import {
  categoryTone,
  categoryToneOf,
  exampleLifeEvents,
  featuredLifeEvents,
  groupByCategory,
} from "./categories";

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

describe("categoryTone", () => {
  it("follows the category position and repeats after six", () => {
    expect([0, 1, 5, 6, 13].map(categoryTone)).toEqual([
      "category-1",
      "category-2",
      "category-6",
      "category-1",
      "category-2",
    ]);
  });
});

describe("featuredLifeEvents", () => {
  const cats = Array.from({ length: 5 }, (_, i) => ({
    id: `k${String(i)}`,
    slug: `k${String(i)}`,
    sort_order: i,
  }));
  const events = cats.flatMap((c) => [
    { title: `${c.slug}-a`, category: { id: c.id } },
    { title: `${c.slug}-b`, category: { id: c.id } },
  ]);

  it("takes the first life event of each of the first four categories", () => {
    const featured = featuredLifeEvents(groupByCategory(cats, events));
    expect(featured.map((f) => [f.lifeEvent.title, f.tone])).toEqual([
      ["k0-a", "category-1"],
      ["k1-a", "category-2"],
      ["k2-a", "category-3"],
      ["k3-a", "category-4"],
    ]);
  });

  it("returns fewer when there are fewer categories", () => {
    const featured = featuredLifeEvents(groupByCategory([housing], [moving]));
    expect(featured).toEqual([{ lifeEvent: moving, tone: "category-1" }]);
  });
});

describe("exampleLifeEvents", () => {
  it("takes the first life events that are not featured, in catalog order", () => {
    const groups = groupByCategory(
      [documents, housing],
      [passport, moving, idCard],
    );
    // Featured: moving (housing) and passport (documents).
    expect(exampleLifeEvents(groups)).toEqual([idCard]);
  });

  it("stops at four", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({
      title: `e${String(i)}`,
      category: { id: "c2" },
    }));
    const examples = exampleLifeEvents(groupByCategory([housing], many));
    expect(examples.map((e) => e.title)).toEqual(["e1", "e2", "e3", "e4"]);
  });
});

describe("categoryToneOf", () => {
  it("gives a category the tone of its position in display order", () => {
    expect(categoryToneOf([documents, housing], "c1")).toBe("category-2");
    expect(categoryToneOf([documents, housing], "c2")).toBe("category-1");
  });

  it("falls back to the first tone for an unknown category", () => {
    expect(categoryToneOf([housing], "missing")).toBe("category-1");
  });
});
