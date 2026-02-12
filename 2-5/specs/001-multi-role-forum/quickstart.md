# Quickstart: 多角色論壇／社群平台（計畫版）

**Date**: 2026-02-09  
**Feature**: [plan.md](./plan.md)

此 Quickstart 描述「完成程式碼腳手架後」的本機開發流程；實際指令可能會隨 Phase 2 tasks 產生的專案結構微調。

---

## Prerequisites

- Node.js 20 LTS
- SQLite（使用本機單檔；由 Prisma 驅動）

---

## Environment Variables

- `DATABASE_URL=file:./dev.db`
- `SESSION_SECRET=...`（用於 session token 簽章/派生）
- `CSRF_SECRET=...`（用於 CSRF token 簽章）

（選配）
- `SEED_ADMIN_EMAIL=admin@example.com`
- `SEED_ADMIN_PASSWORD=change-me-please`

---

## Setup

1) 安裝依賴

- `npm install`

2) 建立資料表

- `npm run db:migrate`

3) 啟動開發伺服器

- `npm run dev`

4) （選配）建立種子資料（看板 / Admin）

- `npm run db:seed`

---

## Testing

- 單元：`npm test`
- E2E：`npm run test:e2e`

建議 E2E 最少覆蓋：401/403/404、看板停用限制、Moderator board scope、鎖文限制、重複 Like/Favorite/Report 冪等。

---

## Troubleshooting

- 若遇到 `SQLITE_BUSY` 類錯誤：確認已啟用 WAL、busy timeout、交易保持短小，並檢查是否多進程/多實例同時寫入同一個 DB 檔。
