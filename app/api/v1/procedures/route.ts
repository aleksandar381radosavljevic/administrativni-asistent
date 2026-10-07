import type { NextRequest } from "next/server";
import { handle, parseQuery } from "@/lib/api/handler";
import { listProcedures } from "@/lib/services/procedures";
import { procedureListQuerySchema } from "@/lib/services/schemas";

// GET /api/v1/procedures (03 listProcedures)
export async function GET(request: NextRequest) {
  return handle(async () => {
    const query = parseQuery(
      procedureListQuerySchema,
      request.nextUrl.searchParams,
    );
    return Response.json(await listProcedures(query));
  });
}
