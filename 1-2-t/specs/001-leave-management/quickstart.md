# Quickstart: Leave Management System

**Feature**: [spec.md](spec.md)  
**Branch**: 001-leave-management  
**Date**: 2026-01-31

本 quickstart 目標是讓新加入的開發者能在本機把前後端跑起來並完成一輪核心流程驗證。

## Prerequisites

- Node.js LTS（建議 20+）
- 套件管理器：pnpm（或 npm / yarn 擇一，專案需統一）

## Repository Layout（目標結構）

```text
backend/   # NestJS + Prisma + SQLite
frontend/  # React (Vite) + TS
```

## Backend (NestJS)

1. 安裝依賴
   - `cd backend && pnpm install`
2. 設定環境變數（範例）
   - `DATABASE_URL="file:./dev.db"`
   - `JWT_ACCESS_SECRET="change-me-change-me"`
   - `COOKIE_SECURE=false`（本機）
   - `COOKIE_SAMESITE="lax"`
   - `CORS_ORIGIN="http://localhost:5173"`
   - `LOG_LEVEL="info"`（可選）
3. 資料庫 migration + seed（至少建立預設 LeaveType 與初始 LeaveBalance）
   - `pnpm prisma migrate dev`
   - `pnpm prisma db seed`
4. 啟動
   - `pnpm start:dev`

## Frontend (Vite)

1. 安裝依賴
   - `cd frontend && pnpm install`
2. 設定 API base URL
   - `VITE_API_BASE_URL=http://localhost:3000`
3. 啟動
   - `pnpm dev`

## Manual Verification (Happy Path)

- 員工：登入 → 新增草稿 →（需要附件的假別先上傳）→ 送出 → 狀態為 submitted
- 主管：登入 → 待審清單 → 核准/駁回（駁回需原因）→ 狀態變 approved/rejected
- 員工：我的請假列表 → 篩選/排序 → 點進詳情
- 員工：submitted 可撤回 → 狀態為 cancelled
- 員工：剩餘假期（Leave Balance）頁確認 `available = quota - used - reserved`
- 主管：部門日曆 → 切換月份 → includeSubmitted → 點事件導向詳情

## Notes

- 本機同站（same-site）部署，cookie 預設用 `SameSite=Lax`。
- 若未來前後端不同網域，需調整 `SameSite=None; Secure` 並加入 CSRF 防護策略。
