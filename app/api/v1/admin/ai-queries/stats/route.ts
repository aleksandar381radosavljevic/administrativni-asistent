import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { aiQueryStats } from "@/lib/services/admin/ai-queries";
import { aiQueryStatsQuerySchema } from "@/lib/services/write-schemas";

// GET /api/v1/admin/ai-queries/stats (03 adminAiQueryStats)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      aiQueryStatsQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await aiQueryStats(client, query));
  });
}
