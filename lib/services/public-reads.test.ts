import { beforeEach, describe, expect, it, vi } from "vitest";

// Vitest runs `use cache` functions as plain functions, so these tests check
// what each public read tells the cache (ADR 0017), not the caching itself.
vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
// A cached scope must not read request data; any attempt fails the test.
vi.mock("next/headers", () => {
  const forbidden = () => {
    throw new Error("public reads must not read cookies or headers");
  };
  return { cookies: forbidden, headers: forbidden, draftMode: forbidden };
});
vi.mock("@/lib/supabase/anon", () => ({ createAnonClient: vi.fn() }));

const { cacheLife, cacheTag } = await import("next/cache");
const { createAnonClient } = await import("@/lib/supabase/anon");
const { getCatalog } = await import("./catalog");
const { listCategories } = await import("./categories");
const { getInstitutionBySlug, listInstitutions } =
  await import("./institutions");
const { getLifeEventBySlug, listLifeEvents } = await import("./life-events");
const { getProcedureBySlug, listProcedures } = await import("./procedures");

const EVENT = "30000000-0000-4000-8000-000000000001";
const PROCEDURE = "40000000-0000-4000-8000-00000000000a";
const INSTITUTION = "20000000-0000-4000-8000-000000000001";

const procedureRow = {
  id: PROCEDURE,
  title: "Prijava prebivališta",
  slug: "prijava-prebivalista",
  description: null,
  can_online: false,
  can_in_person: true,
  can_by_mail: false,
  cost_type: "free",
  cost_amount: null,
  processing_time: null,
  status: "published",
  last_verified_at: "2026-09-01T00:00:00+00:00",
};

/** Rows each table returns; `null` stands for "no row with that slug". */
let rows: Record<string, unknown>;

/**
 * A stand-in for the Supabase query builder: every call chains, and awaiting
 * the query yields the rows set for its table.
 */
function fakeClient() {
  const query = (table: string) => {
    const builder: Record<string, unknown> = {
      then: (resolve: (value: unknown) => void) => {
        const data = rows[table];
        const count = Array.isArray(data) ? data.length : null;
        resolve({ data, error: null, count });
      },
    };
    for (const method of [
      "select",
      "order",
      "eq",
      "range",
      "maybeSingle",
      "overrideTypes",
    ]) {
      builder[method] = () => builder;
    }
    return builder;
  };
  return { from: query };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createAnonClient).mockImplementation(
    () => fakeClient() as unknown as ReturnType<typeof createAnonClient>,
  );
  rows = {
    categories: [],
    life_events: [],
    procedures: [],
    institutions: [],
    synonyms: [],
    procedure_dependencies: [],
  };
});

const page = { limit: 20, offset: 0 };
const tags = () => vi.mocked(cacheTag).mock.calls.flat();

describe("public reads", () => {
  it.each([
    ["listCategories", () => listCategories()],
    ["listLifeEvents", () => listLifeEvents(page)],
    ["listProcedures", () => listProcedures(page)],
    ["listInstitutions", () => listInstitutions(page)],
    ["getCatalog (AI)", () => getCatalog()],
  ])("%s is tagged with the catalog", async (_name, read) => {
    await read();
    expect(tags()).toEqual(["catalog"]);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
  });

  it("tags a found detail with its entity, so writes to it expire it", async () => {
    rows.procedures = {
      ...procedureRow,
      cost_description: null,
      official_link: null,
      form_link: null,
      steps: [],
      documents: [],
      procedure_institutions: [],
      life_event_procedures: [],
    };
    rows.life_events = {
      id: EVENT,
      title: "Selim se",
      description: null,
      slug: "selim-se",
      icon: null,
      estimated_duration: null,
      sort_order: 1,
      status: "published",
      category: {
        id: "10000000-0000-4000-8000-000000000002",
        name: "Preseljenje",
        slug: "preseljenje",
        icon: null,
        sort_order: 1,
      },
      life_event_procedures: [],
    };
    rows.institutions = {
      id: INSTITUTION,
      name: "MUP",
      slug: "mup",
      kind: "government",
      status: "published",
      description: null,
      website: null,
      phone: null,
      email: null,
      address: null,
      working_hours: null,
      procedure_institutions: [{ procedure: procedureRow }],
    };

    const procedure = await getProcedureBySlug("prijava-prebivalista");
    const event = await getLifeEventBySlug("selim-se");
    const institution = await getInstitutionBySlug("mup");

    expect(procedure?.id).toBe(PROCEDURE);
    expect(event?.id).toBe(EVENT);
    expect(institution?.procedures).toHaveLength(1);
    expect(tags()).toEqual([
      `procedure:${PROCEDURE}`,
      `life-event:${EVENT}`,
      `institution:${INSTITUTION}`,
    ]);
    expect(cacheLife).toHaveBeenCalledTimes(3);
  });

  it("tags a missing detail with the catalog, so publishing it shows up", async () => {
    rows.procedures = null;
    rows.life_events = null;
    rows.institutions = null;

    expect(await getProcedureBySlug("nema")).toBeNull();
    expect(await getLifeEventBySlug("nema")).toBeNull();
    expect(await getInstitutionBySlug("nema")).toBeNull();
    expect(tags()).toEqual(["catalog", "catalog", "catalog"]);
  });

  it("uses the cookie-less anon client and no request data", async () => {
    rows.procedures = null;
    await listCategories();
    await getCatalog();
    await getProcedureBySlug("nema");
    expect(
      vi.mocked(createAnonClient).mock.calls.every((c) => c.length === 0),
    ).toBe(true);
  });
});
