import "server-only";
import { mapDbError } from "@/lib/api/errors";
import { createAnonClient } from "@/lib/supabase/anon";
import { CATEGORY_SELECT } from "./mappers";
import type { Category, CategoryListResponse } from "./schemas";

/** Public categories (RLS: only those with a published life event), by sort order. */
export async function listCategories(): Promise<CategoryListResponse> {
  const { data, error } = await createAnonClient()
    .from("categories")
    .select(CATEGORY_SELECT)
    .order("sort_order")
    .order("name")
    .overrideTypes<Category[], { merge: false }>();
  if (error) throw mapDbError(error);
  return { data };
}
