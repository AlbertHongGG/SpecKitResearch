# Quickstart

## 1) Install dependencies

```bash
npm install
```

## 2) Generate Prisma client + migrate + seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## 3) Start backend and frontend

```bash
npm run dev
```

## 4) Run tests

```bash
npm run test
npm run e2e
```

## 5) Common failures

- If `DATABASE_URL` is missing, copy `.env.example` and configure local sqlite path.
- If playwright browser missing: `npx playwright install`.
