# Research: Idempotent Payment Callback/Webhook Handling（Order/SubOrder Marketplace）

**Date**: 2026-02-10  
**Target stack**: SQLite + Prisma + NestJS  
**Scope**: webhook/callback 冪等鍵、事件亂序/延遲、事件持久化、庫存扣減 exactly-once、以及「付款成功但訂單建立部分失敗」的補償與對帳設計。

> 核心前提：支付提供者 webhook 幾乎都是 **at-least-once delivery**（可能重送）且 **可能亂序**；你的系統必須把「重放」視為常態。

---

## 1) 設計目標與威脅模型

### 必須保證（Must-haves）

- **Webhook 重送不造成重複副作用**：不重複推進 Payment/Order/SubOrder 狀態、不重複扣庫存、不重複出貨/通知。
- **亂序/延遲可被吸收**：舊事件到達也不會把狀態推回去或覆蓋新狀態。
- **可追溯**：每一個 webhook 事件（原始 payload + 驗簽結果 + 處理結果）可查詢與稽核。
- **可恢復**：處理中當機、資料寫入部分成功，都能靠重試/對帳回到一致狀態。

### SQLite 現實約束

- SQLite 單機單寫者特性讓你「更容易做一致性」，但要避免長交易與高頻寫。
- 不指望資料庫提供 `SELECT ... FOR UPDATE`；以 **唯一約束（unique）+ 條件更新（updateMany with where）+ 交易** 取代。

---

## 2) 端到端建議架構（Ingest fast, process safely）

**關鍵拆分：Webhook Ingestion（接收） vs Processing（處理）**

1. Webhook Controller（NestJS）
   - 驗證簽名（signature verification）。
   - **先寫入 `WebhookEvent`**（若重複則去重），立即回 `2xx`。
   - 不在 request thread 做重副作用（扣庫存/狀態推進/通知）。

2. Background Worker（NestJS cron / interval）
   - 以批次方式撈取 `pending` 事件。
   - 對每個事件做「**領取鎖定（lease）→ 交易內處理 → 標記 processed**」。

這個模式同時解：

- 供應商要求快速回 `2xx`（否則重送更兇）
- 處理可以重試、可監控、可限流（尤其 SQLite 寫入要節制）

---

## 3) Idempotency Keys：需要三層冪等

### Layer A：買家結帳請求冪等（避免重複建單）

- 前端在「提交結帳」時送 `Idempotency-Key`（或 `checkout_request_id`）。
- 伺服器端以 `(buyerId, idempotencyKey)` 建唯一約束：重試請求回傳同一個 `orderId/paymentId`。
- 建議把「價格快照、收貨資訊、cart snapshot、拆單結果」持久化到 `CheckoutSession`（或 `CheckoutAttempt`），以利後續補償/對帳。

### Layer B：你呼叫支付提供者 API 的冪等

- 多數支付提供者支援 API-level idempotency（例如 idempotency key header）。
- 建議 key 來源：你的 `Payment.id` 或 `CheckoutSession.id`，確保重試 create/capture 不會產生多筆交易。

### Layer C：Webhook 事件冪等（避免重複處理同一事件）

- 首選：使用支付提供者提供的 **event id**（例如 `event.id`）作為 `providerEventId`。
- 若提供者沒有 event id：用可穩定組合的 key，例如 `transactionId + eventType + eventCreatedAt + amount + currency`，再加 `payloadHash` 輔助偵錯。

---

## 4) Webhook 事件持久化（WebhookEvent Table）

### 建議資料欄位（概念）

- `id`：UUID
- `provider`：例如 `stripe` / `ecpay` / `newebpay`
- `providerEventId`：供應商事件識別（可為 null，但強烈建議要有）
- `eventType`：`payment_succeeded` / `payment_failed` / `refund_succeeded` ...
- `eventCreatedAt`：供應商事件時間（若無則以 `receivedAt` 替代）
- `receivedAt`
- `signatureVerified`：boolean
- `transactionId`：支付交易識別（例如 chargeId / paymentIntentId）
- `orderId`：若 payload 有帶（可能為 null）
- `payloadJson`（raw）
- `payloadHash`（例如 SHA-256）
- `processingStatus`：`pending | processing | processed | ignored | failed`
- `processingAttempts`, `lastError`, `nextRetryAt`
- `lockedAt`, `lockOwner`（lease 機制）

