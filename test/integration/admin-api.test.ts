import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  auditLogListResponseSchema,
  dependencySchema,
  errorSchema,
  institutionSchema,
  lifeEventDetailSchema,
  procedureDetailSchema,
  synonymListResponseSchema,
  validationErrorSchema,
} from "@/lib/services/schemas";

// Admin endpoints against the local Supabase stack with the test seed. The
// route handlers run with a real admin JWT, so RLS, the write guard and the
// audit triggers do the enforcement (ADR 0004). Each run creates its own
// users and slugs, so it can be repeated without a database reset, and it
// publishes nothing, so the public integration tests keep their counts.

// Revalidation needs a Next.js request scope; it is covered by unit tests.
vi.mock("@/lib/cache/revalidate", () => ({ revalidateTags: vi.fn() }));

const lifeEventsRoute = await import("@/app/api/v1/admin/life-events/route");
const lifeEventRoute =
  await import("@/app/api/v1/admin/life-events/[id]/route");
const lifeEventProceduresRoute =
  await import("@/app/api/v1/admin/life-events/[id]/procedures/route");
const dependenciesRoute =
  await import("@/app/api/v1/admin/life-events/[id]/dependencies/route");
const dependencyRoute =
  await import("@/app/api/v1/admin/life-events/[id]/dependencies/[procedure_id]/[depends_on_id]/route");
const proceduresRoute = await import("@/app/api/v1/admin/procedures/route");
const procedureRoute = await import("@/app/api/v1/admin/procedures/[id]/route");
const institutionsRoute = await import("@/app/api/v1/admin/institutions/route");
const synonymsRoute = await import("@/app/api/v1/admin/synonyms/route");
const auditLogRoute = await import("@/app/api/v1/admin/audit-log/route");

const run = Date.now().toString(36);
const MUP = "20000000-0000-4000-8000-000000000001";
const CATEGORY = "10000000-0000-4000-8000-000000000002";
// Two published seed procedures, linked into a draft event below.
const PRIJAVA = "40000000-0000-4000-8000-000000000001";
const LICNA_KARTA = "40000000-0000-4000-8000-000000000002";

let adminToken = "";
let userToken = "";
let adminId = "";

async function signedInUser(role: string | undefined) {
  const url = process.env.SUPABASE_URL!;
  const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `${role ?? "user"}-${run}@example.test`;
  const password = `test-${run}-password`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: role === undefined ? {} : { role },
  });
  if (error) throw error;
  const anon = createClient(url, process.env.SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: session, error: signInError } =
    await anon.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, token: session.session.access_token };
}

beforeAll(async () => {
  const admin = await signedInUser("admin");
  adminToken = admin.token;
  adminId = admin.id;
  userToken = (await signedInUser(undefined)).token;
});

