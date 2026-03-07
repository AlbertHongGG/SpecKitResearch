多角色論壇／社群平台（Multi-Role Forum & Community Platform）

規格、設計與任務清單位於 specs/001-multi-role-forum/。

建議先讀 quickstart：specs/001-multi-role-forum/quickstart.md

## 開發

安裝依賴：

```bash
npm install
```

建立環境變數：

```bash
cp .env.example .env
```

建議 `.env`（前端來源 5173/5174、後端 4000）：

```env
DATABASE_URL="file:./dev.db"
APP_ORIGIN="http://localhost:5174"
APP_ORIGINS="http://localhost:5173,http://localhost:5174"
SESSION_SECRET="請填至少 32 字元"
CSRF_SECRET="請填至少 32 字元"
```

初始化 DB（第一次需要 migrate + seed）：

```bash
npm run db:migrate
npm run db:seed
```

啟動：

```bash
npm run dev
```

- 後端/API：`http://localhost:4000`
- 允許跨來源（含憑證）前端來源：`http://localhost:5173`、`http://localhost:5174`

若你要前後端分開跑（建議測試 CORS 時用）：

```bash
# Terminal 1: backend
npm run dev:backend

# Terminal 2: frontend
npm run dev:frontend
```

- 前端頁面：`http://localhost:5174`
- 前端的 `/api/*` 會自動代理到 `http://localhost:4000/api/*`

## Seed 測試帳號

- admin@example.com / password1234
- mod@example.com / password1234
- user@example.com / password1234

## 測試

Unit（Vitest）：

```bash
npm test
```

E2E（Playwright）：

```bash
npm run playwright
```

## 維運工具

資料一致性自檢：

```bash
npm run db:integrity
```
