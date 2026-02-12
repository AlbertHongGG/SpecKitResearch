# Helpdesk Ticket System (SpecKit)

This repository is an npm workspaces monorepo:

- `backend/`: NestJS + Prisma (SQLite)
- `frontend/`: React + Vite + TypeScript

## Quick start

- Install deps: `npm install`
- Run backend: `npm --prefix backend run start:dev`
- Run frontend: `npm --prefix frontend run dev`

See the feature quickstart for manual validation steps:
- `specs/001-helpdesk-ticket-system/quickstart.md`

## Verification (Polish T110)

The following commands were executed from repo root and are expected to be green:

- Lint: `npm run lint`
- Tests: `npm run test`
- Build: `npm run build`

Latest run: 2026-02-02

Notes:
- Frontend tests may emit React Router future-flag warnings (non-fatal).
- Backend tests may emit Prisma deprecation/config warnings (non-fatal).
