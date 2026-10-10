import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getAiEnv } from "@/lib/env";

let client: Anthropic | undefined;

/**
 * The Anthropic client, created on first use so that routes without AI never
 * need the key. Tests mock this module; they never call the real API (05 §7).
 *
 * Why a short timeout and one retry: the chat page gives up after 25 s (08),
 * and the route makes two calls in a row, so the SDK defaults (10 minutes,
 * two retries) would keep a serverless function running long after the user
 * has gone.
 */
export function getAnthropic(): Anthropic {
  client ??= new Anthropic({
    apiKey: getAiEnv().ANTHROPIC_API_KEY,
    maxRetries: 1,
    timeout: 20_000,
  });
  return client;
}

/** Model id from the server-only ANTHROPIC_MODEL (04 §7.1). */
export function getModel(): string {
  return getAiEnv().ANTHROPIC_MODEL;
}
