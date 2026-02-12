# Quickstart: Jira Lite（設計/開發啟動指引）

本文件描述「預期的」本機開發啟動流程（在尚未產生完整程式碼前，用於對齊開發與驗證方式）。

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

## Local Setup（目標流程）

1) 安裝依賴

- 使用任一 Node.js 套件管理工具（npm/pnpm/yarn 其一），安裝 root 與各 app 依賴。

2) 設定環境變數（範例）

- `DATABASE_URL=file:./dev.db`（SQLite 單檔）
- `SESSION_SECRET=...`（session 簽章/加密用）
- `APP_ORIGIN=http://localhost:3000`（前端）
- `API_ORIGIN=http://localhost:4000`（後端）

3) 初始化資料庫

- 執行 Prisma migrate 產生 schema
- 產生初始資料（platform admin、demo org/project 等）以利手動測試

4) 啟動開發伺服器

- Frontend（Next.js）
- Backend（NestJS）

5) 驗證最小可行流程（MVP）

- Guest → /login
- Org Admin 邀請 → /invite/:token 接受
- /orgs 切換組織 → /orgs/:orgId/projects
- 進入 project：/projects/:projectId/board
- 建立 issue：看到 issue key（PROJ-1）並可在 /projects/:projectId/issues/:issueKey 開啟

## Testing Strategy（最小集合）

- Unit（Vitest）: RBAC 判斷、tenant 邊界、workflow 合法轉換、deprecated status
- E2E（Playwright）:
  - 401 導向 /login（returnTo）
  - 非成員存取 org/project 回 404
  - suspended/archived 下寫入拒絕與 UI 不顯示寫入 CTA
