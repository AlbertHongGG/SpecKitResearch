# Feature Specification: 金流前置模擬平台（非真的刷卡） / Payment Flow Simulation Platform (Non-Real Payment)

**Feature Branch**: `001-payment-flow-sim`  
**Created**: 2026-03-05  
**Status**: Draft  
**Input**: 建立一個不連真實金流/銀行的測試平台，用於完整模擬「建立訂單 → 進入付款頁 → 付款結果 → Return URL / Webhook 回傳」，並支援延遲、錯誤、重送與重播，驗證訂單狀態機與不可變事件紀錄。

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - 建立訂單並完成模擬付款（含 Return/Webhook） (Priority: P1)

身為 User（Developer），我可以建立一筆模擬訂單，取得付款頁連結，並在付款頁完成模擬付款後，收到回傳（Return URL）與（選填）Webhook，以便驗證整體串接與訂單終態。

**Why this priority**: 這是平台的核心價值（端到端串接驗證），沒有它就無法完成任何整合測試。

**Independent Test**: 只要能「建立訂單 → 打開付款頁 → 完成付款 → 看到 Return/Webhook 紀錄」，就能獨立驗證 MVP。

**Acceptance Scenarios**:

1. **Given** 使用者已登入且 role=User（Developer），**When** 建立訂單並選擇情境 `success` 且設定 callback_url，**Then** 系統建立訂單（status=`created`），提供付款頁 URL，完成付款後訂單進入終態 `paid`，並以訂單的 return_method 對 callback_url 送出結果，且建立一筆 ReturnLog。
2. **Given** 訂單建立時提供 webhook_url，**When** 訂單完成付款進入終態（`paid`/`failed`/`cancelled`/`timeout`），**Then** 系統發送 Webhook（允許延遲），並建立一筆 WebhookLog，payload 欄位與 Return payload 欄位一致。

---

### User Story 2 - 驗證失敗/逾時/延遲與不可變狀態事件 (Priority: P2)

身為 User（Developer）或 QA，我可以選擇不同模擬情境（失敗、取消、逾時、延遲成功）並設定延遲與錯誤碼/錯誤訊息，然後在訂單詳情中查看訂單狀態機的歷史與不可變事件紀錄，以驗證錯誤處理與「終態不可再轉換」。

**Why this priority**: 金流整合最常見問題在於錯誤情境、延遲與狀態機一致性；必須可重現且可觀測。

**Independent Test**: 建立一筆 `failed` 或 `timeout` 訂單並完成付款後，只看訂單詳情即可驗證：終態、錯誤欄位、事件流不可變、非法轉換被拒。

**Acceptance Scenarios**:

1. **Given** 訂單在 `payment_pending`，**When** 以情境 `failed` 完成付款並提供 error_code/error_message，**Then** 訂單終態為 `failed` 且 completed_at 有值，Return/Webhook payload 皆包含相同錯誤欄位，且狀態轉換被記錄為不可變的 OrderStateEvent。
2. **Given** 訂單已在終態（`paid`/`failed`/`cancelled`/`timeout`），**When** 嘗試再次觸發會改變訂單狀態的操作，**Then** 系統拒絕並回 400（或等價的「非法狀態」錯誤），且不寫入新的 OrderStateEvent。

---

### User Story 3 - 重送與重播（Replay）復現問題 (Priority: P3)

身為 User（Developer），我可以對同一筆訂單重送 Webhook，或建立 ReplayRun 進行 webhook_only / full_flow 的重播，以便在不改變訂單終態的前提下復現回傳與 Webhook 行為。

**Why this priority**: 問題排查需要可重現；金流回呼常見不穩定，重送/重播是核心除錯能力。

**Independent Test**: 以一筆已完成終態的訂單，按一次「重送 Webhook」或「Replay webhook_only」，即可獨立驗證：會新增對應 Log，且訂單終態不變。

**Acceptance Scenarios**:

1. **Given** 訂單已進入終態且有 webhook_url，**When** 使用者點擊「重送 Webhook」，**Then** 系統送出相同業務 payload（欄位與值一致），但 timestamp 與 signature 重新產生，並新增一筆 WebhookLog 與一筆 AuditLog。
2. **Given** 訂單已進入終態，**When** 使用者建立 ReplayRun（scope=`full_flow`），**Then** 系統新增 ReturnLog（與既有 payload 一致）並（若有 webhook_url）新增 WebhookLog，且上述新紀錄皆標記 replay_run_id；訂單 status 不改變。

