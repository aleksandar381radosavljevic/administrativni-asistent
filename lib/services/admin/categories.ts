import "server-only";
import { ApiError, mapDbError } from "@/lib/api/errors";
import { writeTags } from "@/lib/cache/tags";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import { CATEGORY_SELECT } from "../mappers";
import type { Category } from "../schemas";
import type { CategoryWrite } from "../write-schemas";
import type { WriteResult } from "./shared";

// Admin category writes (03 adminCreateCategory, adminUpdateCategory). Admins
// list categories with the public GET /categories.

export async function createCategory(
  client: AppSupabaseClient,
  input: CategoryWrite,
): Promise<WriteResult<Category>> {
  const { data, error } = await client
    .from("categories")
    .insert(input)
    .select(CATEGORY_SELECT)
    .single();
  if (error) throw mapDbError(error);
  return { body: data, tags: writeTags({}) };
}

export async function updateCategory(
  client: AppSupabaseClient,
  id: string,
  input: CategoryWrite,
): Promise<WriteResult<Category>> {
  const { data, error } = await client
    .from("categories")
    .update(input)
    .eq("id", id)
    .select(CATEGORY_SELECT)
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (data === null) throw ApiError.notFound();

  // Life event pages show their category, so they change with it.
  const { data: events, error: eventsError } = await client
    .from("life_events")
    .select("id")
    .eq("category_id", id);
  if (eventsError) throw mapDbError(eventsError);
  return {
    body: data,
    tags: writeTags({ lifeEventIds: events.map((event) => event.id) }),
  };
}
