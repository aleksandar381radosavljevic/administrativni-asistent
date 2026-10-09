import { z } from "zod";
import { labels } from "@/lib/i18n/labels";
import { idSchema } from "@/lib/services/schemas";
import { ApiError, type ValidationDetail } from "./errors";

const fieldMessages = labels.validation;

/**
 * Runs a route handler body and turns errors into contract responses. An
 * unexpected error becomes a generic 500; its details stay in the server log.
 */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    const apiError = error instanceof ApiError ? error : ApiError.internal();
    if (apiError.status >= 500) console.error("Route handler failed", error);
    return Response.json(apiError.toBody(), { status: apiError.status });
  }
}

/**
 * Validates query parameters. Invalid input is a 400; `messages` can give a
 * more helpful message per parameter (keyed by name) than the generic one.
 */
export function parseQuery<T extends z.ZodType>(
  schema: T,
  params: URLSearchParams,
  messages: Partial<Record<string, string>> = {},
): z.infer<T> {
  const result = schema.safeParse(Object.fromEntries(params));
  if (!result.success) {
    const field = String(result.error.issues[0]?.path[0] ?? "");
    throw ApiError.badRequest(messages[field]);
  }
  return result.data;
}

/**
 * Serbian messages for Zod's built-in checks; refinements carry their own
 * message, which takes precedence (Zod 4 error precedence).
 */
const serbianErrorMap: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case "invalid_type":
      return issue.input === undefined
        ? fieldMessages.required
        : fieldMessages.invalidType;
    case "too_small":
      if (issue.origin !== "string") return fieldMessages.tooSmall;
      return Number(issue.minimum) <= 1
        ? fieldMessages.empty
        : fieldMessages.tooShort;
    case "too_big":
      return issue.origin === "string"
        ? fieldMessages.tooLong
        : fieldMessages.tooBig;
    case "invalid_format":
      return fieldMessages.invalidFormat;
    default:
      return fieldMessages.invalidValue;
  }
};

function toDetails(error: z.ZodError): ValidationDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length === 0 ? "body" : issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Reads and validates a JSON body. A body that is not JSON is a 400 (03
 * BadRequest: malformed request); JSON that breaks the schema or a business
 * rule is a 422 with one `details` entry per problem (03 ValidationError).
 */
export async function parseBody<T extends z.ZodType>(
  schema: T,
  request: Request,
): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw ApiError.badRequest(labels.apiErrors.invalidJson);
  }
  const result = schema.safeParse(body, { error: serbianErrorMap });
  if (!result.success) throw ApiError.validation(toDetails(result.error));
  return result.data;
}

/**
 * Validates an `{id}` path segment. Why 404 and not 400: a malformed id
 * cannot name an existing record, the same reasoning as for malformed slugs.
 */
export function parseId(value: string): string {
  const result = idSchema.safeParse(value);
  if (!result.success) throw ApiError.notFound();
  return result.data.toLowerCase();
}
