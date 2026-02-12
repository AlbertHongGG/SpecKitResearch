# 社團活動管理平台（Activity Management Platform）

本 repo 包含：

- `backend/`: NestJS + Prisma + SQLite（REST API，JWT auth，RBAC）
- `frontend/`: React + Vite + Tailwind（TanStack Query / React Hook Form / Zod）

API 契約來源：

- `specs/001-activity-management/contracts/openapi.yaml`

## 本機啟動

### 1) 安裝

```bash
npm install
```

### 2) 後端環境變數

```bash
cp backend/.env.example backend/.env
```

### 3) 建立資料庫與 seed

```bash
npm --workspace backend run prisma:migrate
npm --workspace backend run prisma:seed
```

### 4) 啟動

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/health
- OpenAPI YAML: http://localhost:3000/docs/openapi.yaml

## Demo 流程（建議）

### Seed 帳號

- admin: `admin@example.com` / `admin1234`
- member: `member@example.com` / `member1234`
- member2: `member2@example.com` / `member1234`

### Member

- 公開列表：`/`（活動列表）
- 活動詳情：點進活動後可報名（需登入）
- 我的活動：`/me/activities`（可取消報名：僅未結束且未過截止）

### Admin

- 管理後台：`/admin`
- 建立/編輯活動：`/admin/activities/new`、`/admin/activities/:activityId/edit`
- 名單與 CSV：`/admin/activities/:activityId/roster`

## 測試

```bash
npm test
npm --workspace backend run test:e2e
```

## 開發規範

請見 [CONTRIBUTING.md](CONTRIBUTING.md)。
