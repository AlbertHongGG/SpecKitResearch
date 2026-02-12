# Feature Specification: 多商家電商平台（Marketplace）

**Feature Branch**: `001-multi-vendor-marketplace`
**Created**: 2026-02-10
**Status**: Draft
**Input**: User description: "$ARGUMENTS"

<!-- Note: Payment webhook idempotency + reconciliation details are captured in ./research-payments-webhooks.md -->
<!-- Note: Domain-level state machine enforcement patterns (SubOrder transitions, refund rejection restoration, Order status derivation) are captured in ./research-domain-state-machines-nestjs.md -->
<!-- Note: Review comment XSS prevention strategy (Next.js + React) is captured in ./research-xss-review-comments-nextjs-react.md -->

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

### User Story 1 - 買家完成跨賣家下單與付款（拆單） (Priority: P1)

買家可以瀏覽/搜尋/篩選商品並加入購物車，在結帳時建立 1 筆平台層 Order 與依賣家拆分的 N 筆 SubOrder，完成付款後可清楚看到付款結果與各 SubOrder 的處理進度。

**Why this priority**: 這是平台的核心交易閉環，能直接驗證 Marketplace 的關鍵價值（多賣家商品聚合結帳 + 拆單追蹤）。

**Independent Test**: 以「兩個不同賣家的商品」完成一次結帳與付款，驗證：建立 Order+SubOrder、付款結果頁呈現、訂單頁可追蹤狀態。

**Acceptance Scenarios**:

1. **Given** 訪客未登入且正在商品詳情頁，**When** 點擊「加入購物車」或嘗試進入購物車/結帳，**Then** 系統導向登入且不建立任何 Cart/Order/Payment。
2. **Given** 買家已登入且購物車內包含不同賣家的 active 商品，**When** 進入結帳並提交，**Then** 系統建立 1 筆 Order(status=created) 與依 seller 拆分的 SubOrders(status=pending_payment)，並建立 Payment(status=pending)。
3. **Given** 付款流程完成且回傳結果為成功，**When** 買家進入付款結果頁，**Then** 頁面明確顯示成功並可前往訂單；訂單中 Order 與各 SubOrder 皆反映付款成功後的狀態。
4. **Given** 付款結果為失敗或取消，**When** 買家進入付款結果頁，**Then** 頁面明確顯示失敗/取消並提供重試付款；Order 維持可重試付款的狀態。

---

### User Story 2 - 賣家入駐、上架商品、出貨與查詢結算 (Priority: P2)

使用者可以申請成為賣家並經平台管理員審核後取得賣家身分；賣家可管理自家商品（草稿/上架/下架/封禁不可用）、處理自家 SubOrder 出貨與售後，並可查詢延遲結算資訊。

**Why this priority**: Marketplace 的供給端必須可運作，否則交易與履約無法成立；同時可驗證「資料隔離」與「賣家僅能操作自家資源」。

**Independent Test**: 用一位使用者送出賣家申請→管理員核准→賣家上架商品→產生 SubOrder 後賣家出貨→賣家可查看該筆結算資料。

**Acceptance Scenarios**:

1. **Given** 已登入使用者尚未具備賣家身分，**When** 送出賣家申請，**Then** 申請狀態為 submitted 且可在賣家入口查看審核狀態。
2. **Given** 管理員審核 submitted 申請，**When** 核准，**Then** 該使用者取得 Seller 身分且審核動作寫入 AuditLog。
3. **Given** 賣家已具備 Seller 身分，**When** 建立並上架商品，**Then** 商品在公共目錄可被瀏覽與加入購物車（若狀態為 active 且未 banned）。
4. **Given** 賣家有一筆 status=paid 的 SubOrder，**When** 進行出貨操作，**Then** 該 SubOrder 狀態依合法轉換變為 shipped 並可被買家追蹤。

---

### User Story 3 - 取消/退款/糾紛與稽核可追溯 (Priority: P3)

買家可在付款前取消整筆 Order；付款後可針對特定 SubOrder 申請退款，賣家可同意或拒絕，必要時由管理員介入並可強制取消/退款。所有關鍵操作需可被稽核追溯。

