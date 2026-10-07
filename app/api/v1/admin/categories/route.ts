import type { NextRequest } from "next/server";
import { writeResponse } from "@/lib/api/admin";
import { handle, parseBody } from "@/lib/api/handler";
import { requireAdmin } from "@/lib/auth/admin";
import { createCategory } from "@/lib/services/admin/categories";
import { categoryWriteSchema } from "@/lib/services/write-schemas";

// POST /api/v1/admin/categories (03 adminCreateCategory)
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { client } = await requireAdmin(request);
    const input = await parseBody(categoryWriteSchema, request);
    return writeResponse(await createCategory(client, input), 201);
  });
}
