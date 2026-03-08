# 3-3 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-04

## Active Technologies

- TypeScript（Node.js 20 LTS；TypeScript 5.x） + Next.js（App Router, React）、NestJS（REST JSON）、Prisma、Zod、Tailwind CSS、TanStack Query、React Hook Form、date-fns (001-subscription-billing-platform)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript（Node.js 20 LTS；TypeScript 5.x）: Follow standard conventions

## Recent Changes

- 001-subscription-billing-platform: Added TypeScript（Node.js 20 LTS；TypeScript 5.x） + Next.js（App Router, React）、NestJS（REST JSON）、Prisma、Zod、Tailwind CSS、TanStack Query、React Hook Form、date-fns

<!-- MANUAL ADDITIONS START -->
### Target Monorepo Layout (preferred)

```text
apps/
	web/   # Next.js App Router
	api/   # NestJS REST
packages/
	contracts/ # OpenAPI + shared Zod schemas
	db/        # Prisma schema + migrations (SQLite)
	shared/    # shared types (roles, error codes, meter codes)
tests/
	unit/
	contract/
	e2e/
```

### Expected Commands (once scaffolded)

- `pnpm dev` (run web + api)
- `pnpm test` (unit)
- `pnpm test:e2e` (Playwright)

<!-- MANUAL ADDITIONS END -->
