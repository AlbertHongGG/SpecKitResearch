# Tasks: Multi-vendor Marketplace Platform（多商家電商平台 / Marketplace）

**Input**: Design documents from `specs/001-multi-vendor-marketplace/`
**Prerequisites**: plan.md（required）, spec.md（required）
**Available docs**: research.md / data-model.md / contracts/ / quickstart.md（目前 prerequisites 掃描為空；因此本 tasks 以 plan.md + spec.md 為權威）

**Tests**: 核心業務規則（狀態機、聚合規則、冪等、扣庫存、防越權）必須有測試（happy path + edge + failure）。

**Organization**: Tasks 依 spec.md 的 User Stories（US1/US2/US3）分組，並保留 Setup/Foundational/Polish 階段。

## Checklist Format（REQUIRED）

每個任務 MUST 符合：

- [ ] `T###`（順序 ID）
- [ ] `[P]` 僅在可平行時出現
- [ ] `[US#]` 僅在 User Story phase 內出現
- [ ] 任務描述 MUST 包含至少一個明確檔案或目錄路徑

---

## Phase 1: Setup（專案初始化 / Shared Infrastructure）

**Purpose**: 建立可開發、可測試的 monorepo（frontend + backend + prisma），並確立一致的腳本與格式。

- [x] T001 建立 monorepo 基本結構與 workspace 設定於 `package.json`（workspaces: `backend/`, `frontend/`）
- [x] T002 [P] 建立根層級通用設定：`/.gitignore`, `/.editorconfig`, `/.nvmrc`（或 `.tool-versions`）
- [x] T003 [P] 建立根層級格式化/檢查設定：`/.prettierrc`, `/eslint.config.*`（或 `backend/*`, `frontend/*` 各自配置）
- [x] T004 [P] 初始化 NestJS 專案骨架於 `backend/`（產生 `backend/src/main.ts`, `backend/src/app.module.ts`）
- [x] T005 [P] 初始化 Next.js（App Router）專案骨架於 `frontend/`（產生 `frontend/src/app/` 與 Tailwind 設定）
- [x] T006 設定根層級 scripts 於 `package.json`：`dev`, `dev:backend`, `dev:frontend`, `test`, `test:backend`, `test:frontend`, `lint`, `format`
- [x] T007 建立環境範本：`backend/.env.example`, `frontend/.env.example`（包含 API base URL 與 session cookie 設定）
- [x] T008 建立專案啟動文件於 `README.md`（包含 migrate/seed、開兩個 dev server、跑測試）
- [x] T009 [P] 建立 VS Code 建議設定於 `.vscode/settings.json`（格式化、eslint、typescript）
- [x] T010 [P] 建立共用型別/常數資料夾（若需要）於 `backend/src/common/constants/*` 與 `frontend/src/lib/constants/*`
- [x] T011 [P] 建立 CI 工作流程骨架於 `.github/workflows/ci.yml`（lint + unit + e2e 佔位）
- [x] T012 設定 DB 檔案路徑與本機目錄策略於 `backend/.env.example`（例如 `DATABASE_URL="file:./dev.db"`）

---

## Phase 2: Foundational（阻塞性基礎建設 / Blocking Prerequisites）

**Purpose**: 所有 User Stories 共用的基礎：Prisma schema/migrate/seed、auth/session/RBAC/ownership、錯誤語意、request-id、審計、狀態機、測試底座。

**⚠️ CRITICAL**: 本階段未完成前，不開始任何 story 的頁面/功能實作。

### Backend: Prisma + SQLite

- [x] T013 初始化 Prisma 設定與 generator 於 `prisma/schema.prisma`
- [x] T014 [P] 建立 Prisma client service 於 `backend/src/prisma/prisma.service.ts`
- [x] T015 [P] 建立 Prisma module 於 `backend/src/prisma/prisma.module.ts`

- [x] T016 建立 Prisma model: User/Role（RBAC）於 `prisma/schema.prisma`
- [x] T017 建立 Prisma model: Session（cookie session store）於 `prisma/schema.prisma`
- [x] T018 建立 Prisma model: Category/Product（含 seller_id、status、stock、price）於 `prisma/schema.prisma`
- [x] T019 建立 Prisma model: Cart/CartItem（含 buyer_id、product_id、quantity）於 `prisma/schema.prisma`
- [x] T020 建立 Prisma model: Order/SubOrder/SubOrderItem（含聚合欄位與狀態）於 `prisma/schema.prisma`
- [x] T021 建立 Prisma model: Payment（含 transaction_id、status、order_id）於 `prisma/schema.prisma`
- [x] T022 建立 Prisma model: RefundRequest（含 prev_status、requested/approved amount、status）於 `prisma/schema.prisma`
- [x] T023 建立 Prisma model: Review（含 product_id、buyer_id、rating、comment）於 `prisma/schema.prisma`
- [x] T024 建立 Prisma model: SellerApplication（submitted/approved/rejected）於 `prisma/schema.prisma`
- [x] T025 建立 Prisma model: Settlement（period、gross/platform_fee/net、pending/settled）於 `prisma/schema.prisma`
- [x] T026 建立 Prisma model: DisputeCase（open/resolved）於 `prisma/schema.prisma`
- [x] T027 建立 Prisma model: AuditLog（actor/role/action/target/metadata）於 `prisma/schema.prisma`

