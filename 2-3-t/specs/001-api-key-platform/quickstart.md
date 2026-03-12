# Quickstart（本機啟動與驗證流程）

Created: 2026-03-05  
Feature: 001-api-key-platform

本文件提供「最小可用」的本機啟動與驗證步驟，使用 repo 內已存在、可直接執行的 scripts。

---

## 先決條件

- Node.js（Active LTS；建議 22.x）
- `corepack`（隨 Node 內建）
- `pnpm`（建議；或退回 `npm`）
- SQLite（由 Prisma/SQLite driver 使用；不需要額外服務）

---

## 專案結構

- `backend/`：NestJS（Fastify adapter）
- `frontend/`：Next.js App Router
- SQLite 檔案：預設為 `./data/dev.db`（由 `backend/.env` 的 `DATABASE_URL` 決定）

---

## 環境變數

### backend/.env（必需）

建議直接從範本建立：

- `cp backend/.env.example backend/.env`

最少需要確保以下欄位存在且合理：

- `DATABASE_URL="file:../data/dev.db"`
- `API_KEY_PEPPER="..."`（至少 16 字元；不得寫入 DB、不得輸出到 log）
- `SESSION_COOKIE_NAME=sid`
- `PORT=3001`

### frontend/.env.local（建議）

建立檔案 `frontend/.env.local`：

- `NEXT_PUBLIC_BACKEND_URL="http://localhost:3001"`

---

## 初始化

1. 啟用 corepack（若使用 pnpm）
   - `corepack enable`
2. 安裝依賴
   - `pnpm install`
3. 建立環境變數檔
   - `cp backend/.env.example backend/.env`
   - `cp frontend/.env.example frontend/.env.local`
4. 建立資料夾與 SQLite 檔案位置
   - `mkdir -p data`
5. Prisma migrate（建立 schema）
   - `pnpm -C backend migrate`
6. Seed（建立 admin 帳號 + 範例 service/endpoint/scope/rules）
   - `pnpm -C backend seed`

---

## 啟動

此專案的 seed 會建立一個 `demo` service，upstream 指向 `http://localhost:4000`。
建議先啟動本機 upstream mock（方便驗證 gateway）：

- Upstream mock（Terminal A）
   - `node frontend/tests/e2e/upstream-server.js --port=4000`

- Backend（API + Gateway；Terminal B）
   - `pnpm -C backend dev`
- Frontend（Web 後台；Terminal C）
   - `pnpm -C frontend dev`

或使用 root script 同時啟動（不包含 upstream mock）：

- `pnpm dev`

---

## 最小驗證（手動）

### 0) Health check

- Backend health：`curl -i http://localhost:3001/health`
- Upstream health：`curl -i http://localhost:4000/health`

### 1) Web 後台基本流程

- 註冊：`POST /register` → 201（不自動登入）
- 登入：`POST /login` → 200（設定 `sid` cookie）
- 建立 key：`POST /keys` → 201（只在此回傳 `plain_key` 一次）
- 導覽一致性：Guest/Developer/Admin 的 nav 顯示項與 route guard 一致；Developer 進 `/admin` 顯示 403。

### 2) Gateway 驗證（curl）

- 用剛建立回應拿到的 `plain_key` 呼叫（注意：gateway 是後端 port 3001；upstream 是 4000）：
   - `curl -i -H "Authorization: Bearer <plain_key>" http://localhost:3001/gateway/demo/hello`
- 驗證錯誤語意（應可在 usage 查到）：
  - 無/錯 key → 401
  - scope 不足 → 403
  - rate limit 超限 → 429（含 `Retry-After` 與 `RateLimit-*`）

---

## 重要提醒（安全）

- 不要把 `plain_key`（或 `Authorization` header、cookie）貼到 log、issue、或任何可被收集的地方。
- 若需要除錯，僅以 `api_key_id`（token 內的 key_id）或 request_id 追查。

---

## Quickstart 驗收清單（T133）

以下項目全部通過即可視為 quickstart 驗證完成：

1. `pnpm -C backend migrate` 成功（無錯誤）
2. `pnpm -C backend seed` 成功，並輸出 admin 帳密資訊
3. `curl http://localhost:3001/health` 回 200（JSON）
4. 登入後可在 UI 建立 key，且 `plain_key` 僅顯示一次
5. `curl -H "Authorization: Bearer <plain_key>" http://localhost:3001/gateway/demo/hello` 回 200，且 body 含 `message: "hello"`
6. 在 usage/audit 查詢頁看得到對應紀錄（且不含 `plain_key`/Authorization/cookie）
