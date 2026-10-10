import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import * as categoriesRoute from "@/app/api/v1/categories/route";
import * as institutionRoute from "@/app/api/v1/institutions/[slug]/route";
import * as institutionsRoute from "@/app/api/v1/institutions/route";
import * as lifeEventRoute from "@/app/api/v1/life-events/[slug]/route";
import * as lifeEventsRoute from "@/app/api/v1/life-events/route";
import * as procedureRoute from "@/app/api/v1/procedures/[slug]/route";
import * as proceduresRoute from "@/app/api/v1/procedures/route";
import * as searchRoute from "@/app/api/v1/search/route";
import {
  categoryListResponseSchema,
  institutionDetailSchema,
  institutionListResponseSchema,
  lifeEventDetailSchema,
  lifeEventListResponseSchema,
  procedureDetailSchema,
  procedureListResponseSchema,
  searchResponseSchema,
} from "@/lib/services/schemas";

// Public read endpoints against the local Supabase stack loaded with
// supabase/seed.sql. Responses are parsed with the contract schemas.

// cacheLife() and cacheTag() throw outside a Next.js cache scope, and Vitest
// runs `use cache` functions as plain functions (ADR 0017).
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// connection() needs a Next.js request scope, which Vitest does not have.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));

const request = (path: string) =>
  new NextRequest(`http://localhost/api/v1${path}`);
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("public API on the seeded database", () => {
  it("lists the seeded categories", async () => {
    const body = categoryListResponseSchema.parse(
      await (await categoriesRoute.GET()).json(),
    );
    expect(body.data.map((c) => c.slug)).toEqual([
      "licna-dokumenta",
      "preseljenje-i-adresa",
    ]);
  });

  it("lists and paginates life events by category", async () => {
    const response = await lifeEventsRoute.GET(
      request("/life-events?category_slug=preseljenje-i-adresa&limit=1"),
    );
    const body = lifeEventListResponseSchema.parse(await response.json());
    expect(body.pagination).toEqual({ total: 2, limit: 1, offset: 0 });
    expect(body.data[0].procedure_count).toBe(2);
  });

  it("returns a life event with its dependency", async () => {
    const response = await lifeEventRoute.GET(
      request("/life-events/selim-se-na-novu-adresu"),
      params("selim-se-na-novu-adresu"),
    );
    const body = lifeEventDetailSchema.parse(await response.json());
    expect(body.procedures.map((p) => p.slug)).toEqual([
      "prijava-prebivalista",
      "nova-licna-karta",
    ]);
    expect(body.procedures[1].depends_on).toEqual([
      body.procedures[0].procedure_id,
    ]);
  });

  it("returns a procedure with money as a decimal string", async () => {
    const response = await procedureRoute.GET(
      request("/procedures/pasosh"),
      params("pasosh"),
    );
    const body = procedureDetailSchema.parse(await response.json());
    expect(body.cost_amount).toBe("3000.00");
    expect(body.steps.map((s) => s.sort_order)).toEqual([1, 2, 3]);
  });

  it("returns 404 for an unknown procedure", async () => {
    const response = await procedureRoute.GET(
      request("/procedures/nepostoji"),
      params("nepostoji"),
    );
    expect(response.status).toBe(404);
  });

  it("finds content through a synonym", async () => {
    const response = await searchRoute.GET(
      request("/search?q=putna%20isprava"),
    );
    const body = searchResponseSchema.parse(await response.json());
    expect(body.query).toBe("pasoš");
    expect(body.procedures.map((p) => p.slug)).toContain("pasosh");
  });

  it("lists public procedures, also filtered by institution", async () => {
    const all = procedureListResponseSchema.parse(
      await (await proceduresRoute.GET(request("/procedures"))).json(),
    );
    expect(all.pagination.total).toBe(5);
    const byMup = procedureListResponseSchema.parse(
      await (
        await proceduresRoute.GET(request("/procedures?institution_slug=mup"))
      ).json(),
    );
    expect(byMup.pagination.total).toBe(5);
    const unknown = procedureListResponseSchema.parse(
      await (
        await proceduresRoute.GET(request("/procedures?institution_slug=nema"))
      ).json(),
    );
    expect(unknown).toEqual({
      data: [],
      pagination: { total: 0, limit: 20, offset: 0 },
    });
  });

  it("lists institutions and returns one with its public procedures", async () => {
    const list = institutionListResponseSchema.parse(
      await (await institutionsRoute.GET(request("/institutions"))).json(),
    );
    expect(list.data.map((i) => i.slug)).toEqual(["mup"]);
    const detail = institutionDetailSchema.parse(
      await (
        await institutionRoute.GET(request("/institutions/mup"), params("mup"))
      ).json(),
    );
    expect(detail.procedures).toHaveLength(5);
    expect(detail.procedures.map((p) => p.slug)).toContain("pasosh");
  });
});
