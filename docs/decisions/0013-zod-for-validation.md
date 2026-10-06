# 0013. Zod 4 for request and AI response validation

- Status: Accepted
- Date: 2026-10-06

## Context
Every route handler validates input against the API contract (03), and the AI route parses structured model output (0006). One schema library should cover both.

## Options
1. **Zod 4**: widest adoption, built-in `z.toJSONSchema()` for the model's structured output format.
2. **Valibot**: smaller bundle and modular API; JSON Schema export needs an extra package.
3. **Hand-written validators**: no dependency, but repetitive and no JSON Schema export.

## Decision
Option 1, chosen by the owner on 2026-10-06.

## Why
Validation runs on the server, so bundle size matters little. One schema serves as the request validator, the TypeScript type and the JSON Schema sent to the model.

## Consequences
- Schemas live next to the route handlers' service layer and are the source of request/response types.
- A test checks that the request schemas accept the examples in 03.
