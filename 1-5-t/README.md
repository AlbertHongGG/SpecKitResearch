# 內部文件審核與簽核系統

本專案採 monorepo（npm workspaces）：

- `backend/`：Fastify + Prisma + SQLite
- `frontend/`：React + Vite + Tailwind
- `packages/contracts/`：Zod schemas + shared types
- `storage/attachments/`：附件檔案（不可覆寫、append-only）

## 開發

### 需求

- Node.js（建議 LTS：Node 20）

### 安裝

- `npm install`

### Backend（Fastify + Prisma + SQLite）

後端需要至少以下環境變數：

- `DATABASE_URL`（SQLite 檔案路徑，Prisma 使用）
- `JWT_SECRET`（session JWT 簽章用）
- `NODE_ENV`（`development`/`production`/`test`）

建議開發模式（在 repo root 另開一個終端機）：

- `cd backend`
- `export DATABASE_URL="file:./prisma/dev.db"`
- `export JWT_SECRET="dev-secret"`
- `export NODE_ENV="development"`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run db:seed`
- `npm run dev`

預設會啟動在 `http://localhost:3000`。

### Frontend（React + Vite）

另開一個終端機：

- `cd frontend`
- `npm run dev`

預設會啟動在 `http://localhost:5173`，並透過 Vite proxy 將 `/api/*` 轉送到後端 `http://localhost:3000`。

### 一鍵同時啟動（可選）

- `npm run dev`

> 仍需先在啟動前準備 backend 的 `DATABASE_URL`/`JWT_SECRET`（可在同一個 shell 先 export）。

## 測試

- 跑全工作區（backend + frontend）：`npm test`
- 單跑 backend：`npm -w backend test`
- 單跑 frontend unit：`npm -w frontend test`
- 跑 E2E（Playwright）：`npm -w frontend run test:e2e`

## 資料庫與附件

### SQLite

- 開發 DB（建議設定）：`backend/prisma/dev.db`
	- 對應的 `DATABASE_URL` 範例：在 `backend/` 目錄下使用 `file:./prisma/dev.db`

### 附件

- 附件目錄：`storage/attachments/`
	- 後端寫入路徑以 `backend/` 為工作目錄時會落在 `../storage/attachments/`
	- 附件採 create-new（不可覆寫），且不納入 git

## 預設 seed 帳號

seed 會建立/更新以下帳號（密碼皆為 `password`）：

- Admin：`admin@example.com`
- User：`user@example.com`
- Reviewer：`reviewer1@example.com`、`reviewer2@example.com`
