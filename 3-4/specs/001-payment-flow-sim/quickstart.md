# quickstart.md — 快速開始（Phase 1）

**Feature**: 001-payment-flow-sim  
**Date**: 2026-03-05

本文件描述本機開發啟動方式，包含 DB migration/seed、前後端啟動、以及最小驗證路徑。

---

## 先決條件

- Node.js 20 LTS（建議）
- npm
- SQLite（由 Prisma 使用；單檔 DB）

---

## 環境變數（建議）

Backend（範例）：

- `DATABASE_URL="file:./dev.db"`
- `SESSION_COOKIE_NAME="paysim_session"`
- `SESSION_IDLE_SEC=28800`（8h）
- `SESSION_ABSOLUTE_SEC=604800`（7d）
- `CSRF_COOKIE_NAME="csrf_token"`
- `APP_BASE_URL="http://localhost:3000"`
- `FRONTEND_BASE_URL="http://localhost:5173"`

---

## 安裝與啟動

1) 安裝依賴

- `npm install`

2) 設定環境變數

- `cp .env.example .env`
- 視需要調整 `.env`（例如 `DATABASE_URL`）

3) 初始化資料庫（migration + seed）

- `npm -w backend run prisma:generate`
- `npm -w backend run prisma:migrate`
- `npm -w backend run prisma:seed`

4) 啟動（開發模式）

- `npm run dev`

---

## 預設連線與頁面

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- App（Frontend SPA）: `http://localhost:5173`

---

## 最小驗證（P1 路徑）

1) 以 User（Developer）登入
2) 建立訂單（scenario=success, delay=0, return_method 任一）
3) 開啟付款頁 `/pay/:order_no`
4) 點擊 simulate payment
5) 在訂單詳情確認：
   - Order status 進入 `paid`
   - 有對應 OrderStateEvent（created→payment_pending、payment_pending→paid）
   - 產生 ReturnLog；若設定 webhook_url 亦產生 WebhookLog

---

## E2E（Playwright）

- `npm run e2e`

E2E 會以獨立的 SQLite DB 啟動後端並在本機起前端 dev server，完成 US1～US4 的端到端路徑驗證。

---

## 常見除錯

- Webhook 失敗：檢查 WebhookLog 的 `response_status` 與 `response_body_excerpt`（摘要上限 4KB），以及 worker 是否在跑。
- Return 無法到達：ReturnLog 的 `success=true` 不代表接收端收到；請搭配 client-signal/ack（若有）判讀。
