import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";
import { handle } from "@/lib/api/handler";
import { getLifeEventBySlug } from "@/lib/services/life-events";
import { slugSchema } from "@/lib/services/schemas";

// GET /api/v1/life-events/{slug} (03 getLifeEvent)
export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/v1/life-events/[slug]">,
) {
  return handle(async () => {
    const { slug } = await ctx.params;
    // A malformed slug cannot exist, so it is a 404 like any unknown slug.
    if (!slugSchema.safeParse(slug).success) throw ApiError.notFound();
    const lifeEvent = await getLifeEventBySlug(slug);
    if (lifeEvent === null) throw ApiError.notFound();
    return Response.json(lifeEvent);
  });
}
