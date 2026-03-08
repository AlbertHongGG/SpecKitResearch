---
description: "Task list for 001-payment-flow-sim implementation"
---

# Tasks: 金流前置模擬平台（payment-flow-sim）

**Input**: 設計文件位於 specs/001-payment-flow-sim/（plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md）

**範圍宣告**：本 tasks 清單目標是「完整可上線的完成系統」，包含後端邏輯、資料層、UI 介面、worker、管理功能、日誌/重送/重播與必要測試。

**測試策略**：核心 domain/business rules 必須有測試（happy path、edge、failure）。若某些端到端測試暫時省略，必須在 tasks 末尾的風險註記提供替代驗證與回滾方案。

## Phase 1: Setup（Shared Infrastructure）

- [x] T001 初始化 monorepo 腳手架與 npm workspaces 於 package.json
- [x] T002 [P] 設定格式化/靜態檢查設定於 .prettierrc.cjs
- [x] T003 [P] 設定 ESLint 基礎規則於 .eslintrc.cjs
- [x] T004 [P] 設定 TypeScript 共用設定於 tsconfig.base.json
- [x] T005 [P] 設定環境變數範例於 .env.example
- [x] T006 建立 backend 專案結構與 scripts 於 backend/package.json
- [x] T007 [P] 建立 backend TypeScript 設定於 backend/tsconfig.json
- [x] T008 建立 Fastify 入口與 healthcheck 於 backend/src/main.ts
- [x] T009 建立 backend 路由掛載骨架於 backend/src/api/http.ts
- [x] T010 建立 frontend（Vite + React + TS）專案結構於 frontend/package.json
- [x] T011 [P] 建立 Vite 設定於 frontend/vite.config.ts
- [x] T012 建立 React 入口與 Router 掛載於 frontend/src/main.tsx
- [x] T013 [P] 建立 Tailwind 設定於 frontend/tailwind.config.ts
- [x] T014 [P] 建立全域樣式與 Tailwind imports 於 frontend/src/index.css
- [x] T015 [P] 建立 Playwright 基礎設定於 playwright.config.ts

---

## Phase 2: Foundational（Blocking Prerequisites）

