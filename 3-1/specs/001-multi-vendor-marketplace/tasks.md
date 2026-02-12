---

description: "Task list for feature implementation"
---

# Tasks: 多商家電商平台（Marketplace）

**Input**: Design documents from `/specs/001-multi-vendor-marketplace/`

- plan: [plan.md](plan.md)
- spec: [spec.md](spec.md)
- research: [research.md](research.md)
- data model: [data-model.md](data-model.md)
- contracts: [contracts/openapi.yaml](contracts/openapi.yaml)

**Tests**: 核心 domain/business rules 必須有測試（happy path / edge cases / failures）。本 tasks 清單已納入單元/整合/E2E；若後續任何測試被省略，必須在同一個 user story phase 內加註風險、替代驗證方式與回滾/補償計畫。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Only for user story tasks ([US1], [US2], [US3])
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 建立 monorepo 目錄結構並加入 README 說明（backend/, frontend/）於 README.md
- [x] T002 初始化後端 NestJS 專案骨架（含 scripts）於 backend/package.json
- [x] T003 初始化前端 Next.js（App Router）+ TypeScript 專案骨架於 frontend/package.json
- [x] T004 [P] 設定前端 Tailwind CSS 與全域樣式骨架於 frontend/tailwind.config.ts
- [x] T005 [P] 設定前端 ESLint/Prettier + import sort（若採用）於 frontend/.eslintrc.cjs
- [x] T006 [P] 設定後端 ESLint/Prettier 於 backend/.eslintrc.cjs
- [x] T007 [P] 建立本機環境變數樣板與文件於 backend/.env.example
- [x] T008 [P] 建立前端環境變數樣板與文件於 frontend/.env.example
- [x] T009 [P] 建立 VS Code workspace 設定（format on save / ESLint）於 .vscode/settings.json
- [x] T010 [P] 建立統一 npm scripts（dev/lint/format/test）並補齊工作區說明於 frontend/package.json
- [x] T011 [P] 建立統一 npm scripts（dev/lint/format/test）並補齊工作區說明於 backend/package.json
- [x] T012 建立本機啟動說明（含 ports、cookie、CORS）於 specs/001-multi-vendor-marketplace/quickstart.md
- [x] T013 [P] 將 API 契約檔納入格式化/校驗流程（例如 YAML format）於 specs/001-multi-vendor-marketplace/contracts/openapi.yaml
- [x] T014 [P] 新增通用 UI 元件骨架（Button/Input/Alert）於 frontend/src/components/ui/Button.tsx
- [x] T015 [P] 新增後端共用模組骨架（shared/）於 backend/src/shared/shared.module.ts
- [x] T016 建立 DB 檔案位置與 Prisma 基礎配置於 backend/prisma/schema.prisma

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Backend foundation

