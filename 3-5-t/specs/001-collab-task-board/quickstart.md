# Quickstart（開發/測試/本機跑起來）

本 repo 已完成 monorepo scaffold（frontend / backend / packages/shared）。以下步驟可在 macOS 上快速把 API/Web 跑起來並執行測試。

## Prereqs
- Node.js 20+
- pnpm（以 repo root `package.json#packageManager` 為準）
- SQLite 3（macOS 預設即可）

## 1) 安裝依賴
在 repo root：
- `pnpm install`

## 2) 設定環境變數
最少需要提供 API 的 `COOKIE_SECRET`（長度至少 16）。

Prisma CLI 與 API dev server 都會以 `apps/api` 作為工作目錄；因此建議把 `.env` 放在 `apps/api/.env`。

在 repo root：
- `cp .env.example apps/api/.env`

（可選）若你也想在 repo root 留一份：
- `cp .env.example .env`

## 3) 建立 DB（Prisma + SQLite 單檔）
- 預設 DB：`data/app.db`（由 `DATABASE_URL` 控制；預設值為 `file:../../data/app.db`）
- 初始化 migration：`pnpm --filter api db:migrate`
- 建立 dev seed：`pnpm --filter api db:seed`

## 4) 啟動開發
- API：`pnpm dev:api`（預設 `http://localhost:3001`）
- Web：`pnpm dev:web`（預設 `http://localhost:3000`）

Web 可用的環境變數：
- `NEXT_PUBLIC_API_BASE_URL`（預設 `http://localhost:3001`）

## 5) 測試
- Typecheck：`pnpm typecheck`
- 單元/整合：`pnpm test`
- E2E：`pnpm e2e`

Playwright 預設會啟動 Web server 在 `http://localhost:3100`（避免本機 `:3000` 被其他程式佔用）。
需要覆蓋時：
- `PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm e2e`

## 6) 契約
- REST API：見 [contracts/openapi.yaml](contracts/openapi.yaml)
- Realtime events：見 [contracts/realtime-events.md](contracts/realtime-events.md)

## Notes
- SQLite 併發：使用 WAL、短交易、busy/locked 重試；並遵守 OCC（`version`）語意。
- Cookie auth：請使用 HttpOnly/Secure/SameSite cookie，並加上 CSRF 防護（Origin/Referer 檢查或 double-submit）。
