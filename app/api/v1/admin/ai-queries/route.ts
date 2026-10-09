import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { listAiQueries } from "@/lib/services/admin/ai-queries";
import { aiQueryListQuerySchema } from "@/lib/services/write-schemas";

// GET /api/v1/admin/ai-queries (03 adminListAiQueries)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      aiQueryListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listAiQueries(client, query));
  });
}
