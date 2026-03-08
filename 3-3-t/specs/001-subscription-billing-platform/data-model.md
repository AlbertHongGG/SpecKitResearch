# Phase 1 Data Model — Subscription & Billing Platform

## 1. 核心實體與欄位

> 以下延續 spec 定義，補上驗證規則、索引與狀態語意。

### User
- `id` (string, PK)
- `email` (string, unique, normalized)
- `password_hash` (string)
- `is_platform_admin` (boolean, default false)
- `created_at`, `last_login_at`

Validation
- email 格式合法且唯一

### Organization
- `id` (string, PK)
- `name` (string)
- `created_at`

### OrganizationMember
- `id` (string, PK)
- `organization_id` (FK Organization)
- `user_id` (FK User)
- `role` (`END_USER | ORG_ADMIN`)
- `status` (`ACTIVE | REMOVED`)
- `created_at`

Validation
- unique(`organization_id`, `user_id`)（有效成員）

### Plan
- `id` (string, PK)
- `name` (string)
- `billing_cycle` (`monthly | yearly`)
- `price_cents` (integer >= 0)
- `currency` (ISO code)
- `is_active` (boolean)
- `limits` (json)
- `features` (json)
- `created_at`, `updated_at`

Validation
- 停用 plan 不可做新訂閱或升降級目標

### Subscription
- `id` (string, PK)
- `organization_id` (FK Organization)
- `plan_id` (FK Plan)
- `status` (`Trial | Active | PastDue | Suspended | Canceled | Expired`)
- `billing_cycle` (`monthly | yearly`)
- `current_period_start`, `current_period_end`
- `trial_end_at`, `canceled_at`, `expired_at`
- `pending_plan_id` (FK Plan, nullable)
- `pending_effective_at` (datetime, nullable)
- `grace_period_end_at` (datetime, nullable)
- `version` (integer, OCC)
- `created_at`, `updated_at`

Validation
- `Expired` 不可逆
- `Canceled` 不可自動回 `Active`
- 升級立即生效；降級僅透過 `pending_*` 在期末生效

### UsageMeter
- `id` (string, PK)
- `code` (`API_CALLS | STORAGE_BYTES | USER_COUNT | PROJECT_COUNT`)
- `name`, `unit`

### UsageRecord
- `id` (string, PK)
- `organization_id` (FK Organization)
- `subscription_id` (FK Subscription)
- `meter_code` (enum)
- `period_start`, `period_end`
- `value` (number >= 0)
- `source_event_id` (string, nullable)
- `updated_at`

Validation
- 去重唯一鍵建議：(`subscription_id`,`meter_code`,`source_event_id`)

### Invoice
- `id` (string, PK)
- `organization_id` (FK Organization)
- `subscription_id` (FK Subscription)
- `status` (`Draft | Open | Paid | Failed | Voided`)
- `billing_period_start`, `billing_period_end`
- `total_cents` (integer)
- `currency`
- `due_at`, `paid_at`, `failed_at`, `created_at`
- `invoice_type` (`RECURRING | PRORATION | OVERAGE`)

Validation
- recurring 唯一鍵：(`subscription_id`,`invoice_type`,`billing_period_start`,`billing_period_end`)

### InvoiceLineItem
- `id` (string, PK)
- `invoice_id` (FK Invoice)
- `type` (`RECURRING | PRORATION | OVERAGE | TAX`)
- `description`
- `amount_cents`
- `quantity` (nullable)
- `meter_code` (nullable)

### PaymentMethod
- `id` (string, PK)
- `organization_id` (FK Organization)
- `provider`
- `provider_payment_method_ref`
- `is_default` (boolean)
- `created_at`

Validation
- 每個 organization 僅一筆 default

### AdminOverride
- `id` (string, PK)
- `organization_id` (FK Organization)
- `forced_status` (`NONE | Suspended | Expired`)
- `reason`
- `created_by_user_id` (FK User)
- `created_at`, `revoked_at`

Validation
- `forced_status=Expired` 不可由 revoke 恢復可用狀態

### AuditLog
- `id` (string, PK)
- `actor_user_id` (FK User)
- `actor_role_context` (`GUEST | END_USER | ORG_ADMIN | PLATFORM_ADMIN`)
- `organization_id` (nullable FK)
- `action`, `target_type`, `target_id`
- `payload` (json)
- `trace_id`, `correlation_id` (string, nullable)
- `created_at`

## 2. 關聯
- Organization 1:N OrganizationMember
- User 1:N OrganizationMember
- Organization 1:N Subscription（邏輯上同時僅一筆 current effective）
- Subscription 1:N Invoice
- Invoice 1:N InvoiceLineItem
- Organization 1:N PaymentMethod
- Organization 1:N UsageRecord
- Organization 1:N AuditLog
- Organization 1:N AdminOverride

## 3. 狀態轉移（對應 transition diagrams）

### Subscription 狀態機
- `Trial -> Active`：試用結束且付款成功
- `Active -> PastDue`：付款失敗
- `PastDue -> Active`：寬限期內付款成功
- `PastDue -> Suspended`：寬限期到期未付款
- `Suspended -> Active`：補繳成功
- `Active|PastDue|Suspended -> Canceled`：Org Admin 取消
- `Active|PastDue|Suspended|Canceled -> Expired`：Platform Admin 強制到期

Invariants
- Expired 不可逆
- Canceled 不可自動恢復為 Active
- override 優先於 base subscription status

### Invoice 狀態機
- `Draft -> Open -> Paid|Failed|Voided`
- `Draft -> Voided`

Invariants
- 支付回調需冪等；重送不重複計費

## 4. Entitlement 計算模型

計算順序（後端 SSOT）
1. Auth + organization membership
2. Admin override（Expired/Suspended）
3. Subscription status
4. Plan feature flag
5. Usage limits + strategy（Block/Throttle/Overage）
6. 動作層 RBAC（例如僅 Org Admin 可管理付款方式）

輸出建議欄位
- `allowed` (boolean)
- `effective_status`
- `reason_codes[]`
- `limits`, `usage`
- `next_actions[]`
- `evaluated_at`

## 5. 一致性與可重播
- 付款事件表/冪等鍵表保留唯一事件識別
- Subscription 使用 `version` 欄位防競態覆寫
- 所有管理操作與狀態變更寫入 AuditLog（含 who/when/what/why）
- 核心查詢支援 trace/correlation 關聯