- [x] T016 建立 Prisma schema 檔案骨架於 backend/prisma/schema.prisma
- [x] T017 定義 Prisma User/Session 模型於 backend/prisma/schema.prisma
- [x] T018 定義 Prisma PaymentMethod/SimulationScenarioTemplate/SystemSettings 模型於 backend/prisma/schema.prisma
- [x] T019 定義 Prisma WebhookEndpoint/Order/OrderStateEvent 模型於 backend/prisma/schema.prisma
- [x] T020 定義 Prisma ReturnLog/WebhookJob/WebhookLog/ReplayRun/AuditLog 模型於 backend/prisma/schema.prisma
- [x] T021 建立 Prisma seed（含預設 Admin、PaymentMethod、ScenarioTemplate、SystemSettings）於 backend/prisma/seed.ts
- [x] T022 [P] 建立後端 config loader 與環境變數驗證於 backend/src/lib/config.ts
- [x] T023 [P] 建立統一錯誤格式與 error codes 於 backend/src/api/errors.ts
- [x] T024 [P] 建立 request_id 產生與注入（reply header + log 綁定）於 backend/src/api/plugins/requestId.ts
- [x] T025 [P] 建立 Fastify cookie 設定（含 session cookie name）於 backend/src/api/plugins/cookies.ts
- [x] T026 [P] 建立 CORS/Origin allowlist 設定於 backend/src/api/plugins/cors.ts
- [x] T027 建立 CSRF double-submit middleware（cookie + X-CSRF-Token）於 backend/src/api/plugins/csrf.ts
- [x] T028 建立統一 error handler（ErrorResponse）於 backend/src/api/plugins/errorHandler.ts
- [x] T029 [P] 建立密碼 hash/verify（argon2id 或等價安全算法）於 backend/src/lib/password.ts
- [x] T030 [P] 建立 Session repository（create/find/touch/revoke/cleanup）於 backend/src/repositories/sessionRepo.ts
- [x] T031 [P] 建立 User repository（findByEmail/create）於 backend/src/repositories/userRepo.ts
- [x] T032 建立 AuthService（login/logout/getSession）於 backend/src/services/auth/AuthService.ts
- [x] T033 建立 RBAC 與 anti-IDOR guard（preHandler）於 backend/src/api/plugins/authz.ts
- [x] T034 [P] 建立 AuditService（append-only）於 backend/src/services/audit/AuditService.ts
- [x] T035 [P] 建立 AuditLog repository 於 backend/src/repositories/auditRepo.ts
- [x] T036 建立 Order 狀態機（合法轉移 + 非法拒絕）於 backend/src/domain/order/orderStateMachine.ts
- [x] T037 [P] 建立 OrderStateEvent 追加邏輯（append-only）於 backend/src/services/orders/orderEvents.ts
- [x] T038 [P] 建立 Webhook 簽章工具（HMAC-SHA256 + t=,v1= 格式）於 backend/src/lib/webhook/signing.ts
- [x] T039 [P] 建立 constant-time 比較工具於 backend/src/lib/crypto/constantTime.ts
- [x] T040 [P] 建立 WebhookEndpoint repository（createIfMissing/list/rotateSecret）於 backend/src/repositories/webhookEndpointRepo.ts
- [x] T041 建立 WebhookEndpoint secret 產生/加密/解密工具於 backend/src/lib/webhook/secrets.ts
- [x] T042 [P] 建立 Order repository（create/list/getByOrderNo/updateStatus）於 backend/src/repositories/orderRepo.ts
- [x] T043 [P] 建立 ReturnLog repository（create/markClientSignal/ack/listByOrder）於 backend/src/repositories/returnLogRepo.ts
- [x] T044 [P] 建立 WebhookJob repository（enqueue/lockDueJobs/markResult）於 backend/src/repositories/webhookJobRepo.ts
- [x] T045 [P] 建立 WebhookLog repository（append attempt）於 backend/src/repositories/webhookLogRepo.ts
- [x] T046 [P] 建立 ReplayRun repository（create/updateStatus）於 backend/src/repositories/replayRunRepo.ts
- [x] T047 建立 DB outbox job lock（SQLite 交易 + locked_at/locked_by）於 backend/src/jobs/jobLocking.ts
- [x] T048 建立 Webhook worker 主迴圈（掃描 due jobs、送出、寫 WebhookLog）於 backend/src/jobs/webhookWorker.ts
- [x] T049 [P] 建立 HTTP client wrapper（timeout、response excerpt 上限 4KB）於 backend/src/lib/http/client.ts
- [x] T050 [P] 建立 frontend API fetch wrapper（含 credentials、錯誤格式解析）於 frontend/src/api/http.ts
- [x] T051 [P] 建立 frontend CSRF header 注入（從 cookie 讀取）於 frontend/src/api/csrf.ts
- [x] T052 [P] 建立 frontend auth API 與 TanStack Query hooks 於 frontend/src/api/auth.ts
- [x] T053 建立 frontend router 與 routes 基礎骨架於 frontend/src/routes/router.tsx
- [x] T054 [P] 建立 ProtectedRoute（未登入導向 /login）於 frontend/src/routes/ProtectedRoute.tsx
- [x] T055 [P] 建立共用 UI 元件（Button/Input/Alert/Spinner）於 frontend/src/components/ui/Button.tsx
- [x] T056 [P] 建立日期時間格式化工具（dayjs）於 frontend/src/lib/datetime.ts
- [x] T057 [P] 建立 Vitest 基礎設定（backend）於 backend/vitest.config.ts
- [x] T058 [P] 建立 Vitest 基礎設定（frontend）於 frontend/vitest.config.ts
- [x] T059 [P] 建立核心狀態機單元測試（合法/非法/終態不可變）於 backend/tests/unit/orderStateMachine.test.ts
- [x] T060 [P] 建立 webhook signing 單元測試（raw_body + t + v1）於 backend/tests/unit/webhookSigning.test.ts
- [x] T061 [P] 建立 CSRF middleware 單元測試（缺 token/不一致/成功）於 backend/tests/unit/csrf.test.ts
- [x] T062 [P] 更新 OpenAPI 補齊付款頁首次進入轉移端點於 specs/001-payment-flow-sim/contracts/openapi.yaml
- [x] T063 [P] 建立 /api/pay/{order_no}/enter route 契約於 specs/001-payment-flow-sim/contracts/openapi.yaml
- [x] T064 實作 /api/pay/{order_no}/enter handler（created→payment_pending，冪等）於 backend/src/api/routes/pay.ts

**Checkpoint**：Foundation ready（可開始 US1～US4）

---

## Phase 3: User Story 1（P1）建立訂單並完成模擬付款（含 Return/Webhook）

