import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseId } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { updateCategory } from "@/lib/services/admin/categories";
import { categoryWriteSchema } from "@/lib/services/write-schemas";

type Context = RouteContext<"/api/v1/admin/categories/[id]">;

// PUT /api/v1/admin/categories/{id} (03 adminUpdateCategory)
export async function PUT(request: NextRequest, ctx: Context) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const id = parseId((await ctx.params).id);
    const input = await parseBody(categoryWriteSchema, request);
    return writeResponse(await updateCategory(client, id, input));
  });
}
