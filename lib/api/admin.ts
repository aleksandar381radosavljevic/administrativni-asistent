import "server-only";
import { revalidateTags } from "@/lib/cache/revalidate";
import type { WriteResult } from "@/lib/services/admin/shared";

/**
 * Finishes an admin write: invalidates the cache tags it affected (04 §3.2)
 * and returns the contract body, or an empty 204.
 */
export function writeResponse<T>(
  result: WriteResult<T>,
  status: 200 | 201 | 204 = 200,
): Response {
  revalidateTags(result.tags);
  return status === 204
    ? new Response(null, { status })
    : Response.json(result.body, { status });
}
