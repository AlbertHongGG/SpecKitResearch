# Quickstart: 客服工單系統（Helpdesk / Ticket System）

**Branch**: `001-helpdesk-ticket-system`  
**Date**: 2026-02-01  

> 本文件描述預期的本機啟動流程（依 plan 的 `frontend/` + `backend/` 結構）。若尚未產生程式碼骨架，請先完成初始化/腳手架建立後再依此執行。

---

## Prerequisites

- Node.js（建議 LTS；本專案前端工具鏈需符合 Vite/Vitest 的 Node 版本要求）
- npm（或等效套件管理器；若改用 pnpm/yarn 需全專案一致）

---

## Backend（NestJS + Prisma + SQLite）

### 1) 安裝依賴

- `cd backend && npm install`

### 2) 設定環境變數

建議使用 `backend/.env`：

- `DATABASE_URL="file:./dev.db"`
- `JWT_ACCESS_SECRET="<random (至少 16 字元)>"`
- `JWT_ACCESS_TTL="15m"`

> 本專案目前採 **bearer-only（單一 JWT access token）**。`JWT_REFRESH_*` 為未來可能的強化保留欄位，非必要。

> SQLite 固定為單檔；`dev.db` 位置可依需求調整，但需維持單檔模式。

### 3) 建立資料表（Prisma Migrate）

- `cd backend && npm run prisma:migrate`

### 4) 建立開發用帳號（Seed）

- `cd backend && npm run db:seed`

Seed 會建立/覆寫以下帳號（可直接用來登入前端）：

- Admin：`admin@example.com` / `Admin1234!`
- Agent：`agent@example.com` / `Agent1234!`
- Customer：`customer@example.com` / `Customer1234!`

### 5) 啟動後端

- `cd backend && npm run dev`

預期服務位址（範例）：
- API Base URL: `http://localhost:3000`

---

## Frontend（React + Vite）

### 1) 安裝依賴

- `cd frontend && npm install`

### 2) 設定環境變數

建議使用 `frontend/.env`：

- `VITE_API_BASE_URL="http://localhost:3000"`

### 3) 啟動前端

- `cd frontend && npm run dev`

預期服務位址（範例）：
- Web: `http://localhost:5173`

---

## Common troubleshooting

- **401 一直被導回 /login**：確認已登入並保存 token，且 `VITE_API_BASE_URL` 指向正確的後端；並檢查後端 `JWT_ACCESS_SECRET`/`JWT_ACCESS_TTL`。
- **接手/狀態變更常衝突**：這是預期行為（併發保護）；前端應顯示明確錯誤並提供重新整理。
- **SQLite 被鎖住（SQLITE_BUSY）**：確保交易短小、避免長時間持有寫鎖；必要時加入短暫重試。

---

## Tests

- Backend：`cd backend && npm test`
- Frontend：`cd frontend && npm test`
