# Quickstart：個人記帳＋月報表（開發者）

本文件用來快速啟動本功能的本機開發環境（以目前 repo scripts 為準）。

---

## Prerequisites

- Node.js 20+
- pnpm
- （不需要 Docker）

---

## Environment Variables（範例）

- Backend（`backend/.env`，可由 `backend/.env.example` 複製）：
	- `DATABASE_URL`：SQLite 單檔（例：`file:./prisma/dev.db`）
	- `SESSION_SECRET`：用於簽章/加密（不可提交到版本庫）
	- `APP_ORIGIN`：前端站台 origin（例：`http://localhost:5173`，用於 CORS/CSRF 檢查）
- Frontend（`frontend/.env`，可由 `frontend/.env.example` 複製）：
	- `VITE_API_BASE_URL`：API base URL（建議用前端 dev server origin，例如：`http://localhost:5173`）
	- `VITE_API_PREFIX`：API 路徑前綴（本 repo 預設：`/api`，由 Vite proxy 轉送至後端）

---

## Run Database

1) 安裝依賴（repo root）：`pnpm install`
2) 建立資料表（Prisma migrate；會建立/更新 SQLite 檔案）：`pnpm -C backend prisma:migrate`

---

## Run Backend

1) 確認已啟動 DB（見上一節）
2) 啟動：`pnpm -C backend dev`
3) 健康檢查：`GET http://localhost:3000/health`

---

## Run Frontend

1) 啟動：`pnpm -C frontend dev`
2) 開啟：`http://localhost:5173`

---

## Run All（Convenience）

- 同時啟動前後端（repo root）：`pnpm dev`
- 全域型別檢查（repo root）：`pnpm typecheck`
- 全域測試（repo root）：`pnpm test`
- 全域建置（repo root）：`pnpm build`

---

## Tests

- Backend：`pnpm -C backend test`
- Frontend unit：`pnpm -C frontend test`
- Frontend E2E（Playwright）：`pnpm -C frontend test:e2e`

---

## Dev Notes

- Auth 採 cookie session，跨網域呼叫需確保：前端 `credentials: 'include'`，後端 CORS 精準允許 `APP_ORIGIN`。
- 任何 401/Session 逾時都必須觸發「清 session → 導向 /login」的狀態轉移。
