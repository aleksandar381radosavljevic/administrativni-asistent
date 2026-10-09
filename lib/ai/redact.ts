import { labels } from "@/lib/i18n/labels";
import {
  aiRedactionKindSchema,
  type AiChatMessage,
  type AiRedaction,
  type AiRedactionKind,
} from "@/lib/services/schemas";

// Best-effort, pattern-based redaction of personal data in chat messages
// (ADR 0007, 04 §7.4). It runs before the Anthropic call and before the
// ai_queries insert. The passes run from the most specific pattern to the
// least, so a document number is not mistaken for a phone number.

const placeholders = labels.ai.redacted;

// Letters in any script, so Cyrillic and Latin keywords get word boundaries.
const NOT_LETTER_BEFORE = String.raw`(?<![\p{L}\p{N}_])`;

const EMAIL =
  /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;

// Words that announce a document number, Latin (with and without
// diacritics) and Cyrillic: lična karta, LK, pasoš, vozačka, saobraćajna,
// broj dokumenta, registarski broj...
const DOCUMENT_KEYWORDS = [
  String.raw`li[čc]n\p{L}*\s+kart\p{L}*`,
  String.raw`lk`,
  String.raw`paso[šs]\p{L}*`,
  String.raw`voza[čc]k\p{L}*`,
  String.raw`saobra[ćc]ajn\p{L}*`,
  String.raw`dokument\p{L}*`,
  String.raw`registarsk\p{L}*`,
  String.raw`лична\s+карт\p{L}*`,
  String.raw`личн\p{L}*\s+карт\p{L}*`,
  String.raw`лк`,
  String.raw`пасош\p{L}*`,
  String.raw`возачк\p{L}*`,
  String.raw`саобраћајн\p{L}*`,
  String.raw`документ\p{L}*`,
].join("|");

// A keyword, up to 30 characters without digits ("broj:", "moje je"), then
// a number of at least 6 digits, optionally with a short letter prefix
// (AB1234567) and inner spaces or dashes.
const DOCUMENT_IN_CONTEXT = new RegExp(
  String.raw`(${NOT_LETTER_BEFORE}(?:${DOCUMENT_KEYWORDS})(?![\p{L}])[^\d\n]{0,30}?)` +
    String.raw`(${NOT_LETTER_BEFORE}(?:\p{L}{1,3}-?)?\d(?:[ -]?\d){5,14})(?![\p{N}])`,
  "giu",
);

// A token that mixes a letter prefix with at least 6 digits looks like a
// document or registration number even without a keyword.
const DOCUMENT_TOKEN = new RegExp(
  String.raw`${NOT_LETTER_BEFORE}\p{L}{1,3}-?\d{6,}(?![\p{L}\p{N}])`,
  "gu",
);

// 13 digits, together or split 7 + 6 (date of birth, then the rest).
const JMBG = /(?<![\p{N}])\d{7}[ -]?\d{6}(?![\p{N}])/gu;

// Any other run of 14 or more digits (card or account numbers and the like).
// It also guarantees that no 13-digit run reaches ai_queries, whose
// chk_ai_query_no_jmbg constraint would reject the insert.
const LONG_NUMBER = /\d{14,}/g;

