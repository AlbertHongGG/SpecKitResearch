# API Platform & Key Management System

Monorepo workspace:

- Backend: NestJS (Fastify)
- Frontend: Next.js App Router

## Prerequisites

- Node.js (LTS recommended)
- pnpm

## Local setup

Install dependencies from repo root:

- `pnpm install`

Create env files:

- Backend: copy `backend/.env.example` to `backend/.env`
- Frontend: copy `frontend/.env.example` to `frontend/.env.local`

## Run locally

In two terminals:

1) Backend (port 3001):

- `pnpm -C backend start:dev`

2) Frontend (port 3000):

- `pnpm -C frontend dev`

## Tests

- All tests: `pnpm test`
- Unit tests: `pnpm test:unit`
- E2E tests: `pnpm test:e2e`
