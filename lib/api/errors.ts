import { labels } from "@/lib/i18n/labels";

const messages = labels.apiErrors;
const fieldMessages = labels.validation;

export interface ValidationDetail {
  field: string;
  message: string;
}

/** An error with its HTTP status and the 03 error body (`Error` / `ValidationError`). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ValidationDetail[],
  ) {
    super(message);
    this.name = "ApiError";
  }

  toBody() {
    return this.details === undefined
      ? { error: this.code, message: this.message }
      : { error: this.code, message: this.message, details: this.details };
  }

  static badRequest(message: string = messages.badRequest) {
    return new ApiError(400, "bad_request", message);
  }

  static unauthorized() {
    return new ApiError(401, "unauthorized", messages.unauthorized);
  }

  static forbidden() {
    return new ApiError(403, "forbidden", messages.forbidden);
  }

  static notFound() {
    return new ApiError(404, "not_found", messages.notFound);
  }

  static conflict(message: string = messages.conflict) {
    return new ApiError(409, "conflict", message);
  }

  static validation(details: ValidationDetail[] = []) {
    return new ApiError(422, "validation_error", messages.validation, details);
  }

  /** 503: the Anthropic API failed or the spending limit is reached (04 §7.3). */
  static aiUnavailable() {
    return new ApiError(503, "ai_unavailable", messages.aiUnavailable);
  }

  static internal() {
    return new ApiError(500, "internal_error", messages.internal);
  }
}

/** The fields of a PostgREST / Postgres error that the mapping needs. */
export interface DbError {
  code?: string | null;
  message?: string | null;
}

// Database messages that name a rule the client can fix, mapped to the field
// to show next to it. The patterns match the RAISE texts of the publish-rule
// triggers and the constraint names in the migrations.
const checkDetails: [RegExp, ValidationDetail][] = [
  [
    /has no published procedure/i,
    { field: "procedures", message: fieldMessages.lifeEventNeedsProcedure },
  ],
  [/has no steps/i, { field: "steps", message: fieldMessages.stepsRequired }],
  [
    /has no institution/i,
    { field: "institution_ids", message: fieldMessages.institutionsRequired },
  ],
];

const foreignKeyDetails: [RegExp, ValidationDetail][] = [
  [
    /life_events_category_id_fkey/,
    { field: "category_id", message: fieldMessages.unknownCategory },
  ],
  [
    /fk_pd_procedure_in_event/,
    { field: "procedure_id", message: fieldMessages.procedureNotInEvent },
  ],
  [
    /fk_pd_depends_on_in_event/,
    { field: "depends_on_id", message: fieldMessages.procedureNotInEvent },
  ],
  [
    /life_event_procedures_procedure_id_fkey/,
    { field: "procedures", message: fieldMessages.unknownProcedure },
  ],
  [
    /procedure_institutions_institution_id_fkey/,
    { field: "institution_ids", message: fieldMessages.unknownInstitution },
  ],
];

function detailsFor(
  table: [RegExp, ValidationDetail][],
  message: string | null | undefined,
): ValidationDetail[] {
  const match = table.find(([pattern]) => pattern.test(message ?? ""));
  return match === undefined ? [] : [match[1]];
}

/**
 * Maps a Supabase (PostgREST or Postgres SQLSTATE) error to the contract's
 * status codes (03). Why the cycle check looks at the message: the cycle
 * trigger and the publish rules both raise 23514, but 03 answers a cycle
 * with 409 and a broken publish rule with 422.
 */
export function mapDbError(error: DbError): ApiError {
  switch (error.code) {
    case "PGRST116": // .single() found no row
    case "P0002": // no_data_found, raised by the admin write functions
      return ApiError.notFound();
    case "PGRST301": // JWT invalid
    case "PGRST302": // anonymous access disabled, token missing
    case "PGRST303": // JWT expired
      return ApiError.unauthorized();
    case "42501": // insufficient_privilege: RLS, grants or the write guard
      return ApiError.forbidden();
    case "23505": // unique_violation: slug, name, term
      return ApiError.conflict();
    case "23514": // check_violation: publish rules, cost rules, cycles
      if (/circular dependency/i.test(error.message ?? "")) {
        return new ApiError(
          409,
          "circular_dependency",
          messages.circularDependency,
        );
      }
      return ApiError.validation(detailsFor(checkDetails, error.message));
    case "23503": // foreign_key_violation, e.g. dependency outside the event
      return ApiError.validation(detailsFor(foreignKeyDetails, error.message));
    case "23502": // not_null_violation
    case "22001": // string_data_right_truncation
      return ApiError.validation();
    case "22P02": // invalid_text_representation, e.g. a malformed uuid
      return ApiError.badRequest();
    default:
      return ApiError.internal();
  }
}
