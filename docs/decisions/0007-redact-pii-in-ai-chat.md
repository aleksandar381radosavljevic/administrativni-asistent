# 0007. Redact personal data in AI chat before it leaves the request

- Status: Accepted
- Date: 2026-10-05

## Context
PR-15 says personal data from the chat is neither stored nor logged, and 9.2 says it is not sent to the API. `ai_queries.query_text` stores raw text, and the same text goes to Anthropic.

## Options
1. **Redaction**: mask JMBG, phone numbers, emails and document numbers before the API call and the insert; delete queries after 90 days.
2. **No text**: store only the matched event and `was_answered`; the admin loses UF-10 insight.
3. **No change**: PR-15 stays unmet.

## Decision
Option 1.

## Why
Keeps the admin's view of what is missing (UF-10) while meeting the intent of PR-15.

## Consequences
- Redaction is pattern-based and imperfect; PR-15 is reworded to "best-effort redaction" so the docs do not promise more than the code does.
- A scheduled job deletes `ai_queries` older than 90 days.
- Sentry drops request bodies on the AI route and Session Replay stays off.
- Rate limiting stores a salted hash of the IP, never the raw IP.
