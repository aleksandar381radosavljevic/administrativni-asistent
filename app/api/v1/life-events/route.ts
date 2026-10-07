import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { listLifeEvents } from "@/lib/services/life-events";
import { lifeEventListQuerySchema } from "@/lib/services/schemas";

// GET /api/v1/life-events (03 listLifeEvents)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      lifeEventListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listLifeEvents(query));
  });
}
