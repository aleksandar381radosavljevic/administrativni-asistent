# 0006. Retrieve AI context by putting the content catalog in a cached system prompt

- Status: Accepted
- Date: 2026-10-05

## Context
04 retrieves the top 3–5 procedures with full-text search on the user's question. Tested on Postgres 16: a conversational question ("Preselio sam se iz Novog Sada u Beograd…") does not match "Prijava prebivališta". v1 has about 20 life events and 60–100 procedures.

## Options
1. **Catalog in prompt**: titles, slugs and synonyms of all published events and procedures in a cached system prompt; the model returns IDs; the server loads details.
2. **FTS with OR semantics**: cheapest, weak on synonyms and unexpected phrasing (ES-08).
3. **pgvector embeddings**: scales best, adds an embedding model and vector maintenance.

## Decision
Option 1, revisited when published procedures exceed about 300.

## Why
At this size the catalog is a few thousand tokens, prompt caching makes it cheap, and the model handles intent and phrasing better than keyword search.

## Consequences
- Two steps per question: pick IDs (structured output), then answer from the loaded details. `was_answered` comes from structured output, not text parsing.
- The catalog is rebuilt when content is published, keeping the prompt prefix stable for caching.
- The model choice (04 names `claude-sonnet-4-6` with temperature 0) is decided separately with a small eval; current Sonnet models reject a non-default temperature.
