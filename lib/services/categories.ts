import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { mapDbError } from "@/lib/api/errors";
import { CATALOG_TAG } from "@/lib/cache/tags";
import { createAnonClient } from "@/lib/supabase/anon";
import { CATEGORY_SELECT } from "./mappers";
import type { Category, CategoryListResponse } from "./schemas";

/** Public categories (RLS: only those with a published life event), by sort order. */
export async function listCategories(): Promise<CategoryListResponse> {
  "use cache";
  // Admin writes expire the tag at once; "hours" (revalidate 1 h) is the safety net of 04 §3.2.
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  const { data, error } = await createAnonClient()
    .from("categories")
    .select(CATEGORY_SELECT)
    .order("sort_order")
    .order("name")
    .overrideTypes<Category[], { merge: false }>();
  if (error) throw mapDbError(error);
  return { data };
}
