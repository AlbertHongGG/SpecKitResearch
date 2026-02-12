# Research: Enforcing Domain State Machines（NestJS Domain Layer / Marketplace Order/SubOrder）

**Date**: 2026-02-10  
**Target stack**: NestJS + TypeScript（persistence: Prisma/SQLite assumed）  
**Scope**: 1) SubOrder 合法狀態轉換強制（domain 層） 2) 退款拒絕時的 prev_status（恢復策略） 3) 由 SubOrders **決定性**推導 Order aggregate status（不可手改） 4) 測試策略

---

## 0) 結論先行（推薦做法）

- **SubOrder 狀態機用「行為方法」封裝**：禁止任何 service/repository 直接 set status；只允許 `subOrder.ship()` / `subOrder.requestRefund()` 這類 domain method 內部推進。
- **退款拒絕的 prev_status 放在 RefundRequest 上（推薦）**：`RefundRequest.subOrderPrevStatus` 作為「這次申請退款的來源狀態」，拒絕時僅能回到該值；避免多次申請造成 SubOrder.prevStatus 被覆蓋或不一致。
- **Order 狀態用純函式推導（deterministic）**：`deriveOrderStatus(subOrders)` 變成單一真相；Order.status 若要持久化，只能作為 denormalized cache，且必須在同一交易內以推導結果更新。
- **競態與一致性要雙層保護**：domain 層做「允許/拒絕」判斷；repository 寫入用「條件更新（compare-and-swap）」防止並發下的非法跳轉。

---

## 1) 為什麼要在 Domain 層「強制」狀態機

在 Marketplace 這種流程長、角色多（Buyer/Seller/Admin）的 domain：

- API 層/Service 層很容易散落 `if (status !== ...) throw`，最後規則難以維護、也容易被漏掉。
- 同一個狀態改變可能由不同入口觸發（例如 webhook vs 手動操作），若規則不集中，就會產生不可預期的狀態。
- 退款拒絕要回復「申請前狀態」屬於 **可逆轉換**，需要明確保存來源狀態與稽核。

因此核心目標是把狀態機變成：

1) **可讀、可查、可測**（單一地方定義規則）
2) **可恢復**（拒絕退款能正確回復）
3) **可抗並發**（DB 寫入層也拒絕非法轉換）

---

## 2) SubOrder 狀態機：建模與實作模式

### 2.1 狀態與事件（建議用「事件驅動的行為方法」）

不要讓外界呼叫 `setStatus(next)`；改成 domain 行為：

- `markPaid(paymentRef, occurredAt)`
- `ship(actorSellerId, tracking?, occurredAt)`
- `markDelivered(occurredAt)`
- `cancelBeforePayment(actorBuyerId, reason)`
- `requestRefund(actorBuyerId, requestedAmount, reason, now)`
- `approveRefund(actorSellerId, approvedAmount, now)`（或由 admin）
- `rejectRefund(actorSellerId, reason, now)`（會觸發 restore）
- `markRefunded(refundTxId, now)`（終態）

優點：
- 行為名稱就是產品語意（避免 API 亂用 status）
- 前置條件與後置條件集中
- 測試可直寫「Given/When/Then」

### 2.2 規則表：集中定義合法轉換

兩種常用模式（都可行）：

**模式 A：transition map（宣告式）**
- 用一個 map 定義「從狀態 S 可以接受哪些 event」
- event handler 裡再做細節驗證（例如退款窗口、金額）

**模式 B：每個 domain method 自己 assert 當前狀態**（MVP 最直覺）
- `requestRefund()` 內 `assertStatusIn([paid, shipped, delivered])`
- `ship()` 內 `assertStatus(paid)`

推薦：MVP 先用模式 B；當狀態數/事件數變多再抽成 transition map。

### 2.3 Domain error 要「可機器判讀」

建議定義 `DomainError`（或 `InvariantViolation`），至少包含：

- `code`: 例如 `SUBORDER_INVALID_TRANSITION`, `REFUND_WINDOW_EXPIRED`
- `message`: 對開發者可讀
- `details`: `{ currentStatus, attemptedAction, ... }`

API 層把 `SUBORDER_INVALID_TRANSITION` 映射成 HTTP `409 Conflict`（與 spec 一致）。