**Goal**：完成端到端 P1 流程（登入 → 建立訂單 → 付款頁 → 模擬付款 → Return dispatch → Webhook job/worker）並可在 UI 查看 Return/Webhook 紀錄。

**Independent Test**：用一個使用者完成 success 訂單，能在訂單詳情看到終態、事件、ReturnLog、WebhookLog。


- [x] T065 [P] [US1] 實作登入 API（建立 session cookie + 設定 CSRF cookie）於 backend/src/api/routes/auth.ts
- [x] T066 [P] [US1] 實作登出 API（revoke session）於 backend/src/api/routes/auth.ts
- [x] T067 [P] [US1] 實作 session 查詢 API（回 user + expires_at）於 backend/src/api/routes/auth.ts
- [x] T068 [P] [US1] 實作列出 enabled payment methods API 於 backend/src/api/routes/catalog.ts
- [x] T069 [P] [US1] 實作列出 enabled scenario templates API 於 backend/src/api/routes/catalog.ts
- [x] T070 [P] [US1] 實作建立訂單 API（驗證/套用模板預設/持久化 return_method）於 backend/src/api/routes/orders.ts
- [x] T071 [P] [US1] 實作訂單列表 API（分頁/篩選/ownership）於 backend/src/api/routes/orders.ts
- [x] T072 [P] [US1] 實作訂單詳情 API（含 events/return_logs/webhook_logs/replay_runs/audit_logs）於 backend/src/api/routes/orders.ts
- [x] T073 [US1] 實作 simulate payment API（依 scenario 完成終態、寫 OrderStateEvent、建立 ReturnLog、enqueue WebhookJob）於 backend/src/api/routes/pay.ts
- [x] T074 [P] [US1] 實作 return client-signal API（寫入 ReturnLog.client_signal_at）於 backend/src/api/routes/returns.ts
- [x] T075 [P] [US1] 實作 return ack API（寫入 ReturnLog.ack_at）於 backend/src/api/routes/returns.ts
- [x] T076 [US1] 實作 webhook worker 實際送出（含簽章/headers/紀錄 WebhookLog）於 backend/src/jobs/webhookWorker.ts
- [x] T077 [P] [US1] 建立訂單/付款/回傳相關 AuditLog 記錄點於 backend/src/services/audit/AuditService.ts


- [x] T078 [P] [US1] 建立前端 Login 頁（RHF+Zod）於 frontend/src/pages/LoginPage.tsx
- [x] T079 [P] [US1] 建立前端登入狀態管理與 session bootstrap 於 frontend/src/api/session.ts
- [x] T080 [P] [US1] 建立 Orders List 頁（分頁/篩選）於 frontend/src/pages/OrdersListPage.tsx
- [x] T081 [P] [US1] 建立 Create Order 表單頁（payment methods/scenarios 下拉 + 驗證）於 frontend/src/pages/OrderCreatePage.tsx
- [x] T082 [P] [US1] 建立 Order Detail 頁（摘要 + tabs：Events/Return/Webhook/Audit）於 frontend/src/pages/OrderDetailPage.tsx
- [x] T083 [P] [US1] 建立 Pay Page（/pay/:orderNo，先呼叫 enter，再允許 simulate）於 frontend/src/pages/PayPage.tsx
- [x] T084 [P] [US1] 建立 Complete/Return Dispatch Page（/complete/:orderNo，依 return_method 進行 redirect/form submit）於 frontend/src/pages/CompletePage.tsx
- [x] T085 [US1] 在 Complete page 送出 client-signal（beacon/keepalive）於 frontend/src/api/returns.ts


- [x] T086 [P] [US1] 後端整合測試：建立訂單→enter→simulate→ReturnLog/WebhookJob 生成於 backend/tests/integration/us1_end_to_end.test.ts
- [x] T087 [P] [US1] E2E：登入→建單→付款→詳情看到 ReturnLog 於 e2e/us1.spec.ts


---

## Phase 4: User Story 2（P2）失敗/逾時/延遲與不可變狀態事件

**Goal**：支援 failed/timeout/cancelled/delayed_success 情境、錯誤欄位、延遲完成；並保證終態不可變與非法操作不污染事件流。

**Independent Test**：建立 failed 與 delayed_success 訂單，確認 payload 與狀態事件正確；對終態重複 simulate 應回 409 且不寫事件。


