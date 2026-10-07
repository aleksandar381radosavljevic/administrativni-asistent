import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  createLifeEvent,
  listAdminLifeEvents,
} from "@/lib/services/admin/life-events";
import {
  adminListQuerySchema,
  lifeEventCreateSchema,
} from "@/lib/services/write-schemas";

// GET /api/v1/admin/life-events (03 adminListLifeEvents)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      adminListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listAdminLifeEvents(client, query));
  });
}

// POST /api/v1/admin/life-events (03 adminCreateLifeEvent)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const input = await parseBody(lifeEventCreateSchema, request);
    return writeResponse(await createLifeEvent(client, input), 201);
  });
}
