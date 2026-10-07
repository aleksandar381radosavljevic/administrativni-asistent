import { handle } from "@/lib/api/handler";
import { listCategories } from "@/lib/services/categories";

// GET /api/v1/categories (03 listCategories)
export async function GET() {
  return handle(async () => Response.json(await listCategories()));
}