---

## 3) 退款拒絕恢復：prev_status 的存放位置與一致性

### 3.1 需求重述

- SubOrder 進入 `refund_requested` 時必須保存「申請退款前的狀態」
- 退款被拒絕時 SubOrder 需要 **恢復到該狀態**
- 必須可稽核：誰在何時以何理由拒絕，且前後狀態可追溯

### 3.2 三種常見做法比較

#### Option 1：把 `prev_status` 存在 SubOrder（簡單但容易踩坑）

- 欄位：`sub_orders.refundRequestedFromStatus` 或 `sub_orders.prevStatus`
- 優點：查詢快、欄位直觀
- 風險：
  - 若允許多次退款申請，欄位會被覆寫；很難對應「哪一次 RefundRequest」
  - 若退款請求表存在（你多半會需要），prev 狀態應該跟那張表同生共死

適用：你確定整個生命週期只會有 0 或 1 次退款申請（通常不成立）。

#### Option 2（推薦）：把 prev_status 存在 RefundRequest

- 欄位：`refund_requests.subOrderPrevStatus`
- 進入 refund_requested 時：建立 RefundRequest，並寫入 `subOrderPrevStatus = subOrder.status`
- 拒絕時：只允許 `refund_requested -> refundRequest.subOrderPrevStatus`

優點：
- prev_status 具備「因果關係」：這次申請把狀態從哪裡帶來
- 多次退款申請也安全：每次申請都保存自己的 prev_status
- 稽核更清楚：退款請求本身就是稽核主體（requested/approved/rejected/refunded）

#### Option 3：用 Event Sourcing（最強但成本高）

- 不存 prev_status；用事件重播推導「申請前狀態」
- 適用：你已採用事件溯源與投影；否則 MVP 不建議

### 3.3 拒絕退款的復原細節（建議不變更 RefundRequest 的歷史）

拒絕退款時應同時做：

- `RefundRequest.status = rejected`（終態/不可再轉回 requested）
- `SubOrder.status = RefundRequest.subOrderPrevStatus`
- 寫入 `AuditLog` 或 `SubOrderStatusHistory`：包含 `{ from: refund_requested, to: prev, reason, actor }`

並加上護欄：
- 只有當 `SubOrder.status === refund_requested` 且 `RefundRequest.status === requested` 時可拒絕
- 若 SubOrder 已被 admin 強制退款（或進入終態），拒絕應回 `409`

---

## 4) Order 狀態推導：確保 deterministic（決定性）與可維護性

### 4.1 原則

- Order.status **不是獨立狀態機**；它是 SubOrders 的「投影」
- 推導必須是：同一組 SubOrder statuses → 永遠得到同一個 Order status
- 推導規則要「全域覆蓋」：任何組合都要有結果（total function）

### 4.2 建議：把推導寫成純函式

建立 `deriveOrderStatus(subOrders): OrderStatus`，輸入只包含必要資訊（至少 subOrder.status；必要時也可帶 refund 相關旗標）。

建議策略：
- **先定義終態優先級**（例如 all cancelled / all refunded / all delivered）
- 再定義「部分履約」的規則（部分 shipped / 部分 delivered / 混合 paid）
- 最後以 `created`（或 `pending_payment` 反映）作為 fallback

重要：把規則寫成「一組固定順序的 if」或「priority ranking」，避免不小心重疊造成不穩定。

### 4.3 持久化 or 查詢時計算？

- **查詢時計算（virtual）**：最一致，但每次查詢要 join/aggregate；對列表頁可能較重
- **持久化作 cache（denormalized）**：效能好，但要保證每次 SubOrder 更新時同步更新 Order

推薦：MVP 用「持久化 cache + 同交易更新」。硬規則：
- Repository 不允許外界直接更新 Order.status
- 只能透過 `OrderRepository.recomputeStatus(orderId)` 或在更新 SubOrders 的 use case transaction 末尾更新

### 4.4 交易邊界（Prisma/SQLite 友善）

在一個 use case（例如 `shipSubOrder`）內：

