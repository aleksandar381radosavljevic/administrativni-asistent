import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { listStaleProcedures } from "@/lib/services/admin/procedures";
import { paginationQuerySchema } from "@/lib/services/schemas";

// GET /api/v1/admin/stale-procedures (03 adminListStaleProcedures)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      paginationQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listStaleProcedures(client, query));
  });
}