- [x] T028 建立必要 unique/index/foreign key 約束於 `prisma/schema.prisma`（包含 payment idempotency、ownership 查詢）
- [x] T029 建立初始 migration 於 `prisma/migrations/*`（Prisma Migrate）
- [x] T030 建立 seed 腳本於 `prisma/seed.ts`（至少：categories、products、buyer/seller/admin、sellerApplication 範例、order 範例）

### Backend: HTTP foundations（error semantics / validation / request-id）

- [x] T031 建立一致錯誤回應型別於 `backend/src/common/http/error-response.ts`（含 `error_code`, `message`, `details?`, `request_id`）
- [x] T032 [P] 建立 error codes 常數於 `backend/src/common/http/error-codes.ts`
- [x] T033 建立全域 exception filter 於 `backend/src/common/http/http-exception.filter.ts` 並於 `backend/src/main.ts` 註冊
- [x] T034 [P] 建立 request-id middleware/interceptor 於 `backend/src/common/observability/request-id.middleware.ts`（response header + log context）
- [x] T035 [P] 建立 Zod validation pipe 於 `backend/src/common/validation/zod.pipe.ts`
- [x] T036 [P] 建立 Zod schema helper 於 `backend/src/common/validation/zod.ts`

### Backend: Auth/session/RBAC/ownership

- [x] T037 建立 session cookie 設定與 middleware 於 `backend/src/auth/session/session.middleware.ts`
- [x] T038 建立 session store（Prisma）於 `backend/src/auth/session/session.store.ts`
- [x] T039 建立 session service 於 `backend/src/auth/session/session.service.ts`（create/destroy/get）

- [x] T040 建立 RBAC roles 常數與 decorator 於 `backend/src/auth/rbac/roles.ts`、`backend/src/auth/rbac/roles.decorator.ts`
- [x] T041 建立 RBAC guard 於 `backend/src/auth/rbac/roles.guard.ts`
- [x] T042 建立 ownership helpers 於 `backend/src/auth/ownership/ownership.service.ts`（buyer_id/seller_id 驗證）
- [x] T043 建立 current-user accessor 於 `backend/src/auth/current-user.decorator.ts`（提供 user_id/roles）

### Backend: AuditLog + core domain rules (state machine / aggregation / idempotency / stock)

- [x] T044 建立 AuditLog service 於 `backend/src/common/audit/audit.service.ts`（actor/action/target + before/after metadata）
- [x] T045 [P] 建立 audit action 常數於 `backend/src/common/audit/audit-actions.ts`

- [x] T046 建立 SubOrder 狀態機定義與合法轉換表於 `backend/src/modules/orders/suborder-state.ts`
- [x] T047 建立 Order 聚合規則於 `backend/src/modules/orders/order-aggregation.ts`
- [x] T048 建立 payment callback 去重 helper 於 `backend/src/modules/payments/idempotency.ts`（使用 Payment.transaction_id+order_id）
- [x] T049 建立扣庫存原子更新 helper 於 `backend/src/modules/catalog/stock-deduction.ts`（Prisma transaction/atomic update）
- [ ] T050 建立補償/修復標記策略（付款成功但資料不完整）於 `backend/src/modules/payments/compensation.ts`

### Backend tests（Jest）

- [ ] T051 建立 Jest 設定於 `backend/jest.config.*`（或 `backend/test/jest.config.*`）
- [ ] T052 [P] 建立 test DB helper（migrate/seed/clean）於 `backend/test/helpers/test-db.ts`
- [ ] T053 [P] 撰寫 SubOrder 狀態機單元測試於 `backend/test/unit/suborder-state.spec.ts`（含拒絕非法轉換）
- [ ] T054 [P] 撰寫 Order 聚合規則單元測試於 `backend/test/unit/order-aggregation.spec.ts`
- [ ] T055 [P] 撰寫 Payment callback 冪等單元測試於 `backend/test/unit/payment-idempotency.spec.ts`
- [ ] T056 [P] 撰寫扣庫存原子更新單元測試於 `backend/test/unit/stock-deduction.spec.ts`（含 oversell failure path）
- [ ] T057 [P] 撰寫 RBAC/ownership guard 測試於 `backend/test/unit/authz.spec.ts`

