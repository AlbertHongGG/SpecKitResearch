# Quickstart（開發啟動指引）

本 repo 已完成實作：pnpm workspace monorepo（Next.js App Router 前端 + NestJS/Prisma/SQLite 後端 + shared contracts）。

---

## 前置需求

- Node.js 20 LTS
- pnpm（repo 以 pnpm workspace 為準）

---

## 安裝依賴

在 repo 根目錄：

```bash
pnpm install
```

---

## 設定環境變數

1) 後端

```bash
cp backend/.env.example backend/.env
```

預設值適用本機 HTTP 開發（重要：`SESSION_COOKIE_NAME=sid` + `SESSION_COOKIE_SECURE=false`，避免 `__Host-` + Secure 在 HTTP 下無法種 cookie）。

2) 前端

```bash
cp frontend/.env.example frontend/.env.local
```

---

## 初始化資料庫（SQLite + Prisma）

```bash
pnpm -C backend db:generate
pnpm -C backend db:migrate
pnpm -C backend db:seed
```

---

## 啟動開發環境

同時啟動前後端：

```bash
pnpm dev
```

- 前端：`http://localhost:3000`
- 後端：`http://localhost:3001`

若 `3000` 被占用，可改用：

```bash
pnpm -C frontend dev -- -p 3100
```

---

## Seed 帳號（db:seed）

- admin：`admin@example.com` / `password123`
- instructor：`instructor@example.com` / `password123`
- student：`student@example.com` / `password123`

---

## 測試

### Backend（Vitest）

```bash
pnpm -C backend test
```

### Frontend E2E（Playwright）

首次需安裝瀏覽器：

```bash
pnpm -C frontend test:e2e:install
```

執行 E2E（會自動 build + 啟動後端/前端 webServer；前端使用 `http://localhost:3100` 避開常見的 3000 衝突）：

```bash
pnpm -C frontend test:e2e
```

---

## 一口氣驗證（建議 CI/驗收用）

```bash
pnpm -r build
pnpm -r lint
pnpm -r test
```
