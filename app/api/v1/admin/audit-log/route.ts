import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { listAuditLog } from "@/lib/services/admin/audit-log";
import { auditLogQuerySchema } from "@/lib/services/write-schemas";

// GET /api/v1/admin/audit-log (03 adminListAuditLog). Read-only by design.
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(auditLogQuerySchema, request.nextUrl.searchParams);
    return Response.json(await listAuditLog(client, query));
  });
}