### Frontend foundations（Next.js App Router）

- [ ] T058 建立 TanStack Query provider 於 `frontend/src/app/providers.tsx` 與 `frontend/src/app/layout.tsx`
- [ ] T059 建立 API client（含 credentials, baseURL, error mapping）於 `frontend/src/services/api/client.ts`
- [ ] T060 [P] 建立 API error mapping（401/403/404/409/5xx）於 `frontend/src/services/api/errors.ts`
- [ ] T061 建立 session 讀取與 hook 於 `frontend/src/services/auth/session.ts`、`frontend/src/services/auth/useSession.ts`
- [ ] T062 建立 route guard utilities 於 `frontend/src/lib/routing/guards.ts`（未登入導向 login；無權限顯示 403）
- [ ] T063 建立導覽列（依角色顯示入口）於 `frontend/src/components/nav/Header.tsx`

- [ ] T064 [P] 建立共用 UI 狀態元件於 `frontend/src/components/ui/Loading.tsx`, `frontend/src/components/ui/Empty.tsx`, `frontend/src/components/ui/ErrorState.tsx`
- [ ] T065 [P] 建立共用表單元件（Input/Select/Button）於 `frontend/src/components/ui/form/*`
- [ ] T066 [P] 建立全站錯誤頁於 `frontend/src/app/403/page.tsx`, `frontend/src/app/404/page.tsx`, `frontend/src/app/500/page.tsx`

### Frontend tests（Vitest + Playwright scaffolding）

- [ ] T067 建立 Vitest 設定於 `frontend/vitest.config.ts` 與範例測試 `frontend/src/lib/__tests__/smoke.test.ts`
- [ ] T068 建立 Playwright 設定於 `frontend/playwright.config.ts` 與 smoke 測試 `frontend/tests/e2e/smoke.spec.ts`
- [ ] T069 [P] 建立 Playwright test fixtures（login/session helper）於 `frontend/tests/e2e/fixtures.ts`
- [ ] T070 [P] 建立 FE mock server 或 API test helper（若用）於 `frontend/tests/helpers/api.ts`

**Checkpoint**: Foundation ready（狀態機/聚合/冪等/扣庫存/RBAC/錯誤語意/共用 UI 狀態 + 測試底座 已具備）

---

## Phase 3: User Story 1（P1）— 公共瀏覽/搜尋 + Buyer 購物車/結帳/付款/訂單/退款申請/評價（交易閉環）

**Goal**: Buyer 從瀏覽商品到結帳拆單、付款結果追蹤、訂單追蹤、取消、退款申請、評價。

**Independent Test**: Buyer 完成「瀏覽→購物車→結帳建立 Order+SubOrders+Payment→模擬 payment callback 成功/失敗/取消→付款結果正確→訂單追蹤→付款前取消→付款後退款申請→delivered 評價且無 XSS」。

### Backend: Catalog/Search（US1）

- [ ] T071 [P] [US1] 建立 Catalog module skeleton 於 `backend/src/modules/catalog/catalog.module.ts`
- [ ] T072 [P] [US1] 建立 Catalog controller 於 `backend/src/modules/catalog/catalog.controller.ts`（`GET /products`, `GET /products/:id`）
- [ ] T073 [US1] 建立 Catalog service 於 `backend/src/modules/catalog/catalog.service.ts`（只回 active 且非 banned；detail 對 banned 回「不可用」而非 404）
- [ ] T074 [US1] 建立 query/response Zod schemas 於 `backend/src/modules/catalog/catalog.schemas.ts`

### Backend: Auth（US1）

- [ ] T075 [P] [US1] 建立 Auth controller 於 `backend/src/auth/auth.controller.ts`（`/auth/signup`, `/auth/login`, `/auth/logout`）
- [ ] T076 [US1] 建立 Auth service 於 `backend/src/auth/auth.service.ts`（password hash/verify；建立 session）
- [ ] T077 [P] [US1] 建立 Auth schemas 於 `backend/src/auth/auth.schemas.ts`（Zod request validation）

### Backend: Cart（US1）

- [ ] T078 [P] [US1] 建立 Cart module skeleton 於 `backend/src/modules/cart/cart.module.ts`
- [ ] T079 [P] [US1] 建立 Cart controller 於 `backend/src/modules/cart/cart.controller.ts`（`GET /cart`, `POST /cart/items`, `PATCH`, `DELETE`）
- [ ] T080 [US1] 建立 Cart service 於 `backend/src/modules/cart/cart.service.ts`（active 且非 banned 才可加入；quantity>=1；擁有權）
- [ ] T081 [P] [US1] 建立 Cart schemas 於 `backend/src/modules/cart/cart.schemas.ts`

