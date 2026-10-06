import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// docs/01-domain-model.sql is the documented copy of the initial migration.
// Why a test instead of a symlink: the docs must stay readable on their own,
// and a failing test is the cheapest way to make drift impossible to miss.
describe("schema copy", () => {
  it("docs/01-domain-model.sql is identical to the initial migration", () => {
    const root = join(__dirname, "..");
    const doc = readFileSync(join(root, "docs/01-domain-model.sql"), "utf8");
    const migration = readFileSync(
      join(root, "supabase/migrations/20261006120000_initial_schema.sql"),
      "utf8",
    );
    expect(migration).toBe(doc);
  });
});
