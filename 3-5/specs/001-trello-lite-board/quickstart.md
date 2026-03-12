# Quickstart: Trello Lite（本機開發）

**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Contracts**: [contracts/openapi.yaml](contracts/openapi.yaml)  
**Date**: 2026-02-04

本文件提供最小可行的本機啟動與驗證路徑（不依賴雲端服務；DB 固定 SQLite 單檔）。

---

## Prerequisites

- Node.js 20+
- 你偏好的套件管理器（npm / pnpm / yarn 皆可；以下以 npm 表示）

---

## Repository layout（目標）

- backend/：Fastify + Prisma + SQLite
- frontend/：Next.js（App Router）

> 若目前 repo 尚未建立上述資料夾，請依 [plan.md](plan.md) 的結構決策建立後再開始實作。

---

## Environment variables（建議）

Backend（示意）：
- DATABASE_URL：指向 SQLite 檔案（例如 `file:./dev.db`）
- AUTH_ACCESS_TTL_SECONDS：access token 存活秒數（例如 900）
- AUTH_REFRESH_TTL_DAYS：refresh token 存活天數（例如 14）
- COOKIE_SECURE：本機可為 false，部署必須 true
- COOKIE_SAMESITE：建議 Lax（同站部署）

---

## Database (SQLite + Prisma)

- 初始化 Prisma schema 與 migrations
- 產生 SQLite 檔案（單檔）
- 套用 migrations 後，確認以下最小索引/約束存在：
  - ProjectMembership unique(project_id, user_id)
  - Task(list_id, position)
  - ActivityLog(project_id, timestamp desc)

---

## Run backend

```sh
cd backend
npm install
npm run prisma:migrate
npm run dev
```

預設：API 會在 `http://localhost:4000`（依 `PORT` env 而定）。

> CSRF 最小防護：所有非 GET/HEAD/OPTIONS 的 API 請求需要帶 `x-csrf` header（任意非空字串即可；前端已內建送出 `x-csrf: 1`）。

目標：
- 能提供 REST API（見 [openapi.yaml](contracts/openapi.yaml)）
- 能提供 SSE endpoint（見 openapi 的 `GET /projects/{projectId}/events`）

最小驗證：
1. 註冊 → 登入 → 建立專案
2. 建立 Board/List/Task
3. 拖拉（MoveTask）後取得權威排序摘要
4. 新增 comment 與 activity log 查詢
5. 封存 Project 後任何寫入都被拒絕

（用 curl 測試寫入時記得加 header）

```sh
curl -i -X POST "$API_BASE/auth/login" \
  -H 'content-type: application/json' \
  -H 'x-csrf: 1' \
  --data '{"email":"a@example.com","password":"password123"}'
```

---

## Run frontend

```sh
cd frontend
npm install

# 指向後端 API
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:4000' > .env.local

npm run dev
```

目標頁面（對齊 spec）：
- `/`、`/register`、`/login`
- `/projects`
- `/projects/:projectId/board`
- `/projects/:projectId/members`
- `/projects/:projectId/activity`
- `/projects/:projectId/archived`

最小驗證：
- 401：未登入導向 `/login` 並保留返回路徑
- 403：非專案成員禁止存取
- 404：專案不存在顯示找不到
- 看板頁：snapshot 載入 + SSE 訂閱事件，能即時更新 task 排序 / comment / activity

---

## Suggested test strategy (optional but recommended)

- Vitest：
  - Task 狀態機合法轉換
  - WIP 限制（含 Admin/Owner override 與 ActivityLog 追加）
  - 版本衝突（version 不一致應拒絕並回傳最新）
  - position 生成（between prev/next）
- Playwright：
  - 兩個使用者同專案：拖拉後另一端即時看到一致排序
  - Viewer 角色：UI 不顯示寫入入口，且後端拒絕寫入

