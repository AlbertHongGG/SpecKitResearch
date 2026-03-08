---

description: "Task list for feature implementation"

---

# Tasks: 金流前置模擬平台（非真的刷卡）

**Input**: Design documents from `/specs/001-payment-flow-sim/`

- spec.md: [spec.md](spec.md)
- plan.md: [plan.md](plan.md)
- research.md: [research.md](research.md)
- data-model.md: [data-model.md](data-model.md)
- contracts: [contracts/openapi.yaml](contracts/openapi.yaml)
- quickstart: [quickstart.md](quickstart.md)

**Scope note**: 本 tasks.md 目標是「完成的專案結果」（完整邏輯 + UI 介面 + 測試 + 可觀測性/安全性基本盤），不是僅 MVP。

**Tests**: 依憲章與 plan.md，核心業務規則必須有測試（happy path / edge / failure）。

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**: 可並行（不同檔案、無未完成依賴）
- **[US#]**: 僅限 user story phase 任務；Setup/Foundational/Polish 不標
- 每個 task 描述都包含明確檔案路徑

---

## Phase 1: Setup（專案初始化與骨架）

- [x] T001 初始化 monorepo root 設定於 package.json（npm workspaces）
- [x] T002 新增 workspace TypeScript 基礎設定於 tsconfig.base.json
- [x] T003 [P] 新增 root lint/format 設定於 .eslintrc.cjs
- [x] T004 [P] 新增 root prettier 設定於 .prettierrc
- [x] T005 [P] 新增 editor 設定於 .editorconfig
- [x] T006 新增 workspace scripts 與共用指令於 package.json
- [x] T007 建立 shared contracts package 骨架於 packages/contracts/package.json
- [x] T008 [P] 初始化 contracts TS 設定於 packages/contracts/tsconfig.json
- [x] T009 建立 backend 專案骨架於 backend/package.json
- [x] T010 [P] 初始化 backend TS 設定於 backend/tsconfig.json
- [x] T011 [P] 初始化 backend Fastify 啟動點於 backend/src/main.ts
- [x] T012 建立 frontend 專案骨架於 frontend/package.json
- [x] T013 [P] 初始化 frontend Vite + React 入口於 frontend/src/main.tsx
- [x] T014 [P] 初始化 frontend Router 基礎於 frontend/src/routes/router.tsx
- [x] T015 [P] 初始化 Tailwind 設定於 frontend/tailwind.config.ts
- [x] T016 [P] 初始化 frontend 全域樣式於 frontend/src/styles/index.css
- [x] T017 建立 e2e 測試目錄骨架於 tests/e2e/README.md
- [x] T018 [P] 新增 Playwright 設定於 tests/e2e/playwright.config.ts
- [x] T019 [P] 新增 Vitest 設定於 backend/vitest.config.ts
- [x] T020 [P] 新增 Vitest 設定於 packages/contracts/vitest.config.ts

---

## Phase 2: Foundational（所有 User Stories 的阻塞前置）

**⚠️ CRITICAL**: Phase 2 未完成前，不開始任何 US1~US4 的功能開發。

### Contracts & Shared Types

- [x] T021 建立統一錯誤 envelope schema 於 packages/contracts/src/error.ts
- [x] T022 [P] 建立共用 enum schema（role/status/method/scenario）於 packages/contracts/src/enums.ts
- [x] T023 [P] 建立共用時間/日期型別 helper 於 packages/contracts/src/datetime.ts
- [x] T024 建立 contracts barrel exports 於 packages/contracts/src/index.ts
- [x] T025 [P] 為錯誤 envelope 寫單元測試於 packages/contracts/tests/error.test.ts

### Backend Core (Fastify)

- [x] T026 建立 backend app 組裝（plugins + routes）於 backend/src/app.ts
- [x] T027 [P] 實作 request-id 產生/傳遞於 backend/src/plugins/request_id.ts
- [x] T028 [P] 實作統一 error handler（對齊 contracts）於 backend/src/plugins/error_handler.ts
- [x] T029 [P] 實作結構化 logger（含 requestId）於 backend/src/lib/logger.ts
- [x] T030 [P] 建立 env config 載入與驗證於 backend/src/config/env.ts
- [x] T031 [P] 建立 Zod 驗證工具（request body/params/query）於 backend/src/lib/validate.ts
- [x] T032 [P] 建立 RBAC middleware（requireAuth / requireAdmin）於 backend/src/middleware/authz.ts
- [x] T033 [P] 建立 IDOR 防護 helper（order ownership check）於 backend/src/domain/auth/ownership.ts
- [x] T034 建立 CSRF 基礎防護（Origin/Referer 檢查或 token）於 backend/src/middleware/csrf.ts

### Database (Prisma + SQLite)

- [x] T035 建立 Prisma schema 骨架於 backend/prisma/schema.prisma
- [x] T036 [P] 定義 User/Session 表於 backend/prisma/schema.prisma
- [x] T037 [P] 定義 PaymentMethod/SimulationScenarioTemplate 表於 backend/prisma/schema.prisma
- [x] T038 [P] 定義 Order/OrderStateEvent/ReturnLog/WebhookLog/AuditLog/ReplayRun 表於 backend/prisma/schema.prisma
- [x] T039 [P] 定義 WebhookJob/SystemSetting/WebhookSigningSecret 表於 backend/prisma/schema.prisma
- [x] T040 新增 Prisma client 初始化 plugin 於 backend/src/plugins/prisma.ts
- [x] T041 建立第一版 migration（含 indexes）於 backend/prisma/migrations/0001_init/migration.sql
- [x] T042 建立 seed（admin + developer + default methods/scenarios/settings）於 backend/prisma/seed.ts

### Auth (Session Cookie)

- [x] T043 [P] 實作密碼雜湊（argon2/bcrypt）於 backend/src/domain/auth/password.ts
- [x] T044 [P] 實作 Session service（create/rotate/revoke/validate）於 backend/src/domain/auth/session_service.ts
- [x] T045 [P] 實作 Session cookie 設定 helper 於 backend/src/domain/auth/cookie.ts
- [x] T046 實作 login/logout/me routes 於 backend/src/api/routes/auth.ts
- [x] T047 [P] 新增 auth routes contract 測試於 backend/tests/integration/auth.test.ts
- [x] T048 [P] 新增 session 失效/rotation 單元測試於 backend/tests/unit/session_service.test.ts

### Frontend Foundation

- [x] T049 建立 API client（fetch wrapper + credentials）於 frontend/src/services/http.ts
- [x] T050 [P] 建立 error mapping（對齊 contracts）於 frontend/src/services/errors.ts
- [x] T051 [P] 建立 TanStack Query client 設定於 frontend/src/services/queryClient.ts
- [x] T052 [P] 建立 auth state hook（me + logout）於 frontend/src/services/auth.ts
- [x] T053 [P] 建立 Route Guard（Guest/User/Admin）於 frontend/src/routes/guards.tsx
- [x] T054 建立 Login 頁面（RHF+Zod）於 frontend/src/pages/LoginPage.tsx
- [x] T055 [P] 建立 layout/nav 框架於 frontend/src/components/AppLayout.tsx
- [x] T056 [P] 建立 admin route skeleton 於 frontend/src/routes/adminRoutes.tsx
- [x] T057 [P] 建立 user routes skeleton 於 frontend/src/routes/appRoutes.tsx

### Dev Experience

- [x] T058 新增 .env.example（backend + frontend）於 .env.example
- [x] T059 [P] 新增 backend dev script（ts-node/tsx）於 backend/package.json
- [x] T060 [P] 新增 frontend dev/build script 於 frontend/package.json

**Checkpoint**: 可登入、可取得 `auth/me`、基礎錯誤格式與 request-id 可工作。

---

## Phase 3: User Story 1 - 建立模擬訂單並完成回傳（Return URL）(Priority: P1)

**Goal**: 建單 → 付款頁（首次載入推進 payment_pending）→ 模擬付款進終態 → 產生 Return payload 與 ReturnLog，UI 可完整操作與檢視。

**Independent Test**: 只要 UI 可完成「建立訂單 → 開付款頁 → pay → 看到 ReturnLog + OrderStateEvent」，即驗證 US1。

### Tests（US1）

- [x] T061 [P] [US1] 建立 Orders/PayPage Zod schemas 於 packages/contracts/src/orders.ts
- [x] T062 [P] [US1] 建立 ReturnPayload schema 並確保欄位一致性測試於 packages/contracts/tests/payload_consistency.test.ts
- [x] T063 [P] [US1] 狀態機合法/非法轉換單元測試於 backend/tests/unit/order_state_machine.test.ts
- [x] T064 [P] [US1] Orders.Create/PayPage.Pay 整合測試（Fastify inject）於 backend/tests/integration/us1_flow.test.ts

### Backend Domain（US1）

- [x] T065 [P] [US1] 實作 OrderStateMachineService 於 backend/src/domain/orders/order_state_machine_service.ts
- [x] T066 [P] [US1] 實作 OrderRepository（Prisma）於 backend/src/infra/repos/order_repo.ts
- [x] T067 [P] [US1] 實作 Event/Log repositories 於 backend/src/infra/repos/order_logs_repo.ts
- [x] T068 [US1] 實作 OrdersService（create/list/get）於 backend/src/domain/orders/orders_service.ts
- [x] T069 [US1] 實作 PayPageService（load/pay）於 backend/src/domain/pay/pay_page_service.ts
- [x] T070 [P] [US1] 實作 ReturnDispatchService（query_string/post_form 生成）於 backend/src/domain/return/return_dispatch_service.ts
- [x] T071 [US1] 建立 ReturnLog 寫入與錯誤處理於 backend/src/domain/return/return_log_service.ts

### Backend API（US1）

- [x] T072 [US1] 實作 `POST /api/orders` 於 backend/src/api/routes/orders.ts
- [x] T073 [US1] 實作 `GET /api/orders` 分頁與 filter 於 backend/src/api/routes/orders.ts
- [x] T074 [US1] 實作 `GET /api/orders/{id}` 於 backend/src/api/routes/orders.ts
- [x] T075 [US1] 實作 `GET /api/pay/{order_no}`（首次載入推進狀態）於 backend/src/api/routes/pay.ts
- [x] T076 [US1] 實作 `POST /api/pay/{order_no}`（pay + ReturnLog）於 backend/src/api/routes/pay.ts
- [x] T077 [P] [US1] 實作 input validation（Zod）於 backend/src/api/schemas/us1.ts
- [x] T078 [US1] 將 US1 routes 註冊到 app 於 backend/src/app.ts

### Frontend UI（US1）

- [x] T079 [P] [US1] 建立 Orders API hooks 於 frontend/src/services/orders.ts
- [x] T080 [US1] 建立訂單列表頁（filters + paging）於 frontend/src/pages/OrdersListPage.tsx
- [x] T081 [US1] 建立新訂單頁（RHF+Zod + defaults）於 frontend/src/pages/OrderCreatePage.tsx
- [x] T082 [P] [US1] 建立付款頁（載入 order + 倒數）於 frontend/src/pages/PayPage.tsx
- [x] T083 [US1] 實作 pay action（呼叫 API + 依 return_method 導向/表單送出）於 frontend/src/pages/PayPage.tsx
- [x] T084 [US1] 建立訂單詳情頁（events + return_logs）於 frontend/src/pages/OrderDetailPage.tsx
- [x] T085 [P] [US1] 建立狀態徽章與金額顯示元件於 frontend/src/components/OrderStatusBadge.tsx
- [x] T086 [P] [US1] 建立 ReturnLog 列表元件於 frontend/src/components/ReturnLogList.tsx
- [x] T087 [P] [US1] 建立 StateEvent timeline 元件於 frontend/src/components/OrderEventTimeline.tsx
- [x] T088 [US1] 串接 routes（/orders, /orders/new, /orders/:id, /pay/:order_no）於 frontend/src/routes/appRoutes.tsx

### Tooling / Receiver（US1）

- [x] T089 [P] [US1] 建立本機 callback/webhook receiver（debug 用）於 tools/receiver/package.json
- [x] T090 [US1] 實作 receiver server（/callback, /webhook）於 tools/receiver/src/main.ts
- [x] T091 [US1] 更新 quickstart 指令與實際路徑於 specs/001-payment-flow-sim/quickstart.md

### E2E（US1）

- [x] T092 [P] [US1] Playwright：登入 + 建單 + 開付款頁 + pay 於 tests/e2e/us1.spec.ts
- [x] T093 [US1] Playwright：整合 receiver（驗證 callback 收到 payload）於 tests/e2e/us1.spec.ts

**Checkpoint**: US1 全流程可在 UI 完成，並可在 OrderDetail 看到不可變事件與 ReturnLog。

---

## Phase 4: User Story 2 - 模擬 Webhook（含簽章、延遲、重送）(Priority: P2)

**Goal**: 終態後非同步送出 webhook（延遲/重試），可檢視每次嘗試的 WebhookLog，並支援手動重送（payload 不變、timestamp/signature 更新）。

**Independent Test**: 建立含 webhook_url 訂單並付款 → 看到 WebhookLog；點重送 → 新增第二筆 WebhookLog。

### Tests（US2）

- [x] T094 [P] [US2] 建立 webhook signature helper 單元測試於 backend/tests/unit/webhook_signature.test.ts
- [x] T095 [P] [US2] 建立 webhook job claim/retry 單元測試於 backend/tests/unit/webhook_job.test.ts
- [x] T096 [P] [US2] Webhook resend 整合測試於 backend/tests/integration/webhook_resend.test.ts

### Backend Domain + Worker（US2）

- [x] T097 [P] [US2] 實作 stable JSON stringify（作為 raw_body）於 backend/src/lib/stable_json.ts
- [x] T098 [P] [US2] 實作 WebhookSignatureService（HMAC + timestamp + rotation）於 backend/src/domain/webhook/webhook_signature_service.ts
- [x] T099 [P] [US2] 實作 WebhookPayloadBuilder（與 ReturnPayload 一致）於 backend/src/domain/webhook/webhook_payload_builder.ts
- [x] T100 [P] [US2] 實作 WebhookJobService（enqueue/claim/complete/fail）於 backend/src/domain/webhook/webhook_job_service.ts
- [x] T101 [US2] 實作 WebhookSender（HTTP client + timeout + classify retryable）於 backend/src/domain/webhook/webhook_sender.ts
- [x] T102 [US2] 實作 webhook worker loop（poll/claim/send/log/retry）於 backend/src/worker/webhook_worker.ts
- [x] T103 [US2] 建立 worker entrypoint + CLI flags 於 backend/src/worker/main.ts
- [x] T104 [US2] 將 worker scripts 加入 backend/package.json

### Backend API（US2）

- [x] T105 [US2] 在 PayPageService pay 終態時 enqueue webhook job 於 backend/src/domain/pay/pay_page_service.ts
- [x] T106 [US2] 實作 `POST /api/orders/{id}/webhook/resend` 於 backend/src/api/routes/webhook.ts
- [x] T107 [US2] 在 OrderDetail 回傳加入 webhook_logs 於 backend/src/api/mappers/order_mapper.ts
- [x] T108 [US2] 將 webhook route 註冊到 app 於 backend/src/app.ts

### Frontend UI（US2）

- [x] T109 [P] [US2] 建立 webhook resend hook 於 frontend/src/services/webhook.ts
- [x] T110 [P] [US2] 建立 WebhookLog 列表元件於 frontend/src/components/WebhookLogList.tsx
- [x] T111 [US2] 在 OrderDetail 加入 Webhook logs tab + resend button 於 frontend/src/pages/OrderDetailPage.tsx

### Receiver/E2E（US2）

- [x] T112 [US2] 擴充 receiver 驗證 signature header 並記錄於 tools/receiver/src/webhook_verify.ts
- [x] T113 [P] [US2] Playwright：驗證 webhook 最終送達 receiver 於 tests/e2e/us2_webhook.spec.ts

**Checkpoint**: Webhook 可延遲/重送、每次 attempt 都有 WebhookLog，簽章可被 receiver 驗證。

---

## Phase 5: User Story 3 - Replay（重播）以復現 Return/Webhook 行為 (Priority: P3)

**Goal**: 對終態訂單執行 Replay（webhook_only/full_flow），不改變訂單終態，並以 ReplayRun + replay_run_id 連結新增的 ReturnLog/WebhookLog。

**Independent Test**: 終態訂單按 Replay → 出現 ReplayRun；ReturnLog/WebhookLog 追加且帶 replay_run_id，訂單 status 不變。

### Tests（US3）

- [x] T114 [P] [US3] Replay 不改變終態單元測試於 backend/tests/unit/replay_service.test.ts
- [x] T115 [P] [US3] Replay API 整合測試於 backend/tests/integration/replay.test.ts

### Backend Domain（US3）

- [x] T116 [P] [US3] 實作 ReplayService（create run + dispatch by scope）於 backend/src/domain/replay/replay_service.ts
- [x] T117 [P] [US3] 實作 ReplayRun repository 於 backend/src/infra/repos/replay_repo.ts
- [x] T118 [US3] 更新 ReturnLog/WebhookLog 寫入支援 replay_run_id 於 backend/src/domain/return/return_log_service.ts
- [x] T119 [US3] 更新 WebhookJob enqueue 支援 replay_run_id 於 backend/src/domain/webhook/webhook_job_service.ts

### Backend API（US3）

- [x] T120 [US3] 實作 `POST /api/orders/{id}/replay` 於 backend/src/api/routes/replay.ts
- [x] T121 [US3] 將 replay route 註冊到 app 於 backend/src/app.ts

### Frontend UI（US3）

- [x] T122 [P] [US3] 建立 replay hook 於 frontend/src/services/replay.ts
- [x] T123 [US3] 在 OrderDetail 加入 Replay controls + ReplayRun 列表於 frontend/src/pages/OrderDetailPage.tsx
- [x] T124 [P] [US3] 建立 ReplayRun 列表元件於 frontend/src/components/ReplayRunList.tsx

**Checkpoint**: Replay 可用、結果可追蹤（replay_run_id）、訂單終態不變。

---

## Phase 6: User Story 4 - Admin 管理付款方式、情境模板與系統參數 (Priority: P4)

**Goal**: Admin 可管理 PaymentMethod/ScenarioTemplate/Settings（含 session TTL、allowed currencies、default return method、webhook signing rotation 設定），且影響 /orders/new 的選項與預設。

**Independent Test**: Admin 在 /admin 修改 payment methods/scenarios/settings → User 建單頁立即反映。

### Tests（US4）

- [x] T125 [P] [US4] Admin RBAC（403）整合測試於 backend/tests/integration/admin_rbac.test.ts
- [x] T126 [P] [US4] Admin payment methods API 整合測試於 backend/tests/integration/admin_payment_methods.test.ts
- [x] T127 [P] [US4] Admin scenario templates API 整合測試於 backend/tests/integration/admin_scenarios.test.ts
- [x] T128 [P] [US4] Admin settings API 整合測試於 backend/tests/integration/admin_settings.test.ts

### Backend Domain（US4）

- [x] T129 [P] [US4] 實作 PaymentMethodService 於 backend/src/domain/admin/payment_method_service.ts
- [x] T130 [P] [US4] 實作 ScenarioTemplateService 於 backend/src/domain/admin/scenario_template_service.ts
- [x] T131 [P] [US4] 實作 SettingsService（allowed currencies/default return method/session TTL）於 backend/src/domain/admin/settings_service.ts
- [x] T132 [P] [US4] 實作 WebhookSigningSecretService（create/rotate/retire，不回傳 secret）於 backend/src/domain/admin/webhook_secret_service.ts

### Backend API（US4）

- [x] T133 [US4] 實作 `GET/PUT /api/admin/payment-methods` 於 backend/src/api/routes/admin_payment_methods.ts
- [x] T134 [US4] 實作 `GET/PUT /api/admin/scenario-templates` 於 backend/src/api/routes/admin_scenario_templates.ts
- [x] T135 [US4] 實作 `GET/PUT /api/admin/settings` 於 backend/src/api/routes/admin_settings.ts
- [x] T136 [US4] 將 admin routes 註冊到 app 於 backend/src/app.ts

### Frontend UI（US4）

- [x] T137 [P] [US4] 建立 admin API hooks（methods/scenarios/settings）於 frontend/src/services/admin.ts
- [x] T138 [US4] 建立 Admin dashboard layout 於 frontend/src/pages/admin/AdminLayout.tsx
- [x] T139 [US4] 建立 PaymentMethod 管理頁於 frontend/src/pages/admin/PaymentMethodsPage.tsx
- [x] T140 [US4] 建立 ScenarioTemplate 管理頁於 frontend/src/pages/admin/ScenarioTemplatesPage.tsx
- [x] T141 [US4] 建立 Settings 管理頁（session TTL/currencies/return_method/webhook signing）於 frontend/src/pages/admin/SettingsPage.tsx
- [x] T142 [US4] 串接 /admin routes（含 guard）於 frontend/src/routes/adminRoutes.tsx

### Integrations（US4）

- [x] T143 [US4] 建單頁讀取 payment methods/scenario templates/settings 預設於 frontend/src/pages/OrderCreatePage.tsx
- [x] T144 [US4] backend Orders.Create 驗證 payment_method_code 必須 enabled 於 backend/src/domain/orders/orders_service.ts
- [x] T145 [US4] backend Orders.Create 驗證 currency 必須在 allowed list 於 backend/src/domain/orders/orders_service.ts
- [x] T146 [US4] backend Orders.Create 對 default return_method 套用（若前端未指定）於 backend/src/domain/orders/orders_service.ts

**Checkpoint**: Admin 改設定能即時影響建單選項/預設；所有操作有 AuditLog。

---

## Phase 7: Polish & Cross-Cutting Concerns（跨故事品質與完成度）

- [x] T147 [P] 補齊 OpenAPI schemas/response examples 於 specs/001-payment-flow-sim/contracts/openapi.yaml
- [x] T148 [P] 建立對外 README（啟動/架構/限制）於 README.md
- [x] T149 加入 quickstart 的實際指令（install/dev/migrate/seed）於 specs/001-payment-flow-sim/quickstart.md
- [x] T150 [P] 新增 backend AuditLog 寫入 helper（統一 action/target/meta）於 backend/src/domain/audit/audit_log_service.ts
- [x] T151 [P] 補齊所有敏感資訊遮罩（logs/response 不洩漏）於 backend/src/lib/redact.ts
- [x] T152 [P] 加入 rate limit（login / webhook resend / replay）於 backend/src/plugins/rate_limit.ts
- [x] T153 [P] 補齊 CORS 設定（僅允許 frontend origin，含 credentials）於 backend/src/plugins/cors.ts
- [x] T154 [P] 補齊 security headers（基本）於 backend/src/plugins/security_headers.ts
- [x] T155 [P] 前端加入全域 error boundary + toast 於 frontend/src/components/ErrorBoundary.tsx
- [x] T156 [P] 前端加入 loading/empty states（list/detail/admin）於 frontend/src/components/States.tsx
- [x] T157 [P] 加入 a11y 檢查（表單 label、focus）於 frontend/src/components/forms/FormField.tsx
- [x] T158 [P] 加入 DB index 檢核與必要補強於 backend/prisma/migrations/0002_indexes/migration.sql
- [x] T159 [P] 加入資料清理策略（舊 session/webhook jobs）於 backend/src/worker/cleanup_worker.ts
- [x] T160 [P] 加入 worker observability（job lag/attempts）於 backend/src/domain/webhook/webhook_metrics.ts
- [x] T161 [P] 增加 E2E：Admin 改設定影響建單頁 於 tests/e2e/us4_admin.spec.ts
- [x] T162 [P] 增加 E2E：Replay 不改變終態 於 tests/e2e/us3_replay.spec.ts
- [x] T163 建立 release/版本標示（SemVer）於 backend/package.json
- [x] T164 建立 release/版本標示（SemVer）於 frontend/package.json
- [x] T165 建立 release/版本標示（SemVer）於 packages/contracts/package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）→ Phase 2（Foundational）→ US1（P1）→ US2（P2）→ US3（P3）→ US4（P4）→ Polish

### User Story Dependencies（completion order graph）

- US1（建立訂單/付款/Return）是最底層核心能力
- US2（Webhook）依賴 US1 的「終態完成」與 payload 一致性
- US3（Replay）依賴 US1/US2 的 dispatch 能力，但不應改變訂單狀態
- US4（Admin）可獨立開發，但會影響 US1 建單預設與驗證（建議在 US1 穩定後整合）

---

## Parallel Execution Examples（per user story）

### US1

- 可並行：T061, T062, T063, T064（contracts/tests）
- 可並行：T065, T066, T067, T070（domain/repo helpers）
- 可並行：T085, T086, T087（UI components）

### US2

- 可並行：T094, T095, T096（tests）
- 可並行：T097, T098, T099, T100（helpers/services）

### US3

- 可並行：T114, T115（tests）
- 可並行：T116, T117（domain + repo）

### US4

- 可並行：T125~T128（tests）
- 可並行：T129~T132（domain services）
- 可並行：T139~T141（admin pages）

---

## Implementation Strategy

### Suggested MVP Scope（僅建議）

- 建議先完成到 US1（含基礎測試 + UI），作為後續 US2/US3/US4 的穩定底座。

### Full System Delivery（本次需求）

- 依 Phase 3~6 完整完成 US1~US4，最後跑 Phase 7 polish（安全/觀測/清理/更多 E2E）。
