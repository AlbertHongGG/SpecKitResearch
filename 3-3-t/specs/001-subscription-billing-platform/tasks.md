# Tasks: SaaS 訂閱與計費管理平台（Subscription & Billing System）

**Input**: Design documents from `/specs/001-subscription-billing-platform/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: 核心業務規則為必要測試範圍（狀態機、冪等、RBAC、跨組織隔離、entitlement 一致性）。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立完整前後端專案骨架與開發工具鏈

- [X] T001 建立 monorepo 基礎檔案於 package.json
- [X] T002 建立後端 NestJS 專案骨架於 backend/package.json
- [X] T003 建立前端 Next.js 專案骨架於 frontend/package.json
- [X] T004 [P] 建立共享契約套件骨架於 shared/contracts/package.json
- [X] T005 [P] 建立後端 TypeScript 設定於 backend/tsconfig.json
- [X] T006 [P] 建立前端 TypeScript 設定於 frontend/tsconfig.json
- [X] T007 [P] 建立 ESLint 設定於 .eslintrc.cjs
- [X] T008 [P] 建立 Prettier 設定於 ./.prettierrc
- [X] T009 [P] 建立根目錄環境變數範本於 .env.example
- [X] T010 [P] 建立後端環境變數範本於 backend/.env.example
- [X] T011 [P] 建立前端環境變數範本於 frontend/.env.example
- [X] T012 建立統一開發與測試指令於 ./Makefile

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 User Story 共用且阻塞後續開發的基礎能力

**⚠️ CRITICAL**: 完成前不得開始任何 User Story 實作

- [X] T013 建立 Prisma SQLite schema 基礎結構於 backend/prisma/schema.prisma
- [X] T014 建立初始 migration 於 backend/prisma/migrations/0001_init/migration.sql
- [X] T015 [P] 建立 Prisma Client provider 於 backend/src/common/prisma/prisma.service.ts
- [X] T016 [P] 建立後端設定載入模組於 backend/src/common/config/app.config.ts
- [X] T017 [P] 建立 session/cookie 安全設定於 backend/src/common/auth/session.config.ts
- [X] T018 [P] 建立 CSRF 保護 middleware 於 backend/src/common/security/csrf.middleware.ts
- [X] T019 建立全域錯誤格式與錯誤碼對映於 backend/src/common/errors/error-response.ts
- [X] T020 [P] 建立全域例外處理器於 backend/src/common/errors/http-exception.filter.ts
- [X] T021 [P] 建立 requestId/traceId/correlationId 攔截器於 backend/src/common/observability/tracing.interceptor.ts
- [X] T022 [P] 建立結構化日誌模組於 backend/src/common/observability/logger.service.ts
- [X] T023 建立 Auth module（註冊/登入/登出/session）於 backend/src/modules/auth/auth.module.ts
- [X] T024 [P] 建立 RBAC Guard 與角色定義於 backend/src/common/auth/rbac.guard.ts
- [X] T025 [P] 建立 Organization scope guard（防 IDOR）於 backend/src/common/auth/org-scope.guard.ts
- [X] T026 建立使用者/組織/成員 repository 於 backend/src/modules/organizations/organizations.repository.ts
- [X] T027 建立審計記錄基礎服務於 backend/src/modules/audit/audit.service.ts
- [X] T028 建立冪等事件儲存模型與服務於 backend/src/modules/payments/idempotency.service.ts
- [X] T029 建立 Subscription 狀態機核心服務骨架於 backend/src/modules/subscriptions/subscription-state-machine.service.ts
- [X] T030 建立 Invoice 狀態機核心服務骨架於 backend/src/modules/invoices/invoice-state-machine.service.ts
- [X] T031 建立 Entitlement evaluator 骨架於 backend/src/modules/entitlements/entitlement-evaluator.service.ts
- [X] T032 建立 shared Zod schema 入口於 shared/contracts/zod/index.ts
- [X] T033 [P] 建立 shared API type 入口於 shared/contracts/types/index.ts
- [X] T034 建立前端 API client 與 error adapter 於 frontend/src/services/http/client.ts
- [X] T035 [P] 建立前端 QueryClient provider 於 frontend/src/lib/query/query-provider.tsx
- [X] T036 建立前端全域 route guard 與 session context 於 frontend/src/lib/auth/session-context.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 組織訂閱生命週期管理 (Priority: P1)

**Goal**: 完成 Org Admin/End User 的完整訂閱、計費、付款方式、成員管理與 App 區 UI

**Independent Test**: 單一組織可完成註冊登入、升級/降級/取消、發票檢視、付款失敗進 PastDue 與恢復流程

### Tests for User Story 1

- [X] T037 [P] [US1] 建立訂閱狀態機單元測試於 backend/tests/unit/subscriptions/subscription-state-machine.spec.ts
- [X] T038 [P] [US1] 建立發票狀態機單元測試於 backend/tests/unit/invoices/invoice-state-machine.spec.ts
- [X] T039 [P] [US1] 建立升級 proration 計算單元測試於 backend/tests/unit/billing/proration-calculator.spec.ts
- [X] T040 [P] [US1] 建立降級 pending change 單元測試於 backend/tests/unit/subscriptions/downgrade-pending.spec.ts
- [X] T041 [P] [US1] 建立付款失敗→PastDue→Suspended 整合測試於 backend/tests/integration/billing/pastdue-suspension.spec.ts
- [X] T042 [P] [US1] 建立訂閱 API 契約測試於 backend/tests/contract/subscriptions.contract.spec.ts
- [X] T043 [P] [US1] 建立發票 API 契約測試於 backend/tests/contract/invoices.contract.spec.ts
- [X] T044 [P] [US1] 建立 App 核心旅程 E2E（訂閱/發票）於 frontend/tests/e2e/app-subscription-billing.spec.ts

### Implementation for User Story 1

- [X] T045 [P] [US1] 建立 Plan repository 與查詢服務於 backend/src/modules/plans/plans.repository.ts
- [X] T046 [P] [US1] 建立 Subscription repository 於 backend/src/modules/subscriptions/subscriptions.repository.ts
- [X] T047 [P] [US1] 建立 Invoice repository 於 backend/src/modules/invoices/invoices.repository.ts
- [X] T048 [P] [US1] 建立 PaymentMethod repository 於 backend/src/modules/payments/payment-methods.repository.ts
- [X] T049 [P] [US1] 建立 Members repository 於 backend/src/modules/organizations/members.repository.ts
- [X] T050 [US1] 實作升級服務（即時生效+proration）於 backend/src/modules/subscriptions/use-cases/upgrade-subscription.service.ts
- [X] T051 [US1] 實作降級服務（pending change）於 backend/src/modules/subscriptions/use-cases/downgrade-subscription.service.ts
- [X] T052 [US1] 實作取消訂閱服務於 backend/src/modules/subscriptions/use-cases/cancel-subscription.service.ts
- [X] T053 [US1] 實作 recurring invoice 產生服務於 backend/src/modules/invoices/use-cases/create-recurring-invoice.service.ts
- [X] T054 [US1] 實作付款結果處理服務（Paid/Failed）於 backend/src/modules/payments/use-cases/apply-payment-result.service.ts
- [X] T055 [US1] 實作 payment webhook controller（冪等）於 backend/src/modules/payments/payments-webhook.controller.ts
- [X] T056 [US1] 實作訂閱查詢 controller 於 backend/src/modules/subscriptions/subscriptions.controller.ts
- [X] T057 [US1] 實作發票查詢 controller 於 backend/src/modules/invoices/invoices.controller.ts
- [X] T058 [US1] 實作付款方式 CRUD controller 於 backend/src/modules/payments/payment-methods.controller.ts
- [X] T059 [US1] 實作成員管理 controller（invite/remove/role）於 backend/src/modules/organizations/members.controller.ts
- [X] T060 [US1] 實作 App summary controller 於 backend/src/modules/app/app-summary.controller.ts
- [X] T061 [US1] 為升降級與付款方式操作加入 audit append 於 backend/src/modules/audit/audit-events.service.ts
- [X] T062 [US1] 建立前端公開 Pricing 頁 UI 於 frontend/src/app/pricing/page.tsx
- [X] T063 [US1] 建立前端 Sign Up 頁與表單驗證於 frontend/src/app/signup/page.tsx
- [X] T064 [US1] 建立前端 Login 頁與表單驗證於 frontend/src/app/login/page.tsx
- [X] T065 [US1] 建立 App Dashboard 頁於 frontend/src/app/app/page.tsx
- [X] T066 [US1] 建立 Subscription 頁（含 upgrade/downgrade/cancel CTA）於 frontend/src/app/app/subscription/page.tsx
- [X] T067 [US1] 建立 Usage 頁於 frontend/src/app/app/usage/page.tsx
- [X] T068 [US1] 建立 Invoices 頁於 frontend/src/app/app/billing/invoices/page.tsx
- [X] T069 [US1] 建立 Payment Methods 頁於 frontend/src/app/app/billing/payment-methods/page.tsx
- [X] T070 [US1] 建立 Members 頁於 frontend/src/app/app/org/members/page.tsx
- [X] T071 [US1] 建立 Auth Header 與組織切換元件於 frontend/src/components/navigation/auth-header.tsx
- [X] T072 [US1] 建立 App 區服務層 hooks（subscriptions/invoices/payments/members）於 frontend/src/features/app/hooks/index.ts
- [X] T073 [US1] 實作 Loading/Error/Empty 共用元件於 frontend/src/components/states/index.tsx
- [X] T074 [US1] 實作付款失敗與寬限提示 UI 元件於 frontend/src/features/billing/components/pastdue-banner.tsx

**Checkpoint**: User Story 1 fully functional and independently testable

---

## Phase 4: User Story 2 - 後端統一 Entitlement 與一致性控制 (Priority: P2)

**Goal**: 讓 UI 與 backend 對功能可用性、限制、拒絕原因完全一致

**Independent Test**: 在多種狀態與 override 組合下，比對 entitlement API 與 UI 可用性結果一致

### Tests for User Story 2

- [X] T075 [P] [US2] 建立 entitlement evaluator 單元測試於 backend/tests/unit/entitlements/entitlement-evaluator.spec.ts
- [X] T076 [P] [US2] 建立 override 優先規則單元測試於 backend/tests/unit/entitlements/override-precedence.spec.ts
- [X] T077 [P] [US2] 建立超量策略（Block/Throttle/Overage）單元測試於 backend/tests/unit/usage/over-limit-strategy.spec.ts
- [X] T078 [P] [US2] 建立 entitlement API 契約測試於 backend/tests/contract/entitlements.contract.spec.ts
- [X] T079 [P] [US2] 建立跨組織隔離整合測試於 backend/tests/integration/security/org-isolation.spec.ts
- [X] T080 [P] [US2] 建立 UI 與 API 一致性 E2E 測試於 frontend/tests/e2e/entitlement-consistency.spec.ts

### Implementation for User Story 2

- [X] T081 [P] [US2] 建立 AdminOverride repository 於 backend/src/modules/admin/admin-override.repository.ts
- [X] T082 [P] [US2] 建立 UsageRecord repository 於 backend/src/modules/usage/usage-records.repository.ts
- [X] T083 [P] [US2] 建立 UsageMeter service 於 backend/src/modules/usage/usage-meter.service.ts
- [X] T084 [US2] 實作 entitlement decision service（含 reason codes）於 backend/src/modules/entitlements/entitlement-decision.service.ts
- [X] T085 [US2] 實作 entitlement API controller 於 backend/src/modules/entitlements/entitlements.controller.ts
- [X] T086 [US2] 實作 usage 累積與 period reset 服務於 backend/src/modules/usage/use-cases/usage-period.service.ts
- [X] T087 [US2] 實作 over-limit 行為策略服務於 backend/src/modules/usage/use-cases/enforce-usage-policy.service.ts
- [X] T088 [US2] 實作組織切換上下文解析 middleware 於 backend/src/common/auth/organization-context.middleware.ts
- [X] T089 [US2] 實作 API 層統一拒絕原因碼轉換於 backend/src/common/errors/reason-code.mapper.ts
- [X] T090 [US2] 前端整合 entitlement hooks 與 feature gate 於 frontend/src/features/entitlements/use-entitlements.ts
- [X] T091 [US2] 前端實作全站 FeatureGate 元件於 frontend/src/components/auth/feature-gate.tsx
- [X] T092 [US2] 前端實作 Org Switcher 與 scope 重載於 frontend/src/components/navigation/organization-switcher.tsx
- [X] T093 [US2] 前端更新 Subscription 頁 CTA 可用性判斷於 frontend/src/app/app/subscription/page.tsx
- [X] T094 [US2] 前端更新 Usage 頁超量提示與策略訊息於 frontend/src/app/app/usage/page.tsx
- [X] T095 [US2] 前端更新 Payment Methods/Members 導覽顯示規則於 frontend/src/components/navigation/auth-header.tsx
- [X] T096 [US2] 前端統一 401/403/404/5xx 頁面處理於 frontend/src/app/(errors)/
- [X] T097 [US2] 新增 entitlement 與 UI 一致性觀測事件上報於 frontend/src/lib/observability/entitlement-mismatch.ts

**Checkpoint**: User Stories 1 and 2 are independently functional and consistent

---

## Phase 5: User Story 3 - 平台治理、風險監控與稽核追溯 (Priority: P3)

**Goal**: 完成 Platform Admin 後台能力（Plan 管理、Override、風險與營收、Audit 查詢）

**Independent Test**: Platform Admin 可在 /admin 完成治理流程並可稽核追溯

### Tests for User Story 3

- [X] T098 [P] [US3] 建立 Plan CRUD 單元測試於 backend/tests/unit/admin/plans.service.spec.ts
- [X] T099 [P] [US3] 建立 Admin override 單元測試於 backend/tests/unit/admin/override.service.spec.ts
- [X] T100 [P] [US3] 建立風險帳號聚合單元測試於 backend/tests/unit/admin/risk-accounts.service.spec.ts
- [X] T101 [P] [US3] 建立營收指標計算單元測試於 backend/tests/unit/admin/revenue-metrics.service.spec.ts
- [X] T102 [P] [US3] 建立 Audit 查詢契約測試於 backend/tests/contract/admin-audit.contract.spec.ts
- [X] T103 [P] [US3] 建立 Admin 區 E2E（plans/override/audit）於 frontend/tests/e2e/admin-governance.spec.ts

### Implementation for User Story 3

- [X] T104 [P] [US3] 建立 Admin plans service 於 backend/src/modules/admin/plans/admin-plans.service.ts
- [X] T105 [P] [US3] 建立 Admin subscriptions query service 於 backend/src/modules/admin/subscriptions/admin-subscriptions.service.ts
- [X] T106 [P] [US3] 建立 Admin risk service 於 backend/src/modules/admin/risk/admin-risk.service.ts
- [X] T107 [P] [US3] 建立 Admin revenue metrics service 於 backend/src/modules/admin/metrics/revenue-metrics.service.ts
- [X] T108 [P] [US3] 建立 Admin usage ranking service 於 backend/src/modules/admin/metrics/usage-ranking.service.ts
- [X] T109 [P] [US3] 建立 Audit query service 於 backend/src/modules/audit/audit-query.service.ts
- [X] T110 [US3] 實作 Admin plans controller 於 backend/src/modules/admin/plans/admin-plans.controller.ts
- [X] T111 [US3] 實作 Admin subscriptions controller 於 backend/src/modules/admin/subscriptions/admin-subscriptions.controller.ts
- [X] T112 [US3] 實作 Admin overrides controller 於 backend/src/modules/admin/overrides/admin-overrides.controller.ts
- [X] T113 [US3] 實作 Admin risk controller 於 backend/src/modules/admin/risk/admin-risk.controller.ts
- [X] T114 [US3] 實作 Admin revenue metrics controller 於 backend/src/modules/admin/metrics/revenue-metrics.controller.ts
- [X] T115 [US3] 實作 Admin usage metrics controller 於 backend/src/modules/admin/metrics/usage-ranking.controller.ts
- [X] T116 [US3] 實作 Admin audit controller 於 backend/src/modules/admin/audit/admin-audit.controller.ts
- [X] T117 [US3] 補強 override 寫入 audit 與不可逆保護於 backend/src/modules/admin/overrides/admin-override-guard.service.ts
- [X] T118 [US3] 建立 Admin Dashboard 頁於 frontend/src/app/admin/page.tsx
- [X] T119 [US3] 建立 Admin Plans 頁於 frontend/src/app/admin/plans/page.tsx
- [X] T120 [US3] 建立 Admin Subscriptions 頁於 frontend/src/app/admin/subscriptions/page.tsx
- [X] T121 [US3] 建立 Admin Revenue Metrics 頁於 frontend/src/app/admin/metrics/revenue/page.tsx
- [X] T122 [US3] 建立 Admin Usage Ranking 頁於 frontend/src/app/admin/metrics/usage/page.tsx
- [X] T123 [US3] 建立 Admin Risk Accounts 頁於 frontend/src/app/admin/risk/page.tsx
- [X] T124 [US3] 建立 Admin Audit Log 頁於 frontend/src/app/admin/audit/page.tsx
- [X] T125 [US3] 建立 Admin Header 與導覽權限控制於 frontend/src/components/navigation/admin-header.tsx

**Checkpoint**: All user stories are independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事品質強化、安全硬化、效能與上線準備

- [X] T126 [P] 建立 Forbidden/NotFound/ServerError 頁於 frontend/src/app/403/page.tsx
- [X] T127 [P] 建立 Not Found 與 5xx 頁於 frontend/src/app/not-found.tsx
- [X] T128 建立後端 OpenAPI 匯出與文件校驗腳本於 backend/scripts/validate-openapi.ts
- [X] T129 建立資料種子腳本（Platform Admin/Org/Plans）於 backend/prisma/seed.ts
- [X] T130 建立 recurring billing 與 grace checker 排程任務於 backend/src/modules/billing/billing-scheduler.service.ts
- [X] T131 建立 webhook 重送與死信補償任務於 backend/src/modules/payments/payment-retry.worker.ts
- [X] T132 建立安全硬化清單檢查（cookie/csrf/rbac/idor）於 backend/tests/integration/security/security-hardening.spec.ts
- [X] T133 建立效能基準測試（entitlement API）於 backend/tests/integration/perf/entitlement-latency.spec.ts
- [X] T134 [P] 建立前端 RWD 與可用性調整於 frontend/src/styles/responsive.css
- [X] T135 建立 quickstart 驗收腳本於 scripts/validate-quickstart.sh
- [X] T136 建立部署與回滾操作文件於 docs/deployment-and-rollback.md
- [X] T137 [P] 更新最終架構與 API 使用說明於 README.md
- [X] T138 執行全量測試與發布前檢查報告於 docs/release-readiness-report.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 無前置，可立即開始
- **Phase 2 (Foundational)**: 依賴 Phase 1 完成，且阻塞所有 User Story
- **Phase 3 (US1)**: 依賴 Phase 2，先完成核心商業閉環
- **Phase 4 (US2)**: 依賴 Phase 2（可與 US3 並行，但建議 US1 後優先）
- **Phase 5 (US3)**: 依賴 Phase 2（與 US2 可並行）
- **Phase 6 (Polish)**: 依賴所有目標 User Story 完成

### User Story Dependencies

- **US1 (P1)**: 僅依賴 Foundational；為完整計費流程主幹
- **US2 (P2)**: 依賴 Foundational；與 US1 API 整合但可獨立測試一致性
- **US3 (P3)**: 依賴 Foundational；可獨立實作治理後台

### Within Each User Story

- 先測試（unit/contract/integration/E2E）再實作
- repository/model → service/use-case → controller/API → UI page/components → observability/audit
- 每一故事完成後需通過該故事 Independent Test

### Parallel Opportunities

- Setup 階段 `T004~T011` 可平行
- Foundational 階段 `T015~T025`, `T033`, `T035` 可平行
- US1 的 `T045~T049`、測試 `T037~T044` 可平行
- US2 的 `T081~T083`、測試 `T075~T080` 可平行
- US3 的 `T104~T109`、測試 `T098~T103` 可平行
- US2 與 US3 在 Foundational 後可同時開工

---

## Parallel Example: User Story 1

- T037 [P] [US1] 建立訂閱狀態機單元測試於 backend/tests/unit/subscriptions/subscription-state-machine.spec.ts
- T038 [P] [US1] 建立發票狀態機單元測試於 backend/tests/unit/invoices/invoice-state-machine.spec.ts
- T039 [P] [US1] 建立升級 proration 計算單元測試於 backend/tests/unit/billing/proration-calculator.spec.ts
- T045 [P] [US1] 建立 Plan repository 與查詢服務於 backend/src/modules/plans/plans.repository.ts
- T046 [P] [US1] 建立 Subscription repository 於 backend/src/modules/subscriptions/subscriptions.repository.ts
- T047 [P] [US1] 建立 Invoice repository 於 backend/src/modules/invoices/invoices.repository.ts

## Parallel Example: User Story 2

- T075 [P] [US2] 建立 entitlement evaluator 單元測試於 backend/tests/unit/entitlements/entitlement-evaluator.spec.ts
- T076 [P] [US2] 建立 override 優先規則單元測試於 backend/tests/unit/entitlements/override-precedence.spec.ts
- T077 [P] [US2] 建立超量策略（Block/Throttle/Overage）單元測試於 backend/tests/unit/usage/over-limit-strategy.spec.ts
- T081 [P] [US2] 建立 AdminOverride repository 於 backend/src/modules/admin/admin-override.repository.ts
- T082 [P] [US2] 建立 UsageRecord repository 於 backend/src/modules/usage/usage-records.repository.ts
- T083 [P] [US2] 建立 UsageMeter service 於 backend/src/modules/usage/usage-meter.service.ts

## Parallel Example: User Story 3

- T098 [P] [US3] 建立 Plan CRUD 單元測試於 backend/tests/unit/admin/plans.service.spec.ts
- T099 [P] [US3] 建立 Admin override 單元測試於 backend/tests/unit/admin/override.service.spec.ts
- T100 [P] [US3] 建立風險帳號聚合單元測試於 backend/tests/unit/admin/risk-accounts.service.spec.ts
- T104 [P] [US3] 建立 Admin plans service 於 backend/src/modules/admin/plans/admin-plans.service.ts
- T105 [P] [US3] 建立 Admin subscriptions query service 於 backend/src/modules/admin/subscriptions/admin-subscriptions.service.ts
- T106 [P] [US3] 建立 Admin risk service 於 backend/src/modules/admin/risk/admin-risk.service.ts

---

## Implementation Strategy

### Full-System Delivery (非 MVP)

1. 完成 Phase 1 + Phase 2，建立可擴充且可測試的共用基礎
2. 完成 US1，打通訂閱與計費主流程
3. 完成 US2，保證 entitlement 與 UI/API 一致
4. 完成 US3，補齊平台治理與營運監控
5. 完成 Polish，進行效能、安全、回滾與上線驗證

### Incremental Validation

1. US1 驗證：升級/降級/付款失敗與恢復完整跑通
2. US2 驗證：各狀態下 UI 與 API 一致率達成目標
3. US3 驗證：Admin 可完成 Plan/Override/Audit/Risk 全流程
4. 最後依 quickstart 全流程回歸

### Team Parallel Strategy

1. 團隊共同完成 Setup + Foundational
2. 分線並行：
   - 開發線 A：US1（核心訂閱計費）
   - 開發線 B：US2（entitlement 與一致性）
   - 開發線 C：US3（平台治理與監控）
3. 每條線皆含 backend + frontend + tests，於契約層對齊整合

---

## Notes

- 所有 task 已遵循格式：`- [ ] Txxx [P?] [US?] 描述 + 檔案路徑`
- Setup/Foundational/Polish 無 `[USx]` 標籤；僅 User Story phase 使用
- 所有核心業務規則皆含測試任務，符合規格與憲章要求
- 本 task 清單以完成系統為目標（含邏輯、UI、治理、觀測、安全、上線準備）