- [x] T017 定義 Prisma 全量 schema（含 User/Session/Order/SubOrder/Payment/Refund/Settlement/Dispute/AuditLog/WebhookEvent/InventoryLedger）於 backend/prisma/schema.prisma
- [x] T018 建立初始 migration 並可在本機套用於 backend/prisma/migrations/
- [x] T019 [P] 建立 PrismaClient 注入與生命週期管理於 backend/src/shared/db/prisma.service.ts
- [x] T020 建立 AppModule 組裝（auth/catalog/cart/checkout/orders/payments/refunds/reviews/seller/admin/audit/shared）於 backend/src/app.module.ts
- [x] T021 建立 API CORS 設定（cookie credentials + allowlist）於 backend/src/main.ts
- [x] T022 [P] 建立統一 ErrorResponse 型別與錯誤碼常數於 backend/src/shared/http/error-codes.ts
- [x] T023 [P] 實作全域 Exception Filter（輸出 ErrorResponse + requestId）於 backend/src/shared/http/http-exception.filter.ts
- [x] T024 [P] 實作 requestId 產生與傳遞（header + log context）於 backend/src/shared/http/request-id.middleware.ts
- [x] T025 [P] 建立結構化 logging（至少 console JSON + requestId）於 backend/src/shared/observability/logger.ts
- [x] T026 [P] 實作密碼雜湊/比對（bcrypt/argon2 其一）於 backend/src/auth/passwords.ts
- [x] T027 建立 Auth 模組：signup/login/logout/me + session 發行/撤銷於 backend/src/auth/auth.controller.ts
- [x] T028 [P] 實作 cookie 設定策略（HttpOnly/SameSite/Secure）於 backend/src/auth/cookies.ts
- [x] T029 [P] 實作 Authentication guard（解析 cookie session）於 backend/src/auth/auth.guard.ts
- [x] T030 [P] 實作 Roles decorator 與 RBAC guard 於 backend/src/auth/roles.decorator.ts
- [x] T031 [P] 實作資源擁有權 helper（buyer/seller）於 backend/src/auth/ownership.ts
- [x] T032 [P] 實作 CSRF 基線：Origin 檢查 middleware（對非 GET）於 backend/src/shared/http/origin-check.middleware.ts
- [x] T033 建立 AuditLog 寫入服務（共用於 admin/強制操作/狀態終態）於 backend/src/audit/audit.service.ts
- [x] T034 [P] 建立 Audit action/target 常數表於 backend/src/audit/audit.actions.ts
- [x] T035 [P] 建立 Money（int）計算工具與格式化於 backend/src/shared/money/money.ts
- [x] T036 [P] 建立 Zod request validation pipe（統一處理 422）於 backend/src/shared/validation/zod-validation.pipe.ts
- [x] T037 定義補償/回滾策略（付款/庫存/退款）與人工介入入口（runbook）於 specs/001-multi-vendor-marketplace/research.md
- [x] T038 [P] 建立 SubOrder 狀態機（合法轉換表 + guard）於 backend/src/orders/suborder-state-machine.ts
- [x] T039 [P] 建立 Order 聚合狀態推導函式 deriveOrderStatus 於 backend/src/orders/order-status.ts
- [x] T040 建立 seed 腳本（admin/buyer/seller、分類、商品、測試庫存）於 backend/prisma/seed.ts
- [x] T041 [P] 建立後端測試資料工廠（users/products/orders）於 backend/test/test-factories.ts
- [x] T042 [P] 補齊 OpenAPI 的 ErrorResponse/error codes 對齊於 specs/001-multi-vendor-marketplace/contracts/openapi.yaml
- [x] T043 [P] 新增後端基礎測試：ErrorResponse envelope + requestId 於 backend/test/integration/error-envelope.test.ts
- [x] T044 [P] 新增後端基礎測試：RBAC/ownership 401/403/404 行為於 backend/test/integration/authz-basics.test.ts
- [x] T045 [P] 新增後端基礎測試：signup/login/logout/me 的 session cookie 行為於 backend/test/integration/auth-session.test.ts

### Frontend foundation

- [x] T046 [P] 建立 API client（cookie credentials include）於 frontend/src/services/apiClient.ts
- [x] T047 [P] 建立 TanStack Query client 與 provider 於 frontend/src/lib/queryClient.tsx
- [x] T048 [P] 建立 auth hooks（useMe/useLogout）於 frontend/src/hooks/useMe.ts
- [x] T049 [P] 建立 route access control（Next middleware）於 frontend/middleware.ts
- [x] T050 [P] 建立全站錯誤頁（403/404/500）於 frontend/src/app/403/page.tsx
- [x] T051 [P] 建立 Loading/Empty/Error 狀態元件（可重試）於 frontend/src/components/states/ErrorState.tsx
- [x] T052 [P] 建立全站 Header（依角色顯示入口）於 frontend/src/components/AppHeader.tsx
- [x] T053 [P] 建立頁面 layout 與導覽注入於 frontend/src/app/layout.tsx
- [x] T054 [P] 建立 forms 基礎元件（React Hook Form + Zod wrapper）於 frontend/src/lib/forms.ts
- [x] T055 建立全站錯誤處理策略（401→導向 /login，403→/403）於 frontend/src/services/httpErrorHandling.ts
- [x] T056 [P] 建立前端基礎 E2E 測試骨架（playwright config + baseURL）於 frontend/test/e2e/playwright.config.ts
- [x] T057 [P] E2E 測試：未登入嘗試進入 /cart 與 /checkout 必須導向 /login 於 frontend/test/e2e/auth-redirect.spec.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 買家完成跨賣家下單與付款（拆單） (Priority: P1) 🎯 MVP

