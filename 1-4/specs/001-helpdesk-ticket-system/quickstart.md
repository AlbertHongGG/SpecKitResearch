# Quickstart: 客服工單系統（Helpdesk / Ticket System）

本 Quickstart 目標是讓你在本機（SQLite 單檔）快速跑起前後端、建立資料庫、並用範例帳號驗證主要流程。

## 0) Prerequisites

- Node.js：LTS 版本
- 套件管理器：npm（或團隊慣用工具）
- SQLite：不需額外安裝（由 Prisma/driver 使用本機檔案）

## 1) Repo 結構（本 feature 建議）

```text
backend/                  # NestJS REST API
  prisma/
    schema.prisma
    migrations/
    dev.db                 # SQLite 單檔（本機）
  src/
frontend/                 # React + Vite
  src/
```

## 2) Backend（NestJS）

1. 進入 backend 並安裝依賴

   - `cd backend && npm install`

2. 設定環境變數（範例）

   - `DATABASE_URL="file:./prisma/dev.db"`
   - `JWT_SECRET=...`
   - `JWT_ACCESS_TTL_SECONDS=900`
   - `REFRESH_TOKEN_TTL_DAYS=30`

3. 產生/套用 migrations

   - `npx prisma migrate dev`

4. 啟動 API

   - `npm run start:dev`

5. （建議）初始化資料（seed）

   - `npm run prisma:seed`

## 3) Frontend（React + Vite）

1. 進入 frontend 並安裝依賴

   - `cd frontend && npm install`

2. 設定 API base url（範例）

   - `VITE_API_BASE_URL=http://localhost:3000`

3. 啟動前端

   - `npm run dev`

## 4) 驗證流程（手動）

以下流程建議使用 seed 帳號（`backend/prisma/seed.ts`）快速驗證：

### A) Customer flow（US1）

1. 以 Customer 登入
2. 建立工單（標題/分類/描述）
3. 查看 `/tickets` 列表與 `/tickets/:id` 詳情（時間軸）
4. 等待客服推進到 `Waiting for Customer` 後再回覆
5. 工單進入 `Resolved` 後，Customer 可將其關閉（`Closed`）

### B) Agent flow（US2）

1. 以 Agent 登入
2. 前往 `/agent/tickets?view=unassigned` 檢視未指派工單
3. 接手（Open + unassigned → In Progress）
4. 推進狀態：`In Progress` → `Waiting for Customer` / `Resolved`
5. 新增 internal note（Customer 不可見）

### C) Admin flow（US3）

1. 以 Admin 登入
2. 前往 `/admin/dashboard`，切換 range（7/30 天）觀察 SLA / 狀態分佈 / 負載
3. 於工單詳情中指派/改派 assignee（含取消指派）
4. 建立新 Agent / 停用 Agent，並驗證停用後無法登入或 refresh

### D) List limit（Polish T105）

票券列表支援 `limit` query 參數（1..100，預設 50）：

- Customer: `/tickets?limit=20`、`/tickets?status=Open&limit=10`
- Agent: `/agent/tickets?view=unassigned&limit=20`

回應會包含 `tickets`（最多 `limit` 筆）以及 `total`（符合條件的總數）。

## 5) 測試（可選，但建議）

- Frontend：`npm run test`（Vitest）
- Backend：`npm run test`（Jest）

核心測試建議覆蓋：
- 狀態機合法/非法轉換（含角色）
- 併發接手（僅一方成功，另一方 409）
- Closed 終態禁止任何寫入
- is_internal 可見性（Customer 永遠看不到）
- IDOR：Customer 不可讀他人工單（404）

Polish 建議覆蓋：
- list `limit` 行為與參數驗證（>=1、<=100）
- 401/403/404/409 的一致 UX 呈現