### Backend: Checkout + Payments（US1）

- [ ] T082 [P] [US1] 建立 Checkout module skeleton 於 `backend/src/modules/checkout/checkout.module.ts`
- [ ] T083 [P] [US1] 建立 Checkout controller 於 `backend/src/modules/checkout/checkout.controller.ts`（`POST /checkout`）
- [ ] T084 [US1] 建立 Checkout service 於 `backend/src/modules/checkout/checkout.service.ts`（部分缺貨/不可售→409 並不建立 Order/SubOrder/Payment；回傳清單）
- [ ] T085 [P] [US1] 建立 Checkout schemas 於 `backend/src/modules/checkout/checkout.schemas.ts`

- [ ] T086 [P] [US1] 建立 Payments module skeleton 於 `backend/src/modules/payments/payments.module.ts`
- [ ] T087 [P] [US1] 建立 Payments controller 於 `backend/src/modules/payments/payments.controller.ts`（`GET /payments/:id`, `POST /payments/:id/retry`）
- [ ] T088 [US1] 建立 Payments service 於 `backend/src/modules/payments/payments.service.ts`（retry 僅限 failed/cancelled）

- [ ] T089 [P] [US1] 建立 payment callback controller 於 `backend/src/modules/payments/payment-callback.controller.ts`（`POST /payments/callback`）
- [ ] T090 [US1] 建立 payment callback service 於 `backend/src/modules/payments/payment-callback.service.ts`（transaction：更新 Payment/Order/SubOrders + 扣庫存；冪等去重）
- [ ] T091 [P] [US1] 建立 payment schemas 於 `backend/src/modules/payments/payments.schemas.ts`

### Backend: Orders（US1）

- [ ] T092 [P] [US1] 建立 Orders module skeleton 於 `backend/src/modules/orders/orders.module.ts`
- [ ] T093 [P] [US1] 建立 Orders controller 於 `backend/src/modules/orders/orders.controller.ts`（`GET /orders`, `GET /orders/:id`, `GET /orders/:id/suborders/:subOrderId`）
- [ ] T094 [US1] 建立 Orders service 於 `backend/src/modules/orders/orders.service.ts`（buyer ownership；回應聚合狀態一致）
- [ ] T095 [US1] 建立付款前取消 endpoint 於 `backend/src/modules/orders/orders.controller.ts`（`POST /orders/:id/cancel`）
- [ ] T096 [P] [US1] 建立 Orders schemas 於 `backend/src/modules/orders/orders.schemas.ts`

### Backend: RefundRequest（Buyer）+ Review（US1）

- [ ] T097 [P] [US1] 建立 Refunds module skeleton 於 `backend/src/modules/refunds/refunds.module.ts`
- [ ] T098 [P] [US1] 建立 Buyer refund controller 於 `backend/src/modules/refunds/refunds.controller.ts`（`POST /refund-requests`）
- [ ] T099 [US1] 建立 Refunds service 於 `backend/src/modules/refunds/refunds.service.ts`（保存 prev_status；delivered 7 天窗口；寫 AuditLog）
- [ ] T100 [P] [US1] 建立 Refund schemas 於 `backend/src/modules/refunds/refunds.schemas.ts`

- [ ] T101 [P] [US1] 建立 Reviews module skeleton 於 `backend/src/modules/reviews/reviews.module.ts`
- [ ] T102 [P] [US1] 建立 Reviews controller 於 `backend/src/modules/reviews/reviews.controller.ts`（`POST /reviews`）
- [ ] T103 [US1] 建立 Reviews service 於 `backend/src/modules/reviews/reviews.service.ts`（僅 delivered；comment XSS 策略一致）
- [ ] T104 [P] [US1] 建立 Review schemas 於 `backend/src/modules/reviews/reviews.schemas.ts`

### Backend tests（US1）

- [ ] T105 [P] [US1] 整合測試：Visitor access protected routes 回 401 於 `backend/test/integration/authn-guards.spec.ts`
- [ ] T106 [P] [US1] 整合測試：Checkout 部分缺貨→409 且不建立資料 於 `backend/test/integration/checkout-stock.spec.ts`
- [ ] T107 [P] [US1] 整合測試：Payment callback 冪等（重複 callback 不重複扣庫存）於 `backend/test/integration/payment-callback-idempotency.spec.ts`
- [ ] T108 [P] [US1] 整合測試：Buyer 資源隔離（cart/orders/refunds/reviews）於 `backend/test/integration/buyer-ownership.spec.ts`
- [ ] T109 [P] [US1] 單元測試：delivered 退款窗口 7 天於 `backend/test/unit/refund-window.spec.ts`
- [ ] T110 [P] [US1] 單元測試：Review comment XSS（呈現不執行）於 `backend/test/unit/review-xss.spec.ts`

