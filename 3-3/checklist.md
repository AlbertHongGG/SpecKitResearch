# 功能覆蓋確認表（Feature Coverage Checklist）

SaaS 訂閱與計費管理平台（Subscription & Billing System）

---

## Authentication / Session

- [] 註冊（含建立初始 Organization）
- [] 登入
- [] 登出
- [N] Session 管理（/app/\*\* 未登入導向 /login 或 401 規則）
- [N] /admin/\*\* Platform Admin 權限判斷（非平台權限 403）

## Organization / RBAC

- [N] Organization 成員角色（END_USER / ORG_ADMIN）
- [N] 組織切換（多 Organization）
- [N] /app/subscription 管理動作（Upgrade/Downgrade/Cancel）僅 Org Admin
- [N] /app/billing/payment-methods 僅 Org Admin
- [N] /app/org/members 僅 Org Admin
- [N] organization_id 範圍資料隔離（防止越權讀取/修改）

## Plans（資料驅動）

- [N] Plan 資料驅動（新增/調整不需改程式碼）
- [N] Plan 啟用/停用（is_active）
- [N] Plan pricing（依 billing_cycle）
- [N] Plan limits（json）
- [N] Plan features（json）

## Subscription / Billing 核心

- [N] Subscription 狀態集合（Trial/Active/PastDue/Suspended/Canceled/Expired）
- [N] Subscription 不可逆規則（Expired 不可恢復；Canceled 不可自動回 Active）
- [N] Upgrade（立即生效）
- [N] Upgrade Proration Invoice（Open）
- [N] Downgrade Pending Change（pending_plan_id/pending_effective_at，下期生效）
- [N] Cancel Subscription（Org Admin）
- [N] 每個 billing cycle 產生 recurring invoice
- [N] Invoice 狀態集合（Draft/Open/Paid/Failed/Voided）
- [N] InvoiceLineItem 類型（RECURRING/PRORATION/OVERAGE/TAX）
- [N] 付款成功/失敗處理（Paid/Failed + 訂閱狀態更新）
- [N] Grace period（PastDue→Suspended）

## Usage Metering / Limits

- [N] UsageMeter（API_CALLS/STORAGE_BYTES/USER_COUNT/PROJECT_COUNT）
- [N] UsageRecord 依 period 分段（period_start/period_end）
- [N] 依 billing cycle 邊界進行 usage reset（新 period）
- [ ] 超量策略：Block
- [ ] 超量策略：Throttle
- [ ] 超量策略：Overage billing（允許超量並按超量出帳）

## Feature Flag / Entitlement（SSOT）

- [N] 後端 entitlement 計算（SSOT，不允許 UI 自行 hard-code）
- [ ] entitlement 規則（subscription.status + plan.features + limits/usage + 超量策略）
- [ ] entitlement 驅動 UI 可見性與可操作性一致（前後端一致）

## Admin Override

- [N] AdminOverride（forced_status=Suspended/Expired）
- [N] Override 優先權（覆蓋一般訂閱狀態於 entitlement）
- [N] Force Suspended（含 reason）
- [N] Force Expired（含 reason，不可逆）
- [N] Revoke Override（僅 Suspended）

## Admin Dashboard / Admin Pages

- [ ] Admin Dashboard（MRR/Churn/風險概況）
- [N] Admin Plans（Create/Edit/Enable/Disable）
- [ ] Admin Subscriptions（Search/Filter/View Details）
- [ ] Admin Revenue Metrics（MRR/Churn）
- [ ] Admin Usage Ranking（依 meter/期間）
- [ ] Admin Risk Accounts（PastDue/Suspended/即將超量 + override actions）
- [N] Admin Audit Log（查詢 who/when/what/why）

## Pages / UX States

- [N] /pricing
- [ ] /signup
- [ ] /login
- [N] /app
- [N] /app/subscription
- [N] /app/usage
- [N] /app/billing/invoices
- [N] /app/billing/payment-methods
- [N] /app/org/members
- [N] /admin
- [N] /admin/plans
- [ ] /admin/subscriptions
- [ ] /admin/metrics/revenue
- [ ] /admin/metrics/usage
- [ ] /admin/risk
- [N] /admin/audit
- [ ] /403
- [N] /404
- [ ] /5xx
- [N] Loading 狀態（主要頁面）
- [N] Error 狀態（主要頁面）
- [N] Empty 狀態（清單頁）

## Audit / Observability / Security / Reliability

- [N] AuditLog 寫入（Org Admin 管理操作）
- [N] AuditLog 寫入（Platform Admin 管理操作）
- [N] AuditLog 查詢/篩選（actor/role/org/action/time）
- [N] 付款回調冪等性（避免重複計費/重複狀態）
- [N] 用量累積冪等性（避免重複累積）
- [ ] 訂閱狀態轉換防競態（多事件同時發生仍一致可追溯）
