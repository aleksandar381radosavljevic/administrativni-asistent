import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  addDependency,
  listDependencies,
} from "@/lib/services/admin/dependencies";
import { dependencyWriteSchema } from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/life-events/[id]/dependencies">;

// GET /api/v1/admin/life-events/{id}/dependencies (03 adminListDependencies)
export async function GET(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    return Response.json(await listDependencies(client, id));
  });
}

// POST /api/v1/admin/life-events/{id}/dependencies (03 adminAddDependency)
export async function POST(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(dependencyWriteSchema, request);
    return writeResponse(await addDependency(client, id, input), 201);
  });
}
