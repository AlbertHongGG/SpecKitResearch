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

1) Backend (port 3000):

- `DATABASE_URL="file:./dev.db" PORT=3000 NODE_ENV=development pnpm -C backend start:dev`

2) Frontend (port 5173):

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 pnpm -C frontend dev`

Allowed local frontend origins for backend CORS:

- `http://localhost:5173`
- `http://localhost:5174`

## Tests

- All tests: `pnpm test`
- Unit tests: `pnpm test:unit`
- E2E tests: `pnpm test:e2e`
