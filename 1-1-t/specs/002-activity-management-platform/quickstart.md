# Phase 1 — Quickstart (Dev)

本文件提供在本機啟動前後端的最小步驟，並指出核心驗證路徑。


本 repo 已包含 `backend/`（NestJS + Prisma）與 `frontend/`（React + Vite）。以下為本機啟動最小步驟。

## Prerequisites

- Node.js 20 LTS
- npm（若後續改用 pnpm/yarn，需同步更新此文件）

## Environment

後端啟動需要下列 env vars（可先用 `export` 設在同一個 shell session）：

- `DATABASE_URL`：SQLite 檔案路徑（例如 `file:./dev.db`）
- `JWT_SECRET`：JWT 簽章密鑰（本機可用任意長度字串）
- `TZ`：預設 `Asia/Taipei`
- `FRONTEND_ORIGIN`：預設 `http://127.0.0.1:5173`

## Backend

```bash
cd backend
npm install
export DATABASE_URL="file:./dev.db"
export JWT_SECRET="dev-secret"

npm run db:migrate
npm run db:seed
npm run start:dev
```

預期：API 在 `http://localhost:3000`。

### Seed accounts

Seed 會建立以下預設帳號（可直接用於登入）：

- admin：`admin@example.com` / `admin1234`
- member：`member@example.com` / `member1234`

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

預期：前端在 `http://localhost:5173`，並可呼叫 backend（預設會打 `VITE_API_BASE_URL`，在 `frontend/.env`）。

## Smoke Test (manual)

1. 註冊一個 member
2. 以 admin 建立活動草稿並發布
3. member 在列表可看見活動並報名
4. member 在「我的活動」看見已報名活動
5. member 取消報名後名額釋放
6. admin 查看報名名單並匯出 CSV

## Contract

- OpenAPI：見 [contracts/openapi.yaml](contracts/openapi.yaml)

