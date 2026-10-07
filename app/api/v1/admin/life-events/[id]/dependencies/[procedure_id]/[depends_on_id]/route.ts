import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { removeDependency } from "@/lib/services/admin/dependencies";

type Context =
  RouteContext<"/api/v1/admin/life-events/[id]/dependencies/[procedure_id]/[depends_on_id]">;

// DELETE /api/v1/admin/life-events/{id}/dependencies/{procedure_id}/{depends_on_id}
// (03 adminRemoveDependency). Path-based, no request body (ADR 0003).
export async function DELETE(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const params = await ctx.params;
    const result = await removeDependency(client, {
      life_event_id: parseId(params.id),
      procedure_id: parseId(params.procedure_id),
      depends_on_id: parseId(params.depends_on_id),
    });
    return writeResponse(result, 204);
  });
}