---

### User Story 4 - 管理員維護付款方式/情境模板/系統參數 (Priority: P4)

身為 Admin，我可以管理付款方式、模擬情境模板與系統參數（例如允許幣別、Session 有效期、Return method 預設、Webhook 簽章密鑰輪替策略），並查看全站訂單與操作紀錄，以便提供一致的測試環境。

**Why this priority**: 讓平台可持續運作與支援多團隊；但不影響 P1~P3 的核心串接測試。

**Independent Test**: 只要能新增/停用付款方式、調整一個情境模板預設延遲，並在建立訂單時看到生效，即可獨立驗證。

**Acceptance Scenarios**:

1. **Given** 使用者 role=Admin，**When** 停用某付款方式，**Then** User（Developer）在建立訂單時不可再選到該付款方式。
2. **Given** 使用者 role=Admin，**When** 更新某情境模板的預設 error_code/error_message，**Then** 新建訂單選該情境時會自動帶入新預設值（但仍允許對單筆訂單覆寫）。

### Edge Cases

- callback_url 或 webhook_url 不是合法 http/https URL（需被拒絕）
- User（Developer）以訂單 id/order_no 嘗試存取他人訂單或其紀錄（需回 403）
- 付款頁被重複載入（created → payment_pending 只應發生一次）
- 使用者重複點擊「模擬付款」（終態後不得再次改變狀態；需拒絕且不污染事件流）
- delayed_success：在延遲期間訂單保持 payment_pending，延遲後才進 paid
- Webhook 接收端無回應或回 5xx（需記錄失敗、可手動重送）
- Return URL 無法到達（例如網路/URL 不可用）：跨站瀏覽器導向/送出錯誤通常不可可靠偵測；仍需記錄 ReturnLog attempt 與（若有）client-signal/receiver-ack 狀態以利除錯

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: System MUST provide authentication via email + password and establish a server-managed session for authenticated requests.
- **FR-002**: System MUST store passwords only as irreversible hashes; the system MUST NOT store any real cardholder data.
- **FR-003**: System MUST enforce role-based access control with roles Guest / User（Developer） / Admin; a user’s role MUST NOT be switchable by the user.
- **FR-004**: Guest users MUST only be able to access the login page; any attempt to access protected pages MUST redirect to `/login`.
- **FR-005**: Protected APIs MUST return 401 for unauthenticated requests and 403 for authenticated-but-unauthorized requests.
- **FR-006**: User（Developer） MUST be prevented from accessing orders they do not own (anti-IDOR), including all related logs and events.

- **FR-007**: System MUST allow User（Developer） to create simulation orders with required fields: amount, currency (default TWD), callback_url, payment_method, simulation_scenario.
- **FR-008**: amount MUST be a positive integer.
- **FR-009**: currency MUST be one of the allowed currency codes; default allowed currencies MUST include TWD, USD, JPY and MUST be configurable by Admin.
- **FR-010**: callback_url MUST be a valid http/https URL.
- **FR-011**: webhook_url (if provided) MUST be a valid http/https URL.
- **FR-012**: return_method MUST be persisted onto the order at creation time (defaulted by a system setting) and MUST be immutable afterward.
- **FR-013**: payment_method MUST be chosen from enabled payment methods only.
- **FR-014**: simulation_scenario MUST be one of: success, failed, cancelled, timeout, delayed_success.
- **FR-015**: delay_sec MUST be an integer >= 0; webhook_delay_sec (if provided) MUST be an integer >= 0.
- **FR-016**: For scenarios `failed` and `timeout`, the system MUST support returning error_code and error_message (defaulted by template and overridable per order).

- **FR-017**: System MUST generate a unique, immutable order_no for each order.
- **FR-018**: System MUST provide a payment page URL in the form `/pay/:order_no` for each order.

- **FR-019**: The order status machine MUST support only these statuses: created, payment_pending, paid, failed, cancelled, timeout.
- **FR-020**: The system MUST allow only these transitions: created → payment_pending; payment_pending → paid/failed/cancelled/timeout.
- **FR-021**: On the first successful load of `/pay/:order_no`, the system MUST transition the order status from `created` to `payment_pending` and record an OrderStateEvent.
- **FR-022**: paid/failed/cancelled/timeout MUST be terminal; once entered, the order MUST NOT transition to any other status.
- **FR-023**: Any illegal state transition MUST be rejected with a 400-class error and MUST NOT create an OrderStateEvent.
- **FR-024**: Every legal state transition MUST create an immutable OrderStateEvent with from_status, to_status, trigger, actor_type, occurred_at, and optional meta.

