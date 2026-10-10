# Documentation – Administrativni Asistent

The Markdown (and SQL/YAML) files in `docs/` are the single source of truth for the product; there are no Word or Pages exports ([ADR 0011](decisions/0011-content-and-copy-defaults.md)). ADRs override the other documents where they conflict.

| Document | What it covers |
|---|---|
| [00-product-spec.md](00-product-spec.md) | Scope, users, functional requirements, business rules (PR-xx), edge cases (ES-xx) |
| [01-domain-model.md](01-domain-model.md) | Entities, visibility, roles, database rules, search |
| [01-domain-model.sql](01-domain-model.sql) | Schema DDL: tables, RLS, triggers, `search_content`, AI tables; source of truth for names. Identical copy of the initial migration in `supabase/migrations/` |
| [02-user-flows.md](02-user-flows.md) | User and admin flows UF-01..UF-10 with alternative paths |
| [03-api-contract.yml](03-api-contract.yml) | OpenAPI contract for `/api/v1`; source of truth for endpoints and JSON fields |
| [04-architecture.md](04-architecture.md) | Stack, structure, data access, AI integration, deployment, environment variables |
| [05-coding-standards.md](05-coding-standards.md) | Project-specific code rules on top of ai-instructions |
| [06-design-system.md](06-design-system.md) | Theme tokens, contrast, Osnova usage, project components |
| [07-ai-instructions.md](07-ai-instructions.md) | Instructions for coding agents; read first |
| [08-screen-specifications.md](08-screen-specifications.md) | Every public and admin screen; UI copy of record |
| [open-questions.md](open-questions.md) | All open questions with their current defaults |
| [decisions/](decisions/) | ADRs 0001–0017, binding |
| [future/](future/) | Frozen mobile docs 09–11; not implementation input ([ADR 0002](decisions/0002-web-only-v1.md)) |

SQL tests live in [`../supabase/tests/`](../supabase/tests/README.md).
