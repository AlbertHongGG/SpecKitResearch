# 開發指令整理

本專案採 `frontend/` 與 `backend/` 分離。

## Backend（NestJS）

- 安裝：`npm install`
- 開發：`npm run dev`
- 測試：`npm test`
- Prisma：
  - 產生 client：`npm run prisma:generate`
  - 產生/套用 migration：`npm run prisma:migrate`
  - seed：`npm run prisma:seed`

## Frontend（Vite + React）

- 安裝：`npm install`
- 開發：`npm run dev`
- 測試：`npm test`
- E2E（Playwright）：`npm run test:e2e`