**Goal**: 買家瀏覽/搜尋/篩選商品、登入後加入購物車、結帳建立 Order + SubOrders，完成付款並在訂單頁追蹤狀態。

**Independent Test**: 用 seed 的兩位賣家商品，完成「登入→加購→結帳→模擬付款成功 callback→付款結果頁→訂單詳情」。

### Tests for User Story 1 (REQUIRED)

- [x] T058 [P] [US1] 單元測試：deriveOrderStatus 覆蓋所有聚合規則於 backend/test/unit/order-status.test.ts
- [x] T059 [P] [US1] 單元測試：SubOrder 狀態機非法轉換必須被拒絕於 backend/test/unit/suborder-state-machine.test.ts
- [x] T060 [P] [US1] 整合測試：Checkout 拆單（依 seller 分組）與價格快照於 backend/test/integration/checkout-split-order.test.ts
- [x] T061 [P] [US1] 整合測試：付款 callback 重放不重複扣庫存（InventoryLedger exactly-once）於 backend/test/integration/payment-idempotency.test.ts
- [x] T062 [P] [US1] E2E 測試：買家登入→加購→結帳→付款成功→訂單詳情於 frontend/test/e2e/us1-checkout-flow.spec.ts

### Implementation for User Story 1

#### Backend (US1)

- [x] T063 [P] [US1] 實作 Catalog 商品列表/搜尋（active only）於 backend/src/catalog/catalog.controller.ts
- [x] T064 [P] [US1] 實作 Product 詳情（banned 回 404）於 backend/src/catalog/catalog.controller.ts
- [x] T065 [P] [US1] 實作 Cart 讀取/新增更新/刪除於 backend/src/cart/cart.controller.ts
- [x] T066 [P] [US1] 實作 Cart 規則檢查（active、quantity>=1、stock）於 backend/src/cart/cart.service.ts
- [x] T067 [US1] 實作 Checkout：由 Cart 建立 Order + SubOrders + Items + Payment(pending) 於 backend/src/checkout/checkout.service.ts
- [x] T068 [US1] 實作 Checkout controller（POST /checkout）與 409/422 錯誤語意於 backend/src/checkout/checkout.controller.ts
- [x] T069 [US1] 實作 Orders：我的訂單列表與詳情（資源擁有權）於 backend/src/orders/orders.controller.ts
- [x] T070 [US1] 建立 Payment callback 事件寫入（WebhookEvent upsert）於 backend/src/payments/webhook-event.service.ts
- [x] T071 [US1] 實作 Payment callback：冪等鍵（orderId+transactionId）與處理結果記錄於 backend/src/payments/payments.controller.ts
- [x] T072 [US1] 實作庫存扣減原子更新（updateMany + count check）於 backend/src/payments/inventory.service.ts
- [x] T073 [US1] 實作 Payment callback：成功→Payment=succeeded、SubOrders=paid、扣庫存（InventoryLedger）於 backend/src/payments/payment-processing.service.ts
- [x] T074 [US1] 實作 Payment callback：失敗/取消→Payment=failed/cancelled 且 Order 保持可重試於 backend/src/payments/payment-processing.service.ts
- [x] T075 [US1] 實作補償入口：付款成功但資料缺失時可重跑 reconcile（manual endpoint/cron stub）於 backend/src/payments/reconciliation.service.ts
- [x] T076 [US1] 實作付款結果查詢 endpoint（供前端 /payment/result 顯示）於 backend/src/payments/payments.controller.ts
- [x] T077 [US1] 同步更新契約文件（若 endpoint 變更）於 specs/001-multi-vendor-marketplace/contracts/openapi.yaml

#### Frontend (US1)

