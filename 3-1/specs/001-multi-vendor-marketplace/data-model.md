# Data Model: 多商家電商平台（Marketplace）

**Date**: 2026-02-10  
**Spec**: [spec.md](spec.md)  
**Research**: [research.md](research.md)

> 本文件以「概念資料模型 + 重要約束/索引/狀態規則」描述；實作將以 Prisma + SQLite 落地。

---

## 1) Domain Types（共用型別）

- **ID**: `string`（對外契約一律當 `string`）
- **Money**: `int`（最小貨幣單位；避免浮點）
- **Timestamp**: ISO-8601 string（UTC）

---

## 2) Core Entities

### 2.1 User

- `id: ID`
- `email: string`（unique）
- `password_hash: string`
- `roles: string[]`（包含 buyer/seller/admin）
- `created_at: Timestamp`
- `updated_at: Timestamp`

**Constraints / Indexes**
- Unique: `email`

---

### 2.2 SellerApplication

- `id: ID`
- `user_id: ID`（FK → User）
- `shop_name: string`
- `documents?: string | JSON`（可選）
- `status: submitted | approved | rejected`
- `reviewed_by_admin_id?: ID`（FK → User）
- `created_at`, `updated_at`

**Constraints / Indexes**
- Index: `(user_id, status)`

---

### 2.3 Category

- `id: ID`
- `name: string`
- `status: active | inactive`
- `created_at`, `updated_at`

**Constraints / Indexes**
- Unique (建議): `name`

---

### 2.4 Product

- `id: ID`
- `seller_id: ID`（FK → User）
- `title: string`
- `description: string`
- `price: Money`
- `stock: int`
- `category_id: ID`（FK → Category）
- `status: draft | active | inactive | banned`
- `created_at`, `updated_at`

**Validation**
- `price >= 0`
- `stock >= 0`

**Constraints / Indexes**
- Index: `(status, category_id)`
- Index: `(seller_id, status)`

---

### 2.5 Cart / CartItem

**Cart**
- `buyer_id: ID`（PK/FK → User）
- `updated_at: Timestamp`

**CartItem**
- `id: ID`
- `buyer_id: ID`（FK → User）
- `product_id: ID`（FK → Product）
- `quantity: int`

**Validation**
- `quantity >= 1`

**Constraints / Indexes**
- Unique (建議): `(buyer_id, product_id)`（避免同商品重複列）

---

### 2.6 Order（聚合）

- `id: ID`
- `buyer_id: ID`（FK → User）
- `total_amount: Money`
- `status: created | paid | partially_shipped | completed | cancelled | refunded`（**由 SubOrder 聚合推導**）
- `created_at`, `updated_at`

**Constraints / Invariants**
- `status` 不可被任意寫入，必須由聚合函式 `deriveOrderStatus(suborders[])` 計算後更新。

---

### 2.7 SubOrder / SubOrderItem

**SubOrder**
- `id: ID`
- `order_id: ID`（FK → Order）
- `seller_id: ID`（FK → User）
- `subtotal: Money`
- `status: pending_payment | paid | shipped | delivered | cancelled | refund_requested | refunded`
- `refund_requested_prev_status?: paid | shipped | delivered`（用於拒絕退款恢復；亦可改存於 RefundRequest）
- `created_at`, `updated_at`

**SubOrderItem**
- `id: ID`
- `suborder_id: ID`（FK → SubOrder）
- `product_id: ID`（FK → Product）
- `unit_price_snapshot: Money`
- `quantity: int`

**Validation**
- `quantity >= 1`
- `unit_price_snapshot >= 0`

**Constraints / Indexes**
- Index: `(order_id)`
- Index: `(seller_id, status)`

---

### 2.8 Payment

- `id: ID`
- `order_id: ID`（FK → Order）
- `payment_method: string`
- `payment_status: pending | succeeded | failed | cancelled`
- `transaction_id: string`（外部交易識別）
- `callback_received_at?: Timestamp`
- `created_at`, `updated_at`

**Constraints / Indexes**
- Unique: `(order_id, transaction_id)`（支援 callback 冪等鍵）

---

### 2.9 RefundRequest

- `id: ID`
- `order_id: ID`（FK → Order）
- `suborder_id: ID`（FK → SubOrder）
- `buyer_id: ID`（FK → User）
- `reason: string`
- `requested_amount: Money`
- `approved_amount?: Money`
- `status: requested | approved | rejected | refunded`
- `prev_suborder_status?: paid | shipped | delivered`（建議放在此處，作為恢復依據與稽核）
- `created_at`, `updated_at`

