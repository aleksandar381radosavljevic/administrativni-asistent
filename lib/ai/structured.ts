import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import { getAnthropic, getModel } from "./client";

// One Messages API call whose answer must match a Zod schema (ADR 0013):
// the schema goes to the model as `output_config.format`, and the reply is
// validated against the same schema.

/** Per step; the eval picks the final value (04 §7.1). */
const MAX_TOKENS = 4096;

export interface StructuredCall<T extends z.ZodType> {
  system: Anthropic.TextBlockParam[];
  messages: Anthropic.MessageParam[];
  schema: T;
  effort: NonNullable<Anthropic.OutputConfig["effort"]>;
}

/**
 * Returns the validated output, or null when the model refused or ran out of
 * tokens: 04 §7.1 treats both as unanswered. No sampling parameters and no
 * `thinking` setting are sent; both candidate models reject a non-default
 * temperature and think adaptively by default.
 *
 * Errors carry no chat text: an Anthropic failure becomes 503 ai_unavailable
 * and an off-schema reply a generic error, so neither the prompt nor the
 * model's output reaches the logs (ADR 0007).
 */
export async function callStructured<T extends z.ZodType>({
  system,
  messages,
  schema,
  effort,
}: StructuredCall<T>): Promise<z.infer<T> | null> {
  const format = zodOutputFormat(schema);
  let response: Anthropic.Message;
  try {
    response = await getAnthropic().messages.create({
      model: getModel(),
      max_tokens: MAX_TOKENS,
      system,
      messages,
      output_config: {
        effort,
        format: { type: format.type, schema: format.schema },
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic call failed", {
        status: error.status,
        requestId: error.requestID,
      });
      throw ApiError.aiUnavailable();
    }
    throw error;
  }

  if (
    response.stop_reason === "refusal" ||
    response.stop_reason === "max_tokens"
  ) {
    return null;
  }
  const text = response.content.find((block) => block.type === "text");
  const parsed = schema.safeParse(parseJson(text?.text));
  if (!parsed.success) {
    throw new Error("The model's structured output did not match the schema");
  }
  return parsed.data;
}

function parseJson(text: string | undefined): unknown {
  try {
    return text === undefined ? undefined : JSON.parse(text);
  } catch {
    return undefined;
  }
}