- [x] T088 [P] [US2] 補齊 scenario 模板套用與 per-order override 邏輯於 backend/src/services/orders/scenario.ts
- [x] T089 [US2] 實作 delayed_success（保持 payment_pending，延遲後轉 paid）於 backend/src/services/orders/simulatePayment.ts
- [x] T090 [US2] 實作 timeout/failed/cancelled 終態與 error 欄位一致性於 backend/src/services/orders/simulatePayment.ts
- [x] T091 [US2] 確保終態重複 simulate 回 409（且不寫 OrderStateEvent）於 backend/src/api/routes/pay.ts
- [x] T092 [P] [US2] 補齊 OrderStateEvent.meta（包含 error_code/error_message/delay）於 backend/src/services/orders/orderEvents.ts
- [x] T093 [P] [US2] 前端 Pay Page 顯示錯誤欄位與延遲倒數於 frontend/src/pages/PayPage.tsx
- [x] T094 [P] [US2] 前端 Order Detail 顯示事件時間軸（from/to/trigger/meta）於 frontend/src/components/order/OrderEventsTimeline.tsx


- [x] T095 [P] [US2] 單元測試：非法轉移不寫事件（終態重複 simulate）於 backend/tests/unit/orderTransitions.test.ts
- [x] T096 [P] [US2] 整合測試：failed payload Return/Webhook 欄位一致於 backend/tests/integration/us2_failed_payload.test.ts
- [x] T097 [P] [US2] E2E：delayed_success 付款流程（延遲後 paid）於 e2e/us2_delayed_success.spec.ts

---

## Phase 5: User Story 3（P3）重送與重播（Replay）

**Goal**：提供 webhook 重送與 replay（webhook_only/full_flow），新增對應 logs/audit 並確保訂單終態不改變。

**Independent Test**：對已終態訂單按「重送 Webhook」新增 WebhookLog/AuditLog；建立 replay_run 新增 logs 且 status 不變。


- [x] T098 [US3] 實作 resend webhook API（重用 payload、重算 timestamp/signature、寫 WebhookLog + AuditLog）於 backend/src/api/routes/orders.ts
- [x] T099 [US3] 實作 create replay API（建立 ReplayRun、依 scope 產生 ReturnLog/WebhookJob）於 backend/src/api/routes/orders.ts
- [x] T100 [P] [US3] 建立 ReplayRun 狀態更新與錯誤摘要於 backend/src/services/replay/ReplayService.ts
- [x] T101 [P] [US3] 確保 replay 不改變 Order.status（防呆檢查 + 測試）於 backend/src/services/replay/ReplayService.ts
- [x] T102 [P] [US3] 前端 Order Detail 加入「重送 Webhook」按鈕與確認對話框於 frontend/src/components/order/ResendWebhookButton.tsx
- [x] T103 [P] [US3] 前端 Order Detail 加入「Replay webhook_only/full_flow」操作與結果顯示於 frontend/src/components/order/ReplayControls.tsx
- [x] T104 [P] [US3] 前端顯示 replay_run_id 關聯於 frontend/src/components/order/LogsTable.tsx


- [x] T105 [P] [US3] 整合測試：resend 會新增 WebhookLog 且 event_id 不變於 backend/tests/integration/us3_resend_webhook.test.ts
- [x] T106 [P] [US3] 整合測試：replay full_flow 產生 ReturnLog/WebhookLog 且 status 不變於 backend/tests/integration/us3_replay_full_flow.test.ts
- [x] T107 [P] [US3] E2E：訂單詳情操作重送與重播於 e2e/us3_replay.spec.ts

---

## Phase 6: User Story 4（P4）管理員維護付款方式/情境模板/系統參數

**Goal**：完成 Admin 管理 UI 與 API（payment methods、scenario templates、system settings），並能查看全站訂單與審計。

**Independent Test**：Admin 停用某付款方式後，User 建單頁不可選；調整 scenario template 後，新建訂單預設值改變。


- [x] T108 [P] [US4] 實作 admin payment methods list/create/update API 於 backend/src/api/routes/admin.ts
- [x] T109 [P] [US4] 實作 admin scenario templates list/create/update API 於 backend/src/api/routes/admin.ts
- [x] T110 [P] [US4] 實作 admin system settings get/update API 於 backend/src/api/routes/admin.ts
- [x] T111 [US4] 實作 admin 可看全站 orders/detail（繞過 ownership 但保留 RBAC）於 backend/src/api/routes/orders.ts
- [x] T112 [P] [US4] 實作 webhook endpoints list/rotate API（User 自管）於 backend/src/api/routes/webhookEndpoints.ts
- [x] T113 [P] [US4] 前端 Admin Router 與 sidebar 於 frontend/src/pages/admin/AdminLayout.tsx
- [x] T114 [P] [US4] 前端 Admin PaymentMethods 頁於 frontend/src/pages/admin/PaymentMethodsPage.tsx
- [x] T115 [P] [US4] 前端 Admin ScenarioTemplates 頁於 frontend/src/pages/admin/ScenarioTemplatesPage.tsx
- [x] T116 [P] [US4] 前端 Admin SystemSettings 頁於 frontend/src/pages/admin/SystemSettingsPage.tsx
- [x] T117 [P] [US4] 前端 Webhook Endpoints 管理頁（rotate + 顯示 masked secret）於 frontend/src/pages/WebhookEndpointsPage.tsx