// Candidate phone spans: digit groups joined by spaces, dashes, slashes or
// parentheses. Which groups form the number is decided by findPhone().
const PHONE_CANDIDATE = /(?<![\p{L}\p{N}_])(?:\+|\()?\d[\d \t()\-/]*\d/gu;
const DIGIT_GROUP = /\+?\d+/g;
const PHONE_GAP = /^[ \t()\-/]{1,3}$/;

interface Span {
  start: number;
  end: number;
}

/**
 * Serbian numbers have 8 or 9 digits after the leading 0 or the +381 / 00381
 * prefix: mobile 06x, Belgrade 011, other areas 0xx or 0xxx.
 */
function isPhoneNumber(groups: readonly string[]): boolean {
  const digits = groups.join("").replace(/\D/g, "");
  const first = groups[0];
  if (first.startsWith("+381") || first.startsWith("00381")) {
    const national = digits.slice(first.startsWith("+") ? 3 : 5);
    // "+381 (0)64 ..." keeps a trunk 0 that does not count.
    const significant = national.startsWith("0") ? national.slice(1) : national;
    return significant.length >= 8 && significant.length <= 9;
  }
  // A domestic number starts with a 0 and an area or mobile code of at least
  // 2 more digits, so a date like "01 10 2026" is not one.
  return (
    first.startsWith("0") &&
    first.length >= 3 &&
    digits.length >= 9 &&
    digits.length <= 10
  );
}

/** The longest phone number inside one candidate span, if any. */
function findPhones(candidate: string, offset: number): Span[] {
  const groups = [...candidate.matchAll(DIGIT_GROUP)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
  const spans: Span[] = [];
  let i = 0;
  while (i < groups.length) {
    let best = -1;
    for (let j = i; j < groups.length; j++) {
      if (j > i) {
        const gap = candidate.slice(groups[j - 1].end, groups[j].start);
        if (!PHONE_GAP.test(gap)) break;
      }
      const texts = groups.slice(i, j + 1).map((group) => group.text);
      if (isPhoneNumber(texts)) best = j;
    }
    if (best === -1) {
      i++;
      continue;
    }
    // Keep an opening "(0" together with the number: "(011) 123-4567".
    const start =
      groups[i].start > 0 && candidate[groups[i].start - 1] === "("
        ? groups[i].start - 1
        : groups[i].start;
    spans.push({ start: offset + start, end: offset + groups[best].end });
    i = best + 1;
  }
  return spans;
}

function redactPhones(text: string): { text: string; found: boolean } {
  const spans = [...text.matchAll(PHONE_CANDIDATE)].flatMap((match) =>
    findPhones(match[0], match.index),
  );
  let result = text;
  for (const span of spans.reverse()) {
    result =
      result.slice(0, span.start) + placeholders.phone + result.slice(span.end);
  }
  return { text: result, found: spans.length > 0 };
}

export interface RedactedText {
  text: string;
  kinds: AiRedactionKind[];
}

/** Replaces personal data in one text with placeholders such as `[JMBG]`. */
export function redactText(input: string): RedactedText {
  const found = new Set<AiRedactionKind>();
  const mask = (text: string, pattern: RegExp, kind: AiRedactionKind) =>
    text.replace(pattern, () => {
      found.add(kind);
      return placeholders[kind];
    });

  let text = mask(input, EMAIL, "email");
  text = text.replace(
    DOCUMENT_IN_CONTEXT,
    (_match, keyword: string, number: string) => {
      // "dokument" followed by 13 plain digits is still a JMBG.
      const kind: AiRedactionKind =
        /^\d[\d -]*$/.test(number) && number.replace(/\D/g, "").length === 13
          ? "jmbg"
          : "document_number";
      found.add(kind);
      return keyword + placeholders[kind];
    },
  );
  text = mask(text, JMBG, "jmbg");
  text = mask(text, LONG_NUMBER, "document_number");
  text = mask(text, DOCUMENT_TOKEN, "document_number");
  const phones = redactPhones(text);
  if (phones.found) found.add("phone");

  return {
    text: phones.text,
    kinds: aiRedactionKindSchema.options.filter((kind) => found.has(kind)),
  };
}

/**
 * Redacts every message of a conversation (03 aiChat: every message, not
 * only the last) and reports which kinds were masked, in the 03 enum order.
 */
export function redactMessages(messages: readonly AiChatMessage[]): {
  messages: AiChatMessage[];
  redaction: AiRedaction;
} {
  const found = new Set<AiRedactionKind>();
  const redacted = messages.map((message) => {
    const { text, kinds } = redactText(message.content);
    for (const kind of kinds) found.add(kind);
    return { role: message.role, content: text };
  });
  const kinds = aiRedactionKindSchema.options.filter((kind) => found.has(kind));
  return {
    messages: redacted,
    redaction: { applied: kinds.length > 0, kinds },
  };
}