### 索引/唯一性（重點）

- `unique(provider, providerEventId)`（若 `providerEventId` 存在）
- `index(transactionId)`（支援同一交易的事件查詢）
- `index(processingStatus, nextRetryAt)`（worker 掃描）

### 處理鎖（SQLite 友善版）

- worker 用 `updateMany` 嘗試把 `pending` → `processing` 並寫入 `lockedAt/lockOwner`。
- 只有成功更新 1 筆時才算「領到工作」。
- 對於卡死的 `processing`（例如 `lockedAt` 太舊），允許 worker 重新領取（lease timeout）。

---

## 5) 事件亂序：用狀態機 + 單調性（monotonic）吸收

### Payment 狀態建議（MVP）

- `pending`（已建立、尚未最終確定）
- `succeeded`（終態）
- `failed`（終態）
- `cancelled`（終態）

> 若要更細粒度（authorized/captured/refunded），可擴充，但必須明確：**終態不可回退**。

### 亂序處理原則

- **終態護欄**：一旦 Payment 進入 `succeeded`，後到的 `failed/cancelled` 一律 `ignored`（除非供應商明確允許成功後轉失敗，通常不成立）。
- **事件時間比較**：保存 `payment.lastEventCreatedAt`；若新事件的 `eventCreatedAt` 較舊，建議只寫入 history/事件表但不改 aggregate。
- **事件優先級（可選）**：若同時間戳，使用 `eventTypeRank` 決定套用順序（例如 `succeeded` > `failed` > `cancelled` > `update`）。

---

## 6) 庫存扣減 Exactly-once：用「庫存異動台帳（ledger）」當保險

要防的是：同一筆付款成功 webhook 被重送、或同一筆 Payment 被重試處理，導致重複扣庫存。

### 建議做法（可在 SQLite + Prisma 落地）

1. 引入 `InventoryLedger`（append-only）
   - 每次庫存扣減都形成一筆 ledger record
   - ledger 具備 **唯一 operation key**（例如 `paymentId + subOrderId + productId + "PAYMENT_CAPTURE"` 或直接用 `webhookEventId`）

2. 扣庫存交易（同一個 DB transaction 內完成）
   - 若 ledger 已存在（unique 衝突）→ 已扣過 → 冪等成功
   - 若 ledger 不存在 → 原子扣減庫存：
     - `updateMany(where: { productId, stock: { gte: qty } }, data: { stock: { decrement: qty }})`
     - 以「更新筆數 == 1」判定成功
   - 成功後：寫入 ledger → 推進 SubOrder 狀態
   - 失敗（stock 不足）：記錄 incident，依策略自動退款或人工介入

### 為什麼 ledger 必要

- 只靠「Payment 已 succeeded」不足以避免重複扣庫存：你可能在扣庫存前當機，重試後再扣一次。
- ledger 的 unique constraint 是 **可驗證、可對帳、可恢復** 的 exactly-once 錨點。

---

## 7) Webhook 事件處理流程（建議交易邊界）

以下以 `payment_succeeded` 為例，描述一個「可重放、可恢復」的處理順序：

1. worker 領到 `WebhookEvent`（lease lock）
2. 開啟 DB transaction
3. 依 `transactionId` 尋找/建立 `Payment`
   - 若 Payment 不存在：建立 `Payment(status=pending, transactionId=...)` 並標記 `orphaned=true`（缺上游資料，要走對帳）
4. 套用 Payment 狀態機
   - 若已是 `succeeded` → 直接把 event 標 `ignored/processed`（冪等）
   - 否則更新 `Payment=succeeded` + 寫入 `PaymentStatusHistory`（可選、同樣可用 unique 防重）
5. 確保 Order/SubOrder 完整
   - 若 `orderId` 存在且 Order 存在：繼續
   - 若 Order 不存在：嘗試用 `CheckoutSession` 重建（見下一節補償）
6. 對每個 SubOrderItem 做扣庫存（ledger + 條件扣減）
7. 推進各 SubOrder 為 `paid`（條件更新：僅 `pending_payment` 才可推進）
8. 聚合更新 Order 狀態
9. 把 `WebhookEvent` 標記為 `processed`（同交易內）
10. commit

原則：**event 的 processed 標記必須與副作用同交易提交**，才能用重試確保最終一致。

