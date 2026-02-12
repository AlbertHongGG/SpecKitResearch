# Phase 1 — Quickstart（開發者本機啟動指南）

本文件描述此 monorepo 的本機啟動流程與驗證步驟。

## Prerequisites

- Node.js 20 LTS
- npm（或專案最終選定的套件管理器）

## Repo Layout（目標）

```text
frontend/   # Next.js App Router
backend/    # NestJS REST API
packages/   # shared logic-engine / canonicalization / contracts
```

## Environment Variables（建議）

Backend（`backend/.env`）：

- `DATABASE_URL="file:./dev.db"`
- `SESSION_COOKIE_NAME=sid`
- `SESSION_TTL_SECONDS=1209600`（14 天，僅示例）
- `COOKIE_SECURE=false`（dev）
- `ALLOWED_ORIGINS=http://localhost:3000`（逗號分隔）
- `TRUST_PROXY=false`（若有反向代理再開）

Frontend（`frontend/.env.local`）：

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`

## Install

在 repo root：

- `npm install`

（若採 npm workspaces：root `package.json` 會定義 workspaces，並提供統一指令。）

## Database

- 初始化 Prisma schema 與 migration（Phase 2 落地）：
- 初始化 Prisma schema 與 migration：
  - `npm run db:migrate`
  - `npm run db:seed`（提供 demo account / demo survey）

## Dev Servers

- 啟動 backend：`npm run dev:backend`
- 啟動 frontend：`npm run dev:frontend`

（或一次啟動全部：`npm run dev`）

預期埠號：

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

## Sanity Flow（手動驗證）

1) 開啟 `http://localhost:3000/login`，以 demo account 登入
2) 進入 `http://localhost:3000/surveys` 建立 Draft
3) 在 edit 頁新增題目/選項/規則並保存（會做 forward-only 與 cycle detection）
4) publish 後取得 `publish_hash`
5) 使用 public link `http://localhost:3000/s/:slug` 填答並提交
6) 在 results/export 確認 `publish_hash/response_hash` 存在且可重算一致

## Tests（目標）

- 單元測試（shared logic / canonicalization）：`npm run test:unit`
- 前端（Vitest）：`npm run test:frontend`
- 後端（Jest）：`npm run test:backend`
- E2E（Playwright）：`npm run test:e2e`

Playwright 第一次使用需安裝瀏覽器：

- `npx playwright install`

## Troubleshooting

- 看到 401：確認已登入且 cookie `sid` 存在；後台路由必須登入。
- 看到 403：確認為 survey owner。
- `/s/:slug` 404：Survey 必須是 Published；Draft/Closed/不存在都必須 404（避免枚舉）。

