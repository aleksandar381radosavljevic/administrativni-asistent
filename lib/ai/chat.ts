import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { labels } from "@/lib/i18n/labels";
import { getCatalog, type Catalog } from "@/lib/services/catalog";
import { getLifeEventBySlug } from "@/lib/services/life-events";
import { getProcedureBySlug } from "@/lib/services/procedures";
import type {
  AiChatMessage,
  AiChatResponse,
  ProcedureDetail,
} from "@/lib/services/schemas";
import { MAX_SELECTED_PROCEDURES, answerSystem, selectSystem } from "./prompts";
import { callStructured } from "./structured";

// The two-step answer of 04 §4.3 (ADR 0006): step 1 picks ids from the
// cached catalog, the server loads those records with the anon client
// (published content only), step 2 answers from them.

/** Step 1 output. Ids are plain strings; unknown ones are dropped below. */
const selectionSchema = z.object({
  life_event_id: z.string().nullable(),
  procedure_ids: z.array(z.string()),
});

/** Step 2 output; `was_answered` is never parsed from the text (ADR 0006). */
const answerSchema = z.object({
  answer: z.string(),
  was_answered: z.boolean(),
  matched_event_id: z.string().nullable(),
});

// Effort per step, set explicitly because the candidate models have
// different defaults (04 §7.1). Picking ids is a lookup, so it starts low.
const SELECT_EFFORT = "low";
const ANSWER_EFFORT = "medium";

export type ChatAnswer = Omit<AiChatResponse, "redaction">;

const unanswered = (
  matched_life_event: ChatAnswer["matched_life_event"] = null,
): ChatAnswer => ({
  answer: labels.ai.noInformation,
  was_answered: false,
  matched_life_event,
  procedures: [],
});

/**
 * The conversation in Messages API form. A leading assistant message (say, a
 * greeting the page showed) is dropped, because the API expects the
 * conversation to start with the user.
 */
function toApiMessages(
  messages: readonly AiChatMessage[],
): Anthropic.MessageParam[] {
  const firstUser = messages.findIndex((message) => message.role === "user");
  return messages
    .slice(firstUser)
    .map(({ role, content }) => ({ role, content }));
}

interface Selection {
  lifeEvent: Catalog["life_events"][number] | null;
  procedures: Catalog["procedures"];
}

/** Keeps only catalog ids, without repeats, in the model's order. */
function resolveSelection(
  catalog: Catalog,
  output: z.infer<typeof selectionSchema>,
): Selection {
  const procedureById = new Map(catalog.procedures.map((p) => [p.id, p]));
  const ids = [...new Set(output.procedure_ids.map((id) => id.toLowerCase()))];
  return {
    lifeEvent:
      catalog.life_events.find(
        (event) => event.id === output.life_event_id?.toLowerCase(),
      ) ?? null,
    procedures: ids
      .flatMap((id) => procedureById.get(id) ?? [])
      .slice(0, MAX_SELECTED_PROCEDURES),
  };
}

/**
 * Answers the last user message of an already redacted conversation. Never
 * pass unredacted text: everything here is sent to Anthropic (ADR 0007).
 */
export async function answerChat(
  redactedMessages: readonly AiChatMessage[],
): Promise<ChatAnswer> {
  const messages = toApiMessages(redactedMessages);
  const catalog = await getCatalog();

  const selected = await callStructured({
    system: selectSystem(catalog),
    messages,
    schema: selectionSchema,
    effort: SELECT_EFFORT,
  });
  if (selected === null) return unanswered();
  const selection = resolveSelection(catalog, selected);

  // Records can disappear between the catalog read and this one (archived
  // meanwhile); the services then return null and the record is skipped.
  const [lifeEvent, loaded] = await Promise.all([
    selection.lifeEvent === null
      ? null
      : getLifeEventBySlug(selection.lifeEvent.slug),
    Promise.all(
      selection.procedures.map((procedure) =>
        getProcedureBySlug(procedure.slug),
      ),
    ),
  ]);
  const procedures = loaded.filter(
    (procedure): procedure is ProcedureDetail => procedure !== null,
  );
  if (lifeEvent === null && procedures.length === 0) return unanswered();

  const output = await callStructured({
    system: answerSystem({ lifeEvent, procedures }),
    messages,
    schema: answerSchema,
    effort: ANSWER_EFFORT,
  });
  if (output === null) return unanswered();

  const matchedEvent = catalog.life_events.find(
    (event) => event.id === output.matched_event_id?.toLowerCase(),
  );
  const matched_life_event = matchedEvent
    ? {
        id: matchedEvent.id,
        slug: matchedEvent.slug,
        title: matchedEvent.title,
      }
    : null;
  // Why the fixed sentence and not the model's text: an unanswered reply must
  // not carry anything the content does not back up (PR-12).
  if (!output.was_answered) return unanswered(matched_life_event);

  return {
    answer: output.answer,
    was_answered: true,
    matched_life_event,
    procedures: procedures.map(({ id, slug, title }) => ({ id, slug, title })),
  };
}
