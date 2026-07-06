# 社團活動管理平台（Activity Management Platform）

此專案採前後端分離：

- 後端：NestJS + Prisma (SQLite)（`backend/`）
- 前端：React + Vite + TypeScript（`frontend/`）

## 先決條件

- Node.js（建議使用 LTS）

## 安裝

```bash
cd backend && npm install
cd ../frontend && npm install
```

## 啟動（開發模式）

### 後端

```bash
cd backend
npm run prisma:migrate
npm run db:seed
npm run dev
```

- 預設啟動於 `http://localhost:3000`
- Health check：`GET /health`

### 前端

```bash
cd frontend
npm run dev
```

- 預設啟動於 `http://localhost:5173`

## 測試帳號（seed）

> 執行 `cd backend && npm run db:seed` 後可使用。

| 身分 | Email | 密碼 |
|------|-------|------|
| Admin | `admin@example.com` | `password1234` |
| Member | `member@example.com` | `password1234` |

## 測試

> 測試尚在逐步補齊中（請以 feature tasks 為準）。

```bash
cd backend && npm test
cd frontend && npm test
```
