# Quickstart: 公司內部請假系統（Leave Management System）

**Feature**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Date**: 2026-01-31

本 quickstart 對應此 repo 目前的實作（monorepo：`backend/` + `frontend/`），可直接在本機啟動並依 US1→US2→US3 進行 Demo。

---

## 1) Prerequisites

- Node.js（建議 Node 20 LTS）
- Git

（可選）SQLite GUI 工具 / Prisma Studio

---

## 2) 目錄結構

- `backend/`：NestJS + Prisma + SQLite
- `frontend/`：React（Vite）+ TypeScript + Tailwind + TanStack Query
- `specs/001-leave-management/contracts/openapi.yaml`：契約來源

---

## 3) 安裝依賴（repo root）

```bash
npm install
```

---

## 4) Backend

### Environment variables

從範例建立本機 `.env`：

```bash
cp backend/.env.example backend/.env
```

必要環境變數（預設值已在 `backend/.env.example`）：

- `DATABASE_URL=file:./dev.db`
- `TZ=Asia/Taipei`
- `APP_ORIGIN=http://localhost:5173`
- `COOKIE_SECURE=false`
- `JWT_ACCESS_SECRET=...`
- `JWT_REFRESH_SECRET=...`
- `UPLOAD_DIR=./uploads`

### Setup（migrate + seed）

```bash
npm --prefix backend run prisma:migrate
npm --prefix backend run seed
```

### Run

```bash
npm --prefix backend run start:dev
```

API 預設：`http://localhost:3000`

### 測試帳號（seed 產生）

- `employee@example.com` / `password123`
- `manager@example.com` / `password123`
- `hr@example.com` / `password123`

---

---

## 5) Frontend

從範例建立本機 `.env`：

```bash
cp frontend/.env.example frontend/.env
```

（預設）`VITE_API_BASE_URL=http://localhost:3000`

```bash
npm --prefix frontend run dev
```

前端將以 cookie-based auth 與後端互動；所有寫入動作需帶 CSRF header（依 [research.md](research.md) 的決策）。

---

---

## 6) 驗收導向操作（本機）

- 員工登入
- 建立 draft 請假 → 送出（submitted）→ 觀察 Reserved/Available
- 撤回 submitted（cancelled）→ 觀察 Reserved 釋放
- 主管登入 → 待審清單核准/駁回 → 觀察 Used/Reserved 轉換與審核紀錄
- 主管日曆：切換 month/week、顯示 submitted/approved（不同樣式）

---

---

## 7) 測試

```bash
# backend
npm --prefix backend test
npm --prefix backend run test:e2e

# frontend
npm --prefix frontend test

# 全域（依 root package.json）
npm test
```
