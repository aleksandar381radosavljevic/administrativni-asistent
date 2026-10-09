import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  createInstitution,
  listAdminInstitutions,
} from "@/lib/services/admin/institutions";
import {
  adminListQuerySchema,
  institutionWriteSchema,
} from "@/lib/services/write-schemas";

// GET /api/v1/admin/institutions (03 adminListInstitutions)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      adminListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listAdminInstitutions(client, query));
  });
}

// POST /api/v1/admin/institutions (03 adminCreateInstitution)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const input = await parseBody(institutionWriteSchema, request);
    return writeResponse(await createInstitution(client, input), 201);
  });
}