**Why this priority**: 售後流程與稽核是平台風險控管與信任基礎；可驗證狀態機、權限、稽核與補償處理。

**Independent Test**: 以一筆已付款且含多個 SubOrder 的訂單，對其中一筆 SubOrder 申請退款→賣家拒絕→狀態回復且 AuditLog 完整；再由管理員強制退款→狀態終止且不可回退。

**Acceptance Scenarios**:

1. **Given** Order 尚未付款且包含多筆 SubOrder(pending_payment)，**When** 買家取消 Order，**Then** Order 與其 SubOrder 全部變為 cancelled 並可在訂單詳情中看到取消結果。
2. **Given** SubOrder 已付款，**When** 買家提交退款申請，**Then** 退款申請狀態為 requested 且 SubOrder 狀態為 refund_requested。
3. **Given** SubOrder 為 refund_requested 且賣家拒絕退款，**When** 完成拒絕操作，**Then** 退款申請狀態為 rejected，SubOrder 恢復到申請前狀態，且拒絕原因與關鍵欄位寫入 AuditLog。
4. **Given** 發生爭議且管理員介入，**When** 管理員強制退款，**Then** SubOrder 最終狀態為 refunded 且不可回退，相關動作完整寫入 AuditLog。

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

- 同一筆付款成功 callback 重複送達（含亂序/延遲）時，不得重複扣庫存、不得重複推進狀態。
- 結帳檢查時發現部分商品缺貨或已下架：必須阻擋建立訂單並提示買家調整購物車。
- banned 商品：不在任何列表/搜尋中出現；直接以 URL 進入時顯示 404（平台一致策略）。
- 買家/賣家嘗試存取非本人資源（例如他人的 Order、非自家 SubOrder）：必須回 403 並不洩漏敏感資訊。
- 付款成功但系統尚未建立完成訂單資料：系統需能補償修復（自動或人工隊列）並可被追蹤。
- delivered 後退款窗口到期：系統必須拒絕並提供可理解的原因與後續指引。
- 退款被拒絕時，SubOrder 必須可恢復到「申請退款前」的原狀態，且該原狀態必須可被稽核。

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: 系統 MUST 支援使用者註冊、登入、登出，並在會話失效時對受保護資源回應 401。
- **FR-002**: 系統 MUST 支援 RBAC 角色：Visitor/Buyer/Seller/Platform Admin。
- **FR-003**: 系統 MUST 在「前端路由層」與「後端資源層」同時強制執行權限與資源擁有權檢查。
- **FR-004**: Visitor MUST 可以瀏覽商品列表、搜尋/篩選、查看商品詳情；但嘗試加入購物車或進入購物車/結帳 MUST 導向登入且不建立交易資料。
- **FR-005**: 公共商品目錄 MUST 僅展示可售商品（status=active 且非 banned）。
- **FR-006**: 系統 MUST 支援商品搜尋/篩選（至少含關鍵字、分類、價格範圍），且篩選欄位在各頁一致。
- **FR-007**: Buyer MUST 能建立與維護自己的購物車（新增/調整/移除），且 quantity MUST >= 1 並不得超過庫存。
- **FR-008**: 只有 active 商品 MUST 允許加入購物車；draft/inactive/banned MUST 被拒絕並提供原因。
- **FR-009**: Buyer 進入結帳時，系統 MUST 再次檢查：商品仍可售且庫存足夠；若任一項不符合 MUST 阻擋建立訂單並提示調整。
- **FR-010**: 系統 MUST 在一次結帳中建立 1 筆 Order(status=created) 與依 seller 拆分的 N 筆 SubOrder(status=pending_payment)。
- **FR-011**: 系統 MUST 計算 Order total_amount 與各 SubOrder subtotal，並以建立當下的商品價格形成可追溯的明細快照。
- **FR-012**: 系統 MUST 建立 Payment(status=pending) 並提供付款流程入口；付款結果頁 MUST 清楚顯示成功/失敗/取消與下一步動作（重試或前往訂單）。
- **FR-013**: 付款成功 callback/webhook MUST 冪等處理，且 MUST 能處理重送、延遲與亂序；系統 MUST 以可識別的事件鍵去重（例如 provider_event_id，或至少 transaction_id + order_id），並 MUST 保留事件的可追溯記錄（含接收時間與處理結果）；重複事件 MUST 不得造成重複扣庫存或重複推進狀態。
- **FR-014**: 付款成功後系統 MUST 將 Payment=succeeded、各 SubOrder=paid，並由聚合規則更新 Order 狀態。
- **FR-015**: 付款失敗或取消後系統 MUST 將 Payment=failed/cancelled，且允許買家對同一筆 Order 重試付款（Order/SubOrder 不得被錯誤推進）。
- **FR-016**: 系統 MUST 在付款成功後扣減庫存；扣庫存動作 MUST 可被追溯且冪等（同一筆交易/同一批訂單項目不可重複扣減），並在併發下 MUST 避免超賣。
- **FR-017**: 系統 MUST 具備補償/補單與對帳能力：若付款成功但 Order/SubOrder/明細/庫存扣減等任一資料缺失或部分失敗，系統 MUST 能透過可追溯的資料（例如結帳快照或付款事件紀錄）將資料修復至一致狀態；若無法自動修復 MUST 能進入可追蹤的人工處理狀態。
- **FR-018**: Seller MUST 僅能管理自家商品（建立/編輯/上架/下架）與自家 SubOrder（出貨/售後處理）。
- **FR-019**: Seller MUST 只能將 status=paid 的 SubOrder 進行出貨並推進為 shipped。
- **FR-020**: Buyer MUST 能在訂單詳情追蹤每筆 SubOrder 的狀態（pending_payment/paid/shipped/delivered/cancelled/refund_requested/refunded）。
- **FR-021**: 系統 MUST 支援付款前取消：Buyer 取消 Order 時，所有 SubOrder MUST 變為 cancelled，且 Order MUST 變為 cancelled。
- **FR-022**: 系統 MUST 支援付款後退款（以 SubOrder 為單位）：Buyer 可建立退款申請(requested)並使 SubOrder 進入 refund_requested。
- **FR-023**: Seller MUST 可同意或拒絕退款；同意後 MUST 支援部分退款（approved_amount < requested_amount）。
- **FR-024**: 退款完成後，系統 MUST 將 RefundRequest=refunded、SubOrder=refunded，且狀態不可回退。
- **FR-025**: 退款被拒絕時，系統 MUST 將 RefundRequest=rejected，並使 SubOrder 恢復到申請退款前的狀態；恢復依據 MUST 可被稽核。
- **FR-026**: Buyer MUST 只能對已 delivered 的交易商品建立 Review；Review comment MUST 以一致策略防止 XSS。
- **FR-027**: 使用者 MUST 可申請成為賣家（SellerApplication=submitted）；Platform Admin MUST 能核准或拒絕，且審核動作 MUST 寫入 AuditLog。
- **FR-028**: 系統 MUST 支援延遲結算給賣家：依期間彙總 gross_amount、計算 platform_fee 與 net_amount，結算為 settled 後 MUST 不可修改。
- **FR-029**: Platform Admin MUST 能管理 Category（建立/調整/啟用停用）並將管理動作寫入 AuditLog。
- **FR-030**: Platform Admin MUST 能介入糾紛、強制取消/退款，且所有強制操作 MUST 寫入 AuditLog。
- **FR-031**: 系統 MUST 提供一致的錯誤處理：未登入需登入資源→401 並導向登入；角色不符→403；資源不存在→404；系統例外→5xx。
- **FR-032**: 主要頁面（列表/詳情/結帳/付款結果/後台管理）MUST 具備 Loading / Empty / Error 狀態與重試入口（如適用）。