### Frontend: API services & hooks（US1）

- [ ] T111 [P] [US1] 建立 catalog API client 於 `frontend/src/services/catalog/api.ts`
- [ ] T112 [P] [US1] 建立 cart API client 於 `frontend/src/services/cart/api.ts`
- [ ] T113 [P] [US1] 建立 checkout/payments API client 於 `frontend/src/services/checkout/api.ts` 與 `frontend/src/services/payments/api.ts`
- [ ] T114 [P] [US1] 建立 orders API client 於 `frontend/src/services/orders/api.ts`
- [ ] T115 [P] [US1] 建立 refunds API client 於 `frontend/src/services/refunds/api.ts`
- [ ] T116 [P] [US1] 建立 reviews API client 於 `frontend/src/services/reviews/api.ts`

### Frontend pages & UI（US1）

- [ ] T117 [P] [US1] 實作商品列表頁 `/` 於 `frontend/src/app/page.tsx`（Loading/Empty/Error；只顯示 active 且非 banned）
- [ ] T118 [P] [US1] 實作搜尋頁 `/search` 於 `frontend/src/app/search/page.tsx`（query/filter；Loading→Ready/Empty/Error）
- [ ] T119 [P] [US1] 實作商品詳情 `/products/[productId]` 於 `frontend/src/app/products/[productId]/page.tsx`（banned 顯示不可用且禁購）

- [ ] T120 [P] [US1] 實作登入頁 `/login` 於 `frontend/src/app/login/page.tsx`（RHF+Zod；錯誤提示；成功導回）
- [ ] T121 [P] [US1] 實作註冊頁 `/signup` 於 `frontend/src/app/signup/page.tsx`（RHF+Zod；成功導向 login）

- [ ] T122 [US1] 實作購物車頁 `/cart` 於 `frontend/src/app/cart/page.tsx`（guard→/login；調整數量/移除）
- [ ] T123 [US1] 實作結帳頁 `/checkout` 於 `frontend/src/app/checkout/page.tsx`（缺貨 409 顯示修正清單；成功導向付款結果）
- [ ] T124 [US1] 實作付款結果頁 `/payment/result` 於 `frontend/src/app/payment/result/page.tsx`（成功/失敗/取消 + 重試）

- [ ] T125 [US1] 實作我的訂單 `/orders` 於 `frontend/src/app/orders/page.tsx`
- [ ] T126 [US1] 實作訂單詳情 `/orders/[orderId]` 於 `frontend/src/app/orders/[orderId]/page.tsx`（SubOrders + 聚合狀態一致）
- [ ] T127 [US1] 實作子訂單詳情 `/orders/[orderId]/suborders/[subOrderId]` 於 `frontend/src/app/orders/[orderId]/suborders/[subOrderId]/page.tsx`（取消/退款入口依狀態）

- [ ] T128 [US1] 實作新增評價 `/reviews/new` 於 `frontend/src/app/reviews/new/page.tsx`（資格驗證；提交中/錯誤）

### Frontend E2E（US1）

- [ ] T129 [P] [US1] Playwright：Visitor 受保護路由導向 login 於 `frontend/tests/e2e/guards.spec.ts`
- [ ] T130 [P] [US1] Playwright：banned 商品直接 URL 顯示不可用且禁購 於 `frontend/tests/e2e/banned-product-direct-url.spec.ts`
- [ ] T131 [P] [US1] Playwright：Buyer 完整購物流程（含 callback success）於 `frontend/tests/e2e/buyer-checkout.spec.ts`
- [ ] T132 [P] [US1] Playwright：付款失敗/取消→可重試→結果更新 於 `frontend/tests/e2e/payment-retry.spec.ts`
- [ ] T133 [P] [US1] Playwright：部分缺貨→checkout 顯示修正清單且不建立訂單 於 `frontend/tests/e2e/checkout-partial-oos.spec.ts`

**Checkpoint**: US1 完成（Buyer 端交易閉環 + 售後入口可驗收）

---

## Phase 4: User Story 2（P2）— Seller 入駐申請 + 商品管理 + 子訂單履約/退款審核 + 結算查詢

**Goal**: Seller 入駐、商品管理、履約出貨、退款審核、結算查詢。

**Independent Test**: Seller 完成「/seller/apply 申請→（seed/手動/US3）成為 Seller→商品上架→出貨→退款同意/拒絕→查結算」。

