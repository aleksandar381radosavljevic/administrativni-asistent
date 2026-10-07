import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const resolve = {
  alias: {
    "@/": fileURLToPath(new URL("./", import.meta.url)),
    // `server-only` throws outside a React Server Components build; tests
    // import server modules directly, so it is replaced with an empty module.
    "server-only": fileURLToPath(
      new URL("./test/server-only-stub.ts", import.meta.url),
    ),
  },
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve,
        test: {
          name: "unit",
          environment: "node",
          include: ["**/*.test.ts"],
          exclude: [
            "node_modules/**",
            ".next/**",
            "e2e/**",
            "test/integration/**",
          ],
        },
      },
      {
        // Route handlers against the local Supabase stack with the test seed
        // (`supabase start`). Needs SUPABASE_URL and SUPABASE_ANON_KEY from
        // `supabase status -o env`; run with `npm run test:integration`.
        resolve,
        test: {
          name: "integration",
          environment: "node",
          include: ["test/integration/**/*.test.ts"],
        },
      },
    ],
  },
});
