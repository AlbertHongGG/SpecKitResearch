# Multi-vendor Marketplace（SpecKit workspace）

本 repo 依 SpecKit 流程產出規格/計畫/tasks，並以 Next.js（App Router）+ NestJS + Prisma + SQLite 實作多商家 Marketplace。

## 開發環境

- Node.js: `22.x`

## 初次啟動（本機）

1) 安裝依賴

```bash
npm install
```

2) 環境變數

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

3) 建立 DB（migrate + seed）

```bash
npm run prisma:migrate
npm run prisma:seed
```

4) 同時啟動前後端

```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
