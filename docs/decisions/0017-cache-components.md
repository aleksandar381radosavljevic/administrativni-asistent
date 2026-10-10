# 0017. Cache public reads with Cache Components (`use cache`)

- Status: Accepted
- Date: 2026-10-10

## Context
Public content changes only when an admin saves it, but every public request and both steps of every AI chat request (the catalog, then the selected details) read Supabase. 04 §3.2 already describes tagged caches that admin writes expire, so a change is visible on the next request (UF-09), with a one-hour time-based fallback. The tags exist in `lib/cache/tags.ts` and every admin write handler already calls `revalidateTag` through `lib/cache/revalidate.ts`, yet nothing was tagged, so nothing was cached. Next.js 16 offers two ways to cache a non-`fetch` read: Cache Components with the `use cache` directive, or `unstable_cache`, which its docs mark as replaced by `use cache`.

## Options
1. **Cache Components**: `cacheComponents: true` (with `partialPrefetching: true`, which the docs say to set explicitly) and `use cache` + `cacheTag` + `cacheLife` on the public read functions. The supported model in Next.js 16; it also changes rendering app-wide: data is dynamic by default and routes are prerendered where they read no request or uncached data.
2. **`unstable_cache`** around the same functions: no change to rendering, but an API the docs mark as replaced, so adopting it now means migrating later.
3. **No caching**: simplest, but every page view and AI request reads the database, and the catalog has to be rebuilt per AI request.

## Decision
Option 1, chosen by the owner on 2026-10-10.

## Why
It is the documented path forward and fits the existing tag design without new dependencies. Option 2 would be built on an API that is already on its way out, and option 3 ignores 04 §3.2 and puts the database on the path of every AI request.

## Consequences
- Cached: `listCategories`, `listLifeEvents`, `listProcedures`, `listInstitutions`, the three `get…BySlug` reads and the AI catalog (`getCatalog`). Lists and the catalog carry `catalog`; a found detail carries its entity tag (`life-event:<id>`, `procedure:<id>`, `institution:<id>`), and a miss carries `catalog`, which every write expires, so newly published or renamed content replaces a cached 404. Search (dynamic per 04 §3.2), admin reads and anything per user stay uncached.
- Every cached scope sets `cacheLife("hours")` (revalidate after one hour, expire after one day): the one-hour safety net of 04 §3.2. Tag expiry, not time, is what makes saves visible.
- Cached scopes read only plain arguments and use the cookie-less anon client; they must never call `cookies()`, `headers()`, `connection()` or the session client. Values that depend on the current date (the `is_stale` flags, PR-07) are computed outside the cached scope, so a cached row never carries a stale flag from the day it was cached.
- Invalidation stays `revalidateTag(tag, { expire: 0 })`: admin writes come from route handlers, where `updateTag` throws (it works only in Server Actions), and the `max` profile would serve stale content once more, which UF-09 does not allow.
- `GET /api/v1/categories` reads nothing from the request, so it would be prerendered at build time; it calls `connection()` so the build needs no Supabase access or secrets and a failed read is never frozen into a static response. Other public handlers read the request or route params and run at request time anyway.
- `handle()` passes Next.js control-flow errors on with `unstable_rethrow`, because the build's prerender attempt signals "needs a request" by throwing.
- An error thrown inside a cached scope reaches the handler as a generic error, not as an `ApiError`, so it becomes a 500. For anon reads `mapDbError` gives 500 anyway; errors are not cached.
- The default cache handler is in memory. On serverless instances entries may not be reused across requests or instances (Next.js `use cache` docs); how well entries and tag expiry hold across Vercel instances is to be checked on staging. A shared handler (`use cache: remote`) would need its own ADR.
- Vitest runs `use cache` functions as plain functions; tests that reach a cached service mock `next/cache` (and `connection` from `next/server`).
