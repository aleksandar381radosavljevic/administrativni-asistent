import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody, parseQuery } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import {
  listAdminProcedures,
  saveProcedure,
} from "@/lib/services/admin/procedures";
import {
  adminListQuerySchema,
  procedureWriteSchema,
} from "@/lib/services/write-schemas";

// GET /api/v1/admin/procedures (03 adminListProcedures)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const query = parseQuery(
      adminListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listAdminProcedures(client, query));
  });
}

// POST /api/v1/admin/procedures (03 adminCreateProcedure)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const input = await parseBody(procedureWriteSchema, request);
    return writeResponse(await saveProcedure(client, input), 201);
  });
}