### Assumptions

- banned 商品的 URL 直達行為：一律回 404（避免洩漏狀態）。
- 結帳缺貨策略：只要任一商品不可售或庫存不足，一律阻擋建立訂單並要求買家調整。
- delivered 後退款窗口：預設 7 天內可申請，逾期拒絕（可由平台規則調整）。
- 結算週期：預設每週產生一期 Settlement（可調整）。
- 平台抽成（platform_fee）為平台可配置值，賣家不可修改。

### Out of Scope

- 促銷活動、優惠券、點數、會員等級。
- 跨境稅務/發票/物流承運商整合細節。
- 即時聊天、站內信通知系統（可保留事件紀錄但不要求完整通訊能力）。

### Dependencies

- 付款服務：能回傳付款成功/失敗/取消結果，並提供可識別的 transaction_id 以支援冪等。
- 身分與驗證：能支援註冊/登入/登出與會話管理（不限定實作方式）。
- 稽核保存：能持久化保存 AuditLog，並允許依 actor/時間/目標查詢。
- 基礎營運資料：分類、賣家店名等基礎資料需可被管理與展示。

### Acceptance Criteria Coverage

- 權限與錯誤一致性：依角色存取受保護頁面與資源時，必須分別驗證 401/403/404/5xx 的一致行為。
- 交易閉環：以兩位賣家商品完成一次結帳與付款，驗證 Order+SubOrder+Payment 的建立、狀態推進與付款結果頁呈現。
- 狀態機：針對每一個 SubOrder 狀態轉換嘗試（合法/非法）驗證行為；非法轉換必須被拒絕且可追蹤。
- 冪等與一致性：對同一筆交易重放付款成功 callback，多次送達不得造成重複扣庫存或狀態重複推進。
- 售後與稽核：退款核准/拒絕/強制退款後，能在 AuditLog 查到完整 actor、目標、原因與前後狀態。

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: 註冊（/signup）request: { email, password } → response: { user_id }
- **Contract**: 登入（/login）request: { email, password } → response: { user_id, roles[] }
- **Contract**: 商品列表（/）query: { page?, filters? } → response: { items: ProductSummary[], total }
- **Contract**: 搜尋（/search）query: { q?, category_id?, price_min?, price_max?, page? } → response: { items: ProductSummary[], total }
- **Contract**: 商品詳情（/products/:productId）response: { product: ProductDetail, seller: { shop_name }, purchasable: boolean }
- **Contract**: 購物車讀取（/cart）response: { items: CartItemView[], totals }
- **Contract**: 購物車更新（新增/調整/移除）request: { product_id, quantity } → response: { cart }
- **Contract**: 結帳建立訂單（/checkout）request: { shipping_address?, payment_method? } → response: { order_id, suborders: SubOrderSummary[], payment_id }
- **Contract**: 付款結果（/payment/result）query: { order_id, payment_id } → response: { status: succeeded|failed|cancelled, next_actions[] }
- **Contract**: 我的訂單列表（/orders）response: { items: OrderSummary[] }
- **Contract**: 訂單詳情（/orders/:orderId）response: { order: OrderDetail, suborders: SubOrderDetail[] }
- **Contract**: 退款申請（/refunds）request: { suborder_id, reason, requested_amount } → response: { refund_request_id, status }
- **Contract**: 賣家出貨（/seller/orders/:subOrderId/ship）request: { carrier?, tracking_no? } → response: { suborder_id, status }
- **Contract**: 管理員審核賣家（/admin/seller-applications/:id/decision）request: { decision: approved|rejected, note? } → response: { application_id, status }

