# Data Model: SaaS 訂閱與計費管理平台（SSOT）

**Date**: 2026-03-04  
**Source**: [spec.md](./spec.md) + [research.md](./research.md)

> 目標：把「狀態機、不可逆規則、冪等鍵、資料隔離」落在資料模型與約束上，讓錯誤更難發生、且可被偵測/重試/稽核。

---

## 1) 核心實體（Entities）

### User

- `id`（string/uuid）
- `email`（unique, normalized lower-case）
- `password_hash`
- `is_platform_admin`（boolean）
- `created_at`
- `last_login_at?`

**Constraints**:
- `email` UNIQUE

### Organization

- `id`
- `name`
- `created_at`

### OrganizationMember

- `id`
- `organization_id` (FK)
- `user_id` (FK)
- `role`（END_USER | ORG_ADMIN）
- `status`（ACTIVE | REMOVED）
- `created_at`

**Constraints**:
- `(organization_id, user_id)` UNIQUE（同一 user 不可重複加入同 org）
- 讀寫必須以 membership 驗證（防 IDOR）

### Plan

- `id`
- `name`（Free/Pro/Enterprise...）
- `billing_cycle`（monthly | yearly）
- `price_cents`（>= 0）
- `currency`（ISO 4217, e.g. USD/TWD）
- `is_active`
- `limits`（JSON；例如 maxUsers/maxProjects/apiQuota/storageBytes）
- `features`（JSON；例如 advancedAnalytics/exportData/prioritySupport）
- `created_at`
- `updated_at`

**Constraints**:
- `is_active=false` 時不可作為新訂閱與 upgrade/downgrade 目標（但既有訂閱仍可讀）

### Subscription

- `id`
- `organization_id` (FK)
- `plan_id` (FK)
- `status`（Trial | Active | PastDue | Suspended | Canceled | Expired）
- `billing_cycle`（monthly | yearly）
- `current_period_start`
- `current_period_end`
- `trial_end_at?`
- `canceled_at?`
- `expired_at?`
- `pending_plan_id?`
- `pending_effective_at?`
- `grace_period_end_at?`
- `version`（int；用於樂觀鎖 OCC）
- `created_at`
- `updated_at`

**Invariants（DB/Domain 必須共同保證）**:
- `Expired` 不可逆：一旦 status=Expired，後續不得再更新為其他狀態。
- `Canceled` 不可自動回到 Active（重新訂閱需新 subscription 或顯式流程）。
- 每個 Organization 必須有且僅有一筆「current subscription」。

**Recommended Constraints**:
- `(organization_id, is_current)` UNIQUE（只允許一個 current；SQLite 可用 `is_current` 允許 NULL 多筆、TRUE 僅一筆的技巧）
- `version` 用於 CAS 更新：`WHERE id=? AND version=?`

### UsageMeter

- `id`
- `code`（API_CALLS | STORAGE_BYTES | USER_COUNT | PROJECT_COUNT）
- `name`
- `unit`

### UsageEvent（建議新增；用於稽核與冪等）

> spec 已有 UsageRecord；為了做到「可稽核 + 可重算 + 冪等」，建議在設計中引入 append-only 事件表。

- `id`
- `organization_id` (FK)
- `subscription_id` (FK)
- `meter_code`
- `occurred_at`
- `period_start`（用 subscription anchor 計算後固定寫入）
- `delta`（counter 類）或 `value`（gauge/peak 類）
- `idempotency_key`（unique per organization；用於重送去重）
- `metadata`（JSON，可選）

**Constraints**:
- `(organization_id, idempotency_key)` UNIQUE

### UsageRecord（Rollup；對應 spec）

- `id`
- `organization_id` (FK)
- `subscription_id` (FK)
- `meter_code`
- `period_start`
- `period_end`
- `value`（number；對 counter 是 sum，對 peak 是 max，對 gauge 可用 last/max 組合）
- `updated_at`

**Constraints**:
- `(organization_id, subscription_id, meter_code, period_start)` UNIQUE（rollup 唯一）

### Invoice

