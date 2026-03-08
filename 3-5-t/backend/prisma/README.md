# Prisma Migrations: 相容性與回滾演練（SQLite）

本文件說明此專案在 **Prisma + SQLite** 下的 migration 策略、常見風險、以及「回滾演練」的可執行步驟與驗證清單。

> 重點：Prisma Migrate **不提供自動 down migration**。發生問題時的標準作法是「回復資料庫備份」或「用新的 migration 修正」。

---

## 相關指令（本 repo 已存在）

在 repo root：

- 安裝依賴：`pnpm install`

在 `backend/`：

- 產生/套用 dev migration：`pnpm -C backend migrate`
- 執行 seed：`pnpm -C backend seed`
- 檢查 migration 狀態：`pnpm -C backend prisma migrate status`

---

## 環境與資料庫位置

- SQLite 檔案路徑由 `backend/.env` 的 `DATABASE_URL` 決定
  - 預設範例：`DATABASE_URL="file:../data/dev.db"`
- **回滾**（rollback）在 SQLite 場景通常等同於「回復上一份 DB 檔案」

---

## Migration 原則（Compatibility）

1. 以「新增欄位/新增表/新增索引」為優先，避免破壞性變更
2. 破壞性變更（drop column、rename、改型別）必須搭配資料遷移計畫
3. 每次 migration 都要能在「既有資料」上成功套用（不能只在空 DB 成功）

---

## 回滾策略（Rollback Strategy）

### A) 最可靠：回復 DB 檔案備份（建議）

適用：部署前後想要快速回退。

1. 套用 migration 前先備份 DB 檔案
   - 例如：`cp data/dev.db data/dev.db.bak.$(date +%Y%m%d%H%M%S)`
2. 若 migration/行為異常，停止服務後回復備份檔
   - 例如：`cp data/dev.db.bak.<timestamp> data/dev.db`
3. 重新啟動服務並跑 smoke check（見下方清單）

優點：速度快、風險低。
缺點：回復後會遺失 migration 後新增/修改的資料（等同回到備份時間點）。

### B) 用「修正 migration」前進修復（Forward Fix）

適用：已在某環境套用 migration，不適合用 DB 檔案回復（或資料不可回退）。

做法：建立新的 Prisma migration，把 schema 拉回到期望狀態（包含資料修正）。

- 注意：`prisma migrate resolve` 只能標記 migration 狀態，**不會撤銷 SQL**。

---

## 回滾演練（T137 驗證流程）

以下流程建議在「複製出的資料庫檔案」上演練，避免破壞主要 dev DB。

1. 準備測試用 DB 檔案（複製一份）
   - `cp data/dev.db data/dev.rollback-rehearsal.db`
2. 臨時指定 `DATABASE_URL` 指向這份 DB（擇一方式即可）
   - 方式 1：修改 `backend/.env`（不建議長期）
   - 方式 2：在指令前加 env（建議）
     - `DATABASE_URL="file:../data/dev.rollback-rehearsal.db" pnpm -C backend prisma migrate status`
3. 在該 DB 上套用 migration（或跑 `pnpm -C backend migrate` 以產生/套用）
4. 驗證（見下一節清單）
5. 模擬回滾：用備份檔回復 DB 檔案，並再次驗證

---

## 驗證清單（套用/回滾後都要做）

最低限度建議：

- DB
  - `pnpm -C backend prisma migrate status` 顯示狀態合理
  - 能成功 `pnpm -C backend seed`（或至少不破壞既有資料）

- Backend 服務
  - `pnpm -C backend dev` 可啟動
  - `curl -i http://localhost:3001/health` 回 200

- 核心流程 smoke check
  - 可以註冊/登入
  - 可以建立 API key（且 `plain_key` 只出現在建立回應一次）
  - gateway 能正常 proxy（搭配 upstream mock）

- 測試（建議）
  - `pnpm -C backend test`
  - `pnpm -C frontend test`
  -（需要時）`pnpm -C frontend test:e2e`
