import "server-only";
import { z } from "zod";

// Server-only configuration, validated on first use (04 §9.3). Why lazy and
// grouped: a public read must not fail because an unrelated secret (say, the
// Anthropic key) is missing, and `next build` must not need runtime secrets.
// No variable here uses the NEXT_PUBLIC_ prefix; the only public one is the
// client Sentry DSN, which Next.js inlines at build time and never reads here.

const nonEmpty = z.string().trim().min(1);

export const supabaseEnvSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_ANON_KEY: nonEmpty,
});

export const serviceRoleEnvSchema = supabaseEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: nonEmpty,
});

export const aiEnvSchema = z.object({
  ANTHROPIC_API_KEY: nonEmpty,
  ANTHROPIC_MODEL: nonEmpty,
  AI_RATE_LIMIT_SALT: z.string().min(32),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
export type ServiceRoleEnv = z.infer<typeof serviceRoleEnvSchema>;
export type AiEnv = z.infer<typeof aiEnvSchema>;

type Source = Record<string, string | undefined>;

/**
 * Parses one group of variables. The error lists variable names only, never
 * values, so a misconfigured deploy cannot leak a secret into the logs.
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Source,
  group: string,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((i) => i.path.join("."))),
    ];
    throw new Error(
      `Invalid or missing ${group} environment variables: ${names.join(", ")}`,
    );
  }
  return result.data;
}

function cached<T>(load: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= load());
}

export const getSupabaseEnv = cached(() =>
  parseEnv(supabaseEnvSchema, process.env, "Supabase"),
);

export const getServiceRoleEnv = cached(() =>
  parseEnv(serviceRoleEnvSchema, process.env, "Supabase service role"),
);

export const getAiEnv = cached(() => parseEnv(aiEnvSchema, process.env, "AI"));
