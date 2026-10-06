# 0014. Environments and deployment

- Status: Accepted
- Date: 2026-10-06

## Context
The prototype's Supabase project held a leaked service role key and an insecure schema; the owner deletes it. 0003 requires a staging environment. The app is deployed on Vercel.

## Options
Supabase:
1. **Two projects, staging and production**, in Frankfurt (eu-central-1).
2. One Pro project with Supabase branching for staging and per-PR previews.
3. Production only, with local Supabase as staging (conflicts with 0003).

Deployment:
1. **Vercel Git integration**: preview per PR, production from `main`; GitHub Actions only runs checks.
2. GitHub Actions deploys through the Vercel CLI.
3. Manual deploys.

## Decision
Two Supabase projects in Frankfurt, and Vercel Git integration; both chosen by the owner on 2026-10-06.

## Why
Frankfurt is the closest region to users in Serbia and keeps data in the EU. Vercel's Git integration needs the least setup and keeps production secrets out of GitHub; previews let the owner try every change before merging.

## Consequences
- Previews and the staging domain use the staging Supabase project; production keys exist only in Vercel's production environment.
- GitHub Actions runs lint, typecheck, unit tests, SQL tests on local Supabase and the build, with no production secrets.
- Migrations in `supabase/migrations/` go to staging from CI after merge; production migrations are applied manually with the owner's approval.
- Both projects can start on the free plan during development. Production moves to Pro before launch: the free plan pauses inactive projects and has no backups (04 §5).
