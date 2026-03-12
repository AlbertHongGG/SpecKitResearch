# 2-3 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-04

## Active Technologies
- TypeScript（Node.js 20+；前端同 TypeScript） (001-trello-lite-board)
- SQLite（單檔）+ Prisma (001-trello-lite-board)

- TypeScript（Node.js 20+；前端/後端皆 TS） (001-trello-lite-board)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript（Node.js 20+；前端/後端皆 TS）: Follow standard conventions

## Recent Changes
- 001-trello-lite-board: Added TypeScript（Node.js 20+；前端同 TypeScript）

- 001-trello-lite-board: Added TypeScript（Node.js 20+；前端/後端皆 TS）

<!-- MANUAL ADDITIONS START -->
## Trello Lite (001-trello-lite-board)

**Intended structure**

```text
backend/
frontend/
```

**Key concerns**

- Sorting consistency: server authoritative ordering (`Task.position` fractional indexing) + optimistic concurrency (`Task.version`)
- Realtime: SSE project event stream + snapshot/backfill on reconnect
- Audit: append-only Activity Log for all key writes

**Suggested commands (when implemented)**

- Backend: `npm run dev` / `npm test`
- Frontend: `npm run dev` / `npm test`
<!-- MANUAL ADDITIONS END -->
