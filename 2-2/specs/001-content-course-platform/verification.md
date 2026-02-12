# Verification Notes: Content-based Online Course Platform (No Streaming)

## Scope
- Backend: NestJS + Prisma (SQLite)
- Frontend: Next.js App Router + Tailwind + TanStack Query

## Completed Checks
- API contracts aligned with OpenAPI (see contracts/openapi.yaml)
- RBAC guards and route guards implemented
- Course state transitions enforced (draft/submitted/published/rejected/archived)
- Protected content access checks for course reader and file download
- UI pages implemented for all required routes
- Tests added for core rules (unit + integration) and E2E smoke

## Manual Validation Checklist
- Login/register flows
- Course listing and detail visibility rules
- Purchase and my-courses progress display
- Instructor create/edit/submit
- Admin review/taxonomy/users/stats
- Error handling pages (401/403/404/500)

## Outstanding Notes
- E2E tests expect a running frontend/backend instance with seeded data.
