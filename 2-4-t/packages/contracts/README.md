# @app/contracts

Zod schemas + TypeScript types shared between frontend/backend.

## Goal

- Single source of truth for runtime validation (Zod) and compile-time types.
- Keep API payloads stable and explicit (mostly `snake_case`).

## Naming conventions

- API payloads: `snake_case` (e.g. `publish_hash`, `rule_groups`, `target_question_id`).
- DB / internal: usually `camelCase` (e.g. Prisma `publishHash`, `ownerUserId`).

## OpenAPI alignment notes

The repository also contains an OpenAPI document at:

- `specs/001-dynamic-survey-logic/contracts/openapi.yaml`

In practice:

- Backend implements the OpenAPI route shapes.
- Frontend/backend code relies on `@app/contracts` for validation.

Some fields are intentionally mapped between the two.

### Key schema mappings / differences

| Concept | OpenAPI field | Contracts field |
|--------|---------------|-----------------|
| Rule group operator | `group_operator` | `mode` |
| Question title/prompt | `prompt` | `title` |
| Question description | (often absent / type config) | `description` |

Notes:

- `RuleGroup.mode` in contracts is the same semantic value as OpenAPI `group_operator` (`AND` / `OR`).
- The UI and logic-engine are built around the contracts shape (`title`, `description`, `mode`).

### Hashing fields

- `publish_hash` is computed server-side at publish time from a canonical JSON payload (RFC 8785 JCS) + SHA-256.
- `response_hash` is computed server-side at submit time from canonical JSON payload + SHA-256.

Do not trust client-provided hashes.
