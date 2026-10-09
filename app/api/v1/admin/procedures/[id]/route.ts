import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminProcedure,
  patchProcedure,
  saveProcedure,
} from "@/lib/services/admin/procedures";
import {
  procedurePatchSchema,
  procedureWriteSchema,
} from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/procedures/[id]">;

// GET /api/v1/admin/procedures/{id} (03 adminGetProcedure)
export async function GET(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const procedure = await getAdminProcedure(client, id);
    if (procedure === null) throw ApiError.notFound();
    return Response.json(procedure);
  });
}

// PUT /api/v1/admin/procedures/{id} (03 adminUpdateProcedure)
export async function PUT(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(procedureWriteSchema, request);
    return writeResponse(await saveProcedure(client, input, id));
  });
}

// PATCH /api/v1/admin/procedures/{id} (03 adminPatchProcedure)
export async function PATCH(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const patch = await parseBody(procedurePatchSchema, request);
    return writeResponse(await patchProcedure(client, id, patch));
  });
}
