import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handle } from "@/lib/api/handler";
import { getProcedureBySlug } from "@/lib/services/procedures";
import { slugSchema } from "@/lib/services/schemas";

// GET /api/v1/procedures/{slug} (03 getProcedure)
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/procedures/[slug]">,
) {
  return handle(async () => {
    const { slug } = await ctx.params;
    // A malformed slug cannot exist, so it is a 404 like any unknown slug.
    if (!slugSchema.safeParse(slug).success) throw ApiError.notFound();
    const procedure = await getProcedureBySlug(slug);
    if (procedure === null) throw ApiError.notFound();
    return Response.json(procedure);
  });
}
