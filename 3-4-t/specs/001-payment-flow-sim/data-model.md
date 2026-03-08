# Phase 1 Design: Data Model（資料模型）

**Feature**: [specs/001-payment-flow-sim/spec.md](spec.md)
**Research**: [specs/001-payment-flow-sim/research.md](research.md)
**Date**: 2026-03-04

本文件將 spec 的概念資料模型落到「可用 SQLite + Prisma 實作」的設計層級（仍以契約與資料一致性為主，不綁定具體程式碼）。

---

## Enumerations

- `UserRole`: `USER_DEVELOPER` | `ADMIN`
- `OrderStatus`: `created` | `payment_pending` | `paid` | `failed` | `cancelled` | `timeout`
- `ReturnMethod`: `query_string` | `post_form`
- `SimulationScenarioType`: `success` | `failed` | `cancelled` | `timeout` | `delayed_success`
- `ActorType`: `user` | `admin` | `system`
- `ReplayScope`: `webhook_only` | `full_flow`

---

## Core Entities

### User

**Purpose**: 平台登入帳號。

**Fields**
- `id` (PK, string)
- `email` (unique)
- `password_hash` (string)
- `role` (`USER_DEVELOPER`|`ADMIN`)
- `created_at`
- `last_login_at` (nullable)

**Constraints**
- email 必須唯一。
- role 不允許使用者自行變更（只能由 seed/admin 操作）。

**Indexes**
- `email` unique index

---

### Session（Server-side）

**Purpose**: HttpOnly cookie 對應的 server-side session store（SQLite），支援 TTL 與失效。

**Fields**
- `sid` (PK, string) — cookie 內的 session_id（不透明隨機值）
- `user_id` (FK → User.id)
- `created_at`
- `last_seen_at`
- `expires_at` (datetime)
- `revoked_at` (nullable)
- `meta` (json, nullable) — 例如 ua_hash、ip_prefix（僅做稽核/診斷，不作為安全邊界）

**Constraints**
- `expires_at` < now() 視為過期；`revoked_at != null` 視為已失效。
- 建議在登入成功後 rotate（舊 sid 立即 revoked）。

**Indexes**
- index: `user_id`
- index: `expires_at`
- index: `revoked_at`

---

### Order

**Purpose**: 模擬訂單（核心狀態機）。

**Fields**（對齊 spec）
- `id` (PK)
- `order_no` (unique)
- `user_id` (FK → User.id)
- `amount` (int)
- `currency` (string, default `TWD`)
- `status` (OrderStatus)
- `callback_url` (string)
- `return_method` (ReturnMethod, 建立後不可變)
- `webhook_url` (nullable string)
- `payment_method_code` (FK → PaymentMethod.code)
- `simulation_scenario_type` (SimulationScenarioType)
- `delay_sec` (int, default 0)
- `webhook_delay_sec` (nullable int)
- `error_code` (nullable string)
- `error_message` (nullable string)
- `created_at`, `updated_at`
- `completed_at` (nullable datetime)

**Validation Rules**
- `amount` 必須為正整數。
- `currency` 必須在允許清單。
- `callback_url` 必填且必須 `http/https`。
- `webhook_url` 若有值必須 `http/https`。
- `delay_sec >= 0`；`webhook_delay_sec` 若有值則 `>= 0`。
- `return_method` 建立後不可變。

**State Machine Invariants**
- 只允許：`created → payment_pending`（enter_payment_page）
- 只允許：`payment_pending → {paid|failed|cancelled|timeout}`（pay）
- 終態不可變：`paid|failed|cancelled|timeout` 不可再轉換

**Indexes**
- unique: `order_no`
- index: `user_id, created_at`
- index: `status, created_at`
- index: `payment_method_code, created_at`
- index: `simulation_scenario_type, created_at`

---

### PaymentMethod

**Purpose**: 付款方式清單（僅影響顯示/選項）。

**Fields**
- `id` (PK)
- `code` (unique; 例如 `card|atm|cvs`)
- `display_name`
- `enabled` (boolean)
- `sort_order` (int)
- `created_at`, `updated_at`

**Indexes**
- unique: `code`
- index: `enabled, sort_order`

---

### SimulationScenarioTemplate

**Purpose**: 情境模板預設值（Admin 可維護）。

**Fields**
- `id` (PK)
- `type` (SimulationScenarioType)
- `default_delay_sec` (int)
- `default_error_code` (nullable)
- `default_error_message` (nullable)
- `enabled` (boolean)
- `created_at`, `updated_at`

