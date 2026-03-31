# Quickstart（SmartBooking）

本文件描述如何在本專案的既定技術棧下啟動 SmartBooking（前端/後端/DB）並執行測試。

---

## Prerequisites

- Node.js LTS
- npm（本專案預設使用 npm scripts）
- SQLite：由 Prisma 操作 SQLite 單檔，不需另外安裝服務

---

## Project layout（目標）

- `frontend/` React + TS + Tailwind（SPA）
- `backend/` NestJS + TS（REST API）
- `prisma/` Prisma schema + migrations（通常在 backend 底下，視實作選擇）

Spec artifacts（已存在）
- `specs/001-smartbooking-scheduling/spec.md`
- `specs/001-smartbooking-scheduling/plan.md`
- `specs/001-smartbooking-scheduling/research.md`
- `specs/001-smartbooking-scheduling/data-model.md`
- `specs/001-smartbooking-scheduling/contracts/openapi.yaml`

---

## Environment variables（建議）

本專案使用 `.env` 檔（本機開發），可由 `.env.example` 複製建立。

Backend（NestJS）
- `PORT=4000`
- `DATABASE_URL="file:./dev.db"`（SQLite single-file）
- `JWT_SECRET=...`（本機開發用）
- `JWT_EXPIRES_IN="15m"`

Frontend（React）
- `VITE_API_BASE_URL="http://localhost:4000"`

---

## Database & Migrations（Prisma）

常用流程（在 `backend/` 目錄內執行）：

- 安裝依賴：`npm install`
- 產生 Prisma Client：`npm run prisma:generate`
- 建立/更新 migration（會建立 SQLite 檔案）：`npm run prisma:migrate`
- Seed（提供 E2E deterministic 資料）：`npm run prisma:seed`

---

## Run（預期）

Backend
- `cd backend`
- `cp .env.example .env`（Windows PowerShell 可用 `Copy-Item .env.example .env`）
- `npm install`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run dev`（預設 `http://localhost:4000/api`）

Frontend
- `cd frontend`
- `cp .env.example .env`（Windows PowerShell 可用 `Copy-Item .env.example .env`）
- `npm install`
- `npm run dev`（預設 `http://localhost:5174`）

---

## Testing（預期）

Unit（Vitest）

Backend
- `cd backend`
- `npm run test`

Frontend
- `cd frontend`
- `npm run test`

E2E（Playwright）

在 `frontend/` 目錄執行：
- `npm run test:e2e`

備註：Playwright 會自動啟動前後端（見 `frontend/tests/e2e/playwright.config.ts`），並在 global setup 中執行一次 `backend` seed（見 `frontend/tests/e2e/global-setup.ts`）。第一次跑 E2E 前請先確保已完成 migrations（`npm run prisma:migrate`）。

---

## Contract-first workflow

- API 以 `specs/001-smartbooking-scheduling/contracts/openapi.yaml` 為單一真實來源（契約）。
- 後端 handler 必須符合：
  - 端點路徑/方法
  - request/response schema
  - 錯誤 envelope（`ErrorResponse`）
- 前端以 TanStack Query + Zod 做輸入/回應驗證（後端為準）。
