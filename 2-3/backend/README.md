# Backend (Fastify + Prisma + SQLite)

## Prerequisites

- Node.js 20+

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:migrate
```

## Run

```bash
npm run dev
```

## Prisma

- 產生 client：`npm run prisma:generate`
- 建立/套用 migration（dev）：`npm run prisma:migrate`
- 管理介面：`npm run prisma:studio`