function call(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
) {
  const token = options.token === undefined ? adminToken : options.token;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  return new NextRequest(`http://localhost/api/v1/admin${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

const params = <T extends Record<string, string>>(value: T) => ({
  params: Promise.resolve(value),
});

const procedureBody = (slug: string, stepTitles: string[]) => ({
  title: `[TEST] Procedura ${slug}`,
  slug,
  cost_type: "fixed",
  cost_amount: "1250.00",
  status: "draft",
  steps: stepTitles.map((title, index) => ({
    title,
    description: "Opis koraka",
    sort_order: index + 1,
  })),
  documents: [{ name: "Lična karta", is_required: true, sort_order: 1 }],
  institution_ids: [MUP],
  institution_notes: { [MUP]: "Lično u stanici." },
});

async function auditEntries(entityId: string, entityType?: string) {
  const type = entityType === undefined ? "" : `&entity_type=${entityType}`;
  const response = await auditLogRoute.GET(
    call(`/audit-log?entity_id=${entityId}${type}&limit=100`),
  );
  const body = auditLogListResponseSchema.parse(await response.json());
  return body.data;
}

describe("admin authorization", () => {
  it("answers an invalid token with 401", async () => {
    const response = await lifeEventsRoute.GET(
      call("/life-events", { token: "not-a-jwt" }),
    );
    expect(response.status).toBe(401);
    expect(errorSchema.parse(await response.json()).error).toBe("unauthorized");
  });

  it("answers a signed-in user without the admin claim with 403", async () => {
    const read = await lifeEventsRoute.GET(
      call("/life-events", { token: userToken }),
    );
    expect(read.status).toBe(403);
    const write = await institutionsRoute.POST(
      call("/institutions", {
        method: "POST",
        token: userToken,
        body: { name: "X", slug: `x-${run}`, kind: "other", status: "draft" },
      }),
    );
    expect(write.status).toBe(403);
  });

  it("lets the admin read drafts", async () => {
    const response = await lifeEventsRoute.GET(
      call("/life-events?status=draft"),
    );
    expect(response.status).toBe(200);
  });
});

describe("procedure lifecycle with audit rows", () => {
  let procedureId = "";

  it("creates a procedure with its lists in one call", async () => {
    const response = await proceduresRoute.POST(
      call("/procedures", {
        method: "POST",
        body: procedureBody(`proc-${run}`, ["Prvi", "Drugi"]),
      }),
    );
    expect(response.status).toBe(201);
    const body = procedureDetailSchema.parse(await response.json());
    procedureId = body.id;
    expect(body.cost_amount).toBe("1250.00");
    expect(body.steps.map((s) => s.title)).toEqual(["Prvi", "Drugi"]);
    expect(body.institutions[0].note).toBe("Lično u stanici.");
    expect(body.status).toBe("draft");
  });

  it("replaces the step list and deletes the step left out", async () => {
    const response = await procedureRoute.PUT(
      call(`/procedures/${procedureId}`, {
        method: "PUT",
        body: procedureBody(`proc-${run}`, ["Prvi izmenjen"]),
      }),
      params({ id: procedureId }),
    );
    expect(response.status).toBe(200);
    const body = procedureDetailSchema.parse(await response.json());
    expect(body.steps.map((s) => s.title)).toEqual(["Prvi izmenjen"]);
  });

  it("archives the procedure", async () => {
    const response = await procedureRoute.PATCH(
      call(`/procedures/${procedureId}`, {
        method: "PATCH",
        body: { status: "archived" },
      }),
      params({ id: procedureId }),
    );
    expect(response.status).toBe(200);
    expect(procedureDetailSchema.parse(await response.json()).status).toBe(
      "archived",
    );
  });

  it("recorded create and archive with the admin's id", async () => {
    const entries = await auditEntries(procedureId, "procedures");
    expect(entries.map((e) => e.action).sort()).toEqual(["archive", "create"]);
    expect(new Set(entries.map((e) => e.changed_by))).toEqual(
      new Set([adminId]),
    );
  });

  it("rejects a procedure without steps or institutions with 422 details", async () => {
    const response = await proceduresRoute.POST(
      call("/procedures", {
        method: "POST",
        body: { ...procedureBody(`bad-${run}`, []), institution_ids: [] },
      }),
    );
    expect(response.status).toBe(422);
    const body = validationErrorSchema.parse(await response.json());
    expect(body.details.map((d) => d.field)).toEqual(
      expect.arrayContaining(["steps", "institution_ids"]),
    );
  });

  it("answers a taken slug with 409", async () => {
    const response = await proceduresRoute.POST(
      call("/procedures", {
        method: "POST",
        body: procedureBody("pasosh", ["Prvi"]),
      }),
    );
    expect(response.status).toBe(409);
  });
});

describe("life event, procedure order and dependencies", () => {
  let eventId = "";

  it("creates a draft life event and refuses a published one", async () => {
    const event = {
      title: `[TEST] Događaj ${run}`,
      slug: `dogadjaj-${run}`,
      category_id: CATEGORY,
      status: "draft",
    };
    const refused = await lifeEventsRoute.POST(
      call("/life-events", {
        method: "POST",
        body: { ...event, status: "published" },
      }),
    );
    expect(refused.status).toBe(422);

    const response = await lifeEventsRoute.POST(
      call("/life-events", { method: "POST", body: event }),
    );
    expect(response.status).toBe(201);
    const body = lifeEventDetailSchema.parse(await response.json());
    eventId = body.id;
    expect(body.procedures).toEqual([]);
  });

  it("sets the procedures of the event in order", async () => {
    const response = await lifeEventProceduresRoute.PUT(
      call(`/life-events/${eventId}/procedures`, {
        method: "PUT",
        body: {
          procedures: [
            { procedure_id: PRIJAVA, sort_order: 1 },
            { procedure_id: LICNA_KARTA, sort_order: 2 },
          ],
        },
      }),
      params({ id: eventId }),
    );
    expect(response.status).toBe(200);
    const body = lifeEventDetailSchema.parse(await response.json());
    expect(body.procedures.map((p) => p.procedure_id)).toEqual([
      PRIJAVA,
      LICNA_KARTA,
    ]);
  });

  it("adds a dependency and rejects the reverse one as a cycle (409)", async () => {
    const added = await dependenciesRoute.POST(
      call(`/life-events/${eventId}/dependencies`, {
        method: "POST",
        body: { procedure_id: LICNA_KARTA, depends_on_id: PRIJAVA },
      }),
      params({ id: eventId }),
    );
    expect(added.status).toBe(201);
    dependencySchema.parse(await added.json());

    const cycle = await dependenciesRoute.POST(
      call(`/life-events/${eventId}/dependencies`, {
        method: "POST",
        body: { procedure_id: PRIJAVA, depends_on_id: LICNA_KARTA },
      }),
      params({ id: eventId }),
    );
    expect(cycle.status).toBe(409);
    expect(await cycle.json()).toEqual({
      error: "circular_dependency",
      message: "Ova zavisnost bi napravila krug između procedura.",
    });

    const duplicate = await dependenciesRoute.POST(
      call(`/life-events/${eventId}/dependencies`, {
        method: "POST",
        body: { procedure_id: LICNA_KARTA, depends_on_id: PRIJAVA },
      }),
      params({ id: eventId }),
    );
    expect(duplicate.status).toBe(409);
    expect((await duplicate.json()).message).toBe("Ova zavisnost već postoji.");
  });

  it("rejects a dependency on a procedure outside the event with 422", async () => {
    const response = await dependenciesRoute.POST(
      call(`/life-events/${eventId}/dependencies`, {
        method: "POST",
        body: {
          procedure_id: PRIJAVA,
          depends_on_id: "40000000-0000-4000-8000-000000000005",
        },
      }),
      params({ id: eventId }),
    );
    expect(response.status).toBe(422);
  });

  it("removes the dependency by path, then 404 for a second delete", async () => {
    const path = {
      id: eventId,
      procedure_id: LICNA_KARTA,
      depends_on_id: PRIJAVA,
    };
    const url = `/life-events/${eventId}/dependencies/${LICNA_KARTA}/${PRIJAVA}`;
    const first = await dependencyRoute.DELETE(
      call(url, { method: "DELETE" }),
      params(path),
    );
    expect(first.status).toBe(204);
    const second = await dependencyRoute.DELETE(
      call(url, { method: "DELETE" }),
      params(path),
    );
    expect(second.status).toBe(404);
  });

  it("archives the event and audits it under the admin", async () => {
    const response = await lifeEventRoute.PATCH(
      call(`/life-events/${eventId}`, {
        method: "PATCH",
        body: { status: "archived" },
      }),
      params({ id: eventId }),
    );
    expect(response.status).toBe(200);
    const entries = await auditEntries(eventId);
    const actions = entries.map((e) => `${e.entity_type}:${e.action}`);
    expect(actions).toEqual(
      expect.arrayContaining([
        "life_events:create",
        "life_events:archive",
        "life_event_procedures:create",
        "procedure_dependencies:create",
        "procedure_dependencies:delete",
      ]),
    );
    expect(entries.every((e) => e.changed_by === adminId)).toBe(true);
  });
});

describe("institutions and synonyms", () => {
  it("creates a draft institution", async () => {
    const response = await institutionsRoute.POST(
      call("/institutions", {
        method: "POST",
        body: {
          name: `[TEST] Banka ${run}`,
          slug: `banka-${run}`,
          kind: "bank",
          website: "https://banka.example.test",
          status: "draft",
        },
      }),
    );
    expect(response.status).toBe(201);
    const body = institutionSchema.parse(await response.json());
    expect(body).toMatchObject({ kind: "bank", email: null });
  });

  it("finds synonyms by text, with LIKE wildcards taken literally", async () => {
    const term = `kartica ${run}`;
    const created = await synonymsRoute.POST(
      call("/synonyms", {
        method: "POST",
        body: { term, maps_to: "lična karta" },
      }),
    );
    expect(created.status).toBe(201);

    const found = synonymListResponseSchema.parse(
      await (
        await synonymsRoute.GET(
          call(`/synonyms?q=${encodeURIComponent(`ica ${run}`)}`),
        )
      ).json(),
    );
    expect(found.data.map((s) => s.term)).toEqual([term]);

    const wildcard = synonymListResponseSchema.parse(
      await (
        await synonymsRoute.GET(
          call(`/synonyms?q=${encodeURIComponent("%,(")}`),
        )
      ).json(),
    );
    expect(wildcard.data).toEqual([]);
  });
});
