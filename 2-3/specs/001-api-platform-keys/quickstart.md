# Quickstart: API Platform & Key Management System

本文件提供可直接執行的本機啟動流程（monorepo：backend + frontend）。

## Prerequisites

- Node.js LTS
- pnpm（建議）

## 0) 安裝

在 repo root：

```bash
pnpm install
```

## 1) Backend（NestJS + Prisma + SQLite）

在 repo root：

```bash
pnpm -C backend db:generate
pnpm -C backend db:migrate
pnpm -C backend db:seed

PORT=3101 pnpm -C backend start
```

Seed 會建立 dev 用的管理員帳號：

- Email: `admin@example.com`
- Password: `password123`

可用環境變數覆蓋密碼：`SEED_ADMIN_PASSWORD`。

## 2) Frontend（Next.js App Router）

在 repo root：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3101 PORT=3100 pnpm -C frontend dev
```

打開：

- Developer: `http://localhost:3100/keys`
- Admin: `http://localhost:3100/admin`

## 3) 快速驗證

1. 註冊 Developer → 登入
2. 建立 API Key（只會顯示一次原文）
3. 用 key 呼叫：`GET http://localhost:3101/gateway/demo/demo/ping`
4. 到 `/keys` 或 `/admin/usage` 查詢 Usage Logs
5. 到 `/admin/audit` 查詢 Audit Logs

## 4) 跑測試

```bash
pnpm -C backend test
pnpm -C frontend test:e2e
```
