# Content Course Platform（非影音串流）

以 Next.js App Router + Route Handlers 實作的內容型線上課程平台（文字 / 圖片 / PDF）。

## 快速開始

### 1) 安裝

- `npm install`

### 2) 設定環境變數

- `cp .env.example .env`

至少需要：

- `DATABASE_URL`（SQLite）
- `SESSION_SECRET`（cookie session 簽名）

### 3) 初始化 DB（Prisma）

- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`

### 4) 啟動

- `npm run dev`

開啟：

- `http://localhost:3000`

## 測試

### Unit（Vitest）

- `npm run test`

### E2E（Playwright）

- 首次安裝瀏覽器：`npx playwright install`
- `npm run test:e2e`

（Playwright 會自動啟動 dev server，預設使用 port 3005。）

## 內建測試帳號（seed）

- Admin：`admin@example.com` / `password123`
- Instructor：`instructor@example.com` / `password123`
- Student：`student@example.com` / `password123`

## 常用指令

- Lint：`npm run lint`
- Build：`npm run build`
- Format：`npm run format`
- 清理疑似孤兒上傳檔：`npm run cleanup:uploads`（可加 `-- --dry-run`）

## 專案結構

- `app/`：Next.js App Router（頁面 + API Route Handlers）
- `src/domain/`：domain 邏輯（狀態機、access control 等）
- `src/server/`：server utilities（session、guards、files、errors、Prisma）
- `src/ui/`：UI components / hooks / client utils
- `prisma/`：schema、seed
- `tests/unit/`：Vitest 單元測試
- `tests/e2e/`：Playwright E2E
- `specs/001-content-course-platform/`：SpecKit 產物（spec/plan/tasks/contracts 等）

## 規格與合約

- 規格：specs/001-content-course-platform/spec.md
- OpenAPI：specs/001-content-course-platform/contracts/openapi.yaml
- Quickstart：specs/001-content-course-platform/quickstart.md