- **FR-025**: The payment page MUST display order summary (order_no, amount, currency, payment_method, simulation_scenario, delay, and error details when applicable).
- **FR-026**: The user MUST be able to trigger “simulate payment” from the payment page.
- **FR-027**: When simulating payment, the system MUST wait delay_sec before completing (except when delay_sec=0).
- **FR-028**: The simulation outcome MUST set the order to the corresponding terminal status and set completed_at.
- **FR-029**: For delayed_success, the order MUST remain `payment_pending` during the delay and become `paid` after the delay.

- **FR-030**: After completion, the system MUST deliver the result to callback_url using the order’s return_method via a **browser-front-channel** dispatch:
  - query_string: deliver via URL query parameters (browser redirect)
  - post_form: deliver via browser form POST as `application/x-www-form-urlencoded`
- **FR-030a**: The system MUST route the user through a simulator-hosted **completion/return-dispatch page** which performs the redirect/form submit and provides manual fallback controls (e.g., a “continue” button) for cases where auto-dispatch is blocked or interrupted.
- **FR-031**: The Return payload MUST include at minimum: order_no, status, amount, currency, completed_at and (when applicable) error_code, error_message.
- **FR-031a**: The Return payload SHOULD include a correlation identifier (e.g., `return_log_id`) to support debugging and optional receiver acknowledgement.
- **FR-032**: The system MUST create a ReturnLog for each dispatch attempt, including payload, delivery method, callback_url, and key timestamps.
- **FR-032a**: Because browser navigation errors are not reliably observable, ReturnLog `success` MUST be defined as **“dispatch attempt prepared/initiated by the simulator”** and MUST NOT be interpreted as proof that the callback endpoint received or processed the payload.
- **FR-032b**: The system SHOULD record a best-effort client-side signal that the dispatch page started navigation/submission (e.g., via beacon/keepalive request), and MAY support an optional receiver “acknowledge return” API keyed by `return_log_id`.

- **FR-033**: When webhook_url is present and an order enters a terminal state, the system MUST send a webhook request to webhook_url.
- **FR-034**: Webhook dispatch MUST support delay: use webhook_delay_sec when set; otherwise use delay_sec.
- **FR-035**: Webhook dispatch MUST be asynchronous relative to the user-facing completion/redirect path.
- **FR-036**: The Webhook payload MUST be field-identical to the Return payload (same field set and values).
- **FR-037**: Webhook requests MUST include a timestamp and a signature header using vendor-prefixed names:
  - `X-PaySim-Signature`: `t=<unix_seconds>,v1=<signature>`
  - `X-PaySim-Event-Id`: an immutable UUID identifying the business event (same across retries/resends for the same event)
- **FR-038**: The signature MUST be computed as HMAC-SHA256(secret, timestamp + "." + raw_body) and encoded as lowercase hex.
- **FR-039**: The webhook timestamp used for signing MUST be visible in the UI and recorded in WebhookLog.
- **FR-039a**: Verification guidance (for integrators) MUST be documented: reject if `abs(now - t)` exceeds a tolerance window (default 300 seconds, configurable) and implement event-id deduplication for at least 24 hours.
- **FR-039b**: The system MUST support webhook signing secret rotation with a `current` and `previous` secret and a configurable grace period; the system MUST sign using only the `current` secret.
- **FR-039c**: Verification logic MUST support validating signatures using two secrets (current first, then previous if within grace) using constant-time comparison.
- **FR-040**: The system MUST persist a WebhookLog per send attempt including request URL, headers, payload, sent_at, response status, response body excerpt (bounded), and success/failure.

- **FR-041**: Authorized users MUST be able to manually resend a webhook for an order they can access.
- **FR-042**: Resending a webhook MUST create a new WebhookLog and a new AuditLog entry.
- **FR-043**: Resending a webhook MUST reuse the same business payload values but MUST generate a new timestamp and signature.

- **FR-044**: The system MUST support replay runs for an order with scopes `webhook_only` and `full_flow`.
- **FR-045**: A replay run MUST NOT change the order’s terminal status.
- **FR-046**: Each replay run MUST create a ReplayRun record that links any new ReturnLog/WebhookLog created by that run.

- **FR-047**: The system MUST record an AuditLog for key actions at minimum: login/logout/session expiry, order creation, enter payment page, simulate payment, state transitions, return dispatch, webhook send/resend, replay start/finish, and admin management actions.

