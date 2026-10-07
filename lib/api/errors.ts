import { labels } from "@/lib/i18n/labels";

const messages = labels.apiErrors;

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

  static notFound() {
    return new ApiError(404, "not_found", messages.notFound);
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

/**
 * Maps a Supabase (PostgREST or Postgres SQLSTATE) error to the contract's
 * status codes (03). Why the cycle check looks at the message: the cycle
 * trigger and the publish rules both raise 23514, but 03 answers a cycle
 * with 409 and a broken publish rule with 422.
 */
export function mapDbError(error: DbError): ApiError {
  switch (error.code) {
    case "PGRST116": // .single() found no row
      return ApiError.notFound();
    case "PGRST301": // JWT invalid
    case "PGRST302": // anonymous access disabled, token missing
    case "PGRST303": // JWT expired
      return new ApiError(401, "unauthorized", messages.unauthorized);
    case "42501": // insufficient_privilege: RLS, grants or the write guard
      return new ApiError(403, "forbidden", messages.forbidden);
    case "23505": // unique_violation: slug, name, term
      return new ApiError(409, "conflict", messages.conflict);
    case "23514": // check_violation: publish rules, cost rules, cycles
      if (/circular dependency/i.test(error.message ?? "")) {
        return new ApiError(
          409,
          "circular_dependency",
          messages.circularDependency,
        );
      }
      return new ApiError(422, "validation_error", messages.validation, []);
    case "23503": // foreign_key_violation, e.g. dependency outside the event
    case "23502": // not_null_violation
    case "22001": // string_data_right_truncation
      return new ApiError(422, "validation_error", messages.validation, []);
    case "22P02": // invalid_text_representation, e.g. a malformed uuid
      return ApiError.badRequest();
    default:
      return ApiError.internal();
  }
}
