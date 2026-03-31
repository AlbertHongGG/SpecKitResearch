# Phase 1 Quickstart: SmartBooking（本機開發）

**Branch**: 001-smartbooking-platform  
**Date**: 2026-03-04

本文件描述在既定技術棧（React SPA + NestJS + Prisma + SQLite）下的本機啟動方式。若尚未建立程式碼結構，可先依 [plan.md](plan.md) 建立 `frontend/` 與 `backend/`。

---

## 先決條件

- Node.js（建議 LTS，例如 20.x）
- npm（或等價套件管理工具；本 Quickstart 以 npm 為例）

---

## Backend（NestJS + Prisma + SQLite）

### 環境變數（範例）

- `DATABASE_URL=file:./dev.db`
- `JWT_SECRET=change-me`
- `APP_TIMEZONE=Asia/Taipei`（或單一平台時區）
- `PASSWORD_RESET_TOKEN_TTL_MINUTES=30`

### 初始化與啟動（預期流程）

1. 安裝依賴

- `cd backend`
- `npm install`

2. 建立環境變數

- 以 `backend/.env.example` 為範本建立 `backend/.env`

3. 初始化資料庫與 migration

- `npx prisma migrate dev`
- （建議）建立 seed 資料（提供固定測試帳號與示範服務/時段）：`npx prisma db seed`

Seed 會建立以下帳號（密碼固定）：

- Admin: `admin@example.com` / `admin1234`
- Provider: `provider@example.com` / `provider1234`
- User: `user@example.com` / `user1234`

4. 啟動 API

- `npm run start:dev`

> 目標：API 可在 `http://localhost:3000` 提供服務。

---

## Frontend（React SPA）

1. 安裝依賴

- `cd frontend`
- `npm install`

2. 設定 API base URL（例如 `.env`）

- `VITE_API_BASE_URL=http://localhost:3000`

> 可參考 `frontend/.env.example` 建立 `frontend/.env`。

3. 啟動前端

- `npm run dev`

> 目標：前端可在本機開啟並完成登入/瀏覽/預約/取消主要流程。

---

## 測試（建議路徑）

### Unit/Integration（Vitest）

- Backend：`cd backend && npm test`
- Frontend（單元測試若有）：`cd frontend && npm test`

- Backend：核心規則至少覆蓋
  - 不超賣（併發搶位）
  - 取消截止時間
  - 非法狀態轉移
  - 越權/IDOR 防護
  - 重複提交冪等

### E2E（Playwright）

先確保：

- Backend 已 migrate + seed，並在 `http://localhost:3000` 執行中
- Frontend 在 `http://localhost:5173` 執行中（`cd frontend && npm run dev`）

首次安裝瀏覽器（只需一次）：

- `cd frontend && npx playwright install`

執行 E2E：

- `cd frontend && npm run test:e2e`

- 覆蓋 3 條主要 user journeys：
  - User：登入 → 選時段 → 預約 → 取消
  - Provider：建立服務 → 建立時段 → 查看名單 → 完成
  - Admin：停用帳號/服務 → 驗證限制生效

---

## Email（密碼重設）

本機開發建議使用「可替換的 Email Sender」：

- 開發模式：將重設連結輸出到 server log（方便測試）
- 正式模式：串接 SMTP/第三方寄送

重點驗證：token 一次性、過期拒絕、request 一律回 202（避免帳號枚舉）。
