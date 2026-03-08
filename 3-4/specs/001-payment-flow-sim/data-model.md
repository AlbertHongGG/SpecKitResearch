# data-model.md — 資料模型（Phase 1）

**Feature**: 001-payment-flow-sim  
**Date**: 2026-03-05

本文件描述資料實體、欄位、關聯、驗證規則與關鍵索引，作為 Prisma schema 與 API 契約的依據。

---

## Enum / 常數

- `Role`: `USER` | `ADMIN`
- `OrderStatus`: `created` | `payment_pending` | `paid` | `failed` | `cancelled` | `timeout`
- `SimulationScenario`: `success` | `failed` | `cancelled` | `timeout` | `delayed_success`
- `ReturnMethod`: `query_string` | `post_form`
- `ReplayScope`: `webhook_only` | `full_flow`
- `JobStatus`: `pending` | `running` | `succeeded` | `failed` | `dead`

---

## Entity: User

**目的**：帳號、RBAC、訂單擁有者。

**欄位**
- `id`: UUID (PK)
- `email`: string（unique，lowercase 正規化）
- `password_hash`: string（不可逆）
- `role`: Role
- `created_at`: datetime
- `updated_at`: datetime

**索引/約束**
- unique(`email`)

---

## Entity: Session

**目的**：server-side session，支援撤銷與到期。

**欄位**
- `id`: UUID (PK)（同時作為 cookie 內的 session_id）
- `user_id`: UUID (FK → User)
- `created_at`: datetime
- `last_seen_at`: datetime
- `expires_at_idle`: datetime（rolling）
- `expires_at_absolute`: datetime（hard cap）
- `revoked_at`: datetime?（logout/權限變更/管理員撤銷）

**索引/約束**
- index(`user_id`, `created_at`)
- index(`expires_at_idle`)

---

## Entity: PaymentMethod

**目的**：管理員可控的付款方式清單（可用/排序/顯示名稱）。

**欄位**
- `id`: UUID (PK)
- `code`: string（unique；例如 `CREDIT_CARD_SIM`）
- `display_name`: string
- `enabled`: boolean
- `sort_order`: int
- `created_at`: datetime
- `updated_at`: datetime

**索引/約束**
- unique(`code`)
- index(`enabled`, `sort_order`)

---

## Entity: SimulationScenarioTemplate

**目的**：管理員維護情境預設（delay / error 欄位）。

**欄位**
- `id`: UUID (PK)
- `scenario`: SimulationScenario（unique）
- `enabled`: boolean
- `default_delay_sec`: int（>= 0）
- `default_error_code`: string?（僅 `failed`/`timeout` 會用到）
- `default_error_message`: string?
- `created_at`: datetime
- `updated_at`: datetime

**索引/約束**
- unique(`scenario`)

---

## Entity: SystemSettings（Singleton）

**目的**：系統參數（幣別、預設 return method、session 時間、secret grace 預設等）。

**欄位**
- `id`: int (PK, 固定為 1)
- `allowed_currencies`: string[]（可用 JSON 存；預設含 `TWD`,`USD`,`JPY`）
- `default_return_method`: ReturnMethod
- `session_idle_sec`: int（預設 8h）
- `session_absolute_sec`: int（預設 7d）
- `webhook_secret_grace_sec_default`: int（預設 7d）
- `created_at`: datetime
- `updated_at`: datetime

---

## Entity: WebhookEndpoint

**目的**：以（user + webhook_url）為單位管理簽章 secrets 與輪替（對應 research 決策）。

**欄位**
- `id`: UUID (PK)
- `user_id`: UUID (FK → User)
- `url`: string（http/https）
- `current_secret_ciphertext`: bytes/string（加密後）
- `previous_secret_ciphertext`: bytes/string?（加密後）
- `previous_valid_until`: datetime?
- `grace_sec`: int（預設取 SystemSettings；可覆寫）
- `created_at`: datetime
- `updated_at`: datetime
- `last_rotated_at`: datetime?

**索引/約束**
- unique(`user_id`, `url`)

---

## Entity: Order

**目的**：模擬訂單本體。

**欄位**
- `id`: UUID (PK)
- `user_id`: UUID (FK → User)
- `order_no`: string（unique，不可變）
- `status`: OrderStatus
- `amount`: int（> 0）
- `currency`: string（必須在 SystemSettings.allowed_currencies）
- `callback_url`: string（http/https）
- `return_method`: ReturnMethod（建立時決定，不可變）
- `payment_method_code`: string（FK-ish → PaymentMethod.code；建立時必須為 enabled）
- `simulation_scenario`: SimulationScenario
- `delay_sec`: int（>= 0）
- `webhook_delay_sec`: int?（>= 0；未填則沿用 delay_sec）
- `error_code`: string?（僅 `failed`/`timeout`）
- `error_message`: string?
- `webhook_url`: string?（http/https；建立時可選；建議同時寫入 `webhook_endpoint_id`）
- `webhook_endpoint_id`: UUID? (FK → WebhookEndpoint)
- `created_at`: datetime
- `completed_at`: datetime?

**索引/約束**
- unique(`order_no`)
- index(`user_id`, `created_at`)
- index(`status`, `created_at`)

**不變量**
- `order_no`、`return_method` 建立後不可變。
- 進入終態（`paid/failed/cancelled/timeout`）後不得再變更 `status`。

