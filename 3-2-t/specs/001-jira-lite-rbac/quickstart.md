# Quickstart（Jira Lite）

## 1. 先決條件

- Node.js 20 LTS
- npm 10+
- SQLite（本機檔案，透過 Prisma 驅動）

## 2. 專案結構（預期）

- `frontend/`：Next.js App Router + TypeScript + Tailwind
- `backend/`：NestJS + Prisma + SQLite

## 3. 安裝與初始化

```bash
# backend
cd backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run schema:validate
npm run seed

# frontend
cd ../frontend
npm install
```

## 4. 啟動開發伺服器

```bash
# terminal A
cd backend
npm run start:dev

# terminal B
cd frontend
npm run dev
```

## 5. 契約與基本驗證

```bash
# backend contract/unit
cd backend
npm run build
npm run ci:api
npm run test
npm run test:csrf
npm run test:performance
npm run test:contract

# frontend unit
cd ../frontend
npm run build
npm run test

# e2e
npm run test:e2e
```

## 6. 首次驗證清單

1. Guest 存取 `/login` 成功，受保護路由回 `401` 並導向 login。
2. 非成員直連 `/orgs/:orgId`、`/projects/:projectId` 回 `404`。
3. 成員但權限不足操作設定頁回 `403`。
4. Organization `suspended` 後所有寫入回 `403 ORG_SUSPENDED`。
5. Project `archived` 後 Issue 編輯/留言/轉換回 `403 PROJECT_ARCHIVED`。
6. 非法 workflow transition 被拒絕。
7. 同步編輯 issue 觸發 `409 CONFLICT`。
8. Audit log 可查詢到關鍵事件（who/when/what/before/after）。

## 7. 失敗恢復流程

- Migration 失敗：執行 `backend/scripts/migration-rollback-check.sh` 驗證 backup/restore 路徑，修正 schema 後重跑 migration。
- 啟動失敗：檢查 `DATABASE_URL` 與 prisma client 是否重新 generate。
- 權限異常：以 contract test 驗證 `401/403/404` 判斷順序。

## 8. 開發守則

- 所有寫入 API 必須先做：AuthN -> Membership -> Role -> ReadOnlyPolicy。
- 前端只負責可見性與 UX，不得作為安全控制唯一依據。
- 所有狀態變更必須寫入 AuditLog。
