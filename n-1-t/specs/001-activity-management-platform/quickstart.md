# Quickstart: 社團活動管理平台（Activity Management Platform）

**Date**: 2026-02-19  
**Branch**: 001-activity-management-platform

> 本文件描述此功能預期的本機開發啟動方式（於實作完成後適用）。

## Prerequisites

- Node.js（LTS）
- Git

## Planned Repo Layout

- `backend/`: NestJS + Prisma + SQLite
- `frontend/`: React (Vite) + TypeScript

## Backend (NestJS)

1) 進入後端資料夾並安裝依賴

- `cd backend`
- `npm install`

2) 設定環境變數（範例）

- `DATABASE_URL="file:./dev.db"`
- `JWT_SECRET="<dev-secret>"`
- `APP_TIMEZONE="UTC"`

3) 初始化資料庫（Prisma migrate）

- `npm run prisma:migrate`（或 `npx prisma migrate dev`）

4) 建立開發用資料（seed）

- `npm run db:seed`

5) 啟動 API server

- `npm run dev`

## Frontend (Vite)

1) 進入前端資料夾並安裝依賴

- `cd frontend`
- `npm install`

2) 設定 API base URL（範例）

- `VITE_API_BASE_URL="http://localhost:3000"`

3) 啟動前端

- `npm run dev`

## Tests

- Backend: `npm test`（單元 + Supertest 整合測試）
- Backend e2e: `npm run test:e2e`
- Frontend: `npx vitest run`（一鍵跑完；`npm test` 會進入 watch 模式）

## Notes

- 登入狀態以 HttpOnly cookie 承載 JWT（SameSite=Lax），前端請求需使用 `credentials: include`。
- 時間儲存與判斷以 UTC 為基準；UI 若需顯示時區資訊，需在前端明確標示。