- [x] T118 [P] [US4] 整合測試：停用付款方式後 createOrder 會拒絕於 backend/tests/integration/us4_disable_payment_method.test.ts
- [x] T119 [P] [US4] 整合測試：更新 scenario template 後新建訂單帶入新預設於 backend/tests/integration/us4_update_scenario_template.test.ts
- [x] T120 [P] [US4] E2E：Admin 停用付款方式 + User 建單驗證於 e2e/us4_admin.spec.ts

---

## Phase 7: Polish & Cross-Cutting Concerns


- [x] T121 [P] 強化敏感資訊遮蔽（headers/secret 不可被記錄）於 backend/src/api/plugins/errorHandler.ts
- [x] T122 [P] 增加 WebhookLog/ReturnLog 列表分頁（避免大單撐爆 UI）於 frontend/src/components/order/LogsTable.tsx
- [x] T123 [P] 增加 DB cleanup job（清 session、dead jobs）於 backend/src/jobs/cleanupWorker.ts
- [x] T124 [P] 增加資料庫索引檢視與調整（常用查詢）於 backend/prisma/schema.prisma
- [x] T125 [P] 增加 OpenAPI 與實作對齊檢查（至少回應 schema 對應）於 backend/tests/contract/openapi_smoke.test.ts
- [x] T126 [P] 補齊 quickstart 驗證步驟（README/命令一致）於 specs/001-payment-flow-sim/quickstart.md
- [x] T127 [P] 針對 UI 加上空狀態/錯誤狀態一致呈現於 frontend/src/components/ui/EmptyState.tsx
- [x] T128 增加 Production build：後端靜態提供前端 build（含 /pay /complete 路由回 SPA）於 backend/src/main.ts
- [x] T129 [P] 補齊完整 E2E 路徑（US1~US4）於 e2e/full_suite.spec.ts

---

## Dependencies & Execution Order

- Phase 1（Setup）→ Phase 2（Foundational）→ US1（P1）→ US2（P2）→ US3（P3）→ US4（P4）→ Polish

### User Story Dependencies

- US1 依賴 Foundational（auth/db/csrf/worker 骨架）
- US2 依賴 US1（simulate/payment/詳情頁已存在）
- US3 依賴 US1（webhook/logs 已存在）
- US4 依賴 Foundational（RBAC + admin guard）且與 US1/US2/US3 相容

---

## Parallel execution examples

### US1

可平行：
- Login UI 與 Orders UI（frontend/src/pages/*.tsx）
- 後端 orders/auth/catalog routes（backend/src/api/routes/*.ts）
- worker 實作（backend/src/jobs/webhookWorker.ts）

### US2

可平行：
- 模擬付款 service（backend/src/services/orders/simulatePayment.ts）
- 事件時間軸 UI（frontend/src/components/order/OrderEventsTimeline.tsx）

### US3

可平行：
- ResendWebhookButton UI（frontend/src/components/order/ResendWebhookButton.tsx）
- ReplayService（backend/src/services/replay/ReplayService.ts）

### US4

可平行：
- Admin pages（frontend/src/pages/admin/*.tsx）
- Admin API routes（backend/src/api/routes/admin.ts）

---

## Implementation strategy（完整交付，不僅 MVP）

1) 先完成 Phase 1~2（確保資料一致性、安全、worker 可恢復、錯誤/觀測一致）
2) 依 P1→P4 逐一完成 UI + 邏輯 + 測試，確保每個 story 都可獨立驗證
3) 最後做 Polish（安全遮蔽、索引、清理 job、production build、E2E 全套）

---

## Format validation

- 本文件所有 task 均使用 `- [ ] T### ...` 的 checklist 格式
- [P] 僅標註可在不同檔案平行進行者
- User Story phase tasks 皆含 [US1]/[US2]/[US3]/[US4] 標籤，且每個 task 描述包含明確檔案路徑
