# Legacy prototype (do not deploy)

The first, unfinished prototype of administrativni-asistent (Next.js 14, Tailwind). It is kept only for reference while useful pieces are ported to the new app.

- Analysis of this code: see the project analysis report (02-analiza-koda.md); in short, it violates most accepted ADRs and has security issues (admin checks, service role usage, raw PII sent to the AI).
- `.env` files were removed. Any key that ever lived in them is considered compromised and must be rotated.
- Never merge this branch into `main` or deploy it.
