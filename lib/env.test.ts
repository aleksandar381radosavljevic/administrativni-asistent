import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aiEnvSchema, parseEnv, supabaseEnvSchema } from "./env";

describe("parseEnv", () => {
  it("returns the parsed variables", () => {
    const env = parseEnv(
      supabaseEnvSchema,
      { SUPABASE_URL: "http://127.0.0.1:54321", SUPABASE_ANON_KEY: "anon" },
      "Supabase",
    );
    expect(env).toEqual({
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_ANON_KEY: "anon",
    });
  });

  it("names missing or invalid variables without echoing values", () => {
    const parse = () =>
      parseEnv(
        aiEnvSchema,
        { ANTHROPIC_API_KEY: "sk-secret-value", AI_RATE_LIMIT_SALT: "short" },
        "AI",
      );
    expect(parse).toThrow(
      "Invalid or missing AI environment variables: ANTHROPIC_MODEL, AI_RATE_LIMIT_SALT",
    );
    expect(parse).not.toThrow(/sk-secret-value|short/);
  });

  it("rejects a Supabase URL that is not a URL", () => {
    expect(() =>
      parseEnv(
        supabaseEnvSchema,
        { SUPABASE_URL: "localhost", SUPABASE_ANON_KEY: "anon" },
        "Supabase",
      ),
    ).toThrow("SUPABASE_URL");
  });
});

describe(".env.example", () => {
  const lines = readFileSync(join(__dirname, "..", ".env.example"), "utf8")
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.startsWith("#"));

  it("lists variable names without values", () => {
    for (const line of lines) expect(line).toMatch(/^[A-Z0-9_]+=$/);
  });

  it("exposes only the Sentry DSN to the browser (04 §9.3)", () => {
    const publicNames = lines.filter((line) => line.startsWith("NEXT_PUBLIC_"));
    expect(publicNames).toEqual(["NEXT_PUBLIC_SENTRY_DSN="]);
  });
});
