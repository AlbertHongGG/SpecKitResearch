# Quickstart: Logic-driven Dynamic Survey/Form System（動態邏輯問卷／表單系統）

**Feature**: 001-dynamic-survey-logic  
**Date**: 2026-02-05  
**Spec**: [specs/001-dynamic-survey-logic/spec.md](spec.md)  
**Plan**: [specs/001-dynamic-survey-logic/plan.md](plan.md)

本 Quickstart 針對本功能的「預期專案形態」提供最短路徑的啟動方式。

---

## Tech Stack

- Frontend: Next.js（App Router）+ TypeScript + Tailwind CSS
- Data fetching: TanStack Query
- Forms/Validation: React Hook Form + Zod
- Backend: Node.js + NestJS（REST JSON）+ TypeScript
- Auth: Cookie-based Session
- Validation: Zod（request/response schema）
- DB: SQLite（單檔）+ Prisma + Prisma Migrate
- Testing（建議）: Playwright（E2E）+ Vitest（FE）+ Jest（BE）

---

## Repository Layout（預期）

```text
apps/
  web/            # Next.js
  api/            # NestJS
packages/
  logic-engine/   # 共用動態邏輯引擎（isomorphic core + server adapter）
  contracts/      # 共用 DTO / Zod schemas / error codes（可選但建議）
prisma/
  schema.prisma
```

---

## Local Development（建議流程）

1) 安裝依賴
- `npm install`

2) 設定環境變數（開發）
- `cp .env.example .env`
- 依需要調整 `DATABASE_URL` / `SESSION_SECRET` / `APP_BASE_URL`（預設即可跑本機）

3) 初始化資料庫（SQLite）
- `npx prisma db push`
- `npx prisma db seed`

4) 啟動後端（NestJS）
- `npm run dev:api`

5) 啟動前端（Next.js）
- `npm run dev:web`

6) 本機驗證（建議順序）
- 後端 e2e（tsx + node:test）：`npm -w apps/api test`
- Playwright E2E：`npm run test:e2e`

---

## Environment Variables（建議）

- `DATABASE_URL`：SQLite 檔案路徑（Prisma）
- `SESSION_SECRET`：session 簽章密鑰
- `APP_BASE_URL`：用於產生 return_to / redirect 的 base url

---

## Verification Checklist（最小驗證）

- 可以登入並進入 /surveys（未登入則 401）
- 可以建立 Draft 問卷並保存（含 forward-only + cycle detection）
- 可以發佈後取得 publish_hash，且結構變更被禁止
- /s/:slug 填答時動態顯示/隱藏一致；送出時後端重算可見性並拒收 hidden 答案
- 送出後生成 response_hash，且 Response/Answer 不可修改

### US3（發佈/結果/匯出）最小驗證

- 管理者在 `/surveys/:id/edit` 可以 `Publish`；狀態變成 `Published` 且顯示 `publish_hash`
- `/s/:slug` 填答送出後，`/surveys/:id/results` 顯示 `Responses: 1`
- `Download export (JSON)` 可以下載含 `response_hash` 的 export

