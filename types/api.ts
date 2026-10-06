// types/api.ts
// TypeScript tipovi za API zahteve i odgovore

/**
 * Search API
 */
export interface SearchRequest {
  q: string; // minimum 2 karaktera, maximum 100
}

export interface SearchResult {
  query: string; // mapiran pojam (ako je sinonim mapiran)
  original_query: string; // originalni unos
  life_events: LifeEventSummary[];
  procedures: ProcedureSummary[];
  institutions: InstitutionSummary[];
  total_count: number;
}

export interface LifeEventSummary {
  id: string;
  title: string;
  description?: string;
  slug: string;
  icon?: string;
  status: ContentStatus;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ProcedureSummary {
  id: string;
  title: string;
  description?: string;
  slug: string;
  can_online: boolean;
  can_in_person: boolean;
  can_by_mail: boolean;
  cost_amount?: number | null;
  processing_time?: string | null;
  status: ContentStatus;
  is_stale?: boolean;
  last_verified_at?: string | null;
}

export interface InstitutionSummary {
  id: string;
  name: string;
  slug: string;
  website?: string;
  phone?: string;
  email?: string;
  working_hours?: string;
  status: ContentStatus;
}

/**
 * AI Chat API
 */
export interface AiChatRequest {
  message: string; // minimum 3 karaktera, maximum 1000
}

export interface AiChatResponse {
  answer: string; // AI odgovor na srpskom
  was_answered: boolean; // da li je pronađen odgovor u bazi
  matched_life_event?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  related_procedures?: ProcedureSummary[];
}

/**
 * Error Response
 */
export interface ErrorResponse {
  error: string; // mašinski čitljiv kod greške
  message: string; // opis greške
  details?: unknown; // dodatni detalji
}

export interface ValidationErrorResponse extends ErrorResponse {
  details: {
    field: string;
    message: string;
  }[];
}

/**
 * Admin API - Life Events
 */
export interface LifeEventWrite {
  title: string;
  description?: string;
  slug: string;
  category_id: string;
  icon?: string;
  status: ContentStatus;
  sort_order?: number;
}

export interface LifeEventDetail extends LifeEventWrite {
  id: string;
  created_at: string;
  updated_at: string;
  procedures?: Array<{
    procedure_id: string;
    title: string;
    sort_order: number;
  }>;
  dependencies?: Array<{
    procedure_id: string;
    depends_on_id: string;
  }>;
}

/**
 * Admin API - Procedures
 */
export interface ProcedureWrite {
  title: string;
  description?: string;
  slug: string;
  can_online: boolean;
  can_in_person: boolean;
  can_by_mail: boolean;
  cost_amount?: number;
  cost_description?: string;
  processing_time?: string;
  official_link?: string;
  form_link?: string;
  status: ContentStatus;
  last_verified_at?: string;
  steps: StepWrite[];
  documents?: DocumentWrite[];
  institution_ids: string[];
}

export interface StepWrite {
  title: string;
  description: string;
  sort_order: number;
  link_url?: string;
  link_label?: string;
}

export interface DocumentWrite {
  name: string;
  description?: string;
  is_required: boolean;
  note?: string;
  sort_order: number;
}

export interface ProcedureDetail extends ProcedureWrite {
  id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  steps: Array<StepWrite & { id: string }>;
  documents: Array<DocumentWrite & { id: string }>;
  institutions: InstitutionSummary[];
}

/**
 * Admin API - Institutions
 */
export interface InstitutionWrite {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  phone?: string;
  email?: string;
  working_hours?: string;
  status: ContentStatus;
}

export interface InstitutionDetail extends InstitutionWrite {
  id: string;
  created_at: string;
  updated_at: string;
  procedures?: ProcedureSummary[];
}

/**
 * Admin API - Dependencies
 */
export interface DependencyCreate {
  life_event_id: string;
  depends_on_id: string; // procedura od koje zavisi
}

export interface Dependency {
  procedure_id: string;
  depends_on_id: string;
}

/**
 * Admin API - AI Queries
 */
export interface AiQuery {
  id: string;
  query_text: string;
  was_answered: boolean;
  matched_event_id?: string;
  created_at: string;
}

export interface AiQueryListResponse {
  data: AiQuery[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

/**
 * Admin API - Audit Log
 */
export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  changed_by: string;
  changed_at: string;
  diff?: {
    old_values: Record<string, unknown>;
    new_values: Record<string, unknown>;
  };
}

/**
 * Enums
 */
export type ContentStatus = 'draft' | 'published' | 'archived';
export type AuditAction = 'create' | 'update' | 'archive';

/**
 * Pagination
 */
export interface Pagination {
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

/**
 * Rate Limit Info (opciono, za response header-e)
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number; // unix timestamp
}
