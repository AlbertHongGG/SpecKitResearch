# SaaS 訂閱與計費管理平台

完整實作包含：
- 訂閱狀態機（Trial/Active/PastDue/Suspended/Canceled/Expired）
- 發票與付款流程（Draft/Open/Paid/Failed/Voided）
- Usage metering + entitlement SSOT
- Org Admin / Platform Admin 權限控制
- Admin governance（Plans/Risk/Metrics/Audit）

## 專案結構
- `backend/` NestJS + Prisma + SQLite
- `frontend/` Next.js App Router + Tailwind + TanStack Query
- `shared/contracts/` Zod schema + shared types

## 快速開始
1. `npm install`
2. `cp .env.example .env`
3. `cp backend/.env.example backend/.env`
4. `cp frontend/.env.example frontend/.env.local`
5. `npm run -w backend prisma:migrate`
6. `npm run -w backend seed`
7. `npm run -w backend dev`
8. `npm run -w frontend dev`

## 測試
- `npm run test`
- `npm run test:e2e`
