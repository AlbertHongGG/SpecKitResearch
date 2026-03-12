# Contracts: Jira Lite

This package is the shared API contract source of truth for Jira Lite.

- OpenAPI: `openapi.yaml`
- Generated TypeScript types: `src/generated.ts`

## Scripts

- `npm --workspace packages/contracts run lint:openapi`
- `npm --workspace packages/contracts run generate:types`

## Error Codes

All API errors return the following shape:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "requestId": "..."
  }
}
```

Stable `error.code` values:

- `UNAUTHORIZED` — not logged in / session expired
- `FORBIDDEN` — logged in but insufficient permission
- `NOT_FOUND` — existence strategy (non-member) or resource missing
- `CONFLICT` — optimistic concurrency conflict or other conflict (e.g. invite email mismatch)
- `RATE_LIMITED` — too many requests
- `ORG_SUSPENDED` — org is suspended; org-scoped writes blocked
- `PROJECT_ARCHIVED` — project is archived; project-scoped writes blocked
- `ISSUE_STATUS_DEPRECATED` — issue is in a deprecated workflow status; transitions blocked
- `VALIDATION_ERROR` — request validation failed
- `INTERNAL_ERROR` — unexpected server error

## Pagination Conventions

List endpoints may accept:

- `limit` (default 50, max 100)
- `cursor` (opaque string)

Responses may include:

- `nextCursor` (string | null)
