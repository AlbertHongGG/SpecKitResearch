# Quickstart: 個人記帳與月報表網站

**Feature docs**: [spec.md](./spec.md), [plan.md](./plan.md)  
**Created**: 2026-02-01

本文件描述「開發環境」的最小啟動流程（供 Phase 2 實作時落地）。

## Prerequisites

- Node.js（LTS）
- 套件管理器：`pnpm`（或 `npm`）

## Environment Variables

建立 `.env`（或 `.env.local`）並設定：

- `DATABASE_URL`：SQLite 連線字串（例如 `file:./dev.db`）
- `AUTH_SECRET`：隨機長字串（production 必填，用於簽發/驗證 session JWT）
- `AUTH_COOKIE_NAME`：session cookie 名稱（例如 `auth_session`）
- `APP_URL`：本機可用 `http://localhost:3000`（用於同源檢查）

## Install

- `pnpm install`

## Database

- 產生 Prisma client：`pnpm prisma generate`
- 套用 migrations（開發環境）：`pnpm prisma migrate dev`
- Seed 預設類別（如有）：`pnpm prisma db seed`

## Run Dev Server

- `pnpm dev`
- 開啟 `http://localhost:3000`

## Smoke Tests (Manual)

- 註冊新帳號 → 自動導向帳務列表
- 新增一筆支出 → 列表可見且每日小計更新
- 進入月報表頁 → 當月統計與圖表顯示
- 停用某類別 → 新增帳務時不可再選到該類別
- 匯出 CSV（如啟用）→ 下載內容與畫面一致

### Validation Checklist
- 受保護頁面未登入：應導向 `/login`
- 任一 API 回應 header：應含 `x-request-id`，且 per-user API 應 `cache-control: no-store`
- 連續快速觸發寫入/登入：若超過限制，應回 `429 RATE_LIMITED`

## Troubleshooting

- 登入後仍被視為未登入：確認 `AUTH_SECRET` 是否固定、以及 session cookie 是否被瀏覽器保存。
- 類別名稱重複未被阻擋：確認 SQLite partial unique index 是否已在 migration SQL 中建立（見 data-model.md）。