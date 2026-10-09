// Contract-shaped sample data for unit tests, based on the test seed.
import type {
  AiQueryListResponse,
  AiQueryStatsResponse,
  AuditLogListResponse,
  Category,
  CategoryListResponse,
  Dependency,
  Institution,
  InstitutionDetail,
  InstitutionListResponse,
  ProcedureListResponse,
  LifeEventDetail,
  LifeEventListResponse,
  ProcedureDetail,
  SearchResponse,
  Synonym,
} from "@/lib/services/schemas";

export const category: Category = {
  id: "10000000-0000-4000-8000-000000000002",
  name: "[TEST] Preseljenje i adresa",
  slug: "preseljenje-i-adresa",
  icon: "house",
  sort_order: 2,
};

export const categoryList: CategoryListResponse = { data: [category] };

const lifeEventSummary = {
  id: "30000000-0000-4000-8000-000000000004",
  title: "[TEST] Selim se na novu adresu",
  description: null,
  slug: "selim-se-na-novu-adresu",
  icon: "house",
  estimated_duration: "~2 nedelje",
  category,
  procedure_count: 2,
  sort_order: 1,
  status: "published" as const,
};

export const lifeEventList: LifeEventListResponse = {
  data: [lifeEventSummary],
  pagination: { total: 1, limit: 20, offset: 0 },
};

const mup = { name: "[TEST] MUP", slug: "mup", kind: "government" as const };

export const lifeEventDetail: LifeEventDetail = {
  ...lifeEventSummary,
  procedures: [
    {
      procedure_id: "40000000-0000-4000-8000-000000000001",
      title: "[TEST] Prijava prebivališta",
      slug: "prijava-prebivalista",
      sort_order: 1,
      can_online: false,
      can_in_person: true,
      can_by_mail: false,
      cost_type: "free",
      cost_amount: null,
      processing_time: "1 dan",
      status: "published",
      is_stale: false,
      institutions: [mup],
      depends_on: [],
    },
    {
      procedure_id: "40000000-0000-4000-8000-000000000002",
      title: "[TEST] Nova lična karta",
      slug: "nova-licna-karta",
      sort_order: 2,
      can_online: false,
      can_in_person: true,
      can_by_mail: false,
      cost_type: "fixed",
      cost_amount: "1500.00",
      processing_time: "3-5 radnih dana",
      status: "published",
      is_stale: true,
      institutions: [mup],
      depends_on: ["40000000-0000-4000-8000-000000000001"],
    },
  ],
  dependencies: [
    {
      life_event_id: "30000000-0000-4000-8000-000000000004",
      procedure_id: "40000000-0000-4000-8000-000000000002",
      depends_on_id: "40000000-0000-4000-8000-000000000001",
    },
  ],
};

const procedureSummary = {
  id: "40000000-0000-4000-8000-000000000005",
  title: "[TEST] Pasoš",
  slug: "pasosh",
  description: "Obnavljanje pasoša",
  can_online: false,
  can_in_person: true,
  can_by_mail: false,
  cost_type: "fixed" as const,
  cost_amount: "3000.00",
  processing_time: "7-15 radnih dana",
  status: "published" as const,
  is_stale: false,
  last_verified_at: "2026-06-15T00:00:00+00:00",
};

const institution = {
  id: "20000000-0000-4000-8000-000000000001",
  ...mup,
  address: null,
  website: "https://mup.gov.rs",
  phone: null,
  email: null,
  working_hours: null,
  status: "published" as const,
};

export const procedureList: ProcedureListResponse = {
  data: [procedureSummary],
  pagination: { total: 1, limit: 20, offset: 0 },
};

export const institutionList: InstitutionListResponse = {
  data: [institution],
  pagination: { total: 1, limit: 20, offset: 0 },
};

export const institutionDetail: InstitutionDetail = {
  ...institution,
  description: "Ministarstvo unutrašnjih poslova",
  procedures: [procedureSummary],
};

export const procedureDetail: ProcedureDetail = {
  ...procedureSummary,
  cost_description: "Naknada za izradu",
  official_link: "https://mup.gov.rs",
  form_link: null,
  steps: [
    {
      id: "50000000-0000-4000-8000-000000000011",
      sort_order: 1,
      title: "Zakaži termin",
      description: "Zakaži termin za predaju zahteva za pasoš.",
      link_url: null,
      link_label: null,
    },
  ],
  documents: [
    {
      id: "60000000-0000-4000-8000-000000000009",
      name: "Lična karta",
      description: null,
      is_required: true,
      note: null,
      sort_order: 1,
    },
  ],
  institutions: [{ ...institution, note: null }],
  life_events: [
    { slug: "istekao-pasosh", title: "[TEST] Istekao mi je pasoš" },
  ],
};

export const searchResult: SearchResponse = {
  query: "pasoš",
  original_query: "putna isprava",
  life_events: [lifeEventSummary],
  procedures: [procedureSummary],
  institutions: [institution],
  total_count: 3,
};

// ---- Admin --------------------------------------------------------------------

export const ADMIN_ID = "aaaaaaaa-0000-4000-8000-000000000001";

export const adminInstitution: Institution = {
  ...institution,
  description: "Ministarstvo unutrašnjih poslova",
};

export const dependency: Dependency = lifeEventDetail.dependencies[0];

export const synonym: Synonym = {
  id: "70000000-0000-4000-8000-000000000001",
  term: "putna isprava",
  maps_to: "pasoš",
  created_at: "2026-10-06T12:00:00+00:00",
};

export const aiQueryList: AiQueryListResponse = {
  data: [
    {
      id: "80000000-0000-4000-8000-000000000001",
      query_text: "Selim se, JMBG [JMBG], šta mi treba?",
      was_answered: true,
      matched_event_id: lifeEventDetail.id,
      created_at: "2026-10-06T12:00:00+00:00",
    },
  ],
  pagination: { total: 1, limit: 20, offset: 0 },
};

export const aiQueryStats: AiQueryStatsResponse = {
  data: [
    {
      life_event: {
        id: lifeEventDetail.id,
        slug: lifeEventDetail.slug,
        title: lifeEventDetail.title,
      },
      count: 3,
      unanswered_count: 1,
    },
    { life_event: null, count: 2, unanswered_count: 2 },
  ],
};

export const auditLog: AuditLogListResponse = {
  data: [
    {
      id: "90000000-0000-4000-8000-000000000001",
      entity_type: "procedures",
      entity_id: procedureDetail.id,
      action: "archive",
      changed_by: ADMIN_ID,
      changed_at: "2026-10-06T12:00:00+00:00",
      diff: { status: { old: "published", new: "archived" } },
    },
  ],
  pagination: { total: 1, limit: 20, offset: 0 },
};
