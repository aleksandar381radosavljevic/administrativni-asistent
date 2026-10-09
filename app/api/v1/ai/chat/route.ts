import type { NextRequest } from "next/server";
import { answerChat } from "@/lib/ai/chat";
import { recordAiQuery } from "@/lib/ai/queries";
import { hitRateLimit, rateLimitedResponse } from "@/lib/ai/rate-limit";
import { redactMessages } from "@/lib/ai/redact";
import { handle, parseBody } from "@/lib/api/handler";
import {
  aiChatRequestSchema,
  type AiChatResponse,
} from "@/lib/services/schemas";

// POST /api/v1/ai/chat (03 aiChat, 04 §4.3). Chat text is never logged:
// errors below carry status codes and ids only (ADR 0007).
export async function POST(request: NextRequest) {
  return handle(async () => {
    const { messages } = await parseBody(aiChatRequestSchema, request);

    // Before any Anthropic call, so an over-limit client costs nothing.
    const limit = await hitRateLimit(request.headers);
    if (!limit.allowed) return rateLimitedResponse(limit.retryAfterSeconds);

    const redacted = redactMessages(messages);
    const result = await answerChat(redacted.messages);

    // Why a failed insert does not fail the request: the user already has a
    // paid-for answer, and losing one row of UF-10 statistics is the smaller harm.
    const question = redacted.messages[redacted.messages.length - 1];
    try {
      await recordAiQuery({
        query_text: question.content,
        was_answered: result.was_answered,
        matched_event_id: result.matched_life_event?.id ?? null,
      });
    } catch {
      console.error("Storing the AI query failed");
    }

    const body: AiChatResponse = { ...result, redaction: redacted.redaction };
    return Response.json(body);
  });
}
