import { describe, expect, it } from "vitest";
import {
  toInstitutionDetail,
  toLifeEventDetail,
  toLifeEventSummary,
  toProcedureDetail,
  type LifeEventDetailRow,
  type ProcedureDetailRow,
} from "./mappers";
import {
  institutionDetailSchema,
  lifeEventDetailSchema,
  procedureDetailSchema,
} from "./schemas";
import { escapeLike, orderByIds } from "./search";

const now = new Date("2026-10-07T12:00:00Z");
const category = {
  id: "10000000-0000-4000-8000-000000000002",
  name: "Preseljenje",
  slug: "preseljenje",
  icon: null,
  sort_order: 1,
};
const institution = { name: "MUP", slug: "mup", kind: "government" as const };

const procedure = (
  id: string,
  title: string,
  lastVerifiedAt: string | null,
) => ({
  id,
  title,
  slug: title.toLowerCase(),
  can_online: false,
  can_in_person: true,
  can_by_mail: false,
  cost_type: "fixed" as const,
  cost_amount: "1500.00",
  processing_time: null,
  status: "published" as const,
  last_verified_at: lastVerifiedAt,
  procedure_institutions: [{ institution }],
});

const A = "40000000-0000-4000-8000-00000000000a";
const B = "40000000-0000-4000-8000-00000000000b";
const HIDDEN = "40000000-0000-4000-8000-00000000000c";
const EVENT = "30000000-0000-4000-8000-000000000001";

const eventRow: LifeEventDetailRow = {
  id: EVENT,
  title: "Selim se",
  description: null,
  slug: "selim-se",
  icon: "house",
  estimated_duration: null,
  sort_order: 1,
  status: "published",
  category,
  // Deliberately out of order: the mapper sorts by sort_order.
  life_event_procedures: [
    { sort_order: 2, procedure: procedure(B, "Kartica", null) },
    {
      sort_order: 1,
      procedure: procedure(A, "Prijava", "2026-09-01T00:00:00+00:00"),
    },
  ],
};

describe("toLifeEventDetail", () => {
  const detail = toLifeEventDetail(
    eventRow,
    [
      { life_event_id: EVENT, procedure_id: B, depends_on_id: A },
      { life_event_id: EVENT, procedure_id: B, depends_on_id: HIDDEN },
    ],
    now,
  );

  it("matches the contract", () => {
    expect(lifeEventDetailSchema.parse(detail)).toEqual(detail);
  });

  it("orders procedures by their position in the event", () => {
    expect(detail.procedures.map((p) => p.procedure_id)).toEqual([A, B]);
  });

  it("drops dependencies on procedures that are not public", () => {
    expect(detail.dependencies).toEqual([
      { life_event_id: EVENT, procedure_id: B, depends_on_id: A },
    ]);
    expect(detail.procedures[1].depends_on).toEqual([A]);
  });

  it("computes is_stale and counts only listed procedures", () => {
    expect(detail.procedures.map((p) => p.is_stale)).toEqual([false, true]);
    expect(detail.procedure_count).toBe(2);
  });
});

describe("toLifeEventSummary", () => {
  it("counts the visible procedure links", () => {
    const summary = toLifeEventSummary({
      ...eventRow,
      life_event_procedures: [{ procedure_id: A }],
    });
    expect(summary.procedure_count).toBe(1);
    expect(summary).not.toHaveProperty("life_event_procedures");
  });
});

describe("toProcedureDetail", () => {
  const row: ProcedureDetailRow = {
    ...procedure(A, "Prijava", null),
    description: null,
    cost_description: null,
    official_link: null,
    form_link: null,
    steps: [
      {
        id: "50000000-0000-4000-8000-000000000002",
        sort_order: 2,
        title: "Dva",
        description: "",
        link_url: null,
        link_label: null,
      },
      {
        id: "50000000-0000-4000-8000-000000000001",
        sort_order: 1,
        title: "Jedan",
        description: "",
        link_url: null,
        link_label: null,
      },
    ],
    documents: [],
    procedure_institutions: [
      {
        note: "Lično u stanici.",
        institution: {
          id: "20000000-0000-4000-8000-000000000001",
          ...institution,
          address: null,
          website: null,
          phone: null,
          email: null,
          working_hours: null,
          status: "published",
        },
      },
    ],
    life_event_procedures: [
      { life_event: { slug: "selim-se", title: "Selim se", sort_order: 1 } },
    ],
  };
  const detail = toProcedureDetail(row, now);

  it("matches the contract and keeps money as a decimal string", () => {
    expect(procedureDetailSchema.parse(detail)).toEqual(detail);
    expect(detail.cost_amount).toBe("1500.00");
  });

  it("orders steps and flattens the institution note", () => {
    expect(detail.steps.map((s) => s.title)).toEqual(["Jedan", "Dva"]);
    expect(detail.institutions[0].note).toBe("Lično u stanici.");
    expect(detail.life_events).toEqual([
      { slug: "selim-se", title: "Selim se" },
    ]);
  });

  it("marks a never-verified procedure as stale", () => {
    expect(detail.is_stale).toBe(true);
  });
});

describe("toInstitutionDetail", () => {
  const detail = toInstitutionDetail(
    {
      id: "20000000-0000-4000-8000-000000000001",
      ...institution,
      address: null,
      website: null,
      phone: null,
      email: null,
      working_hours: null,
      status: "published",
      description: null,
      procedure_institutions: [
        { procedure: { ...procedure(A, "Zamena", null), description: null } },
        { procedure: { ...procedure(B, "Izvod", null), description: null } },
      ],
    },
    now,
  );

  it("matches the contract", () => {
    expect(institutionDetailSchema.parse(detail)).toEqual(detail);
  });

  it("lists procedures alphabetically without the link rows", () => {
    expect(detail.procedures.map((p) => p.title)).toEqual(["Izvod", "Zamena"]);
    expect(detail).not.toHaveProperty("procedure_institutions");
  });
});

describe("search helpers", () => {
  it("orderByIds keeps rank order and drops rows RLS did not return", () => {
    expect(orderByIds([{ id: "b" }, { id: "a" }], ["a", "x", "b"])).toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });

  it("escapeLike makes wildcards literal", () => {
    expect(escapeLike("100%_a\\b")).toBe("100\\%\\_a\\\\b");
  });
});
