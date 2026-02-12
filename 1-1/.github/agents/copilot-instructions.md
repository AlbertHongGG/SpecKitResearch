# 1-1 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-25

## Active Technologies
- TypeScript（Node.js 建議 20 LTS；瀏覽器端 React 18） (001-activity-management)
- SQLite（單檔），Prisma Migrate 管理 schema (001-activity-management)

- TypeScript 5.x（Frontend/Backend），Node.js 20 LTS（Backend） (001-activity-management-platform)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x（Frontend/Backend），Node.js 20 LTS（Backend）: Follow standard conventions

## Recent Changes
- 001-activity-management: Added TypeScript（Node.js 建議 20 LTS；瀏覽器端 React 18）

- 001-activity-management-platform: Added TypeScript 5.x（Frontend/Backend），Node.js 20 LTS（Backend）

<!-- MANUAL ADDITIONS START -->

## Planned Monorepo Layout (this feature)

```text
backend/
frontend/
specs/
```

## Notes

- Backend uses NestJS + Prisma + SQLite; frontend uses React (Vite) + TanStack Query.
- Prefer following [specs/001-activity-management-platform/contracts/openapi.yaml](../../specs/001-activity-management-platform/contracts/openapi.yaml) for request/response shapes.

<!-- MANUAL ADDITIONS END -->