**Constraints**
- `default_delay_sec >= 0`

**Indexes**
- index: `type, enabled`

---

## Immutable Logs / Events

### OrderStateEvent（不可變）

**Fields**
- `id` (PK)
- `order_id` (FK)
- `from_status` (nullable enum) — 若選擇在 create 時記錄，可允許 null
- `to_status` (enum)
- `trigger` (string; `create|enter_payment_page|pay|...`)
- `actor_type` (ActorType)
- `actor_user_id` (nullable FK → User.id)
- `occurred_at`
- `meta` (json, nullable)

**Rules**
- 只在「合法狀態轉換」時寫入。
- 禁止覆寫/刪除。

**Indexes**
- index: `order_id, occurred_at`

---

### ReturnLog（不可變）

**Fields**
- `id` (PK)
- `order_id` (FK)
- `replay_run_id` (nullable FK → ReplayRun.id)
- `delivery_method` (ReturnMethod)
- `callback_url`
- `payload` (json)
- `dispatched_at`
- `success` (boolean) — 代表平台是否成功「啟動回傳行為」（見 research.md）
- `error_message` (nullable)

**Indexes**
- index: `order_id, dispatched_at`
- index: `replay_run_id, dispatched_at`

---

### WebhookLog（不可變，per attempt）

**Fields**
- `id` (PK)
- `order_id` (FK)
- `replay_run_id` (nullable FK)
- `request_url`
- `request_headers` (json) — 至少包含 timestamp/signature
- `payload` (json)
- `sent_at`
- `response_status` (nullable int)
- `response_body_excerpt` (nullable string)
- `success` (boolean)

**Indexes**
- index: `order_id, sent_at`
- index: `replay_run_id, sent_at`

---

### AuditLog（不可變）

**Fields**
- `id` (PK)
- `actor_type` (ActorType)
- `actor_user_id` (nullable FK)
- `action` (string)
- `target_type` (string)
- `target_id` (nullable string)
- `occurred_at`
- `success` (boolean)
- `error_message` (nullable)
- `meta` (json, nullable)

**Indexes**
- index: `occurred_at`
- index: `actor_user_id, occurred_at`
- index: `target_type, target_id`

---

### ReplayRun

**Fields**
- `id` (PK)
- `order_id` (FK)
- `initiated_by_user_id` (FK)
- `scope` (ReplayScope)
- `started_at`
- `finished_at` (nullable)
- `result_status` (string; `success|fail`)
- `meta` (json, nullable)

**Rules**
- 只能對終態訂單建立。
- 不可改變訂單終態；重播結果只落在 ReturnLog/WebhookLog（帶 replay_run_id）與 ReplayRun。

**Indexes**
- index: `order_id, started_at`

---

## Internal Scheduling (WebhookJob)（建議新增）

> Spec 要求 webhook 延遲與非同步派送；為了可持久化與重啟可續跑，建議新增 job 表（不影響對外契約）。

### WebhookJob

**Fields**
- `id` (PK)
- `order_id` (FK)
- `replay_run_id` (nullable FK)
- `run_at` (datetime)
- `status` (`queued|processing|succeeded|failed_permanent|cancelled`)
- `attempt_count` (int)
- `max_attempts` (int)
- `locked_at` / `lock_expires_at` / `locked_by`（避免多 worker 競態）
- `last_error` (nullable)
- `created_at` / `updated_at`

**Indexes**
- index: `status, run_at`
- index: `lock_expires_at`

**Rules**
- enqueue 與訂單終態/ReturnLog 同 transaction。
- 每次派送 attempt 都新增一筆 WebhookLog（不可覆寫）。

---

## System Settings（建議新增）

> Admin 需要調整允許幣別、預設 return_method、session TTL、webhook secret rotation 等。

### SystemSetting

**Fields**
- `key` (PK string) — 例如 `allowed_currencies`, `default_return_method`, `session_ttl_hours`, `webhook_active_secret_id`, `webhook_previous_secret_id`, `webhook_previous_secret_grace_hours`
- `value_json` (json)
- `updated_at`

### WebhookSigningSecret

**Fields**
- `id` (PK)
- `name`（例如 `active`, `previous` 或用 `kid`）
- `secret_ciphertext`（至少加密/或以環境變數注入；不得明文外洩）
- `is_active`
- `created_at`
- `retired_at` (nullable)

**Note**
- 具體 secret 保存方式屬實作細節；此處要求「不得回傳 secret、支援輪替、可設定 grace period」。
