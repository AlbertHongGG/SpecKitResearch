# Trello Lite (SpecKit Research)

Monorepo：
- API：Fastify + TypeScript + Prisma + SQLite（`apps/api`）
- Web：Next.js App Router + TypeScript + Tailwind + TanStack Query（`apps/web`）
- Shared：Zod schemas / types（`packages/shared`）

## Prereqs
- Node.js 20+
- pnpm（repo 內鎖定版本；見 `package.json#packageManager`）
- SQLite（macOS 預設即可）

## Setup
```sh
pnpm install
```

建立本機環境變數（最少需要 `COOKIE_SECRET`）：
```sh
cp .env.example apps/api/.env
```

（可選）若你也想在 repo root 留一份：
```sh
cp .env.example .env
```

## Database
```sh
pnpm --filter api db:migrate
pnpm --filter api db:seed
```

## Dev
```sh
pnpm dev:api
pnpm dev:web
```
- API 預設：`http://localhost:3001`
- Web 預設：`http://localhost:3000`

## Checks
```sh
pnpm typecheck
pnpm test
pnpm e2e
```

## Playwright port note
若你的本機 `:3000` 已被其他程式佔用（常見：Docker），Playwright 預設會用 `http://localhost:3100` 啟動 web server。
- 需要覆蓋時可設 `PLAYWRIGHT_BASE_URL=http://localhost:3000`（或任何你想用的 port）

## Specs
完整規格/契約/任務列表在：
- `specs/001-collab-task-board/spec.md`
- `specs/001-collab-task-board/contracts/openapi.yaml`
- `specs/001-collab-task-board/contracts/realtime-events.md`
- `specs/001-collab-task-board/tasks.md`
