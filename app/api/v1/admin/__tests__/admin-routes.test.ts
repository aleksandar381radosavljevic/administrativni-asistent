import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import {
  validationErrorSchema,
  type ProcedureDetail,
} from "@/lib/services/schemas";
import {
  adminInstitution,
  aiQueryList,
  aiQueryStats,
  auditLog,
  category,
  dependency,
  institutionList,
  lifeEventDetail,
  lifeEventList,
  procedureDetail,
  procedureList,
  synonym,
} from "@/test/fixtures";

// Every /api/v1/admin/** handler with mocked auth and services: 401/403 from
// requireAdmin, 400/422 from request validation, and the happy path with the
// exact service arguments and the cache tags each write invalidates.

vi.mock("@/lib/auth/admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/cache/revalidate", () => ({ revalidateTags: vi.fn() }));
vi.mock("@/lib/services/admin/categories", () => ({
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));
vi.mock("@/lib/services/admin/life-events", () => ({
  listAdminLifeEvents: vi.fn(),
  getAdminLifeEvent: vi.fn(),
  createLifeEvent: vi.fn(),
  updateLifeEvent: vi.fn(),
  setLifeEventStatus: vi.fn(),
  setLifeEventProcedures: vi.fn(),
}));
vi.mock("@/lib/services/admin/dependencies", () => ({
  listDependencies: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
}));
vi.mock("@/lib/services/admin/procedures", () => ({
  listAdminProcedures: vi.fn(),
  listStaleProcedures: vi.fn(),
  getAdminProcedure: vi.fn(),
  saveProcedure: vi.fn(),
  patchProcedure: vi.fn(),
}));
vi.mock("@/lib/services/admin/institutions", () => ({
  listAdminInstitutions: vi.fn(),
  getAdminInstitution: vi.fn(),
  createInstitution: vi.fn(),
  updateInstitution: vi.fn(),
  setInstitutionStatus: vi.fn(),
}));
vi.mock("@/lib/services/admin/synonyms", () => ({
  listSynonyms: vi.fn(),
  createSynonym: vi.fn(),
  updateSynonym: vi.fn(),
  deleteSynonym: vi.fn(),
}));
vi.mock("@/lib/services/admin/ai-queries", () => ({
  listAiQueries: vi.fn(),
  aiQueryStats: vi.fn(),
}));
vi.mock("@/lib/services/admin/audit-log", () => ({ listAuditLog: vi.fn() }));

const { requireAdmin } = await import("@/lib/auth/admin");
const { revalidateTags } = await import("@/lib/cache/revalidate");
const categories = await import("@/lib/services/admin/categories");
const lifeEvents = await import("@/lib/services/admin/life-events");
const dependencies = await import("@/lib/services/admin/dependencies");
const procedures = await import("@/lib/services/admin/procedures");
const institutions = await import("@/lib/services/admin/institutions");
const synonyms = await import("@/lib/services/admin/synonyms");
const aiQueries = await import("@/lib/services/admin/ai-queries");
const auditLogService = await import("@/lib/services/admin/audit-log");

const categoriesRoute = await import("../categories/route");
const categoryRoute = await import("../categories/[id]/route");
const lifeEventsRoute = await import("../life-events/route");
const lifeEventRoute = await import("../life-events/[id]/route");
const lifeEventProceduresRoute =
  await import("../life-events/[id]/procedures/route");
const dependenciesRoute =
  await import("../life-events/[id]/dependencies/route");
const dependencyRoute =
  await import("../life-events/[id]/dependencies/[procedure_id]/[depends_on_id]/route");
const proceduresRoute = await import("../procedures/route");
const procedureRoute = await import("../procedures/[id]/route");
const institutionsRoute = await import("../institutions/route");
const institutionRoute = await import("../institutions/[id]/route");
const synonymsRoute = await import("../synonyms/route");
const synonymRoute = await import("../synonyms/[id]/route");
const aiQueriesRoute = await import("../ai-queries/route");
const aiQueryStatsRoute = await import("../ai-queries/stats/route");
const staleRoute = await import("../stale-procedures/route");
const auditLogRoute = await import("../audit-log/route");

const client = { fake: "admin client" };
const ID = "30000000-0000-4000-8000-000000000004";
const P1 = "40000000-0000-4000-8000-000000000001";
const P2 = "40000000-0000-4000-8000-000000000002";
const TAGS = ["catalog", `life-event:${ID}`];

type Handler = (
  request: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

function request(path: string, method = "GET", body?: string) {
  return new NextRequest(`http://localhost/api/v1/admin${path}`, {
    method,
    body,
  });
}

function invoke(
  handler: unknown,
  path: string,
  options: {
    method?: string;
    body?: unknown;
    rawBody?: string;
    params?: Record<string, string>;
  } = {},
) {
  const body =
    options.rawBody ??
    (options.body === undefined ? undefined : JSON.stringify(options.body));
  return (handler as Handler)(request(path, options.method, body), {
    params: Promise.resolve(options.params ?? {}),
  });
}

const write = <T>(body: T) => ({ body, tags: TAGS });

const validProcedure = {
  title: "Pasoš",
  slug: "pasos",
  cost_type: "fixed",
  cost_amount: "3000.00",
  status: "draft",
  steps: [{ title: "Zakaži", description: "Opis", sort_order: 1 }],
  institution_ids: ["20000000-0000-4000-8000-000000000001"],
};

const validLifeEvent = {
  title: "Selim se",
  slug: "selim-se",
  category_id: "10000000-0000-4000-8000-000000000002",
  status: "draft",
};

const validInstitution = {
  name: "MUP",
  slug: "mup",
  kind: "government",
  status: "draft",
};

// One entry per handler: how to call it with valid input.
const routes: {
  name: string;
  handler: unknown;
  path: string;
  method: string;
  params?: Record<string, string>;
  body?: unknown;
  service: unknown;
}[] = [
  {
    name: "POST /categories",
    handler: categoriesRoute.POST,
    path: "/categories",
    method: "POST",
    body: { name: "Porodica", slug: "porodica" },
    service: categories.createCategory,
  },
  {
    name: "PUT /categories/{id}",
    handler: categoryRoute.PUT,
    path: `/categories/${ID}`,
    method: "PUT",
    params: { id: ID },
    body: { name: "Porodica", slug: "porodica" },
    service: categories.updateCategory,
  },
  {
    name: "GET /life-events",
    handler: lifeEventsRoute.GET,
    path: "/life-events",
    method: "GET",
    service: lifeEvents.listAdminLifeEvents,
  },
  {
    name: "POST /life-events",
    handler: lifeEventsRoute.POST,
    path: "/life-events",
    method: "POST",
    body: validLifeEvent,
    service: lifeEvents.createLifeEvent,
  },
  {
    name: "GET /life-events/{id}",
    handler: lifeEventRoute.GET,
    path: `/life-events/${ID}`,
    method: "GET",
    params: { id: ID },
    service: lifeEvents.getAdminLifeEvent,
  },
  {
    name: "PUT /life-events/{id}",
    handler: lifeEventRoute.PUT,
    path: `/life-events/${ID}`,
    method: "PUT",
    params: { id: ID },
    body: validLifeEvent,
    service: lifeEvents.updateLifeEvent,
  },
  {
    name: "PATCH /life-events/{id}",
    handler: lifeEventRoute.PATCH,
    path: `/life-events/${ID}`,
    method: "PATCH",
    params: { id: ID },
    body: { status: "archived" },
    service: lifeEvents.setLifeEventStatus,
  },
  {
    name: "PUT /life-events/{id}/procedures",
    handler: lifeEventProceduresRoute.PUT,
    path: `/life-events/${ID}/procedures`,
    method: "PUT",
    params: { id: ID },
    body: { procedures: [{ procedure_id: P1, sort_order: 1 }] },
    service: lifeEvents.setLifeEventProcedures,
  },
  {
    name: "GET /life-events/{id}/dependencies",
    handler: dependenciesRoute.GET,
    path: `/life-events/${ID}/dependencies`,
    method: "GET",
    params: { id: ID },
    service: dependencies.listDependencies,
  },
  {
    name: "POST /life-events/{id}/dependencies",
    handler: dependenciesRoute.POST,
    path: `/life-events/${ID}/dependencies`,
    method: "POST",
    params: { id: ID },
    body: { procedure_id: P2, depends_on_id: P1 },
    service: dependencies.addDependency,
  },
  {
    name: "DELETE /life-events/{id}/dependencies/{procedure_id}/{depends_on_id}",
    handler: dependencyRoute.DELETE,
    path: `/life-events/${ID}/dependencies/${P2}/${P1}`,
    method: "DELETE",
    params: { id: ID, procedure_id: P2, depends_on_id: P1 },
    service: dependencies.removeDependency,
  },
  {
    name: "GET /procedures",
    handler: proceduresRoute.GET,
    path: "/procedures",
    method: "GET",
    service: procedures.listAdminProcedures,
  },
  {
    name: "POST /procedures",
    handler: proceduresRoute.POST,
    path: "/procedures",
    method: "POST",
    body: validProcedure,
    service: procedures.saveProcedure,
  },
  {
    name: "GET /procedures/{id}",
    handler: procedureRoute.GET,
    path: `/procedures/${P1}`,
    method: "GET",
    params: { id: P1 },
    service: procedures.getAdminProcedure,
  },
  {
    name: "PUT /procedures/{id}",
    handler: procedureRoute.PUT,
    path: `/procedures/${P1}`,
    method: "PUT",
    params: { id: P1 },
    body: validProcedure,
    service: procedures.saveProcedure,
  },
  {
    name: "PATCH /procedures/{id}",
    handler: procedureRoute.PATCH,
    path: `/procedures/${P1}`,
    method: "PATCH",
    params: { id: P1 },
    body: { last_verified_at: "2026-10-07T08:00:00Z" },
    service: procedures.patchProcedure,
  },
  {
    name: "GET /institutions",
    handler: institutionsRoute.GET,
    path: "/institutions",
    method: "GET",
    service: institutions.listAdminInstitutions,
  },
  {
    name: "POST /institutions",
    handler: institutionsRoute.POST,
    path: "/institutions",
    method: "POST",
    body: validInstitution,
    service: institutions.createInstitution,
  },
  {
    name: "GET /institutions/{id}",
    handler: institutionRoute.GET,
    path: `/institutions/${ID}`,
    method: "GET",
    params: { id: ID },
    service: institutions.getAdminInstitution,
  },
  {
    name: "PUT /institutions/{id}",
    handler: institutionRoute.PUT,
    path: `/institutions/${ID}`,
    method: "PUT",
    params: { id: ID },
    body: validInstitution,
    service: institutions.updateInstitution,
  },
  {
    name: "PATCH /institutions/{id}",
    handler: institutionRoute.PATCH,
    path: `/institutions/${ID}`,
    method: "PATCH",
    params: { id: ID },
    body: { status: "published" },
    service: institutions.setInstitutionStatus,
  },
  {
    name: "GET /synonyms",
    handler: synonymsRoute.GET,
    path: "/synonyms",
    method: "GET",
    service: synonyms.listSynonyms,
  },
  {
    name: "POST /synonyms",
    handler: synonymsRoute.POST,
    path: "/synonyms",
    method: "POST",
    body: { term: "karton", maps_to: "izvod" },
    service: synonyms.createSynonym,
  },
  {
    name: "PUT /synonyms/{id}",
    handler: synonymRoute.PUT,
    path: `/synonyms/${ID}`,
    method: "PUT",
    params: { id: ID },
    body: { term: "karton", maps_to: "izvod" },
    service: synonyms.updateSynonym,
  },
  {
    name: "DELETE /synonyms/{id}",
    handler: synonymRoute.DELETE,
    path: `/synonyms/${ID}`,
    method: "DELETE",
    params: { id: ID },
    service: synonyms.deleteSynonym,
  },
  {
    name: "GET /ai-queries",
    handler: aiQueriesRoute.GET,
    path: "/ai-queries",
    method: "GET",
    service: aiQueries.listAiQueries,
  },
  {
    name: "GET /ai-queries/stats",
    handler: aiQueryStatsRoute.GET,
    path: "/ai-queries/stats",
    method: "GET",
    service: aiQueries.aiQueryStats,
  },
  {
    name: "GET /stale-procedures",
    handler: staleRoute.GET,
    path: "/stale-procedures",
    method: "GET",
    service: procedures.listStaleProcedures,
  },
  {
    name: "GET /audit-log",
    handler: auditLogRoute.GET,
    path: "/audit-log",
    method: "GET",
    service: auditLogService.listAuditLog,
  },
];

const call = (route: (typeof routes)[number], body = route.body) =>
  invoke(route.handler, route.path, {
    method: route.method,
    body,
    params: route.params,
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(requireAdmin).mockResolvedValue({
    client: client as never,
    userId: "aaaaaaaa-0000-4000-8000-000000000001",
  });
});

describe("every admin route checks the caller first", () => {
  it.each(routes.map((route) => [route.name, route] as const))(
    "%s: 401 without a valid session, 403 for a non-admin",
    async (_name, route) => {
      vi.mocked(requireAdmin).mockRejectedValueOnce(ApiError.unauthorized());
      const unauthorized = await call(route);
      expect(unauthorized.status).toBe(401);
      expect(await unauthorized.json()).toEqual({
        error: "unauthorized",
        message: "Prijavi se da nastaviš.",
      });

      vi.mocked(requireAdmin).mockRejectedValueOnce(ApiError.forbidden());
      const forbidden = await call(route);
      expect(forbidden.status).toBe(403);
      expect((await forbidden.json()).error).toBe("forbidden");

      expect(route.service).not.toHaveBeenCalled();
      expect(revalidateTags).not.toHaveBeenCalled();
    },
  );
});

describe("request validation", () => {
  const withBody = routes.filter((route) => route.body !== undefined);

  it.each(withBody.map((route) => [route.name, route] as const))(
    "%s: 400 for a body that is not JSON, 422 for an empty object",
    async (_name, route) => {
      const malformed = await invoke(route.handler, route.path, {
        method: route.method,
        rawBody: "{",
        params: route.params,
      });
      expect(malformed.status).toBe(400);

      const invalid = await call(route, {});
      expect(invalid.status).toBe(422);
      const body = validationErrorSchema.parse(await invalid.json());
      expect(body.details.length).toBeGreaterThan(0);
      expect(route.service).not.toHaveBeenCalled();
    },
  );

  const withId = routes.filter((route) => route.params?.id !== undefined);

  it.each(withId.map((route) => [route.name, route] as const))(
    "%s: 404 for a malformed id",
    async (_name, route) => {
      const response = await invoke(route.handler, route.path, {
        method: route.method,
        body: route.body,
        params: { ...route.params, id: "nije-uuid" },
      });
      expect(response.status).toBe(404);
      expect(route.service).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["GET /life-events", lifeEventsRoute.GET, "/life-events?status=obrisan"],
    ["GET /procedures", proceduresRoute.GET, "/procedures?limit=500"],
    ["GET /institutions", institutionsRoute.GET, "/institutions?offset=-1"],
    ["GET /synonyms", synonymsRoute.GET, `/synonyms?q=${"a".repeat(201)}`],
    ["GET /ai-queries", aiQueriesRoute.GET, "/ai-queries?was_answered=da"],
    [
      "GET /ai-queries/stats",
      aiQueryStatsRoute.GET,
      "/ai-queries/stats?from=juce",
    ],
    ["GET /stale-procedures", staleRoute.GET, "/stale-procedures?limit=0"],
    ["GET /audit-log", auditLogRoute.GET, "/audit-log?entity_id=123"],
  ])("%s: 400 for an invalid query parameter", async (_name, handler, path) => {
    const response = await invoke(handler, path);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("bad_request");
  });

  it("refuses to create a published life event (PR-04)", async () => {
    const response = await invoke(lifeEventsRoute.POST, "/life-events", {
      method: "POST",
      body: { ...validLifeEvent, status: "published" },
    });
    expect(response.status).toBe(422);
    expect((await response.json()).details).toEqual([
      {
        field: "status",
        message: "Novi životni događaj može biti samo nacrt.",
      },
    ]);
  });

  it("checks the procedure rules from 03 (PR-01, PR-02, PR-03, cost)", async () => {
    const response = await invoke(proceduresRoute.POST, "/procedures", {
      method: "POST",
      body: {
        ...validProcedure,
        can_in_person: false,
        cost_type: "free",
        steps: [],
        institution_ids: [],
      },
    });
    expect(response.status).toBe(422);
    const { details } = validationErrorSchema.parse(await response.json());
    expect(details.map((d) => d.field).sort()).toEqual([
      "can_in_person",
      "cost_amount",
      "institution_ids",
      "steps",
    ]);
  });

  it("rejects duplicate positions and procedures in a life event's list", async () => {
    const response = await invoke(
      lifeEventProceduresRoute.PUT,
      `/life-events/${ID}/procedures`,
      {
        method: "PUT",
        params: { id: ID },
        body: {
          procedures: [
            { procedure_id: P1, sort_order: 1 },
            { procedure_id: P1, sort_order: 1 },
          ],
        },
      },
    );
    expect(response.status).toBe(422);
    expect((await response.json()).details).toHaveLength(2);
  });

  it("rejects a procedure that depends on itself", async () => {
    const response = await invoke(
      dependenciesRoute.POST,
      `/life-events/${ID}/dependencies`,
      {
        method: "POST",
        params: { id: ID },
        body: { procedure_id: P1, depends_on_id: P1 },
      },
    );
    expect(response.status).toBe(422);
  });

  it("rejects a non-http link and a note for an unlinked institution", async () => {
    const response = await invoke(proceduresRoute.POST, "/procedures", {
      method: "POST",
      body: {
        ...validProcedure,
        official_link: "javascript:alert(1)",
        institution_notes: { [P1]: "Nije povezana." },
      },
    });
    expect(response.status).toBe(422);
    expect(
      (await response.json()).details.map((d: { field: string }) => d.field),
    ).toEqual(["official_link", `institution_notes.${P1}`]);
  });

  it("requires at least one field in a procedure PATCH", async () => {
    const response = await invoke(procedureRoute.PATCH, `/procedures/${P1}`, {
      method: "PATCH",
      params: { id: P1 },
      body: {},
    });
    expect(response.status).toBe(422);
  });
});

describe("happy paths", () => {
  it("creates a category with 201 and invalidates its tags", async () => {
    vi.mocked(categories.createCategory).mockResolvedValue(write(category));
    const response = await invoke(categoriesRoute.POST, "/categories", {
      method: "POST",
      body: { name: "Porodica", slug: "porodica" },
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(category);
    expect(categories.createCategory).toHaveBeenCalledWith(client, {
      name: "Porodica",
      slug: "porodica",
      icon: null,
      sort_order: 0,
    });
    expect(revalidateTags).toHaveBeenCalledWith(TAGS);
  });

  it("updates a category", async () => {
    vi.mocked(categories.updateCategory).mockResolvedValue(write(category));
    const response = await invoke(categoryRoute.PUT, `/categories/${ID}`, {
      method: "PUT",
      params: { id: ID },
      body: { name: "Porodica", slug: "porodica", sort_order: 3 },
    });
    expect(response.status).toBe(200);
    expect(categories.updateCategory).toHaveBeenCalledWith(
      client,
      ID,
      expect.objectContaining({ sort_order: 3 }),
    );
  });

  it("lists life events with the status filter", async () => {
    vi.mocked(lifeEvents.listAdminLifeEvents).mockResolvedValue(lifeEventList);
    const response = await invoke(
      lifeEventsRoute.GET,
      "/life-events?status=draft&limit=5",
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(lifeEventList);
    expect(lifeEvents.listAdminLifeEvents).toHaveBeenCalledWith(client, {
      status: "draft",
      limit: 5,
      offset: 0,
    });
  });

  it("creates a draft life event with defaults for omitted fields", async () => {
    vi.mocked(lifeEvents.createLifeEvent).mockResolvedValue(
      write(lifeEventDetail),
    );
    const response = await invoke(lifeEventsRoute.POST, "/life-events", {
      method: "POST",
      body: validLifeEvent,
    });
    expect(response.status).toBe(201);
    expect(lifeEvents.createLifeEvent).toHaveBeenCalledWith(client, {
      ...validLifeEvent,
      description: null,
      icon: null,
      estimated_duration: null,
      sort_order: 0,
    });
    expect(revalidateTags).toHaveBeenCalledWith(TAGS);
  });

  it("returns a life event in any status, or 404", async () => {
    vi.mocked(lifeEvents.getAdminLifeEvent).mockResolvedValueOnce(
      lifeEventDetail,
    );
    const found = await invoke(lifeEventRoute.GET, `/life-events/${ID}`, {
      params: { id: ID.toUpperCase() },
    });
    expect(found.status).toBe(200);
    expect(lifeEvents.getAdminLifeEvent).toHaveBeenCalledWith(client, ID);

    vi.mocked(lifeEvents.getAdminLifeEvent).mockResolvedValueOnce(null);
    const missing = await invoke(lifeEventRoute.GET, `/life-events/${ID}`, {
      params: { id: ID },
    });
    expect(missing.status).toBe(404);
  });

  it("updates, changes the status of and reorders a life event", async () => {
    vi.mocked(lifeEvents.updateLifeEvent).mockResolvedValue(
      write(lifeEventDetail),
    );
    vi.mocked(lifeEvents.setLifeEventStatus).mockResolvedValue(
      write(lifeEventDetail),
    );
    vi.mocked(lifeEvents.setLifeEventProcedures).mockResolvedValue(
      write(lifeEventDetail),
    );
    const ctx = { params: { id: ID } };
    expect(
      (
        await invoke(lifeEventRoute.PUT, `/life-events/${ID}`, {
          ...ctx,
          method: "PUT",
          body: validLifeEvent,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await invoke(lifeEventRoute.PATCH, `/life-events/${ID}`, {
          ...ctx,
          method: "PATCH",
          body: { status: "archived" },
        })
      ).status,
    ).toBe(200);
    expect(lifeEvents.setLifeEventStatus).toHaveBeenCalledWith(client, ID, {
      status: "archived",
    });
    const reorder = {
      procedures: [
        { procedure_id: P2, sort_order: 1 },
        { procedure_id: P1, sort_order: 2 },
      ],
    };
    expect(
      (
        await invoke(
          lifeEventProceduresRoute.PUT,
          `/life-events/${ID}/procedures`,
          { ...ctx, method: "PUT", body: reorder },
        )
      ).status,
    ).toBe(200);
    expect(lifeEvents.setLifeEventProcedures).toHaveBeenCalledWith(
      client,
      ID,
      reorder,
    );
    expect(revalidateTags).toHaveBeenCalledTimes(3);
  });

  it("lists, adds and removes dependencies", async () => {
    vi.mocked(dependencies.listDependencies).mockResolvedValue({
      data: [dependency],
    });
    vi.mocked(dependencies.addDependency).mockResolvedValue(write(dependency));
    vi.mocked(dependencies.removeDependency).mockResolvedValue(write(null));
    const ctx = { params: { id: ID } };

    const list = await invoke(
      dependenciesRoute.GET,
      `/life-events/${ID}/dependencies`,
      ctx,
    );
    expect(await list.json()).toEqual({ data: [dependency] });

    const added = await invoke(
      dependenciesRoute.POST,
      `/life-events/${ID}/dependencies`,
      { ...ctx, method: "POST", body: { procedure_id: P2, depends_on_id: P1 } },
    );
    expect(added.status).toBe(201);
    expect(dependencies.addDependency).toHaveBeenCalledWith(client, ID, {
      procedure_id: P2,
      depends_on_id: P1,
    });

    const removed = await invoke(
      dependencyRoute.DELETE,
      `/life-events/${ID}/dependencies/${P2}/${P1}`,
      {
        method: "DELETE",
        params: { id: ID, procedure_id: P2, depends_on_id: P1 },
      },
    );
    expect(removed.status).toBe(204);
    expect(await removed.text()).toBe("");
    expect(dependencies.removeDependency).toHaveBeenCalledWith(client, {
      life_event_id: ID,
      procedure_id: P2,
      depends_on_id: P1,
    });
  });

  it("passes a cycle rejected by the database through as 409", async () => {
    vi.mocked(dependencies.addDependency).mockRejectedValue(
      new ApiError(
        409,
        "circular_dependency",
        "Ova zavisnost bi napravila krug između procedura.",
      ),
    );
    const response = await invoke(
      dependenciesRoute.POST,
      `/life-events/${ID}/dependencies`,
      {
        method: "POST",
        params: { id: ID },
        body: { procedure_id: P1, depends_on_id: P2 },
      },
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("circular_dependency");
    expect(revalidateTags).not.toHaveBeenCalled();
  });

  it("creates and replaces a procedure with full lists and defaults", async () => {
    vi.mocked(procedures.saveProcedure).mockResolvedValue(
      write<ProcedureDetail>(procedureDetail),
    );
    const created = await invoke(proceduresRoute.POST, "/procedures", {
      method: "POST",
      body: validProcedure,
    });
    expect(created.status).toBe(201);
    expect(procedures.saveProcedure).toHaveBeenCalledWith(client, {
      ...validProcedure,
      description: null,
      can_online: false,
      can_in_person: true,
      can_by_mail: false,
      cost_description: null,
      processing_time: null,
      official_link: null,
      form_link: null,
      last_verified_at: null,
      steps: [{ ...validProcedure.steps[0], link_url: null, link_label: null }],
      documents: [],
      institution_notes: {},
    });

    const replaced = await invoke(procedureRoute.PUT, `/procedures/${P1}`, {
      method: "PUT",
      params: { id: P1 },
      body: validProcedure,
    });
    expect(replaced.status).toBe(200);
    expect(vi.mocked(procedures.saveProcedure).mock.calls[1][2]).toBe(P1);
  });

  it("reads, verifies and lists procedures", async () => {
    vi.mocked(procedures.getAdminProcedure).mockResolvedValue(procedureDetail);
    vi.mocked(procedures.patchProcedure).mockResolvedValue(
      write(procedureDetail),
    );
    vi.mocked(procedures.listAdminProcedures).mockResolvedValue(procedureList);
    vi.mocked(procedures.listStaleProcedures).mockResolvedValue(procedureList);

    const detail = await invoke(procedureRoute.GET, `/procedures/${P1}`, {
      params: { id: P1 },
    });
    expect(await detail.json()).toEqual(procedureDetail);

    const verified = await invoke(procedureRoute.PATCH, `/procedures/${P1}`, {
      method: "PATCH",
      params: { id: P1 },
      body: { last_verified_at: "2026-10-07T08:00:00Z" },
    });
    expect(verified.status).toBe(200);
    expect(procedures.patchProcedure).toHaveBeenCalledWith(client, P1, {
      last_verified_at: "2026-10-07T08:00:00Z",
    });

    await invoke(proceduresRoute.GET, "/procedures?status=archived");
    expect(procedures.listAdminProcedures).toHaveBeenCalledWith(client, {
      status: "archived",
      limit: 20,
      offset: 0,
    });
    const stale = await invoke(staleRoute.GET, "/stale-procedures?offset=20");
    expect(await stale.json()).toEqual(procedureList);
    expect(procedures.listStaleProcedures).toHaveBeenCalledWith(client, {
      limit: 20,
      offset: 20,
    });
  });

  it("creates, reads, updates and archives institutions", async () => {
    vi.mocked(institutions.listAdminInstitutions).mockResolvedValue(
      institutionList,
    );
    vi.mocked(institutions.getAdminInstitution).mockResolvedValue(
      adminInstitution,
    );
    vi.mocked(institutions.createInstitution).mockResolvedValue(
      write(adminInstitution),
    );
    vi.mocked(institutions.updateInstitution).mockResolvedValue(
      write(adminInstitution),
    );
    vi.mocked(institutions.setInstitutionStatus).mockResolvedValue(
      write(adminInstitution),
    );

    expect(
      await (await invoke(institutionsRoute.GET, "/institutions")).json(),
    ).toEqual(institutionList);
    const created = await invoke(institutionsRoute.POST, "/institutions", {
      method: "POST",
      body: { ...validInstitution, email: "info@mup.gov.rs" },
    });
    expect(created.status).toBe(201);
    expect(institutions.createInstitution).toHaveBeenCalledWith(client, {
      ...validInstitution,
      email: "info@mup.gov.rs",
      description: null,
      address: null,
      website: null,
      phone: null,
      working_hours: null,
    });
    const ctx = { params: { id: ID } };
    expect(
      await (
        await invoke(institutionRoute.GET, `/institutions/${ID}`, ctx)
      ).json(),
    ).toEqual(adminInstitution);
    expect(
      (
        await invoke(institutionRoute.PUT, `/institutions/${ID}`, {
          ...ctx,
          method: "PUT",
          body: validInstitution,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await invoke(institutionRoute.PATCH, `/institutions/${ID}`, {
          ...ctx,
          method: "PATCH",
          body: { status: "archived" },
        })
      ).status,
    ).toBe(200);
    expect(institutions.setInstitutionStatus).toHaveBeenCalledWith(client, ID, {
      status: "archived",
    });

    vi.mocked(institutions.getAdminInstitution).mockResolvedValueOnce(null);
    expect(
      (await invoke(institutionRoute.GET, `/institutions/${ID}`, ctx)).status,
    ).toBe(404);
  });

  it("lists, creates, updates and deletes synonyms", async () => {
    const list = {
      data: [synonym],
      pagination: { total: 1, limit: 20, offset: 0 },
    };
    vi.mocked(synonyms.listSynonyms).mockResolvedValue(list);
    vi.mocked(synonyms.createSynonym).mockResolvedValue(write(synonym));
    vi.mocked(synonyms.updateSynonym).mockResolvedValue(write(synonym));
    vi.mocked(synonyms.deleteSynonym).mockResolvedValue(write(null));

    await invoke(synonymsRoute.GET, "/synonyms?q=%20putna%20");
    expect(synonyms.listSynonyms).toHaveBeenCalledWith(client, {
      q: "putna",
      limit: 20,
      offset: 0,
    });
    const created = await invoke(synonymsRoute.POST, "/synonyms", {
      method: "POST",
      body: { term: " putna isprava ", maps_to: "pasoš" },
    });
    expect(created.status).toBe(201);
    expect(synonyms.createSynonym).toHaveBeenCalledWith(client, {
      term: "putna isprava",
      maps_to: "pasoš",
    });
    expect(
      (
        await invoke(synonymRoute.PUT, `/synonyms/${ID}`, {
          method: "PUT",
          params: { id: ID },
          body: { term: "karton", maps_to: "izvod" },
        })
      ).status,
    ).toBe(200);
    const deleted = await invoke(synonymRoute.DELETE, `/synonyms/${ID}`, {
      method: "DELETE",
      params: { id: ID },
    });
    expect(deleted.status).toBe(204);
    expect(synonyms.deleteSynonym).toHaveBeenCalledWith(client, ID);
    expect(revalidateTags).toHaveBeenCalledTimes(3);
  });

  it("lists AI queries with filters and returns the stats", async () => {
    vi.mocked(aiQueries.listAiQueries).mockResolvedValue(aiQueryList);
    vi.mocked(aiQueries.aiQueryStats).mockResolvedValue(aiQueryStats);

    const list = await invoke(
      aiQueriesRoute.GET,
      "/ai-queries?was_answered=false&from=2026-10-01T00:00:00Z",
    );
    expect(await list.json()).toEqual(aiQueryList);
    expect(aiQueries.listAiQueries).toHaveBeenCalledWith(client, {
      was_answered: false,
      from: "2026-10-01T00:00:00Z",
      limit: 20,
      offset: 0,
    });

    const stats = await invoke(
      aiQueryStatsRoute.GET,
      "/ai-queries/stats?to=2026-10-08T00:00:00Z",
    );
    expect(await stats.json()).toEqual(aiQueryStats);
    expect(aiQueries.aiQueryStats).toHaveBeenCalledWith(client, {
      to: "2026-10-08T00:00:00Z",
    });
  });

  it("lists the audit log with its filters", async () => {
    vi.mocked(auditLogService.listAuditLog).mockResolvedValue(auditLog);
    const response = await invoke(
      auditLogRoute.GET,
      `/audit-log?entity_type=procedures&entity_id=${P1.toUpperCase()}`,
    );
    expect(await response.json()).toEqual(auditLog);
    expect(auditLogService.listAuditLog).toHaveBeenCalledWith(client, {
      entity_type: "procedures",
      entity_id: P1,
      limit: 20,
      offset: 0,
    });
  });
});
