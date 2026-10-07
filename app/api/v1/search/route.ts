import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { labels } from "@/lib/i18n/labels";
import { searchQuerySchema } from "@/lib/services/schemas";
import { search } from "@/lib/services/search";

// GET /api/v1/search (03 search)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(searchQuerySchema, request.nextUrl.searchParams, {
      q: labels.apiErrors.searchTooShort,
    });
    return Response.json(await search(query));
  });
}