---

## 8) 付款成功但訂單建立部分失敗：補償/對帳設計

### 推薦的防線：先持久化 CheckoutSession

在讓使用者去付款之前，先在 DB 建立：

- `CheckoutSession`
  - `id`（你的系統產生）
  - `buyerId`
  - `cartSnapshot`（商品/數量/單價/幣別/賣家拆單結果）
  - `shippingSnapshot`
  - `pricingSnapshot`（折扣/運費/稅等；MVP 可簡化）
  - `status: created | payment_initiated | payment_succeeded | reconciled | failed`

呼叫支付 API 時，把 `checkoutSessionId` 放進 provider metadata（或你的 `paymentRef` 欄位），讓 webhook 能回推到它。

### 對帳/補償策略（Saga-ish，但用 DB 就能做）

當收到 `payment_succeeded` webhook：

- **Case 1：Order 已存在但部分 SubOrder 缺失**
  - 用 `CheckoutSession.cartSnapshot` 補建缺失 SubOrder/SubOrderItem
  - 重跑「扣庫存 ledger → 推進 paid」

- **Case 2：Order 不存在（payment orphan）**
  - 建立 `ReconciliationTask`（或把 Payment 標 `needs_reconciliation=true`）
  - worker 依 `CheckoutSession` 建立完整 Order/SubOrder/Items，再跑扣庫存/狀態推進

- **Case 3：CheckoutSession 也不存在/資料不足**
  - 把 Payment 標為 `manual_review_required`
  - 仍保留 webhook payload，可人工核對（或提供 admin 工具補單/退款）

### 補償的底線決策（需要產品規則）

- 若付款成功但扣庫存失敗（超賣）
  - 選項 A：自動退款（最保守、MVP 推薦）
  - 選項 B：backorder（延遲出貨）但要清楚告知買家
  - 選項 C：部分履約（僅對缺貨項退款）— marketplace 複雜度上升

MVP 建議：**自動退款 + 生成 incident + 通知管理員**。

---

## 9) Prisma + SQLite 的落地細節（實務建議）

### 交易與條件更新

- 用 `prisma.$transaction(async (tx) => { ... })` 包住「處理單一 webhook event」的核心副作用。
- 用 `updateMany` 實作原子條件：
  - Payment：`where: { id, status: { notIn: ["succeeded","failed","cancelled"] } }`
  - SubOrder：`where: { id, status: "pending_payment" }`
  - Product stock：`where: { id, stock: { gte: qty } }`

### 去重與重試

- `WebhookEvent` insert 時若撞 unique（Prisma `P2002`），代表 duplicate event：直接回 `2xx`。
- 處理失敗：增加 `processingAttempts`，設定 `nextRetryAt`（指數退避）；超過上限標 `failed` 並告警。

### SQLite 併發建議

- 開 WAL 模式（提升讀寫併發）。
- worker 先做「單 worker」版本（穩、好 debug）；要擴展時再做 partition（例如依 `transactionId` hash）。

---

## 10) 建議的資料表（Prisma Model 概念草案）

> 以下是概念欄位，實際命名依你的 domain model 調整。

- `WebhookEvent`
- `CheckoutSession`
- `Payment`（含 `transactionId`, `status`, `orderId?`, `checkoutSessionId?`, `lastEventCreatedAt?`, `needsReconciliation`）
- `PaymentStatusHistory`（可選，做稽核）
- `InventoryLedger`（`operationKey` unique）
- `ReconciliationTask` / `Incident`（可選，但強烈建議至少有一個可查的 queue/狀態）

---

## 11) 驗收清單（可直接轉成測試案例）

- 同一個 `payment_succeeded` webhook 重送 10 次：
  - Payment 仍為 `succeeded`
  - SubOrder 只會從 `pending_payment` → `paid` 一次
  - 庫存只扣一次（ledger 記錄一筆）
- 亂序：先收到 `succeeded`，再收到 `failed`：
  - Payment 仍為 `succeeded`（failed event 被 ignored）
- 當機復原：處理到「Payment=succeeded」後當機，但還沒扣庫存：
  - 重試後完成扣庫存一次，且不會重複扣
- 付款成功但 Order 不存在：
  - 建立 reconciliation task
  - 用 CheckoutSession 重建 Order/SubOrder
  - 最終狀態一致且可查到 webhook payload
