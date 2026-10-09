import type Anthropic from "@anthropic-ai/sdk";
import { labels } from "@/lib/i18n/labels";
import type { Catalog } from "@/lib/services/catalog";
import type { LifeEventDetail, ProcedureDetail } from "@/lib/services/schemas";

// System prompts of the two steps (04 §4.3, §7.2). Instructions are English;
// the fixed user-facing sentence stays Serbian. Nothing volatile (dates,
// request ids) goes into a prompt, so the cached prefix stays byte-identical.

export const BASE_INSTRUCTIONS = `You are an administrative assistant that helps citizens of Serbia.
Answer ONLY from the content provided below. Do not use outside knowledge.
Do not give legal advice or interpret regulations.
If the content does not contain the answer, reply exactly:
"${labels.ai.noInformation}"
Answer in Serbian, Latin script, addressing the user informally ("ti").
Personal data in the conversation has been replaced with placeholders such as ${labels.ai.redacted.jmbg} or ${labels.ai.redacted.phone}. Never ask the user to repeat it.`;

const SELECT_INSTRUCTIONS = `TASK: Do not answer the user yet. Read the conversation and pick, from the CONTENT CATALOG, the life event and the procedures needed to answer the user's latest message.
- Use only ids that appear in the catalog, copied exactly.
- life_event_id: the one life event the question is about, or null.
- procedure_ids: at most 5 procedures, most relevant first. Include procedures of the life event only when the question needs them.
- Synonyms map what users type to the standard term used in titles.
- If nothing in the catalog is relevant, return null and an empty list.`;

const ANSWER_INSTRUCTIONS = `TASK: Answer the user's latest message using only the CONTENT below, which was selected from the database for this question.
- answer: the reply to the user, short and practical, in the order the user should act.
- was_answered: true only if the CONTENT answers the question; otherwise false, and answer is exactly the sentence above.
- matched_event_id: the id of the life event in the CONTENT that the question is about, or null.`;

/** At most this many procedures are loaded and sent to step 2. */
export const MAX_SELECTED_PROCEDURES = 5;

/**
 * The catalog as text: one JSON object per line, in the catalog's id order.
 * JSON instead of a table, so a title with a "|" or a quote cannot break it.
 */
export function formatCatalog(catalog: Catalog): string {
  const lines = (items: readonly object[]) =>
    items.map((item) => JSON.stringify(item)).join("\n");
  return [
    "CONTENT CATALOG",
    "LIFE EVENTS (id, slug, title, ids of its procedures):",
    lines(catalog.life_events),
    "PROCEDURES (id, slug, title):",
    lines(catalog.procedures),
    "SYNONYMS (what users type, the standard term):",
    lines(catalog.synonyms),
  ].join("\n");
}

/**
 * Step 1 system blocks. The catalog block carries the cache breakpoint, so
 * the instructions and the catalog are cached together (04 §7.1).
 */
export function selectSystem(catalog: Catalog): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: `${BASE_INSTRUCTIONS}\n\n${SELECT_INSTRUCTIONS}` },
    {
      type: "text",
      text: formatCatalog(catalog),
      cache_control: { type: "ephemeral" },
    },
  ];
}

/** Step 2 system blocks: the instructions, then the loaded details. */
export function answerSystem(content: {
  lifeEvent: LifeEventDetail | null;
  procedures: readonly ProcedureDetail[];
}): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: `${BASE_INSTRUCTIONS}\n\n${ANSWER_INSTRUCTIONS}` },
    {
      type: "text",
      text: [
        "CONTENT",
        "LIFE EVENT:",
        JSON.stringify(content.lifeEvent),
        "PROCEDURE DETAILS:",
        ...content.procedures.map((procedure) => JSON.stringify(procedure)),
      ].join("\n"),
    },
  ];
}
