import { defineConfig, devices } from "@playwright/test";

// End-to-end flows (ADR 0009): find a life event, follow a procedure, use the
// checklist. Tests arrive with the public pages; they run against the local
// Supabase stack loaded with the test seed.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
