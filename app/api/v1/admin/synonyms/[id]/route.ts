import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { deleteSynonym, updateSynonym } from "@/lib/services/admin/synonyms";
import { synonymWriteSchema } from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/synonyms/[id]">;

// PUT /api/v1/admin/synonyms/{id} (03 adminUpdateSynonym)
export async function PUT(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(synonymWriteSchema, request);
    return writeResponse(await updateSynonym(client, id, input));
  });
}

// DELETE /api/v1/admin/synonyms/{id} (03 adminDeleteSynonym)
export async function DELETE(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    return writeResponse(await deleteSynonym(client, id), 204);
  });
}
