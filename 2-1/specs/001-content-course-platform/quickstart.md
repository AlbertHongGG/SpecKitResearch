# Phase 1 — Quickstart: 線上課程平台（非影音串流）

**Date**: 2026-02-03

本 Quickstart 以「Next.js（App Router）+ Prisma + SQLite（本機單檔）」為基準，提供在本機啟動與驗證關鍵流程的步驟。

## Prerequisites

- Node.js（建議使用 LTS）
- Git

## Environment

- `DATABASE_URL`: `file:./dev.db`（範例）
- `SESSION_SECRET`: 用於簽名/加密 session 的伺服器端秘密值（不可提交到 repo）
- `UPLOAD_DIR`: 用於存放圖片/PDF 的目錄（不得位於 `/public`）

## Local Setup (planned)

1) 安裝依賴

- `npm install`

2) 初始化資料庫（Prisma + SQLite）

- `npm run prisma:deploy`
- `npm run prisma:seed`
- `npx prisma studio`（可選，用於查看資料）

3) 啟動開發伺服器

- `npm run dev`

## Smoke Test Checklist

- Guest 可以瀏覽 `/courses` 與已上架課程詳情（只看到大綱標題，不看到內容）。
- 未登入或 session 失效時，存取 `/my-courses` 會被引導登入（或 API 回 401）。
- 已登入但未購買時，存取課程內容/附件一律回 403。
- 購買後可進入閱讀頁並讀取 Lesson 內容（text/image/pdf）。
- 重複購買會被阻擋並回 409（已購買）。
- 教師可建立 draft 課程、送審（draft→submitted）。
- 管理員可核准/駁回 submitted，且駁回理由必填並留下審核紀錄。

### Seeded accounts (dev)

- admin: `admin@example.com` / `password123`
- instructor: `instructor@example.com` / `password123`
- student: `student@example.com` / `password123`

### Automated smoke test

- `bash scripts/quickstart-smoke.sh`

## Testing (optional)

- Unit: `npm run test`
