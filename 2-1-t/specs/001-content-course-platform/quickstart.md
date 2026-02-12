# Quickstart: 線上課程平台（非影音串流）

本文件目標是讓你在本機把專案跑起來（DB/migrate/seed/測試）。

## 1) 前置需求

- Node.js 20 LTS
- SQLite（通常系統內建即可；Prisma 會使用內建 driver）

## 2) 環境變數

建議建立 `.env`（或 `.env.local`）並至少包含：

- `DATABASE_URL="file:./dev.db"`
- `SESSION_SECRET="<至少 32 bytes 的隨機字串>"`

可直接從範本開始：

- `cp .env.example .env`

## 3) 安裝依賴

在 repo root：

- `npm install`

（若採用 `pnpm` / `yarn`，請以實際 lockfile 為準。）

## 4) 初始化資料庫（Prisma + SQLite）

- 產生 client：`npm run prisma:generate`
- 套用 migration：`npm run prisma:migrate`
- 匯入 seed 資料：`npm run prisma:seed`

（若尚未有 migration，先建立 schema 後執行 `npx prisma migrate dev --name init`。）

## 5) 準備檔案目錄

- 建立目錄：`mkdir -p storage/uploads`

（上傳實際會自動建立目錄，但建議先建立以便開發時一目了然。）

## 6) 啟動開發伺服器

- `npm run dev`

預期：

- Web：`http://localhost:3000`
- API base：`/api/*`

## 7) 測試

### Unit（Vitest）

- `npm run test`

### E2E（Playwright）

- 首次安裝瀏覽器：`npx playwright install`
- 跑 e2e：`npm run test:e2e`

提示：Playwright 會自動啟動 dev server（預設 port 3005，可用 `PORT=3000 npm run test:e2e` 覆寫）。

### 上傳檔清理

- 清理疑似孤兒檔：`npm run cleanup:uploads`
- Dry-run：`npm run cleanup:uploads -- --dry-run`
- 指定只刪除超過 N 小時：`npm run cleanup:uploads -- --older-than-hours 24`

## 8) 內建測試帳號（seed）

- Admin：`admin@example.com` / `password123`
- Instructor：`instructor@example.com` / `password123`
- Student：`student@example.com` / `password123`

> E2E 測試建議使用獨立 SQLite 檔（例如 `file:./e2e.db`），並在 test setup 中執行 migrate/seed。

## 8) 常見問題

- 登入後仍顯示未登入：確認 cookie domain/path/secure 設定（local dev 通常 `secure: false`）。
- 被停用帳號仍可操作：確認每次 request 都重新查 `User.is_active`（不要只信任 cookie payload）。
- 未購買者看得到內容：確認所有內容 API（含 `/api/files/*`）都有做 resource-level 授權檢查。