- `id`
- `organization_id` (FK)
- `subscription_id` (FK)
- `status`（Draft | Open | Paid | Failed | Voided）
- `billing_period_start`
- `billing_period_end`
- `total_cents`
- `currency`
- `due_at?`
- `paid_at?`
- `failed_at?`
- `created_at`
- `version`（int；OCC）

**Constraints**:
- `(subscription_id, billing_period_start, billing_period_end, kind)` UNIQUE（避免重複 recurring/proration；若用 kind 欄位）
- 或用 `(subscription_id, billing_period_start, billing_period_end)` UNIQUE 並以 line items 區分

### InvoiceLineItem

- `id`
- `invoice_id` (FK)
- `type`（RECURRING | PRORATION | OVERAGE | TAX）
- `description`
- `amount_cents`
- `quantity?`
- `meter_code?`

**Constraints**:
- `(invoice_id, type, meter_code, description)` 可選 UNIQUE（避免重複寫入）

### PaymentMethod

- `id`
- `organization_id` (FK)
- `provider`
- `provider_payment_method_ref`（token/reference；禁止存可重放敏感資料）
- `is_default`
- `created_at`

**Constraints**:
- 每個 organization 最多一個 default：`(organization_id, is_default)` UNIQUE（以 SQLite NULL 技巧或以 trigger/application 保證）

### AdminOverride

- `id`
- `organization_id` (FK)
- `forced_status`（NONE | Suspended | Expired）
- `reason`
- `created_by_user_id` (FK)
- `created_at`
- `revoked_at?`

**Invariants**:
- forced_status=Expired 不可逆：revoked_at 不得使服務恢復（entitlements 仍視為不可用）。

### AuditLog

- `id`
- `actor_user_id` (FK)
- `actor_role_context`（GUEST | END_USER | ORG_ADMIN | PLATFORM_ADMIN | SYSTEM）
- `organization_id?`
- `action`
- `target_type`
- `target_id?`
- `payload`（JSON；包含 who/when/what/why）
- `created_at`

---

## 2) 狀態偏序（State Partial Orders）

### Subscription

- 可逆性：
  - `Expired` 為終態（不可逆）
  - `Canceled` 不可自動回 `Active`
- 建議「只前進、不倒退」的 guard：
  - 一旦 `Expired`，任何事件/操作都不得改回可用狀態
  - `PastDue -> Active` 只允許在「欠款已付清」的證據存在時

### Invoice

- 建議偏序：`Draft -> Open -> Paid`，且 `Draft/Open -> Failed`，`Draft/Open -> Voided`
- `Paid`、`Voided` 通常視為終態；後續事件只能 no-op（冪等）

---

## 3) 冪等與競態控制（DB 層落點）

- **OCC（樂觀鎖）**：`Subscription.version`、`Invoice.version` 用 `UPDATE ... WHERE version=?` 實作 CAS。
- **唯一約束去重**：
  - `WebhookEventInbox(provider, provider_event_id)` UNIQUE（付款回調重送去重）
  - `UsageEvent(organization_id, idempotency_key)` UNIQUE（用量事件重送去重）
  - `Invoice(subscription_id, period_start, period_end[, kind])` UNIQUE（避免重複出帳/重複 proration）
- **短交易 + 可重試**：任何寫入交易需可在 `SQLITE_BUSY`/Prisma `P2034` 下重試（指數退避 + jitter）。

---

## 4) 索引（Indexes；以查詢面向）

- `OrganizationMember(user_id, organization_id)`（org 列表與授權）
- `Subscription(organization_id, is_current)`
- `UsageRecord(organization_id, period_start)`（usage overview）
- `Invoice(organization_id, created_at)`（invoice list）
- `AuditLog(organization_id, created_at)` + `AuditLog(actor_user_id, created_at)`（稽核查詢）

---

## 5) 驗證規則（Validation Rules）

- Plan：price >= 0；limits 必須包含已知 meter key；features 為 boolean map。
- Subscription：
  - `current_period_start < current_period_end`
  - `pending_effective_at` 必須落在下一期 period start
  - `grace_period_end_at` 只能在 `PastDue` 狀態存在
- PaymentMethod：provider ref 不得回傳到一般使用者；僅回顯 masked metadata（如有）。

