import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { setLifeEventProcedures } from "@/lib/services/admin/life-events";
import { lifeEventProceduresWriteSchema } from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/life-events/[id]/procedures">;

// PUT /api/v1/admin/life-events/{id}/procedures (03 adminSetLifeEventProcedures)
export async function PUT(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(lifeEventProceduresWriteSchema, request);
    return writeResponse(await setLifeEventProcedures(client, id, input));
  });
}
