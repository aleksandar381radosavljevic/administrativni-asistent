import "server-only";
import { ApiError, mapDbError } from "@/lib/api/errors";
import { labels } from "@/lib/i18n/labels";
import { lifeEventTag } from "@/lib/cache/tags";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import type { Dependency, DependencyListResponse } from "../schemas";
import type { DependencyWrite } from "../write-schemas";
import type { WriteResult } from "./shared";

// Dependencies within one life event (03 adminListDependencies,
// adminAddDependency, adminRemoveDependency). The cycle check (PR-10) runs in
// a database trigger, serialized per life event; a cycle comes back as 409.

const DEPENDENCY_SELECT = "life_event_id, procedure_id, depends_on_id";

async function assertLifeEventExists(client: AppSupabaseClient, id: string) {
  const { data, error } = await client
    .from("life_events")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw mapDbError(error);
  if (data === null) throw ApiError.notFound();
}

export async function listDependencies(
  client: AppSupabaseClient,
  lifeEventId: string,
): Promise<DependencyListResponse> {
  await assertLifeEventExists(client, lifeEventId);
  const { data, error } = await client
    .from("procedure_dependencies")
    .select(DEPENDENCY_SELECT)
    .eq("life_event_id", lifeEventId)
    .order("procedure_id")
    .order("depends_on_id");
  if (error) throw mapDbError(error);
  return { data };
}

/**
 * Adds a dependency. Both procedures must be in the event (composite FKs:
 * 422), the same pair twice is 409 conflict, a cycle is 409
 * circular_dependency (03).
 */
export async function addDependency(
  client: AppSupabaseClient,
  lifeEventId: string,
  input: DependencyWrite,
): Promise<WriteResult<Dependency>> {
  await assertLifeEventExists(client, lifeEventId);
  const { data, error } = await client
    .from("procedure_dependencies")
    .insert({ life_event_id: lifeEventId, ...input })
    .select(DEPENDENCY_SELECT)
    .single();
  if (error?.code === "23505") {
    throw ApiError.conflict(labels.apiErrors.dependencyExists);
  }
  if (error) throw mapDbError(error);
  // Dependencies appear only on the event page and its checklist (UF-09).
  return { body: data, tags: [lifeEventTag(lifeEventId)] };
}

export async function removeDependency(
  client: AppSupabaseClient,
  key: Dependency,
): Promise<WriteResult<null>> {
  const { data, error } = await client
    .from("procedure_dependencies")
    .delete()
    .match(key)
    .select(DEPENDENCY_SELECT);
  if (error) throw mapDbError(error);
  if (data.length === 0) throw ApiError.notFound();
  return { body: null, tags: [lifeEventTag(key.life_event_id)] };
}