- **FR-048**: Admin MUST be able to manage payment methods (add, disable/enable, sort, display name).
- **FR-049**: Admin MUST be able to manage simulation scenario templates (enable/disable and default delay/error values).
- **FR-050**: Admin MUST be able to configure system parameters at minimum: session duration, default return_method, allowed currencies, and webhook signing secret rotation settings.

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

<!--
  ACTION REQUIRED: Define the contract BEFORE implementation.
  Provide at minimum: request schema, response schema, and error semantics.
-->

- **Contract**: `Login` request: `{ email: string, password: string }`.
- **Contract**: `Login` response (success): `{ user: { id, email, role }, session_expires_at }` and establishes a session; response (failure): `{ error: { code: "AUTH_FAILED", message } }`.
- **Contract**: `Logout` request: none; response: `{ ok: true }` and invalidates the session.
- **Contract**: `GetCurrentSession` response (when authenticated): `{ user: { id, email, role }, session_expires_at }`.

- **Contract**: `CreateSimulationOrder` request: `{ amount, currency?, callback_url, webhook_url?, payment_method_code, simulation_scenario, delay_sec?, webhook_delay_sec?, error_code?, error_message? }`.
- **Contract**: `CreateSimulationOrder` response: `{ order: { id, order_no, status, amount, currency, callback_url, return_method, webhook_url?, payment_method_code, simulation_scenario, delay_sec, webhook_delay_sec?, error_code?, error_message?, created_at, completed_at? }, payment_page_url }`.
- **Contract**: `ListOrders` query supports: `page` (1-based), `status`, `payment_method_code`, `simulation_scenario`, `created_at_from`, `created_at_to`; response: `{ items: [order...], page, page_size: 20, total }`.
- **Contract**: `GetOrderDetail` response: `{ order, state_events: [...], return_logs: [...], webhook_logs: [...], replay_runs: [...], audit_logs: [...] }`.

- **Contract**: `ResendWebhook` request: `{}`; response: `{ ok: true, webhook_log_id }`.
- **Contract**: `CreateReplayRun` request: `{ scope: "webhook_only" | "full_flow" }`; response: `{ ok: true, replay_run_id }`.

- **Contract**: Payment page is a browser page reachable via a per-order payment_page_url that allows triggering a simulate-payment action for authorized users.

- **Contract**: Outbound Return payload (to callback_url) fields: `order_no, status, amount, currency, completed_at, error_code?, error_message?` and optionally `return_log_id`.
- **Contract**: Outbound Webhook payload fields: identical to Return payload.
- **Contract**: Outbound Webhook request headers MUST include:
  - `Content-Type: application/json`
  - `X-PaySim-Event-Id: <uuid>`
  - `X-PaySim-Signature: t=<unix_seconds>,v1=<lowercase_hex_hmac_sha256>`
- **Errors**: 400 validation/illegal transition → show actionable message; 401 unauthenticated → redirect to login; 403 unauthorized/IDOR → show access denied; 404 not found → show not found; 409 conflict (e.g., duplicate action on terminal order) → show already completed; 500 internal simulation error → show retryable error.

### State Transitions & Invariants *(mandatory if feature changes state/data)*

<!--
  ACTION REQUIRED: Explicitly define preconditions/postconditions.
  Do NOT invent business rules; mark unclear items as NEEDS CLARIFICATION.
-->

- **Invariant**: An order’s `order_no` and `return_method` are immutable after creation.
- **Invariant**: Terminal statuses (`paid`, `failed`, `cancelled`, `timeout`) cannot transition to any other status.
- **Invariant**: OrderStateEvent is append-only; events cannot be edited or deleted.
- **Invariant**: User（Developer） can only access orders they created; Admin can access all orders.

- **Transition**: Given order status=`created`, when the payment page is first successfully loaded, then status becomes `payment_pending` and an OrderStateEvent is appended with trigger=`enter_payment_page`.
- **Transition**: Given order status=`payment_pending`, when simulate-payment completes under scenario `success` or `delayed_success`, then status becomes `paid`, completed_at is set, and an OrderStateEvent is appended.
- **Transition**: Given order status=`payment_pending`, when simulate-payment completes under scenario `failed`, then status becomes `failed` and an OrderStateEvent is appended including error meta.
- **Transition**: Given order status=`payment_pending`, when simulate-payment completes under scenario `cancelled`, then status becomes `cancelled` and an OrderStateEvent is appended.
- **Transition**: Given order status=`payment_pending`, when simulate-payment completes under scenario `timeout`, then status becomes `timeout` and an OrderStateEvent is appended.

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: Invalid order creation input (amount/currency/URLs/delays).
- **Recovery**: Reject with 400 and do not create any order/log records; user can correct inputs and retry.

