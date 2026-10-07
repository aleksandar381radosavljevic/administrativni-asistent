import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminLifeEvent,
  setLifeEventStatus,
  updateLifeEvent,
} from "@/lib/services/admin/life-events";
import {
  lifeEventWriteSchema,
  statusChangeSchema,
} from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/life-events/[id]">;

// GET /api/v1/admin/life-events/{id} (03 adminGetLifeEvent)
export async function GET(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const lifeEvent = await getAdminLifeEvent(client, id);
    if (lifeEvent === null) throw ApiError.notFound();
    return Response.json(lifeEvent);
  });
}

// PUT /api/v1/admin/life-events/{id} (03 adminUpdateLifeEvent)
export async function PUT(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(lifeEventWriteSchema, request);
    return writeResponse(await updateLifeEvent(client, id, input));
  });
}

// PATCH /api/v1/admin/life-events/{id} (03 adminSetLifeEventStatus)
export async function PATCH(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const change = await parseBody(statusChangeSchema, request);
    return writeResponse(await setLifeEventStatus(client, id, change));
  });
}