1) 讀取 SubOrder（與必要的 OrderId）
2) domain method 驗證合法性
3) 用 `updateMany(where: { id, status: expected })` 寫入狀態（CAS）
4) 重新查該 Order 的 SubOrders 狀態集合（或用更新前後的資料推導）
5) 計算 `deriveOrderStatus`，並更新 Order.status（同交易）

這樣才能在並發下仍然一致。

---

## 5) 在 NestJS 的分層落點（推薦結構）

### 5.1 分層責任

- **Domain layer**（entities/value objects/domain services）
  - 定義狀態機、行為方法、invariants、`deriveOrderStatus`
- **Application layer**（use cases / command handlers）
  - 權限檢查（actor 是 buyer/seller/admin）、載入 aggregate、呼叫 domain 行為、協調 repository
- **Infrastructure layer**（Prisma repositories / outbox / integrations）
  - DB 交易、CAS 更新、事件持久化、webhook ingest

### 5.2 可選：NestJS CQRS

若你使用 `@nestjs/cqrs`：

- 每個狀態轉換是一個 Command（`ShipSubOrderCommand`）
- Handler 內做交易與儲存
- Domain event（`SubOrderShipped`）可用於觸發通知/稽核

CQRS 不強制，但它能把「狀態改變」的入口收斂得更乾淨。

---

## 6) 測試策略（推薦層級與案例組合）

### 6.1 Domain 單元測試（最重要）

**A) SubOrder transition tests（table-driven）**

- 針對每個 domain method：
  - 合法狀態 → 成功、狀態正確、必要欄位被設置（例如 `refundRequestId`）
  - 非法狀態 → 丟 `DomainError(code=SUBORDER_INVALID_TRANSITION)`

**B) Refund reject restoration**

- Given `SubOrder.status = shipped`
- When `requestRefund()` → `refund_requested` 且 RefundRequest.subOrderPrevStatus = shipped
- When `rejectRefund()` → SubOrder 回到 shipped
- 並驗證：RefundRequest.status=rejected；SubOrder 不殘留 prev_status（若你有在 SubOrder 存 cache，應清空）

**C) deriveOrderStatus 的完整性**

- 以「狀態組合矩陣」測試：
  - all cancelled → cancelled
  - all refunded → refunded
  - all delivered → completed
  - mix paid+shipped → partially_shipped
  - any pending_payment → created（或你 spec 定義的狀態）

建議寫成 `describe.each`，確保規則順序固定且覆蓋所有你允許的 SubOrder 狀態集合。

### 6.2 Repository/DB 整合測試（確保 CAS 與交易）

- 同一筆 SubOrder 並發兩個更新：
  - Thread A: ship（expected status=paid）
  - Thread B: requestRefund（expected status in paid/shipped/delivered）
  - 驗證：只有一個成功；另一個拿到 409（或 application 層對應的衝突錯誤）

- 退款拒絕時的 CAS：
  - only update if `status=refund_requested`
  - 若已被 admin 強制 refunded，拒絕應失敗

### 6.3 Application/API 層測試（語意映射）

- `DomainError(SUBORDER_INVALID_TRANSITION)` → HTTP 409
- 權限錯誤（非賣家出貨）→ 403
- 資源不存在/不屬於 actor → 404 或 403（依 spec）

### 6.4 回歸測試建議（和 webhook 互動）

- webhook `payment_succeeded` 會推進 SubOrders: pending_payment → paid
- 對同事件重送：SubOrder transition 應冪等（透過 repository 的條件更新與事件去重）

---

## 7) 推薦落地清單（可直接轉 tasks）

- Domain
  - 定義 `SubOrderStatus`/`OrderStatus` enums（或 string union）
  - 實作 SubOrder 行為方法與 invariant
  - 實作 `deriveOrderStatus(subOrders)`（純函式）
  - 定義 `DomainError`（含 code）

- Persistence
  - SubOrder 更新一律用 CAS（`updateMany(where: { id, status: expected })`）
  - 退款申請表保存 `subOrderPrevStatus`
  - 狀態歷史或 AuditLog（至少涵蓋 refund reject / admin force refund）

- Tests
  - domain 單元測試覆蓋所有合法/非法轉換
  - deriveOrderStatus 規則矩陣測試
  - 1~2 個 repository 併發/衝突整合測試（CAS 的價值驗證）
