# Quickstart — Subscription & Billing Platform

## 目的
快速驗證規格中最關鍵的端到端行為：
1. 訂閱狀態機
2. entitlement 一致性
3. 付款與發票冪等
4. RBAC 與 organization 隔離

## 先決條件
- Node.js 20+
- npm 10+
- SQLite（本機檔案，由 Prisma 建立）

## 建議工作區結構
- `backend/`（NestJS + Prisma）
- `frontend/`（Next.js）
- `shared/contracts/`（Zod 契約）

## 啟動流程（開發）
1. 安裝依賴（frontend/backend）。
2. 建立 `.env`（session secret、DB path、base URL）。
3. 執行 Prisma migrate，建立 SQLite schema。
4. 啟動 backend API。
5. 啟動 frontend Web。

## 種子資料（最小集）
- 1 位 Platform Admin
- 1 個 Organization（含 Org Admin 與 End User）
- 2~3 個 Plan（含 monthly/yearly，至少一個停用）
- 1 筆 Active Subscription
- 1 組 UsageMeter 定義

## 驗證腳本（手動/UAT）

### Flow A — Upgrade + Proration
1. Org Admin 執行升級。
2. 檢查訂閱 plan 立即切換。
3. 檢查產生 Open 的 PRORATION invoice。
4. 模擬付款成功，檢查 invoice=Paid、subscription 維持 Active。

### Flow B — Payment Failed → PastDue → Suspended
1. 讓 Open invoice 付款失敗。
2. 檢查 subscription 轉 PastDue 並帶 grace period。
3. 模擬 grace 到期未付，檢查轉 Suspended。

### Flow C — Admin Override
1. Platform Admin 對組織強制 Suspended。
2. 檢查 entitlement 立即受限。
3. 強制 Expired，檢查不可逆。

### Flow D — Downgrade Pending
1. Org Admin 排程降級。
2. 檢查 `pending_plan_id`/`pending_effective_at` 出現。
3. 到期後切換，若超量依策略 Block/Throttle/Overage。

### Flow E — RBAC + Multi-Org Isolation
1. End User 嘗試進入付款方式管理 API，應為 403。
2. 切換 organization 後，summary/usage/invoices 應全量切 scope。
3. 嘗試跨 org id 查詢，應被拒絕。

## 測試策略
- Unit (Vitest): 狀態機、entitlement evaluator、pricing/proration 計算、RBAC policy。
- Integration/Contract (Vitest): API + Prisma + SQLite + Zod schema 一致性。
- E2E (Playwright): 關鍵旅程（升級、失敗付款、override、組織切換）。

## 觀測與除錯檢查
- 每個關鍵請求均含 `requestId`。
- 跨流程關聯含 `traceId/correlationId`。
- AuditLog 可查 who/when/what/why。
- 重送 webhook 不應造成重複扣款與重複轉態。
