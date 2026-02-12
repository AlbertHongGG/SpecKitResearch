# Quickstart: 內部文件審核與簽核系統

**Branch**: 001-document-review-approval
**Date**: 2026-02-02

本 quickstart 以「最小可驗證」為目標：

- 三角色登入（User/Reviewer/Admin）
- Admin 建立一個可用流程模板（至少 1 step 且有 assignees）
- User 建立 Draft → 編輯 → 上傳附件 → 送審
- Reviewer 在 /reviews 對任務同意/退回（退回理由必填）
- Admin 對 Approved 文件封存

---

## 1) 必要環境

- Node.js（建議 LTS：Node 20）
- SQLite（由 Prisma 直接使用本機檔案，不需額外安裝 server）

---

## 2) 專案結構

- backend/：Fastify + Prisma + SQLite
- frontend/：React SPA
- packages/contracts/：Zod schemas + TS types（前後端共享）
- storage/attachments/：附件不可變檔案儲存位置

---

## 3) 開發模式啟動

以下命令以 repository root 執行。

- 安裝依賴：
  - `npm install`

- Backend（Fastify + Prisma + SQLite）：
  - 開一個終端機：
    - `cd backend`
    - `export DATABASE_URL="file:./prisma/dev.db"`
    - `export JWT_SECRET="dev-secret"`
    - `export NODE_ENV="development"`
    - `npm run prisma:generate`
    - `npm run prisma:migrate`
    - `npm run db:seed`
    - `npm run dev`

- Frontend（React + Vite）：
  - 另開一個終端機：
    - `cd frontend`
    - `npm run dev`

> 前端 dev server 會透過 Vite proxy 將 `/api/*` 轉送到 `http://localhost:3000`。

### Seed 預設帳號

seed 會建立/更新以下帳號，密碼皆為 `password`：

- Admin：`admin@example.com`
- User：`user@example.com`
- Reviewer：`reviewer1@example.com`、`reviewer2@example.com`

---

## 4) 最小驗證腳本（手動）

1. 以 User 登入 → /documents → 建立文件 → 編輯 title/content → 上傳附件 → 送出簽核
  - 送審時可選擇 seed 的「預設流程」
2. 以 Reviewer 登入 → /reviews → 進入任務對應文件 → 同意或退回
   - 退回必須填 reason
   - 重複送出同一動作應得到 409（任務已被處理）且不得新增重複紀錄
3. 若最終 Approved：以 Admin 登入 → /documents/:id → 封存 → 狀態變 Archived
4. 在 /documents/:id 中確認：
   - 版本/附件/ReviewTask/ApprovalRecord/AuditLog 對應正確
   - append-only：紀錄新增不修改

---

## 5) 自動化測試

在 repository root：

- 單跑 backend 測試：`npm -w backend test`
- 單跑 frontend unit 測試：`npm -w frontend test`
- 跑全工作區測試（backend + frontend）：`npm test`
- E2E（Playwright）：`npm -w frontend run test:e2e`
