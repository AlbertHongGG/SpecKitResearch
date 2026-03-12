# Multi-vendor Marketplace（SpecKit workspace）

本 repo 依 SpecKit 流程產出規格/計畫/tasks，並以 Next.js（App Router）+ NestJS + Prisma + SQLite 實作多商家 Marketplace。

## 開發環境

- Node.js: `22.x`

## 初次啟動（本機）

1. 安裝依賴

```bash
npm install
```

2. 環境變數

```bash
cp backend/.env.example backend/.env
```

如需覆寫前端 API 位址，可自行建立 `frontend/.env.local`：

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

3. 建立 DB（schema sync + seed）

```bash
npm run prisma:push
npm run prisma:seed
```

如果你是在新增或調整 migration 檔本身，再使用 `npm run prisma:migrate`。

4. 同時啟動前後端

```bash
npm run dev
```

- Frontend: http://localhost:5174
- Backend: http://localhost:4000

## 測試帳號

- Admin: `admin@example.com` / `password`
- Seller 1: `seller@example.com` / `password`
- Seller 2: `seller2@example.com` / `password`
- Buyer: `buyer@example.com` / `password`
