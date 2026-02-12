# Quickstart: 社團活動管理平台（001-activity-management）

本 Quickstart 以「已完成專案骨架與功能」為前提，提供本機啟動與 demo 流程。

## Prerequisites

- Node.js：建議 20 LTS
- npm：建議使用 npm（或自行改用 pnpm/yarn，但請全專案一致）

## Repo Layout

```text
backend/   # NestJS + Prisma + SQLite
frontend/  # React(Vite) + TS + Tailwind + TanStack Query
specs/     # 規格文件（已存在）
```

## 1) 安裝依賴

```bash
cd /path/to/repo
npm install
```

## 2) 設定環境變數

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## 3) 建立資料庫與 seed

```bash
npm --workspace backend run prisma:migrate
npm --workspace backend run prisma:seed
```

## 4) 啟動（frontend + backend）

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/health
- OpenAPI YAML: http://localhost:3000/docs/openapi.yaml

## 5) Demo 帳號（seed）

seed 會建立以下帳號提醒：

- admin: `admin@example.com` / `admin1234`
- member: `member@example.com` / `member1234`
- member2: `member2@example.com` / `member1234`

## 6) 測試

```bash
npm test
npm --workspace backend run test:e2e
```

## 7) 以契約為準（OpenAPI）

- API 契約請以 [contracts/openapi.yaml](contracts/openapi.yaml) 為唯一真實來源。
- 前端資料抓取與錯誤處理需對應：401/403/404/409/422。

## 8) 一致性與冪等（實作重點）

- 報名/取消與手動狀態變更都應要求 `Idempotency-Key`（或 request_id）
- 後端以單一交易完成：冪等鍵 claim → 狀態/截止驗證 → 名額 gate（原子）→ Registration 變更 → Activity.status 更新

（已實作）