- **Errors**: 401 → 未登入 → 前端導向 /login
- **Errors**: 403 → 角色不符或非資源擁有者 → 顯示 /403（不得洩漏資源存在與否的敏感資訊）
- **Errors**: 404 → 資源不存在或不可用（含 banned 商品直達）→ 顯示 /404
- **Errors**: 409 → 狀態衝突（例如非法狀態轉換、庫存不足）→ 顯示可理解訊息並提供重試/返回
- **Errors**: 422 → 輸入驗證失敗（例如 quantity < 1）→ 表單/頁面就地提示
- **Errors**: 5xx → 系統例外 → 顯示 /500 並提供重試

### State Transitions & Invariants *(mandatory if feature changes state/data)*

- **Invariant**: 任何受保護資源的讀寫都必須同時檢查「已登入」與「角色 + 資源擁有權」。
- **Invariant**: SubOrder 狀態只能依合法轉換前進或在「拒絕退款」時回復到申請前狀態，禁止任意跳躍。
- **Invariant**: Order 狀態 MUST 由其 SubOrder 聚合計算得出，不允許獨立任意修改。
- **Invariant**: 付款成功 callback 冪等鍵（transaction_id + order_id）在同一筆交易下只能造成一次庫存扣減與一次狀態推進。

- **Transition**: pending_payment → paid
  - Given 付款成功 callback 且冪等鍵未處理過
  - When 系統驗證付款成功
  - Then Payment=succeeded、SubOrder=paid、Order 依聚合規則更新；庫存扣減一次且可驗證

