import "server-only";
import { revalidateTag } from "next/cache";

/**
 * Expires the given cache tags. Why `{ expire: 0 }` and not the recommended
 * "max" profile: "max" keeps serving stale content while it revalidates, but
 * UF-09 needs an admin change (say, a new dependency) in the very next
 * checklist view. updateTag() would do that too, but works only in Server
 * Actions, and these writes come from route handlers.
 */
export function revalidateTags(tags: readonly string[]): void {
  for (const tag of new Set(tags)) revalidateTag(tag, { expire: 0 });
}
