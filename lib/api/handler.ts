import type { z } from "zod";
import { ApiError } from "./errors";

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
