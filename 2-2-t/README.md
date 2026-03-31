# SmartBooking

依 `specs/001-smartbooking-scheduling/` 的規格與契約實作：
- Frontend：React + TS + Tailwind（Vite）
- Backend：NestJS + TS + Prisma + SQLite

## 快速開始

- 後端：
  - `cd backend`
  - `npm install`
  - `cp .env.example .env`
  - `npm run prisma:migrate`
  - `npm run prisma:seed`
  - `npm run dev`（`http://localhost:4000/api`）

- 前端：
  - `cd frontend`
  - `npm install`
  - `cp .env.example .env`
  - `npm run dev`（`http://localhost:5174`）

更多細節請看 `specs/001-smartbooking-scheduling/quickstart.md`。