---

## Entity: OrderStateEvent（append-only）

**目的**：每一次合法狀態轉換的不可變事件。

**欄位**
- `id`: UUID (PK)
- `order_id`: UUID (FK → Order)
- `from_status`: OrderStatus
- `to_status`: OrderStatus
- `trigger`: string（例如 `enter_payment_page` / `simulate_payment`）
- `actor_type`: string（`user`/`system`/`admin`）
- `actor_user_id`: UUID?（若 actor 為 user/admin）
- `meta`: JSON?（例如 error_code/error_message、delay 設定等）
- `occurred_at`: datetime

**索引/約束**
- index(`order_id`, `occurred_at`)

---

## Entity: ReplayRun

**目的**：重播執行記錄（不改變終態），並關聯本次產生的 logs。

**欄位**
- `id`: UUID (PK)
- `order_id`: UUID (FK → Order)
- `scope`: ReplayScope
- `created_by_user_id`: UUID (FK → User)
- `started_at`: datetime
- `finished_at`: datetime?
- `status`: string（例如 `running`/`succeeded`/`failed`）
- `error_summary`: string?

**索引/約束**
- index(`order_id`, `started_at`)

---

## Entity: ReturnLog（append-only）

**目的**：每次 Return dispatch attempt 的紀錄（包含 replay full_flow）。

**欄位**
- `id`: UUID (PK)
- `order_id`: UUID (FK → Order)
- `replay_run_id`: UUID? (FK → ReplayRun)
- `callback_url`: string（快照）
- `return_method`: ReturnMethod（快照）
- `payload`: JSON（至少含 `order_no,status,amount,currency,completed_at,error_code?,error_message?,return_log_id`）
- `success`: boolean（語意：平台已準備/啟動 dispatch；不代表對方已收到）
- `initiated_at`: datetime
- `client_signal_at`: datetime?（best-effort）
- `ack_at`: datetime?
- `error_summary`: string?（僅平台可明確判定之失敗）

**索引/約束**
- index(`order_id`, `initiated_at`)

---

## Entity: WebhookJob（outbox/job）

**目的**：非同步排程 webhook 發送（可恢復、可重試）。

**欄位**
- `id`: UUID (PK)
- `order_id`: UUID (FK → Order)
- `replay_run_id`: UUID? (FK → ReplayRun)
- `webhook_endpoint_id`: UUID? (FK → WebhookEndpoint)
- `url`: string（快照；避免 endpoint 被刪/改後失聯）
- `event_id`: UUID（同一業務事件固定；重試/重送不變）
- `run_at`: datetime
- `status`: JobStatus
- `attempt_count`: int
- `last_error`: string?
- `locked_at`: datetime?
- `locked_by`: string?（worker id）
- `created_at`: datetime
- `updated_at`: datetime

**索引/約束**
- index(`status`, `run_at`)
- index(`order_id`, `created_at`)

---

## Entity: WebhookLog（append-only）

**目的**：每次 webhook send attempt 的紀錄（包含重送與 replay）。

**欄位**
- `id`: UUID (PK)
- `order_id`: UUID (FK → Order)
- `replay_run_id`: UUID? (FK → ReplayRun)
- `webhook_endpoint_id`: UUID? (FK → WebhookEndpoint)
- `url`: string（快照）
- `event_id`: UUID
- `signature_timestamp`: int（unix seconds）
- `signature_header`: string（完整 `X-PaySim-Signature` 值）
- `request_headers`: JSON（需 redaction policy；不可含 secret）
- `payload`: JSON
- `sent_at`: datetime
- `duration_ms`: int?
- `response_status`: int?
- `response_body_excerpt`: string?（上限 4KB）
- `success`: boolean
- `error_summary`: string?

**索引/約束**
- index(`order_id`, `sent_at`)
- index(`event_id`)

---

## Entity: AuditLog（append-only）

**目的**：關鍵操作審計（登入/登出、建立訂單、進入付款頁、simulate、dispatch、webhook、重送、replay、管理操作等）。

**欄位**
- `id`: UUID (PK)
- `actor_user_id`: UUID? (FK → User)
- `actor_role`: Role?
- `action`: string（例如 `order.create`, `order.simulate`, `webhook.resend`）
- `target_type`: string（例如 `order`, `webhook_endpoint`）
- `target_id`: string?
- `request_id`: string?
- `meta`: JSON?
- `created_at`: datetime

**索引/約束**
- index(`created_at`)
- index(`actor_user_id`, `created_at`)

---

## 驗證規則摘要（對應 FR）

- amount：正整數
- currency：必須在 `SystemSettings.allowed_currencies`
- callback_url / webhook_url：必須為合法 `http/https` URL
- delay_sec / webhook_delay_sec：整數且 >= 0
- payment_method_code：必須指向 enabled 的 PaymentMethod
- simulation_scenario：必須為列舉值

---

## 狀態轉移（OrderStatus）

合法轉移（其他一律拒絕且不得寫入 OrderStateEvent）：

- `created` → `payment_pending`（首次成功載入付款頁）
- `payment_pending` → `paid` | `failed` | `cancelled` | `timeout`（simulate-payment 完成）

終態：`paid/failed/cancelled/timeout`（不可再轉移）
