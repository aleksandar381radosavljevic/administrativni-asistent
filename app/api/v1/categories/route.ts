import { connection } from "next/server";
import { handle } from "@/lib/api/handler";
import { listCategories } from "@/lib/services/categories";

// GET /api/v1/categories (03 listCategories)
export async function GET() {
  // This handler reads nothing from the request, so Cache Components would
  // prerender it at build time. connection() keeps it at request time: the
  // build must not need Supabase or its secrets (lib/env.ts), and a failed
  // read must not be frozen into a static 500. The data is still cached.
  await connection();
  return handle(async () => Response.json(await listCategories()));
}