- **Transition**: paid → shipped
  - Given 該 SubOrder 屬於操作的賣家且目前為 paid
  - When 賣家執行出貨
  - Then SubOrder=shipped 並可被買家查詢

- **Transition**: shipped → delivered
  - Given SubOrder=shipped
  - When 買家確認收貨或系統到期自動完成
  - Then SubOrder=delivered；若所有 SubOrder delivered，Order=completed

- **Transition**: pending_payment → cancelled
  - Given Order 尚未付款且 SubOrder=pending_payment
  - When 買家取消整筆 Order
  - Then 所有 SubOrder=cancelled 且 Order=cancelled

- **Transition**: paid/shipped/delivered → refund_requested
  - Given SubOrder 屬於買家且在允許退款窗口內
  - When 買家申請退款
  - Then 建立 RefundRequest=requested 且 SubOrder=refund_requested，保存 prev_status 以便拒絕時恢復

- **Transition**: refund_requested → refunded
  - Given RefundRequest=approved 且退款作業完成
  - When 系統確認退款完成
  - Then RefundRequest=refunded、SubOrder=refunded（不可回退），Order 依聚合規則更新

- **Transition**: refund_requested → prev_status
  - Given 賣家或管理員拒絕退款
  - When 系統完成拒絕
  - Then RefundRequest=rejected，SubOrder 恢復到 prev_status，且拒絕原因與前後狀態寫入 AuditLog

- **Order Aggregation Rule**:
  - 若所有 SubOrder cancelled → Order cancelled
  - 若所有 SubOrder refunded → Order refunded
  - 若所有 SubOrder delivered → Order completed
  - 若存在任一 SubOrder shipped 或 delivered，且仍存在任一 SubOrder paid 或 shipped → Order partially_shipped
  - 若所有 SubOrder 皆為 paid 且無 shipped/delivered → Order paid
  - 其他情況（例如仍有 pending_payment）→ Order created

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: 付款 callback 重複/亂序/延遲送達
  - **Recovery**: 以冪等鍵保證只處理一次；以可查詢的處理紀錄驗證未重複扣庫存與未重複推進狀態
- **Failure mode**: 付款成功但訂單資料未完整建立
  - **Recovery**: 建立「待修復」狀態與補償流程（自動重放或人工介入）；修復後可核對：Payment、Order、SubOrder、庫存與 AuditLog 一致
- **Failure mode**: 結帳時庫存被其他交易搶先扣減造成不足
  - **Recovery**: 阻擋建立訂單並提示買家調整；不得建立不一致的半成品訂單
- **Failure mode**: 非法狀態轉換（例如 shipped 直接到 refunded）
  - **Recovery**: 回 409 並拒絕操作；記錄審計/安全事件以供查核
- **Failure mode**: 退款流程外部失敗（例如退款作業未完成）
  - **Recovery**: 退款申請維持可重試狀態並可被管理員檢視；完成後才允許進入 refunded 終態

### Security & Permissions *(mandatory)*