### Backend endpoints（US2）

- [ ] T134 [P] [US2] 建立 Seller applications controller 於 `backend/src/modules/seller/applications/applications.controller.ts`（submit/status）
- [ ] T135 [US2] 建立 Seller applications service 於 `backend/src/modules/seller/applications/applications.service.ts`

- [ ] T136 [P] [US2] 建立 Seller products controller 於 `backend/src/modules/seller/products/products.controller.ts`（CRUD + status）
- [ ] T137 [US2] 建立 Seller products service 於 `backend/src/modules/seller/products/products.service.ts`（ownership + banned/inactive 規則）

- [ ] T138 [P] [US2] 建立 Seller orders controller 於 `backend/src/modules/seller/orders/orders.controller.ts`（list/detail/ship）
- [ ] T139 [US2] 建立 Seller orders service 於 `backend/src/modules/seller/orders/orders.service.ts`（paid→shipped 合法轉換 + AuditLog）

- [ ] T140 [P] [US2] 建立 Seller refunds controller 於 `backend/src/modules/seller/refunds/refunds.controller.ts`（approve/reject）
- [ ] T141 [US2] 建立 Seller refunds service 於 `backend/src/modules/seller/refunds/refunds.service.ts`（reject 恢復 prev_status + AuditLog）

- [ ] T142 [P] [US2] 建立 Seller settlements controller 於 `backend/src/modules/seller/settlements/settlements.controller.ts`（list/detail）
- [ ] T143 [US2] 建立 Seller settlements service 於 `backend/src/modules/seller/settlements/settlements.service.ts`（只回 seller 自己）

### Backend tests（US2）

- [ ] T144 [P] [US2] 整合測試：seller scope 資源隔離（products/suborders/settlements）於 `backend/test/integration/seller-ownership.spec.ts`
- [ ] T145 [P] [US2] 整合測試：paid→shipped 合法轉換；非法轉換被拒 於 `backend/test/integration/seller-ship-transition.spec.ts`
- [ ] T146 [P] [US2] 整合測試：退款拒絕恢復 prev_status + AuditLog 於 `backend/test/integration/refund-reject-restore.spec.ts`

### Frontend: API services（US2）

- [ ] T147 [P] [US2] 建立 seller applications API client 於 `frontend/src/services/seller/applications/api.ts`
- [ ] T148 [P] [US2] 建立 seller products API client 於 `frontend/src/services/seller/products/api.ts`
- [ ] T149 [P] [US2] 建立 seller orders API client 於 `frontend/src/services/seller/orders/api.ts`
- [ ] T150 [P] [US2] 建立 seller refunds API client 於 `frontend/src/services/seller/refunds/api.ts`
- [ ] T151 [P] [US2] 建立 seller settlements API client 於 `frontend/src/services/seller/settlements/api.ts`

### Frontend pages & UI（US2）

- [ ] T152 [P] [US2] 實作 `/seller/apply` 於 `frontend/src/app/seller/apply/page.tsx`（非 Seller 可申請；已是 Seller 顯示不適用）
- [ ] T153 [P] [US2] 實作 `/seller/products` 於 `frontend/src/app/seller/products/page.tsx`
- [ ] T154 [P] [US2] 實作 `/seller/products/new` 於 `frontend/src/app/seller/products/new/page.tsx`
- [ ] T155 [P] [US2] 實作 `/seller/products/[productId]/edit` 於 `frontend/src/app/seller/products/[productId]/edit/page.tsx`

- [ ] T156 [P] [US2] 實作 `/seller/orders` 於 `frontend/src/app/seller/orders/page.tsx`
- [ ] T157 [P] [US2] 實作 `/seller/orders/[subOrderId]` 於 `frontend/src/app/seller/orders/[subOrderId]/page.tsx`（出貨/退款入口依狀態）

- [ ] T158 [P] [US2] 實作 `/seller/settlements` 於 `frontend/src/app/seller/settlements/page.tsx`
- [ ] T159 [P] [US2] 實作 `/seller/settlements/[settlementId]` 於 `frontend/src/app/seller/settlements/[settlementId]/page.tsx`

### Frontend E2E（US2）

- [ ] T160 [P] [US2] Playwright：Seller 無權進入 admin、Buyer 無權進入 seller（403）於 `frontend/tests/e2e/rbac.spec.ts`
- [ ] T161 [P] [US2] Playwright：Seller 商品管理（new/edit/status）於 `frontend/tests/e2e/seller-products.spec.ts`
- [ ] T162 [P] [US2] Playwright：Seller 出貨與退款審核流程於 `frontend/tests/e2e/seller-fulfillment-refunds.spec.ts`

