# Implementation Plan: Leave Management (MVP)

**Branch**: `001-leave-management` | **Date**: 2026-01-31 | **Spec**: specs/001-leave-management/spec.md
**Input**: Feature specification from `/specs/001-leave-management/spec.md`

## Summary

Build an internal leave management system MVP with employee self-service (create/submit/cancel leave requests, upload attachments, view balance) and manager approvals (view pending approvals, approve/reject, department calendar visibility). The implementation follows contract-first REST with NestJS + Prisma(SQLite) and enforces the provided state machines, including atomic balance reservation/deduction with idempotent transactional operations.

## Technical Context

**Language/Version**: TypeScript (Node.js LTS), React 18 + Vite  
**Primary Dependencies**:  
- Backend: NestJS, Prisma, SQLite, class-validator/class-transformer, pino, multer, bcrypt  
- Frontend: React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS, date-fns, FullCalendar
**Storage**: SQLite (single file) via Prisma; attachments stored on local disk for MVP (behind an interface for future S3)  
**Testing**: Backend unit/integration tests (Jest); prioritize invariants (state transitions, overlap, quota/reservation). Frontend component tests optional (defer for MVP).  
**Target Platform**: Local dev on macOS/Linux; deployable to a single Node server  
**Project Type**: Web application (separate `frontend/` and `backend/`)  
**Performance Goals**: MVP-scale; keep approval/submission flows < 200ms p95 for typical requests on local SQLite  
**Constraints**: Contract-first; date-only semantics in company timezone; transactionality for balance-changing transitions; RBAC+scope enforced server-side  
**Scale/Scope**: Single company instance; ~10–1,000 users; moderate request volumes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Based on `.specify/memory/constitution.md`:

- Gate A (Spec): **PASS** — spec is complete and contains no unresolved NEEDS CLARIFICATION.
- Gate B (Design): **PASS** — Phase 0 research and Phase 1 design outputs exist: `research.md`, `data-model.md`, and `contracts/openapi.yaml`.
- Gate C (Security): **PASS (design)** — API requires authentication; endpoints are scoped by role and manager/department rules; server-side enforcement mandated.
- Gate D (Consistency): **PASS (design)** — submit/approve/reject/cancel modeled as transactional, idempotent operations; balance reservation/deduction must be atomic.

## Project Structure

### Documentation (this feature)

```text
specs/001-leave-management/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
backend/
├── src/
│   ├── auth/
│   ├── users/
│   ├── leave-types/
│   ├── leave-requests/
│   ├── leave-balance/
│   ├── department-calendar/
│   ├── attachments/
│   └── common/
└── test/

frontend/
├── src/
│   ├── app/
│   ├── features/
│   │   ├── auth/
│   │   ├── leave-requests/
│   │   ├── approvals/
│   │   ├── leave-balance/
│   │   └── calendar/
│   ├── shared/
│   └── api/
└── test/
```

**Structure Decision**: Use a split `frontend/` + `backend/` web app layout to keep concerns clean, support independent builds, and align with the chosen React/NestJS stack.

## Complexity Tracking

No constitution gate violations identified in this plan.
