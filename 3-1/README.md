# 多商家電商平台（Marketplace）

此 repo 採 monorepo 結構：

- `backend/`: NestJS + Prisma（SQLite）REST API
- `frontend/`: Next.js（App Router）Web UI

## 開發

- `npm run dev`：同時啟動前後端
- `npm run lint` / `npm run format` / `npm run test`：各自執行 workspace scripts

更多端到端驗收流程請見：`specs/001-multi-vendor-marketplace/quickstart.md`
