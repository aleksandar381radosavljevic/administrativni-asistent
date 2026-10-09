import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { listInstitutions } from "@/lib/services/institutions";
import { paginationQuerySchema } from "@/lib/services/schemas";

// GET /api/v1/institutions (03 listInstitutions)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      paginationQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listInstitutions(query));
  });
}