**Checkpoint**: US2 完成（Seller 後台主要功能可驗收）

---

## Phase 5: User Story 3（P3）— Admin 審核/分類/訂單介入/退款強制/糾紛/營運數據 + AuditLog

**Goal**: Admin 可治理平台：審核賣家、分類管理、介入訂單/退款、處理糾紛、看營運數據，且操作可稽核。

**Independent Test**: Admin 完成「核准賣家申請→管理分類→強制取消/退款或處理 dispute→AuditLog 可追到事件」。

### Backend endpoints（US3）

- [ ] T163 [P] [US3] Admin seller-applications controller 於 `backend/src/modules/admin/seller-applications/seller-applications.controller.ts`（list/approve/reject）
- [ ] T164 [US3] Admin seller-applications service 於 `backend/src/modules/admin/seller-applications/seller-applications.service.ts`（approve 後賦予 Seller role + AuditLog）

- [ ] T165 [P] [US3] Admin categories controller 於 `backend/src/modules/admin/categories/categories.controller.ts`（list/create/update）
- [ ] T166 [US3] Admin categories service 於 `backend/src/modules/admin/categories/categories.service.ts`（AuditLog）

- [ ] T167 [P] [US3] Admin orders controller 於 `backend/src/modules/admin/orders/orders.controller.ts`（search/detail/force actions）
- [ ] T168 [US3] Admin orders service 於 `backend/src/modules/admin/orders/orders.service.ts`（force cancel/refund；聚合狀態一致 + AuditLog）

- [ ] T169 [P] [US3] Admin refunds controller 於 `backend/src/modules/admin/refunds/refunds.controller.ts`（list/approve/reject/force-refund）
- [ ] T170 [US3] Admin refunds service 於 `backend/src/modules/admin/refunds/refunds.service.ts`（同步 RefundRequest/SubOrder/Order 聚合）

- [ ] T171 [P] [US3] Admin disputes controller 於 `backend/src/modules/admin/disputes/disputes.controller.ts`（list/resolve）
- [ ] T172 [US3] Admin disputes service 於 `backend/src/modules/admin/disputes/disputes.service.ts`（resolved 終態不可回退 + AuditLog）

- [ ] T173 [P] [US3] Admin analytics controller 於 `backend/src/modules/admin/analytics/analytics.controller.ts`（read-only）
- [ ] T174 [US3] Admin analytics service 於 `backend/src/modules/admin/analytics/analytics.service.ts`（空資料回 0/Empty）

### Backend tests（US3）

- [ ] T175 [P] [US3] 整合測試：Admin 操作均寫入 AuditLog 於 `backend/test/integration/auditlog-admin-actions.spec.ts`
- [ ] T176 [P] [US3] 整合測試：force refund/cancel 後 Order 聚合狀態一致 於 `backend/test/integration/admin-force-actions.spec.ts`
- [ ] T177 [P] [US3] 單元測試：DisputeCase open→resolved 不可回退 於 `backend/test/unit/dispute-immutability.spec.ts`

### Frontend: API services（US3）

- [ ] T178 [P] [US3] 建立 admin seller-applications API client 於 `frontend/src/services/admin/seller-applications/api.ts`
- [ ] T179 [P] [US3] 建立 admin categories API client 於 `frontend/src/services/admin/categories/api.ts`
- [ ] T180 [P] [US3] 建立 admin orders API client 於 `frontend/src/services/admin/orders/api.ts`
- [ ] T181 [P] [US3] 建立 admin refunds API client 於 `frontend/src/services/admin/refunds/api.ts`
- [ ] T182 [P] [US3] 建立 admin disputes API client 於 `frontend/src/services/admin/disputes/api.ts`
- [ ] T183 [P] [US3] 建立 admin analytics API client 於 `frontend/src/services/admin/analytics/api.ts`

### Frontend pages & UI（US3）

- [ ] T184 [P] [US3] 實作 `/admin/seller-applications` 於 `frontend/src/app/admin/seller-applications/page.tsx`
- [ ] T185 [P] [US3] 實作 `/admin/categories` 於 `frontend/src/app/admin/categories/page.tsx`
- [ ] T186 [P] [US3] 實作 `/admin/orders` 於 `frontend/src/app/admin/orders/page.tsx`（search + force actions）
- [ ] T187 [P] [US3] 實作 `/admin/refunds` 於 `frontend/src/app/admin/refunds/page.tsx`
- [ ] T188 [P] [US3] 實作 `/admin/disputes` 於 `frontend/src/app/admin/disputes/page.tsx`
- [ ] T189 [P] [US3] 實作 `/admin/analytics` 於 `frontend/src/app/admin/analytics/page.tsx`

