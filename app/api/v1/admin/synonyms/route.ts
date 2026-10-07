import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { createSynonym, listSynonyms } from "@/lib/services/admin/synonyms";
import {
  synonymListQuerySchema,
  synonymWriteSchema,
} from "@/lib/services/write-schemas";

// GET /api/v1/admin/synonyms (03 adminListSynonyms)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      synonymListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listSynonyms(client, query));
  });
}

// POST /api/v1/admin/synonyms (03 adminCreateSynonym)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const input = await parseBody(synonymWriteSchema, request);
    return writeResponse(await createSynonym(client, input), 201);
  });
}
