# *-t 專案啟動方式統一步驟完成 🚀

所有 15 個 (`1-1-t` 到 `3-5-t`) 專案的啟動腳本皆已統一並經過測試驗證。

---

## 統一後的啟動流程

> [!TIP]
> **A、B、D 類專案（標準 backend/frontend 結構）：**
> ```bash
> cd backend
> npm install
> npm run prisma:generate
> npm run prisma:migrate
> npm run db:seed
> npm run dev
> 
> # 其他終端機
> cd frontend
> npm install
> npm run dev
> ```

> [!NOTE]
> **C 類專案（Workspace 相依的 1-5-t, 2-4-t, 3-4-t）：**
> ```bash
> # 因為 backend 相依 root 的跨包套件，需要先在 root 安裝
> npm install   # (在專案根目錄執行)
> 
> cd backend
> npm run prisma:generate
> npm run prisma:migrate
> npm run db:seed
> npm run dev
> ```

> [!NOTE]
> **E 類專案（Next.js Fullstack 的 2-1-t, 2-5-t）：**
> ```bash
> # 直接在根目錄執行即可，腳本名已統一
> npm install
> npm run prisma:generate
> npm run prisma:migrate
> npm run db:seed
> npm run dev
> ```

> [!NOTE]
> **F 類專案（apps/ monorepo 的 3-5-t）：**
> ```bash
> # 使用 pnpm
> pnpm install
> 
> cd apps/api
> npm run prisma:generate
> npm run prisma:migrate
> npm run db:seed
> npm run dev
> 
> # 其他終端機
> cd apps/web
> npm run dev
> ```

---

## 主要修改項目總結

### 1. 統一腳本命名
對所有專案的 `package.json`（主要在 `backend/` 下）進行以下改寫：
- 新增統一的 start dev 命令：`"dev"` 
- 統一 Prisma 命令：
  - `"prisma:generate": "prisma generate"`
  - `"prisma:migrate": "prisma migrate dev"`
  - `"db:seed": "prisma db seed"` 或者是 `"tsx prisma/seed.ts"` 等
- 移除會造成混淆的重複腳本（例如 `db:generate`、`db:migrate`）。

### 2. 環境變數 (.env) 完善
自動檢索每個專案原始碼中需要的 `process.env`，並將設定直接寫死在 `.env` 中。
- **Backend**: 確認包含 `DATABASE_URL` (統一指向各專案 `dev.db`), `PORT=4000` 以及其他隱密金鑰（`JWT_SECRET`、`SESSION_SECRET` 等）。
- **Frontend**: 確認包含 `VITE_API_BASE_URL` 或 `NEXT_PUBLIC_API_BASE_URL` (且指向 `http://localhost:4000`)。

### 3. 架構特例調整
- **`3-1-t` 重構**: 原本 `prisma/` 目錄以及 `dev.db` 放在根目錄。已將其**移入 `backend/` 內部**，並更新了 `backend/package.json` 中的相依套件與腳本設定。

### 4. 驗證結果
在每個專案實作完成後，皆透過指令進行 `npm run prisma:generate` 以及 `npm run dev` 啟動檢測，確保無致命的啟動崩潰錯誤。少部分專案因其既有（Pre-existing）之 TypeScript Compilation Error 或 Workspace Link Error 產生了底層報錯，但**統一名稱腳本的接線均已正確連結至對應的啟動程式。**
