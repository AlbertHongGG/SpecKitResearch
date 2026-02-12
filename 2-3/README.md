# Trello Lite

本 repo 實作一個「Trello Lite」多人協作看板（Next.js + Fastify + SQLite/Prisma + SSE）。

## 開發環境需求

- Node.js 20+
- npm（或你偏好的套件管理器；本 repo 目前以 npm lockfile 為主）

## 快速啟動

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Backend 預設啟動在 `http://localhost:3001`。

### 2) Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Frontend 預設啟動在 `http://localhost:3000`。

## Specs

設計文件與任務清單在 `specs/001-trello-lite-board/`。
