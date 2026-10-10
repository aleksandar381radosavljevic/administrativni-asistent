import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  categoryListResponseSchema,
  errorSchema,
  institutionDetailSchema,
  institutionListResponseSchema,
  lifeEventDetailSchema,
  lifeEventListResponseSchema,
  procedureDetailSchema,
  procedureListResponseSchema,
  searchResponseSchema,
} from "@/lib/services/schemas";
import {
  categoryList,
  institutionDetail,
  institutionList,
  lifeEventDetail,
  lifeEventList,
  procedureDetail,
  procedureList,
  searchResult,
} from "@/test/fixtures";

vi.mock("@/lib/services/categories", () => ({ listCategories: vi.fn() }));
// connection() needs a Next.js request scope, which Vitest does not have.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => {}),
}));
vi.mock("@/lib/services/life-events", () => ({
  listLifeEvents: vi.fn(),
  getLifeEventBySlug: vi.fn(),
}));
vi.mock("@/lib/services/procedures", () => ({
  listProcedures: vi.fn(),
  getProcedureBySlug: vi.fn(),
}));
vi.mock("@/lib/services/institutions", () => ({
  listInstitutions: vi.fn(),
  getInstitutionBySlug: vi.fn(),
}));
vi.mock("@/lib/services/search", () => ({ search: vi.fn() }));

const { listCategories } = await import("@/lib/services/categories");
const { listLifeEvents, getLifeEventBySlug } =
  await import("@/lib/services/life-events");
const { listProcedures, getProcedureBySlug } =
  await import("@/lib/services/procedures");
const { listInstitutions, getInstitutionBySlug } =
  await import("@/lib/services/institutions");
const { search } = await import("@/lib/services/search");
const categoriesRoute = await import("../categories/route");
const lifeEventsRoute = await import("../life-events/route");
const lifeEventRoute = await import("../life-events/[slug]/route");
const proceduresRoute = await import("../procedures/route");
const procedureRoute = await import("../procedures/[slug]/route");
const institutionsRoute = await import("../institutions/route");
const institutionRoute = await import("../institutions/[slug]/route");
const searchRoute = await import("../search/route");

const request = (path: string) =>
  new NextRequest(`http://localhost/api/v1${path}`);
const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("GET /categories", () => {
  it("returns the category list", async () => {
    vi.mocked(listCategories).mockResolvedValue(categoryList);
    const response = await categoriesRoute.GET();
    expect(response.status).toBe(200);
    expect(categoryListResponseSchema.parse(await response.json())).toEqual(
      categoryList,
    );
  });

  it("hides unexpected errors behind a contract 500", async () => {
    vi.mocked(listCategories).mockRejectedValue(
      new Error("connection refused at 10.0.0.1"),
    );
    const response = await categoriesRoute.GET();
    expect(response.status).toBe(500);
    const body = errorSchema.parse(await response.json());
    expect(body.error).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("10.0.0.1");
  });
});

describe("GET /life-events", () => {
  it("passes validated filters and pagination defaults to the service", async () => {
    vi.mocked(listLifeEvents).mockResolvedValue(lifeEventList);
    const response = await lifeEventsRoute.GET(
      request("/life-events?category_slug=licna-dokumenta"),
    );
    expect(response.status).toBe(200);
    expect(listLifeEvents).toHaveBeenCalledWith({
      category_slug: "licna-dokumenta",
      limit: 20,
      offset: 0,
    });
    expect(lifeEventListResponseSchema.parse(await response.json())).toEqual(
      lifeEventList,
    );
  });

  it("rejects an out-of-range limit with 400", async () => {
    const response = await lifeEventsRoute.GET(
      request("/life-events?limit=101"),
    );
    expect(response.status).toBe(400);
    expect(errorSchema.parse(await response.json()).error).toBe("bad_request");
    expect(listLifeEvents).not.toHaveBeenCalled();
  });
});

describe("GET /life-events/{slug}", () => {
  it("returns the life event with procedures and dependencies", async () => {
    vi.mocked(getLifeEventBySlug).mockResolvedValue(lifeEventDetail);
    const response = await lifeEventRoute.GET(
      request("/life-events/selim-se-na-novu-adresu"),
      params({ slug: "selim-se-na-novu-adresu" }),
    );
    expect(response.status).toBe(200);
    expect(lifeEventDetailSchema.parse(await response.json())).toEqual(
      lifeEventDetail,
    );
  });

  it("returns 404 for an unknown or hidden life event", async () => {
    vi.mocked(getLifeEventBySlug).mockResolvedValue(null);
    const response = await lifeEventRoute.GET(
      request("/life-events/nacrt"),
      params({ slug: "nacrt" }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "not_found",
      message: "Nismo pronašli ono što tražiš.",
    });
  });

  it("returns 404 for a malformed slug without querying", async () => {
    const response = await lifeEventRoute.GET(
      request("/life-events/Ne%20Postoji"),
      params({ slug: "Ne Postoji" }),
    );
    expect(response.status).toBe(404);
    expect(getLifeEventBySlug).not.toHaveBeenCalled();
  });
});

