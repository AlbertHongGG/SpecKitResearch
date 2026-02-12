# Phase 1 — Quickstart（開發者快速開始）

> 本文件描述此 feature 預期的開發/啟動方式（對應本次 plan 的專案結構）。

## Prerequisites

- Node.js 20 LTS+
- npm 10+

## Repository layout (planned)

- `backend/`：Fastify + Prisma（SQLite）REST API
- `frontend/`：React SPA（TypeScript）

## Backend

1. 安裝依賴（建議在 repo root 一次安裝 workspaces）
   - `npm install`

2. 建立環境變數

- `cp backend/.env.example backend/.env`
- 視需要調整 `backend/.env`（至少要有 `DATABASE_URL` 與兩個 JWT secret）

注意：前端 Vite 預設埠是 `5173`，後端 `CORS_ORIGIN` 預設也以 `http://localhost:5173` 為準。

3. 初始化資料庫

- `npm run -w backend prisma:migrate`
- `npm run -w backend seed`

4. 啟動後端

- `npm run -w backend dev`

預設：`http://localhost:3001`

## Frontend

1. 建立環境變數

- `cp frontend/.env.example frontend/.env`
- 視需要調整 `frontend/.env`（預設 `VITE_API_BASE_URL="http://localhost:3001"`）

2. 啟動前端

- `npm run -w frontend dev`

預設：`http://localhost:5173`

## Seed accounts（建議）

- User: `user@example.com` / `password`
- Reviewer: `reviewer@example.com` / `password`
- Admin: `admin@example.com` / `password`

## Testing (planned)

- Backend unit/integration: `cd backend && npm test`
- E2E (Playwright): `cd frontend && npx playwright test`

## Common flows to verify

- User：建立 Draft → 編輯 → 上傳附件 → 送審
- Reviewer：待辦列表 → 文件詳情 → 同意/退回（退回理由必填）
- Admin：流程模板管理 → 封存 Approved 文件
