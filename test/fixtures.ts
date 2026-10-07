// Contract-shaped sample data for unit tests, based on the test seed.
import type {
  CategoryListResponse,
  InstitutionDetail,
  InstitutionListResponse,
  ProcedureListResponse,
  LifeEventDetail,
  LifeEventListResponse,
  ProcedureDetail,
  SearchResponse,
} from "@/lib/services/schemas";

export const category = {
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
