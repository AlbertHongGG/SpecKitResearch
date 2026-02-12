# 2-4-t Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-06

## Active Technologies
- SQLite（本機單檔；唯一允許 DB）+ Prisma Migrate (001-dynamic-survey-logic)

- TypeScript（Node.js 20 LTS / TS 5.x） (001-dynamic-survey-logic)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript（Node.js 20 LTS / TS 5.x）: Follow standard conventions

## Recent Changes
- 001-dynamic-survey-logic: Added TypeScript（Node.js 20 LTS / TS 5.x）

- 001-dynamic-survey-logic: Added TypeScript（Node.js 20 LTS / TS 5.x）

<!-- MANUAL ADDITIONS START -->
## Feature Notes (001-dynamic-survey-logic)

- Repo 目標結構：`frontend/`（Next.js App Router）+ `backend/`（NestJS REST）+ `packages/`（shared logic-engine / canonicalization / contracts）。
- DB 固定 SQLite 單檔 + Prisma；不可改用 Redis/外部 DB。
- `publish_hash` / `response_hash`：RFC 8785 (JCS) + SHA-256；DB 存放 `lowercase hex (64 chars)`。
- 不可變性：Response/Answer 禁止 UPDATE/DELETE（API + Prisma middleware + SQLite triggers 三層防線）。
- Schema stability：Survey Published/Closed 禁止結構修改；僅允許 `title/description`。
<!-- MANUAL ADDITIONS END -->