**Validation**
- `requested_amount >= 0`
- 若 `approved_amount` 存在：`0 <= approved_amount <= requested_amount`

**Constraints / Indexes**
- Index: `(suborder_id, status)`

---

### 2.10 Review

- `id: ID`
- `buyer_id: ID`（FK → User）
- `product_id: ID`（FK → Product）
- `rating: int`（1..5）
- `comment: string`（純文字；不允許 HTML）
- `created_at`, `updated_at`

**Constraints / Indexes**
- Unique (建議): `(buyer_id, product_id)`（每筆交易策略若需更精準，可改以 SubOrderItem 綁定）

---

### 2.11 Settlement

- `id: ID`
- `seller_id: ID`（FK → User）
- `period: string`（例如 `2026-W06`）
- `gross_amount: Money`
- `platform_fee: Money`
- `net_amount: Money`
- `status: pending | settled`（settled 不可修改）
- `created_at`, `updated_at`

**Constraints / Invariants**
- `net_amount = gross_amount - platform_fee`

---

### 2.12 DisputeCase

- `id: ID`
- `order_id: ID`（FK → Order）
- `suborder_id?: ID`（FK → SubOrder）
- `opened_by: buyer | seller | admin`
- `status: open | resolved`
- `resolution_note?: string`
- `created_at`, `updated_at`

---

### 2.13 AuditLog

- `id: ID`
- `actor_user_id: ID`（FK → User）
- `actor_role: buyer | seller | admin`
- `action: string`
- `target_type: string`
- `target_id: ID`
- `created_at: Timestamp`
- `metadata?: JSON`

**Constraints / Indexes**
- Index: `(target_type, target_id, created_at)`
- Index: `(actor_user_id, created_at)`

---

## 3) Supporting Entities（為冪等/一致性而生）

> 這些屬於「內部一致性」資料結構，不必暴露給前端；但對付款 callback 冪等、補償、以及庫存 exactly-once 很重要。

### 3.1 Session

- `id: ID`
- `token_hash: string`（unique；只存 hash）
- `user_id: ID`
- `created_at`, `expires_at`, `last_seen_at`
- `revoked_at?: Timestamp`

### 3.2 WebhookEvent（支付回呼事件記錄）

- `id: ID`
- `provider: string`
- `event_id: string`（unique with provider）
- `order_id?: ID`
- `transaction_id?: string`
- `payload: JSON`
- `received_at: Timestamp`
- `processed_at?: Timestamp`
- `process_status: pending | processed | failed`
- `error?: string`

### 3.3 InventoryLedger（庫存異動帳）

- `id: ID`
- `operation_key: string`（unique；例如 `payment:{orderId}:{transactionId}`）
- `product_id: ID`
- `delta: int`（負數表示扣庫存）
- `created_at: Timestamp`

---

## 4) State Machines

### 4.1 SubOrder 合法轉換

- `pending_payment → paid`（付款成功）
- `paid → shipped`（賣家出貨）
- `shipped → delivered`（送達/收貨）
- `pending_payment → cancelled`（付款前取消）
- `paid | shipped | delivered → refund_requested`（申請退款；受窗口限制）
- `refund_requested → refunded`（退款完成，終態）
- `refund_requested → prev_status`（拒絕退款後恢復原狀態；必須有稽核）

### 4.2 Order 聚合狀態（deriveOrderStatus）

依 spec 規則（以優先序判定）：

1. 全 cancelled → `cancelled`
2. 全 refunded → `refunded`
3. 全 delivered → `completed`
4. 存在 shipped/delivered 且仍存在 paid/shipped → `partially_shipped`
5. 全 paid 且無 shipped/delivered → `paid`
6. 其他（含 pending_payment）→ `created`

---

## 5) Data Access / Consistency Notes

- 庫存扣減：必須採「條件更新 + 受影響列數檢查」與交易包裝，避免超賣（詳見 [research-inventory-overselling-sqlite-prisma.md](research-inventory-overselling-sqlite-prisma.md)）。
- 付款回呼冪等：以 `(order_id, transaction_id)` 與 `WebhookEvent`/`InventoryLedger.operation_key` unique 約束達成 exactly-once（詳見 [research-payments-webhooks.md](research-payments-webhooks.md)）。
- 稽核：管理操作、狀態終態（取消/退款/結算）需寫入 AuditLog，metadata 需可重建關鍵決策（actor、原因、前後狀態）。
