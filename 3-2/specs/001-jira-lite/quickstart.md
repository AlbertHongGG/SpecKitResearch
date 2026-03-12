# Quickstart: Jira Lite（設計/開發啟動指引）

本文件描述本機開發啟動流程與最小驗證情境（已依目前實作更新）。

## Tech Stack

- Frontend: Next.js（App Router）+ TypeScript + Tailwind + TanStack Query + React Hook Form + Zod + date-fns
- Backend: NestJS（Node.js/TypeScript）REST API
- DB: SQLite（單檔）+ Prisma + Prisma Migrate
- Testing（建議）: Vitest（unit）+ Playwright（E2E）

## Repository Layout（目標結構）

```text
apps/
  frontend/   # Next.js
  backend/    # NestJS
packages/
  contracts/  # OpenAPI 產物與（可選）型別生成
```

## Local Setup（目前流程）

1) 安裝依賴

- 使用任一 Node.js 套件管理工具（npm/pnpm/yarn 其一），安裝 root 與各 app 依賴。

2) 設定環境變數（範例）

- `DATABASE_URL=file:./dev.db`（SQLite 單檔）
- `SESSION_SECRET=...`（session 簽章/加密用）
- `APP_ORIGIN=http://localhost:3000`（前端）
- `API_ORIGIN=http://localhost:4000`（後端）

3) 初始化資料庫 + seed

- 目前 E2E 與本機啟動都可用 `prisma db push` 來同步 schema
- 執行 seed 產生初始資料（platform admin、demo org/project 等）

Windows（cmd）範例：

```bat
cd apps\backend
set DATABASE_URL=file:./dev.db&& set SESSION_SECRET=dev-session-secret-32chars-min&& set APP_ORIGIN=http://127.0.0.1:3000&& set PORT=4000&& npx prisma db push && npm run db:seed
```

4) 啟動開發伺服器

- Backend（NestJS）

```bat
cd apps\backend
set DATABASE_URL=file:./dev.db&& set SESSION_SECRET=dev-session-secret-32chars-min&& set APP_ORIGIN=http://127.0.0.1:3000&& set PORT=4000&& npm run dev
```

- Frontend（Next.js）

```bat
cd apps\frontend
set NEXT_PUBLIC_API_ORIGIN=http://127.0.0.1:4000&& npm run dev
```

## Seed-data verification checklist

執行 `npm run db:seed` 後，至少應存在：

- Users（密碼皆為 `password1234`）
  - `admin@example.com`（Platform Admin）
  - `user@example.com`（Regular User）
  - `viewer@example.com`（Viewer User）
- Organization
  - `Demo Org`（status=active, plan=free）
- Projects（位於 Demo Org）
  - `PROJ`（kanban, active）
  - `SCRUM`（scrum, active）

## Smoke Scenarios（post-implementation）

- Guest → `/login`（成功登入後回到 returnTo）
- Platform Admin → `/platform/orgs` 建立 org、切換 plan/status
- Org Admin → `/orgs/:orgId/invites` 建立 invite，受邀者用 `/invite/:token` 加入
- `/orgs` → `/orgs/:orgId/projects` → `/projects/:projectId/board`
- Project settings → `/projects/:projectId/settings` 封存專案（archive，不可逆）
- Read-only rules
  - org suspended 時：邀請/建專案/封存等寫入應被拒絕（403 + ORG_SUSPENDED），UI 顯示唯讀提示
  - project archived 時：issue mutation/留言/transition 應被拒絕（403 + PROJECT_ARCHIVED），UI 顯示唯讀提示
- Audit
  - `/audit` 可用 scope filters 查詢（platform/org/project）

## Testing Strategy（最小集合）

- Unit（Vitest）: RBAC 判斷、tenant 邊界、workflow 合法轉換、deprecated status
- E2E（Playwright）:
  - 401 導向 /login（returnTo）
  - 非成員存取 org/project 回 404
  - suspended/archived 下寫入拒絕與 UI 不顯示寫入 CTA
