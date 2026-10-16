# 0019. Product name "Kako sa državom"

- Status: Accepted
- Date: 2026-10-16

## Context
The working name "Administrativni asistent" says what the app does but works poorly as a name: nine syllables, the tone of a government counter rather than the informal "ti" of the product ([ADR 0011](0011-content-and-copy-defaults.md)), and "asistent" puts the AI first, while the core of the product is the per-life-event checklist. The app has no production users, domain or search presence yet, so renaming now costs a few strings; after launch it would break shared links and recognition.

## Options
1. **"Kako sa državom"**: reads as the question every citizen has, says what the app is, and speaks from the citizen's side, so it does not suggest an official service. Three words; domain without diacritics (`kakosadrzavom`).
2. **"Redom"**: short, no diacritics, same in Cyrillic, plays on "step by step" and the queue ("red"); needs a descriptive tagline to say what it is.
3. **"Državna posla"**: catchy, but sounds like a government service (a trust problem for unverified content) and is likely to be associated with the satirical TV show "Državni posao".
4. Keep "Administrativni asistent".

## Decision
Option 1, chosen by the owner on 2026-10-16.

## Why
It explains itself without a tagline and invites curiosity, which is what the owner wants from the name, while staying clearly unofficial. "Redom" is shorter but needs a tagline to say what it is; "Državna posla" risks reading as an official service.

## Consequences
- User-facing name: header, page title and metadata, and the docs titles. The home page gets a lead paragraph that says what the app does, that the assistant answers only from published content, and "Nismo državna služba." (08 P1).
- Internal identifiers stay `administrativni-asistent`: repository, npm package name, Supabase `project_id`, Vercel project. Renaming the repository would break the Vercel Git link and the Actions read access to the Osnova packages, which is granted per repository. The initial migration comment and its copy in `01-domain-model.sql` stay as written, because applied migrations do not change. The frozen mobile docs in `future/` are not updated.
- Not yet checked: availability of the `.rs`/`.com` domains (the cloud environment cannot reach registries) and the Serbian trademark register (the Intellectual Property Office e-register was down for maintenance on 2026-10-16). Both must be checked before buying a domain or launching on production; if either is taken, this ADR is reopened.