- **Authentication**: /cart、/checkout、/orders*、/reviews/new、/seller/*、/admin/* 為必須登入；未登入一律 401 並導向 /login。
- **Authorization**:
  - Buyer：只能讀寫自己的 Cart/Order/SubOrder/Payment/RefundRequest/Review。
  - Seller：只能讀寫自家 Product/SubOrder/Settlement。
  - Platform Admin：可跨租戶查詢並介入，且所有關鍵操作必須寫入 AuditLog。
- **Sensitive data**: 密碼/驗證資訊不得回傳；付款交易識別與稽核資料需最小化曝露；錯誤回應不得洩漏他人資源內容。
- **Input safety**: Review comment 必須以一致策略防止 XSS（輸入、儲存、呈現一致）。

### Route Access Control Matrix（路由存取控制表）

> 本表以「使用者可見路由」為主；後端仍必須作為最終裁決點（前端路由限制僅為 UX 與減少誤操作）。

#### Frontend routes

| Route | Visitor | Buyer | Seller | Admin | Notes |
|------|---------|-------|--------|-------|------|
| `/` | ✅ | ✅ | ✅ | ✅ | 商品列表 |
| `/search` | ✅ | ✅ | ✅ | ✅ | 搜尋/篩選 |
| `/products/:productId` | ✅ | ✅ | ✅ | ✅ | banned 直達顯示 404 |
| `/login` | ✅ | ✅ | ✅ | ✅ | 已登入者可導回前頁/首頁（UX） |
| `/signup` | ✅ | ✅ | ✅ | ✅ | 已登入者可導回前頁/首頁（UX） |
| `/cart` | ❌ | ✅ | ✅ | ✅ | 未登入導向 `/login` |
| `/checkout` | ❌ | ✅ | ✅ | ✅ | 未登入導向 `/login` |
| `/payment/result` | ❌ | ✅ | ✅ | ✅ | 需能查詢付款結果 |
| `/orders` | ❌ | ✅ | ✅ | ✅ | 買家訂單列表 |
| `/orders/:orderId` | ❌ | ✅ | ✅ | ✅ | 需資源擁有權（buyer） |
| `/orders/:orderId/suborders/:subOrderId` | ❌ | ✅ | ✅ | ✅ | 退款申請入口（buyer） |
| `/reviews/new` | ❌ | ✅ | ✅ | ✅ | 僅 delivered 後允許建立（由後端判斷） |
| `/seller/apply` | ❌ | ✅ | ✅ | ✅ | 僅「已登入但尚非 seller/admin」顯示入口（UX） |
| `/seller/products` | ❌ | ❌ | ✅ | ✅ | 賣家後台 |
| `/seller/products/new` | ❌ | ❌ | ✅ | ✅ | 賣家後台 |
| `/seller/products/:productId/edit` | ❌ | ❌ | ✅ | ✅ | 資源擁有權（seller） |
| `/seller/orders` | ❌ | ❌ | ✅ | ✅ | 賣家後台 |
| `/seller/orders/:subOrderId` | ❌ | ❌ | ✅ | ✅ | 資源擁有權（seller） |
| `/seller/refunds` | ❌ | ❌ | ✅ | ✅ | 賣家售後 |
| `/seller/settlements` | ❌ | ❌ | ✅ | ✅ | 賣家結算 |
| `/seller/settlements/:settlementId` | ❌ | ❌ | ✅ | ✅ | 資源擁有權（seller） |
| `/admin/*` | ❌ | ❌ | ❌ | ✅ | 管理後台 |
| `/403` | ✅ | ✅ | ✅ | ✅ | 角色不足顯示 |

#### Backend API（概念）

> API 以 `/api` 為 prefix；更完整的 request/response 與錯誤語意以 OpenAPI 契約為準（見 `contracts/openapi.yaml`）。

| API prefix | Visitor | Buyer | Seller | Admin | Notes |
|-----------|---------|-------|--------|-------|------|
| `POST /auth/signup` | ✅ | ✅ | ✅ | ✅ | 註冊 |
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ | 登入（含 rate limit） |
| `POST /auth/logout` | ❌ | ✅ | ✅ | ✅ | 登出 |
| `GET /auth/me` | ❌ | ✅ | ✅ | ✅ | 取得當前使用者 |
| `GET /catalog/*` | ✅ | ✅ | ✅ | ✅ | 商品目錄（active only；banned 404） |
| `/cart/*` | ❌ | ✅ | ✅ | ✅ | 僅本人 |
| `POST /checkout` | ❌ | ✅ | ✅ | ✅ | 建立 Order/SubOrders/Payment |
| `/orders/*` | ❌ | ✅ | ✅ | ✅ | 僅本人；取消/確認收貨需狀態限制 |
| `POST /payments/webhook` | ✅ | ✅ | ✅ | ✅ | Webhook 入口（若有 secret 需驗證；含 rate limit） |
| `GET /payments/result` | ✅ | ✅ | ✅ | ✅ | 付款結果查詢（供結果頁） |
| `/refunds/*` | ❌ | ✅ | ✅ | ✅ | buyer 建立；seller/admin 處理 |
| `/seller/*` | ❌ | ❌ | ✅ | ✅ | 賣家資源（含 ownership） |
| `/admin/*` | ❌ | ❌ | ❌ | ✅ | 管理資源（強制操作需稽核） |

### Observability *(mandatory)*

- **Logging**: 記錄關鍵商務事件（建立訂單、付款結果、出貨、取消、退款申請/核准/拒絕/完成、結算產生/結清）與所有 4xx/5xx 失敗。
- **Tracing**: 每個請求需能以 request_id 關聯到 Payment callback、Order/SubOrder 變更與 AuditLog。
- **User-facing errors**: 以可理解的語言呈現原因與下一步（重試、返回、聯繫客服）；付款結果頁必須明確區分成功/失敗/取消。
- **Developer diagnostics**: 內部記錄需包含 actor、目標資源、前後狀態、冪等鍵、錯誤類型與關聯識別。

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: No（視為新功能/新產品範圍）。
- **Migration plan**: 若既有資料存在，需定義角色與既有使用者映射（Buyer 預設），並提供類別/商品初始資料匯入流程。
- **Rollback plan**: 可停用新功能入口（例如結帳/賣家後台/管理後台）並保留已建立訂單的查詢與售後最小能力；同時保留 AuditLog 供追溯。

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: 上線初期支援數百賣家、數萬商品、日活買家數千；高峰同時結帳使用者 200。
- **Constraints**:
  - 95% 的商品列表/搜尋結果在 2 秒內可顯示首屏內容。
  - 付款結果頁在使用者回到站內後 3 秒內可呈現明確狀態（成功/失敗/取消）。
  - 重要寫入（下單、付款狀態推進、退款終態）必須可保證一致性與可追溯性優先於極致效能。

### Key Entities *(include if feature involves data)*

- **User**: 平台使用者，具備一或多個角色（buyer/seller/admin），為購物、賣家資產與管理行為的主體。
- **Product**: 賣家商品，包含可售狀態、價格、庫存與分類。
- **Category**: 平台分類，用於公共目錄與搜尋篩選。
- **Cart / CartItem**: 買家購物車與項目，僅限買家本人可存取。
- **Order**: 平台層訂單（聚合），由 SubOrder 聚合得出狀態。
- **SubOrder / SubOrderItem**: 賣家層子訂單與明細，依 seller 拆分並由賣家履約與售後處理。
- **Payment**: 付款紀錄，含付款狀態、交易識別與 callback 冪等關聯。
- **RefundRequest**: 退款申請（以 SubOrder 為主），支援部分退款與拒絕回復原狀態。
- **Settlement**: 結算期資料，將買家付款在延遲後結算給賣家，含平台抽成。
- **SellerApplication**: 賣家申請與審核狀態。
- **DisputeCase**: 糾紛案件，用於管理員介入與紀錄結果。
- **AuditLog**: 關鍵操作稽核軌跡，至少涵蓋管理操作、強制取消/退款、審核、結算操作與重要狀態變更。

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: 90% 的新買家可在 3 分鐘內完成「登入 → 加入購物車 → 結帳 → 看到付款結果」。
- **SC-002**: 在 200 位同時結帳的尖峰情境下，結帳建立訂單的成功率達 99%（不含使用者主動取消）。
- **SC-003**: 付款 callback 重複送達的情境下，訂單/庫存/付款狀態不一致事件為 0（以稽核與一致性檢核確認）。
- **SC-004**: 買家可在訂單詳情中清楚辨識每筆 SubOrder 目前進度（至少：待付款/已付款/已出貨/已送達/已取消/退款中/已退款），任務完成率達 95%。
- **SC-005**: 所有管理員關鍵操作（審核、分類管理、強制取消/退款、結算操作）在 100% 情況下都可在 AuditLog 中查到 actor、目標、時間與結果。