- [x] T078 [P] [US1] 實作商品列表頁（/）含 loading/empty/error 於 frontend/src/app/page.tsx
- [x] T079 [P] [US1] 實作搜尋/篩選頁（/search）含 query params 同步於 frontend/src/app/search/page.tsx
- [x] T080 [P] [US1] 實作商品詳情頁（/products/:productId）含可購買狀態於 frontend/src/app/products/[productId]/page.tsx
- [x] T081 [P] [US1] 實作登入頁（/login）表單 + 錯誤提示 + 提交中狀態於 frontend/src/app/login/page.tsx
- [x] T082 [P] [US1] 實作註冊頁（/signup）表單 + 成功導回於 frontend/src/app/signup/page.tsx
- [x] T083 [US1] 串接登入成功後導回前頁（next param）於 frontend/src/app/login/page.tsx
- [x] T084 [P] [US1] 實作購物車頁（/cart）列表、調整數量、移除、前往結帳於 frontend/src/app/cart/page.tsx
- [x] T085 [US1] 實作結帳頁（/checkout）顯示摘要並提交建立訂單/付款於 frontend/src/app/checkout/page.tsx
- [x] T086 [US1] 實作付款結果頁（/payment/result）顯示 succeeded/failed/cancelled 與重試入口於 frontend/src/app/payment/result/page.tsx
- [x] T087 [US1] 實作我的訂單列表（/orders）含狀態摘要於 frontend/src/app/orders/page.tsx
- [x] T088 [US1] 實作訂單詳情（/orders/:orderId）含 SubOrder 列表與狀態於 frontend/src/app/orders/[orderId]/page.tsx
- [x] T089 [US1] 實作子訂單詳情（/orders/:orderId/suborders/:subOrderId）顯示售後入口（US3 會補齊）於 frontend/src/app/orders/[orderId]/suborders/[subOrderId]/page.tsx

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 賣家入駐、上架商品、出貨與查詢結算 (Priority: P2)

**Goal**: 賣家申請入駐與上架商品、處理出貨；管理員審核賣家與分類；賣家查詢延遲結算。

**Independent Test**: 送出賣家申請→管理員核准（AuditLog）→賣家上架商品→買家下單付款→賣家出貨→賣家可查到結算資料。

### Tests for User Story 2 (REQUIRED)

- [x] T090 [P] [US2] 整合測試：管理員核准/拒絕賣家申請寫入 AuditLog 並更新 roles 於 backend/test/integration/admin-seller-application.test.ts
- [x] T091 [P] [US2] 整合測試：Seller 僅能操作自家 Product/SubOrder（IDOR 防護）於 backend/test/integration/seller-ownership.test.ts
- [x] T092 [P] [US2] 整合測試：商品狀態規則（draft/active/inactive/banned）於 backend/test/integration/product-status.test.ts
- [x] T093 [P] [US2] E2E 測試：申請賣家→管理員核准→上架商品→買家可見→賣家出貨於 frontend/test/e2e/us2-seller-admin-flow.spec.ts

### Implementation for User Story 2

#### Backend (US2)

- [x] T094 [P] [US2] 實作賣家申請提交/查詢 endpoints（submitted）於 backend/src/seller/seller-application.controller.ts
- [x] T095 [US2] 實作管理員：列出+核准/拒絕賣家申請（寫 AuditLog、更新 user roles）於 backend/src/admin/seller-applications.service.ts
- [x] T096 [P] [US2] 實作管理員：分類列表/建立/停用於 backend/src/admin/categories.controller.ts
- [x] T097 [US2] 實作分類管理寫 AuditLog（create/update/status change）於 backend/src/admin/categories.service.ts
- [x] T098 [P] [US2] 實作賣家：我的商品列表/建立/更新 endpoints 於 backend/src/seller/seller-products.controller.ts
- [x] T099 [US2] 實作商品狀態規則（draft/active/inactive/banned）與權限（僅 admin 可 banned）於 backend/src/seller/seller-products.service.ts
- [x] T100 [P] [US2] 實作賣家：我的 SubOrder 列表 endpoint（status filter）於 backend/src/seller/seller-suborders.controller.ts
- [x] T101 [US2] 實作賣家：SubOrder 出貨（paid→shipped）與稽核於 backend/src/seller/fulfillment.service.ts
- [x] T102 [P] [US2] 實作買家：確認收貨 endpoint（shipped→delivered）於 backend/src/orders/orders.controller.ts
- [x] T103 [US2] 實作到期自動 delivered（cron stub）於 backend/src/orders/auto-delivery.job.ts
- [x] T104 [US2] 實作結算計算 service（period→gross/platform_fee/net）於 backend/src/seller/settlement.service.ts
- [x] T105 [US2] 實作每週產生 Settlement 的 job（可重跑、冪等）於 backend/src/seller/settlement.job.ts
- [x] T106 [P] [US2] 實作賣家：結算列表/詳情 endpoint 於 backend/src/seller/settlements.controller.ts
- [x] T107 [US2] 實作管理員：結算標記 settled（不可修改）+ AuditLog 於 backend/src/admin/settlements.controller.ts
- [x] T108 [US2] 同步更新契約文件（若 endpoint 變更）於 specs/001-multi-vendor-marketplace/contracts/openapi.yaml