- **Failure mode**: Duplicate or out-of-order user actions (e.g., clicking simulate-payment twice, attempting actions after terminal).
- **Recovery**: Reject the illegal action (400/409) without changing order state or writing OrderStateEvent; ensure UI reflects terminal state.

- **Failure mode**: callback_url unreachable or browser fails to deliver post_form.
- **Recovery**: Record ReturnLog as an attempt (prepared/initiated) plus any available client-signal/ack state; allow replay full_flow to re-attempt delivery.

- **Failure mode**: webhook_url fails (network error, timeout, 4xx/5xx responses).
- **Recovery**: Record WebhookLog as failed with response summary; allow manual resend and replay webhook_only.

### Security & Permissions *(mandatory)*

- **Authentication**: Required for all pages/APIs except `/login` and login API. Rationale: order/test data must be isolated per developer account.
- **Authorization**: Enforce RBAC for routes and APIs; enforce ownership checks for User（Developer） on every order/log/event read or action.
- **Sensitive data**: The platform MUST NOT collect or store any real payment credentials or personal card data. Webhook/Return payloads MUST contain only simulation-safe fields (order and outcome data).
- **Webhook integrity**: Outbound webhooks MUST be signed with HMAC, include timestamp, and expose timestamp in UI/logs to help receivers implement replay protection.

### Observability *(mandatory)*

- **Logging**: AuditLog for user/system/admin actions; OrderStateEvent for all legal state transitions; ReturnLog and WebhookLog for each dispatch attempt.
- **Tracing**: Each API response and each outbound webhook attempt SHOULD include a correlation identifier that is persisted in logs to aid debugging.
- **User-facing errors**: Error messages must be actionable (e.g., invalid URL, unauthorized, order not found) without revealing sensitive account existence details during login.
- **Developer diagnostics**: Logs SHOULD capture bounded error summaries (e.g., response status and a truncated response body excerpt for webhooks).

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No (new standalone simulation platform).
- **Migration plan**: Not applicable for initial release; future changes must preserve existing payload fields for Return/Webhook whenever possible.
- **Rollback plan**: Ability to disable new scenario templates/payment methods and revert system parameters to previous values; retain all logs for auditability.

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: Tens of developers and QA users; up to 50,000 simulation orders per month; peak 200 concurrent sessions.
- **Constraints**:
  - Order list (20 per page) should render results within 2 seconds under expected load.
  - Payment page should become interactive within 2 seconds under expected load (excluding user-configured delays).
  - Webhook dispatch should not block the user’s browser redirect to callback_url.

### Key Entities *(include if feature involves data)*

- **User**: Authenticated account with a fixed role (User（Developer） or Admin) used for access control and ownership.
- **Order**: Simulation order containing amount/currency, callback/webhook URLs, scenario configuration, current status, and completed_at.
- **PaymentMethod**: Admin-managed list of selectable simulated payment methods (enabled/disabled, display ordering).
- **SimulationScenarioTemplate**: Admin-managed defaults per scenario type (default delay, default error fields).
- **OrderStateEvent**: Append-only record of each legal order status transition, including triggers and actor metadata.
- **ReturnLog**: Append-only record of each attempt to deliver the Return payload to callback_url (including replay runs).
- **WebhookLog**: Append-only record of each attempt to send the webhook payload (including resends and replay runs).
- **ReplayRun**: Record of a replay execution for an order with scope and outcome, linking to generated logs.
- **AuditLog**: Append-only record of security and operational actions for traceability.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: A User(Developer) can complete the end-to-end flow (create order -> simulate payment -> see ReturnLog and optional WebhookLog) in under 3 minutes when delay_sec=0.
- **SC-002**: For any completed order, the order detail view shows a complete append-only history: terminal status, at least one OrderStateEvent per legal transition, and the corresponding ReturnLog (and WebhookLog when webhook_url is set).
- **SC-003**: 95% of webhook send attempts are recorded with response status (or a clear failure reason) and are eligible for manual resend within the UI.
- **SC-004**: 0 instances of real payment credential storage: audits confirm no storage or logging of real card numbers or cardholder personal data.
