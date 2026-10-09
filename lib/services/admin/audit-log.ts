import "server-only";
import { mapDbError } from "@/lib/api/errors";
import type { AppSupabaseClient } from "@/lib/supabase/anon";
import type { AuditLogEntry, AuditLogListResponse } from "../schemas";
import type { AuditLogQuery } from "../write-schemas";
import { pageOf, rangeOf } from "./shared";

/**
 * Audit entries, newest first (03 adminListAuditLog). Read-only: entries are
 * written only by triggers and RLS lets admins read them (ADR 0004).
 */
export async function listAuditLog(
  client: AppSupabaseClient,
  query: AuditLogQuery,
): Promise<AuditLogListResponse> {
  let request = client
    .from("audit_log")
    .select(
      "id, entity_type, entity_id, action, changed_by, changed_at, diff",
      {
        count: "exact",
      },
    );
  if (query.entity_type !== undefined) {
    request = request.eq("entity_type", query.entity_type);
  }
  if (query.entity_id !== undefined) {
    request = request.eq("entity_id", query.entity_id);
  }
  if (query.changed_by !== undefined) {
    request = request.eq("changed_by", query.changed_by);
  }
  if (query.from !== undefined) request = request.gte("changed_at", query.from);
  if (query.to !== undefined) request = request.lt("changed_at", query.to);
  const { data, error, count } = await request
    .order("changed_at", { ascending: false })
    .order("id")
    .range(...rangeOf(query))
    .overrideTypes<AuditLogEntry[], { merge: false }>();
  if (error) throw mapDbError(error);
  return { data, pagination: pageOf(query, count) };
}
