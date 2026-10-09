import { describe, expect, it } from "vitest";
import { labels } from "@/lib/i18n/labels";
import type { Catalog } from "@/lib/services/catalog";
import { BASE_INSTRUCTIONS, formatCatalog, selectSystem } from "./prompts";

const catalog: Catalog = {
  life_events: [
    {
      id: "30000000-0000-4000-8000-000000000004",
      slug: "selim-se",
      title: 'Selim se | "nova" adresa',
      procedure_ids: ["40000000-0000-4000-8000-000000000001"],
    },
  ],
  procedures: [
    {
      id: "40000000-0000-4000-8000-000000000001",
      slug: "prijava-prebivalista",
      title: "Prijava prebivališta",
    },
  ],
  synonyms: [{ term: "papiri za auto", maps_to: "registracija vozila" }],
};

describe("formatCatalog", () => {
  it("lists every event, procedure and synonym, one JSON object per line", () => {
    const lines = formatCatalog(catalog).split("\n");
    const objects = lines
      .filter((line) => line.startsWith("{"))
      .map((line) => JSON.parse(line));
    expect(objects).toEqual([
      ...catalog.life_events,
      ...catalog.procedures,
      ...catalog.synonyms,
    ]);
  });

  it("is byte-identical for the same catalog, so the prompt cache hits", () => {
    expect(formatCatalog(structuredClone(catalog))).toBe(
      formatCatalog(catalog),
    );
  });
});

describe("selectSystem", () => {
  it("puts the cache breakpoint on the catalog block", () => {
    const blocks = selectSystem(catalog);
    expect(blocks.at(-1)).toEqual({
      type: "text",
      text: formatCatalog(catalog),
      cache_control: { type: "ephemeral" },
    });
    expect(blocks.slice(0, -1).every((block) => !block.cache_control)).toBe(
      true,
    );
  });
});

describe("BASE_INSTRUCTIONS", () => {
  it("holds the fixed Serbian fallback sentence", () => {
    expect(BASE_INSTRUCTIONS).toContain(labels.ai.noInformation);
  });
});