describe("GET /procedures", () => {
  it("passes the institution filter and pagination to the service", async () => {
    vi.mocked(listProcedures).mockResolvedValue(procedureList);
    const response = await proceduresRoute.GET(
      request("/procedures?institution_slug=mup&offset=20"),
    );
    expect(response.status).toBe(200);
    expect(listProcedures).toHaveBeenCalledWith({
      institution_slug: "mup",
      limit: 20,
      offset: 20,
    });
    expect(procedureListResponseSchema.parse(await response.json())).toEqual(
      procedureList,
    );
  });

  it("rejects a negative offset with 400", async () => {
    const response = await proceduresRoute.GET(
      request("/procedures?offset=-1"),
    );
    expect(response.status).toBe(400);
    expect(listProcedures).not.toHaveBeenCalled();
  });
});

describe("GET /institutions", () => {
  it("returns published institutions with pagination", async () => {
    vi.mocked(listInstitutions).mockResolvedValue(institutionList);
    const response = await institutionsRoute.GET(request("/institutions"));
    expect(response.status).toBe(200);
    expect(listInstitutions).toHaveBeenCalledWith({ limit: 20, offset: 0 });
    expect(institutionListResponseSchema.parse(await response.json())).toEqual(
      institutionList,
    );
  });

  it("rejects a non-numeric limit with 400", async () => {
    const response = await institutionsRoute.GET(
      request("/institutions?limit=sve"),
    );
    expect(response.status).toBe(400);
  });
});

describe("GET /institutions/{slug}", () => {
  it("returns the institution with its procedures", async () => {
    vi.mocked(getInstitutionBySlug).mockResolvedValue(institutionDetail);
    const response = await institutionRoute.GET(
      request("/institutions/mup"),
      params({ slug: "mup" }),
    );
    expect(response.status).toBe(200);
    expect(institutionDetailSchema.parse(await response.json())).toEqual(
      institutionDetail,
    );
  });

  it("returns 404 for an unknown or unpublished institution", async () => {
    vi.mocked(getInstitutionBySlug).mockResolvedValue(null);
    const response = await institutionRoute.GET(
      request("/institutions/nacrt"),
      params({ slug: "nacrt" }),
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 for a malformed slug without querying", async () => {
    const response = await institutionRoute.GET(
      request("/institutions/MUP_"),
      params({ slug: "MUP_" }),
    );
    expect(response.status).toBe(404);
    expect(getInstitutionBySlug).not.toHaveBeenCalled();
  });
});

describe("GET /procedures/{slug}", () => {
  it("returns the procedure detail with money as a string", async () => {
    vi.mocked(getProcedureBySlug).mockResolvedValue(procedureDetail);
    const response = await procedureRoute.GET(
      request("/procedures/pasosh"),
      params({ slug: "pasosh" }),
    );
    expect(response.status).toBe(200);
    const body = procedureDetailSchema.parse(await response.json());
    expect(body.cost_amount).toBe("3000.00");
  });

  it("returns 404 when the procedure is not public (PR-05)", async () => {
    vi.mocked(getProcedureBySlug).mockResolvedValue(null);
    const response = await procedureRoute.GET(
      request("/procedures/nevezana"),
      params({ slug: "nevezana" }),
    );
    expect(response.status).toBe(404);
  });

  it("maps service errors through the contract", async () => {
    vi.mocked(getProcedureBySlug).mockRejectedValue(
      new ApiError(403, "forbidden", "Nemaš pristup ovoj akciji."),
    );
    const response = await procedureRoute.GET(
      request("/procedures/pasosh"),
      params({ slug: "pasosh" }),
    );
    expect(response.status).toBe(403);
  });
});

describe("GET /search", () => {
  it("returns grouped results", async () => {
    vi.mocked(search).mockResolvedValue(searchResult);
    const response = await searchRoute.GET(
      request("/search?q=putna%20isprava&limit=5"),
    );
    expect(response.status).toBe(200);
    expect(search).toHaveBeenCalledWith({ q: "putna isprava", limit: 5 });
    expect(searchResponseSchema.parse(await response.json())).toEqual(
      searchResult,
    );
  });

  it("asks for at least 2 characters (03 BadRequest example)", async () => {
    const response = await searchRoute.GET(request("/search?q=a"));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "bad_request",
      message: "Unesi bar 2 karaktera za pretragu.",
    });
  });

  it("uses the generic message for other invalid parameters", async () => {
    const response = await searchRoute.GET(request("/search?q=pasos&limit=0"));
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Proveri parametre zahteva.");
  });
});
