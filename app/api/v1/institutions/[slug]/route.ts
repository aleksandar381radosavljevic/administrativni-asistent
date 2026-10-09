import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handle } from "@/lib/api/handler";
import { getInstitutionBySlug } from "@/lib/services/institutions";
import { slugSchema } from "@/lib/services/schemas";

// GET /api/v1/institutions/{slug} (03 getInstitution)
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/institutions/[slug]">,
) {
  return handle(async () => {
    const { slug } = await ctx.params;
    // A malformed slug cannot exist, so it is a 404 like any unknown slug.
    if (!slugSchema.safeParse(slug).success) throw ApiError.notFound();
    const institution = await getInstitutionBySlug(slug);
    if (institution === null) throw ApiError.notFound();
    return Response.json(institution);
  });
}