### Frontend E2E（US3）

- [ ] T190 [P] [US3] Playwright：Admin 導覽可見性 + 可進入各 admin 頁於 `frontend/tests/e2e/admin-nav.spec.ts`
- [ ] T191 [P] [US3] Playwright：核准賣家→Seller 取得角色→可進入 seller 後台 於 `frontend/tests/e2e/admin-approve-seller.spec.ts`
- [ ] T192 [P] [US3] Playwright：Admin force refund/cancel + AuditLog 可追溯 於 `frontend/tests/e2e/admin-force-refund.spec.ts`

**Checkpoint**: US3 完成（Admin 治理能力可驗收，且稽核覆蓋）

---

## Phase 6: Polish & Cross-Cutting Concerns（全域打磨 / 完整系統交付）

**Purpose**: 一致性、安全性、可觀測性、文件與驗收腳本，使系統達到「完成品」水準。

- [ ] T193 [P] 補齊 contracts 文件於 `specs/001-multi-vendor-marketplace/contracts/`（以 spec 的 Data Contract 為準；每個 endpoint 一個檔案）
- [ ] T194 [P] 建立資料模型說明於 `specs/001-multi-vendor-marketplace/data-model.md`（對照 `prisma/schema.prisma` 與狀態機）
- [ ] T195 [P] 建立 research 決策紀錄於 `specs/001-multi-vendor-marketplace/research.md`（session store、SQLite 交易策略、XSS 策略）
- [ ] T196 建立 quickstart 驗收腳本於 `specs/001-multi-vendor-marketplace/quickstart.md`（逐步跑完整流程與常見錯誤）

- [ ] T197 強化後端 observability（關鍵路徑 log + request-id 貫穿）於 `backend/src/common/observability/*`
- [ ] T198 強化後端安全性（集中化授權檢查 + 最小回傳）於 `backend/src/auth/*` 與各 `backend/src/modules/*/*.controller.ts`
- [ ] T199 強化前端錯誤體驗（統一 error mapping + toast/inline）於 `frontend/src/services/api/*` 與 `frontend/src/components/ui/ErrorState.tsx`

- [ ] T200 [P] 前端 UI 一致性打磨：主要頁面補齊 Loading/Empty/Error/Retry 於 `frontend/src/app/**/page.tsx`
- [ ] T201 [P] 導覽列 CTA 去重與角色顯示規則檢查於 `frontend/src/components/nav/Header.tsx`

- [ ] T202 建立 AuditLog 覆蓋清單並對照檢查於 `backend/src/common/audit/audit.service.ts`
- [ ] T203 建立整體整合腳本：migrate + seed + run backend/frontend + run e2e 於 `package.json`
- [ ] T204 建立本機/CI 的 e2e 前置（啟動兩個 server + 等待健康檢查）於 `.github/workflows/ci.yml`

---

## Dependencies & Execution Order（依賴圖 / 執行順序）

### User Story Completion Order（Dependency Graph）

- Foundational（Phase 2）完成後，US1/US2/US3 皆可開始
- US1（P1）不依賴 US2/US3
- US2（P2）「申請→核准」端到端會用到 US3 的核准，但可先用 seed/手動角色指派驗證 Seller 後台
- US3（P3）多依賴既有資料（SellerApplication/RefundRequest/Order/DisputeCase），通常在 US1/US2 後驗收更順

### Parallel Execution Examples（每個 Story 的並行例子）

- US1：[P] 的 FE pages（`frontend/src/app/page.tsx`, `frontend/src/app/search/page.tsx`, `frontend/src/app/products/[productId]/page.tsx`）可平行；後端 catalog/cart/checkout/payments 各自 module 可平行
- US2：seller products 與 seller orders 可平行（`frontend/src/app/seller/products/*` vs `frontend/src/app/seller/orders/*`；`backend/src/modules/seller/products/*` vs `backend/src/modules/seller/orders/*`）
- US3：admin categories/refunds/disputes/analytics 各自 module/page 可平行（不同檔案樹）

---

## Implementation Strategy（完成品導向）

- 先完成 Phase 1/2（確保狀態機/冪等/扣庫存/RBAC/一致錯誤語意/審計 皆可被測試）
- 依優先順序完成 US1 → US2 → US3，每個 Checkpoint 都跑該 story 的獨立驗收與對應測試
- 最後進入 Polish：補齊 contracts/data-model/research/quickstart 文件，並完成 CI 整合腳本

**Suggested MVP scope（僅供里程碑使用）**: US1（Buyer 端交易閉環）。本任務要求完成品，最終需完成 US1+US2+US3+Polish。
