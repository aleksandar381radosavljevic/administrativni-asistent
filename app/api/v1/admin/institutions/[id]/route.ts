import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  getAdminInstitution,
  setInstitutionStatus,
  updateInstitution,
} from "@/lib/services/admin/institutions";
import {
  institutionWriteSchema,
  statusChangeSchema,
} from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/institutions/[id]">;

// GET /api/v1/admin/institutions/{id} (03 adminGetInstitution)
export async function GET(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const institution = await getAdminInstitution(client, id);
    if (institution === null) throw ApiError.notFound();
    return Response.json(institution);
  });
}

// PUT /api/v1/admin/institutions/{id} (03 adminUpdateInstitution)
export async function PUT(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(institutionWriteSchema, request);
    return writeResponse(await updateInstitution(client, id, input));
  });
}

// PATCH /api/v1/admin/institutions/{id} (03 adminSetInstitutionStatus)
export async function PATCH(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const change = await parseBody(statusChangeSchema, request);
    return writeResponse(await setInstitutionStatus(client, id, change));
  });
}