#### Frontend (US2)

- [x] T109 [P] [US2] 實作賣家申請頁（/seller/apply）含提交/狀態顯示於 frontend/src/app/seller/apply/page.tsx
- [x] T110 [P] [US2] 實作賣家商品列表頁（/seller/products）於 frontend/src/app/seller/products/page.tsx
- [x] T111 [P] [US2] 實作新增商品頁（/seller/products/new）於 frontend/src/app/seller/products/new/page.tsx
- [x] T112 [P] [US2] 實作編輯商品頁（/seller/products/:productId/edit）於 frontend/src/app/seller/products/[productId]/edit/page.tsx
- [x] T113 [P] [US2] 實作賣家子訂單列表（/seller/orders）於 frontend/src/app/seller/orders/page.tsx
- [x] T114 [US2] 實作賣家子訂單處理頁（/seller/orders/:subOrderId）含出貨操作於 frontend/src/app/seller/orders/[subOrderId]/page.tsx
- [x] T115 [P] [US2] 實作賣家結算列表（/seller/settlements）於 frontend/src/app/seller/settlements/page.tsx
- [x] T116 [P] [US2] 實作賣家結算詳情（/seller/settlements/:settlementId）於 frontend/src/app/seller/settlements/[settlementId]/page.tsx
- [x] T117 [P] [US2] 實作管理員：賣家申請審核頁（/admin/seller-applications）於 frontend/src/app/admin/seller-applications/page.tsx
- [x] T118 [P] [US2] 實作管理員：分類管理頁（/admin/categories）於 frontend/src/app/admin/categories/page.tsx
- [x] T119 [P] [US2] 實作管理員：結算管理頁（/admin/settlements）於 frontend/src/app/admin/settlements/page.tsx
- [x] T120 [US2] 更新 Header 可見性規則（Seller/Admin）於 frontend/src/components/AppHeader.tsx
- [x] T121 [US2] 更新 middleware 角色限制（/seller/*, /admin/*）於 frontend/middleware.ts

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 取消/退款/糾紛與稽核可追溯 (Priority: P3)

**Goal**: 付款前取消、付款後退款（含部分退款）、糾紛介入、強制取消/退款，且全程可稽核追蹤。

**Independent Test**: 已付款訂單→對其中一筆 SubOrder 申請退款→賣家拒絕（恢復原狀態 + AuditLog）→管理員強制退款（終態 + AuditLog）。

### Tests for User Story 3 (REQUIRED)

- [x] T122 [P] [US3] 單元測試：退款拒絕必須恢復 prev_status（含稽核）於 backend/test/unit/refund-restore-prev-status.test.ts
- [x] T123 [P] [US3] 整合測試：付款前取消整筆 Order（SubOrders 全部 cancelled）於 backend/test/integration/cancel-order.test.ts
- [x] T124 [P] [US3] 整合測試：管理員強制退款後 SubOrder 終態不可回退於 backend/test/integration/admin-force-refund.test.ts
- [x] T125 [P] [US3] E2E 測試：買家申請退款→賣家拒絕→管理員強制退款於 frontend/test/e2e/us3-refund-flow.spec.ts

### Implementation for User Story 3

#### Backend (US3)

- [x] T126 [P] [US3] 實作買家取消 Order endpoint（僅 pending_payment）於 backend/src/orders/orders.controller.ts
- [x] T127 [US3] 實作取消：SubOrders 全部 cancelled 並更新 Order 聚合狀態於 backend/src/orders/orders.service.ts
- [x] T128 [P] [US3] 實作買家建立退款申請 endpoint（SubOrder→refund_requested）於 backend/src/refunds/refunds.controller.ts
- [x] T129 [US3] 實作退款窗口限制（delivered 後 7 天）於 backend/src/refunds/refund-policy.ts
- [x] T130 [P] [US3] 實作賣家查詢退款申請列表 endpoint 於 backend/src/seller/seller-refunds.controller.ts
- [x] T131 [US3] 實作賣家同意退款（可部分）→執行退款流程於 backend/src/refunds/refunds.service.ts
- [x] T132 [US3] 實作賣家拒絕退款：RefundRequest=rejected、SubOrder 恢復 prev_status、寫 AuditLog 於 backend/src/refunds/refunds.service.ts
- [x] T133 [P] [US3] 實作管理員：強制退款 endpoint（含原因）於 backend/src/admin/admin-refunds.controller.ts
- [x] T134 [P] [US3] 實作糾紛建立/列表/解決 endpoints 於 backend/src/admin/disputes.controller.ts
- [x] T135 [P] [US3] 實作建立 Review endpoint（僅 delivered）於 backend/src/reviews/reviews.controller.ts
- [x] T136 [US3] 實作 Review comment 策略：純文字（拒絕 HTML）於 backend/src/reviews/reviews.service.ts
- [x] T137 [P] [US3] 實作管理員：AuditLog 查詢 endpoints（actor/target/time）於 backend/src/admin/audit-logs.controller.ts
- [x] T138 [US3] 同步更新契約文件（若 endpoint 變更）於 specs/001-multi-vendor-marketplace/contracts/openapi.yaml

#### Frontend (US3)

- [x] T139 [P] [US3] 在訂單詳情加入「取消訂單」按鈕（可用狀態）於 frontend/src/app/orders/[orderId]/page.tsx
- [x] T140 [US3] 在子訂單詳情加入退款申請入口與表單於 frontend/src/app/orders/[orderId]/suborders/[subOrderId]/page.tsx
- [x] T141 [P] [US3] 實作新增評價頁（/reviews/new?productId=...）於 frontend/src/app/reviews/new/page.tsx
- [x] T142 [P] [US3] 實作賣家退款處理列表與同意/拒絕 UI 於 frontend/src/app/seller/refunds/page.tsx
- [x] T143 [P] [US3] 實作管理員退款處理頁（/admin/refunds）於 frontend/src/app/admin/refunds/page.tsx
- [x] T144 [P] [US3] 實作管理員糾紛介入頁（/admin/disputes）於 frontend/src/app/admin/disputes/page.tsx
- [x] T145 [P] [US3] 實作管理員稽核查詢頁（/admin/audit-logs）於 frontend/src/app/admin/audit-logs/page.tsx
- [x] T146 [US3] 更新 Header 顯示（Buyer 的 reviews/new 入口依策略顯示）於 frontend/src/components/AppHeader.tsx

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T147 [P] 補齊所有頁面的 Loading/Empty/Error 規格一致性於 frontend/src/components/states/LoadingState.tsx
- [x] T148 [P] 補齊導覽列可見性規則與 CTA 去重於 frontend/src/components/AppHeader.tsx
- [x] T149 統一前端錯誤顯示與重試（含 409/422 表單錯誤）於 frontend/src/services/httpErrorHandling.ts
- [x] T150 [P] 後端補齊所有寫入操作的 AuditLog coverage（審核/取消/退款/結算/分類/糾紛）於 backend/src/audit/audit.service.ts
- [x] T151 [P] 後端補齊敏感資料遮罩（避免回傳 password_hash 等）於 backend/src/shared/http/serialization.ts
- [x] T152 [P] 後端補齊 webhook signature 驗證 stub（若有 secret）於 backend/src/payments/webhook-signature.ts
- [x] T153 基礎安全加固：rate limit（登入/付款 callback）於 backend/src/shared/security/rate-limit.ts
- [x] T154 [P] 補齊 OpenAPI：列出所有 endpoints + errors + RBAC 語意於 specs/001-multi-vendor-marketplace/contracts/openapi.yaml
- [x] T155 [P] 補齊 quickstart 的端到端手動驗收腳本（買家/賣家/管理員）於 specs/001-multi-vendor-marketplace/quickstart.md
- [x] T156 [P] DB 索引與唯一約束回顧（冪等鍵、ledger、防超賣）並補 migration 於 backend/prisma/schema.prisma
- [x] T157 [P] 前端可用性：加入基本可及性（表單 label、aria、焦點）於 frontend/src/components/ui/Input.tsx
- [x] T158 [P] UI 一致化：頁面容器、排版、字體與顏色 token 於 frontend/src/app/globals.css
- [x] T159 [P] 系統級文件補齊（路由存取控制表、角色矩陣）於 specs/001-multi-vendor-marketplace/spec.md
- [x] T160 [P] Run quickstart.md validation（依腳本逐步驗收）於 specs/001-multi-vendor-marketplace/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **User Stories (Phase 3-5)** → **Polish (Phase 6)**

### User Story Dependencies

- **US1 (P1)**: 依賴 Phase 2（Auth/RBAC/DB/Errors）。與 US2/US3 無硬依賴。
- **US2 (P2)**: 依賴 Phase 2（RBAC/AuditLog/DB）。可用 seed 商品與使用者獨立驗收。
- **US3 (P3)**: 依賴 Phase 2（RBAC/AuditLog/狀態機）。會讀寫 US1 的 Order/SubOrder，但可在已有訂單資料下獨立驗收。

### Dependency Graph（User Stories）

```text
Setup ─▶ Foundational ─▶ US1
                    ├──▶ US2
                    └──▶ US3
```

---

## Parallel Execution Examples

### US1（Buyer 交易閉環）

- 可並行（不同檔案）：
  - `backend/src/catalog/catalog.controller.ts`（商品目錄）
  - `backend/src/cart/cart.controller.ts`（購物車）
  - `frontend/src/app/page.tsx`（商品列表）
  - `frontend/src/app/search/page.tsx`（搜尋）

### US2（Seller/Admin）

- 可並行（不同檔案）：
  - `backend/src/admin/categories.controller.ts`（分類）
  - `backend/src/admin/seller-applications.controller.ts`（審核）
  - `frontend/src/app/admin/categories/page.tsx`（管理 UI）
  - `frontend/src/app/seller/products/page.tsx`（賣家 UI）

### US3（售後/稽核）

- 可並行（不同檔案）：
  - `backend/src/refunds/refunds.service.ts`（退款規則）
  - `backend/src/admin/disputes.controller.ts`（糾紛）
  - `frontend/src/app/admin/refunds/page.tsx`（管理 UI）
  - `frontend/src/app/orders/[orderId]/page.tsx`（取消入口）

---

## Implementation Strategy

### 完整交付（你要的「完成系統」）

1. Phase 1 + Phase 2 完成後，先把 US1/US2/US3 以「端到端 UI 可操作」為目標逐一打通
2. 每個 user story 都必須能以 quickstart 的手動驗收腳本獨立驗證
3. Phase 6 集中把一致性（loading/error/empty）、稽核覆蓋、安全性與契約完整度補齊

### 風險與緩解

- SQLite 併發寫入限制：以 transaction + 原子條件更新 + busy retry 緩解（詳見 research）；必要時再演進 DB。
- 付款 callback 亂序/重送：以 WebhookEvent/InventoryLedger unique 約束 + 可重放處理確保冪等。

---

## Notes

- 所有 task 皆採嚴格格式：`- [ ] T### [P?] [US#?] 描述（含檔案路徑）`
- `[P]` 僅標記「可與其他 task 同時進行且不會改同一檔案」的項目
- 本 tasks.md 以「完成系統」為目標，不以 MVP 最小集合為限
