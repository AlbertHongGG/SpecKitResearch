---

description: "Task list for feature implementation"
---

# Tasks: SaaS 訂閱與計費管理平台（Subscription & Billing SSOT）

**Input**: Design documents from `/specs/001-subscription-billing-platform/`

**Prerequisites**: plan.md（required）, spec.md（required）, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: 核心 domain / business rules **必須**有 tests（happy path / edge cases / failure）。本 tasks 列表已包含 unit/contract/E2E 的最小集合。

**Organization**: 依 User Story（P1→P3）分 phase，確保每個故事可以獨立驗收。

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**: 可並行（不同檔案/無未完成依賴）
- **[US?]**: 只用在 User Story phase（[US1]/[US2]/[US3]）
- **每個 task 描述必須包含檔案路徑**（可含多個，但至少一個）

## Path Conventions (from plan.md)

```text
apps/
  web/                 # Next.js（App Router）
  api/                 # NestJS（REST）
packages/
  contracts/           # OpenAPI + Zod schema（前後端共用）
  db/                  # Prisma schema + migrations（SQLite）
  shared/              # 共用型別（role、meter code、錯誤碼等）
tests/
  unit/
  contract/
  e2e/
```

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 建立 monorepo 與基本開發體驗（可啟動 web + api + DB migration）。

- [x] T001 初始化 pnpm workspace 與 monorepo scripts（pnpm-workspace.yaml, package.json）
- [x] T002 [P] 建立目標資料夾結構（apps/web, apps/api, packages/contracts, packages/db, packages/shared, tests/*）在 .gitkeep（apps/web/.gitkeep 等）
- [x] T003 建立根層 TypeScript 基礎設定（tsconfig.base.json）
- [x] T004 [P] 設定根層 ESLint + Prettier（.eslintrc.cjs, .prettierrc, .editorconfig）
- [x] T005 Scaffold Next.js App Router 專案（apps/web/package.json, apps/web/next.config.ts, apps/web/app/layout.tsx）
- [x] T006 Scaffold NestJS 專案並改成 TS + REST JSON（apps/api/package.json, apps/api/src/main.ts, apps/api/src/app.module.ts）
- [x] T007 建立 shared package（roles/meter codes/error codes）（packages/shared/package.json, packages/shared/src/index.ts）
- [x] T008 建立 contracts package，並將設計契約複製為可被 codegen/驗證的實作檔（specs/001-subscription-billing-platform/contracts/openapi.yaml → packages/contracts/openapi.yaml；另建 packages/contracts/package.json, packages/contracts/src/index.ts）
- [x] T009 建立 db package（Prisma schema/migrate/generate 腳手架）（packages/db/package.json, packages/db/prisma/schema.prisma）
- [x] T010 設定 root `pnpm dev` 同時啟動 web+api（package.json, scripts/dev.mjs 或使用 concurrently）
- [x] T011 設定 root `pnpm test` / `pnpm test:contract` / `pnpm test:e2e` 腳手架（package.json, tests/README.md）
- [x] T012 建立 `.env.example` 並與 quickstart 對齊（.env.example）
- [x] T013 設定 VS Code workspace 推薦設定（.vscode/settings.json, .vscode/extensions.json）

**Checkpoint**: `pnpm install`、`pnpm dev` 可啟動 skeleton（web:3000、api:4000），且不需要真功能即可回應 health。

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 User Story 都會依賴的基礎：DB schema、Auth/Session/CSRF、RBAC、Org context、錯誤格式、Audit、RequestId、Prisma 交易/重試。

- [x] T014 定義全域錯誤碼與 ErrorResponse（packages/shared/src/errors.ts, packages/contracts/src/error.ts）
- [x] T015 在 OpenAPI 對齊錯誤格式與 security headers（packages/contracts/openapi.yaml；參考 specs/001-subscription-billing-platform/contracts/openapi.yaml）
- [x] T016 [P] 建立 OpenAPI 驗證與型別產出（openapi-typescript）腳本（packages/contracts/package.json, packages/contracts/scripts/generate.ts）
- [x] T017 補齊 OpenAPI 缺漏端點：成員 role 調整與移除（PATCH/DELETE /app/org/members/{memberId}）（packages/contracts/openapi.yaml）
- [x] T018 補齊 OpenAPI 支付/測試用端點：模擬付款結果（POST /app/billing/invoices/{invoiceId}/simulate-payment）（packages/contracts/openapi.yaml）
- [x] T019 補齊 OpenAPI Admin Dashboard 端點（GET /admin/dashboard）（packages/contracts/openapi.yaml）

- [x] T020 建立 Prisma schema（User/Organization/OrganizationMember/Plan/Subscription/Invoice/InvoiceLineItem/PaymentMethod/AdminOverride/AuditLog）（packages/db/prisma/schema.prisma）
- [x] T021 建立 Prisma migrations 與 generate 流程（packages/db/package.json, packages/db/prisma/migrations/）
- [x] T022 [P] 建立 DB access layer（PrismaClient export）與 DATABASE_URL 載入（packages/db/src/client.ts, packages/db/src/index.ts）
- [x] T023 建立 seed：預設 plans、platform admin、示範 org 與 subscription（packages/db/prisma/seed.ts）
- [x] T024 在 api 引入 DB module（Prisma）與 config（apps/api/src/modules/db/db.module.ts, apps/api/src/modules/db/prisma.service.ts）

- [x] T025 實作密碼雜湊（argon2）與 user repo（apps/api/src/modules/auth/password.ts, apps/api/src/modules/users/users.repo.ts）
- [x] T026 實作 session（cookie-based, httpOnly）與 session store（SQLite table + Prisma model） （apps/api/src/modules/auth/session.service.ts, packages/db/prisma/schema.prisma）
- [x] T027 實作 CSRF（double-submit cookie + `X-CSRF-Token` header）中介層（apps/api/src/middleware/csrf.middleware.ts）
- [x] T028 實作 RequestId/TraceId middleware（apps/api/src/middleware/request-id.middleware.ts）
- [x] T029 實作統一 Exception filter（對齊 ErrorResponse + errorCode）（apps/api/src/filters/http-exception.filter.ts）

- [x] T030 實作 org context 解析（`X-Organization-Id`）與 membership 驗證 guard（apps/api/src/guards/org.guard.ts）
- [x] T031 實作 RBAC（END_USER/ORG_ADMIN/PLATFORM_ADMIN）decorator + guard（apps/api/src/guards/rbac.guard.ts, packages/shared/src/roles.ts）
- [x] T032 實作 IDOR 防護策略：org-scoped 查詢必須用 (orgId, id) 的組合（apps/api/src/common/repos/org-scoped.repo.ts）

- [x] T033 建立 AuditLog service（寫入 who/when/what/why + payload）與 helper（apps/api/src/modules/audit/audit.service.ts）
- [x] T034 定義「狀態轉換」必寫 audit 的 enforcement point（subscription/invoice/override）規範（apps/api/src/modules/audit/audit.constants.ts）

- [x] T035 建立 SQLite busy / OCC retry helper（處理 Prisma P2034 / SQLITE_BUSY） （apps/api/src/common/db/retry.ts）
- [x] T036 建立樂觀鎖 update pattern（`version` CAS）共用 helper（apps/api/src/common/db/occ.ts）

- [x] T037 建立最小 health endpoint（GET /healthz）與基本 app bootstrap（apps/api/src/controllers/health.controller.ts）

- [x] T038 建立 web 的 API client（fetch + credentials include + CSRF header 注入） （apps/web/src/lib/api.ts）
- [x] T039 建立 web 的 TanStack Query provider + error boundary skeleton（apps/web/src/app/providers.tsx, apps/web/src/lib/query-client.ts）
- [x] T040 建立 web 的 auth state hook（me endpoint）與 org context state（apps/web/src/features/auth/useMe.ts, apps/web/src/features/org/useActiveOrg.ts）

**Checkpoint**: 能完成 Signup/Login/Logout/Me；state-changing request 會強制 CSRF；org header 缺失或非成員會 403/404；錯誤格式一致。

---

## Phase 3: User Story 1 — 組織訂閱生命週期與權限一致（Priority: P1）

**Goal**: Org Admin 可完成升級（立即生效+補差額帳單）/降級（下期生效）/取消；entitlements 輸出在所有頁面與 API 一致。

**Independent Test**:
- 以 1 個 org + 1 個 Org Admin：
  - 升級：立即生效、回傳 proration invoice(Open)、entitlements 立刻切換
  - 模擬付款 success/fail：invoice Paid/Failed；subscription Active↔PastDue（含 gracePeriodEnd）
  - 降級：建立 pending change；到期後自動切換
  - Expired 不可逆：任何事件無法恢復

### Tests（US1 core rules）

- [x] T041 [P] [US1] 建立 subscription 狀態機單元測試（apps/api/src/modules/billing/subscription.state.spec.ts）
- [x] T042 [P] [US1] 建立 invoice 狀態機單元測試（apps/api/src/modules/billing/invoice.state.spec.ts）
- [x] T043 [P] [US1] 建立 proration 計算單元測試（apps/api/src/modules/billing/proration.spec.ts）
- [x] T044 [P] [US1] 建立 entitlements 決策表單元測試（plan+status+override+usage）（apps/api/src/modules/entitlements/entitlements.spec.ts）

### Backend（US1 implementation）

- [x] T045 [US1] 實作 Plan 讀取（public pricing）與 plan repo（apps/api/src/modules/plans/plans.controller.ts, apps/api/src/modules/plans/plans.service.ts）
- [x] T046 [US1] 實作 Subscription repo（current subscription invariant + OCC） （apps/api/src/modules/billing/subscriptions.repo.ts）
- [x] T047 [US1] 實作 Invoice/LineItem repo（unique constraints + OCC） （apps/api/src/modules/billing/invoices.repo.ts）
- [x] T048 [US1] 實作 EntitlementsService：輸入 orgId → 輸出 features/limits/statusReason（apps/api/src/modules/entitlements/entitlements.service.ts）
- [x] T049 [US1] 實作 Usage rollup 讀取（先以 rollup=0 stub，但保留 meter 結構）（apps/api/src/modules/usage/usage.service.ts）

- [x] T050 [US1] 實作 GET /app/subscription（summary + entitlements） （apps/api/src/modules/app/app.controller.ts）
- [x] T051 [US1] 實作 upgrade：建立 proration invoice(Open) + subscription plan 即刻更新 + audit（apps/api/src/modules/billing/subscription.service.ts）
- [x] T052 [US1] 實作 downgrade：建立 pending change（下期 effectiveAt）+ audit（apps/api/src/modules/billing/subscription.service.ts）
- [x] T053 [US1] 實作 cancel：subscription → Canceled（不可自動回 Active）+ audit（apps/api/src/modules/billing/subscription.service.ts）

- [x] T054 [US1] 實作 GET /app/billing/invoices 與 GET /app/billing/invoices/{invoiceId}（apps/api/src/modules/billing/billing.controller.ts）
- [x] T055 [US1] 實作模擬付款：POST /app/billing/invoices/{invoiceId}/simulate-payment（寫入 webhook inbox event 並走同一流程）（apps/api/src/modules/billing/payment-sim.controller.ts）

- [x] T056 [US1] 建立 webhook inbox table + 去重（UNIQUE provider+eventId）（packages/db/prisma/schema.prisma, apps/api/src/modules/webhooks/webhook-inbox.repo.ts）
- [x] T057 [US1] 實作 /webhooks/payment/{provider}：驗簽 stub + inbox durable write（apps/api/src/modules/webhooks/webhooks.controller.ts）
- [x] T058 [US1] 實作 webhook worker：從 inbox 拉取未處理事件→更新 invoice/subscription→寫 audit（apps/api/src/modules/webhooks/webhook-worker.service.ts）

- [x] T059 [US1] 實作 PastDue grace period 與 Suspended transition（apps/api/src/modules/billing/subscription.state.ts）
- [x] T060 [US1] 實作 Expired 不可逆 guard（任何寫入需拒絕並回 409）（apps/api/src/modules/billing/subscription.guard.ts）

- [x] T061 [US1] 實作 GET /app/dashboard（subscription summary + usage overview + recent invoices）（apps/api/src/modules/app/dashboard.controller.ts）

- [x] T062 [US1] 新增 recurring invoice 產生 job（每期建立 invoice: Draft→Open）（apps/api/src/modules/jobs/recurring-invoice.job.ts）
- [x] T063 [US1] 新增 period rollover job：更新 subscription current_period_* + 套用 pending downgrade（apps/api/src/modules/jobs/period-rollover.job.ts）
- [x] T064 [US1] 新增 grace expiration job：PastDue 到期 → Suspended（apps/api/src/modules/jobs/grace-expiration.job.ts）
- [x] T065 [US1] 建立 job lock（避免多實例重複跑） （packages/db/prisma/schema.prisma, apps/api/src/modules/jobs/job-lock.service.ts）

### Frontend（US1 UI）

- [x] T066 [P] [US1] 建立 Pricing 頁（讀 /pricing/plans，顯示 monthly/yearly）（apps/web/app/pricing/page.tsx）
- [x] T067 [P] [US1] 建立 Dashboard 頁（讀 /app/dashboard）（apps/web/app/app/page.tsx）
- [x] T068 [US1] 建立 Subscription 管理頁（summary + entitlements + upgrade/downgrade/cancel CTA）（apps/web/app/app/subscription/page.tsx）
- [x] T069 [US1] 建立 Upgrade/Downgrade 確認 modal（React Hook Form + Zod）（apps/web/src/features/subscription/UpgradeDowngradeModal.tsx）
- [x] T070 [US1] 建立 Invoice 顯示區塊（proration invoice Open/Paid/Failed 狀態）（apps/web/src/features/billing/InvoiceCard.tsx）
- [x] T071 [US1] 建立「模擬付款」按鈕（success/fail）呼叫 simulate-payment（apps/web/src/features/billing/SimulatePaymentButtons.tsx）

**Checkpoint**: US1 的 acceptance scenarios（升級/付款成功/付款失敗→PastDue/降級 pending→生效/Expired 不可逆）可在 UI + API 一致驗收。

---

## Phase 4: User Story 2 — 一般使用者可查閱訂閱/用量/帳單且不可越權（Priority: P2）

**Goal**: End User 可查閱（Dashboard/Usage/Invoices）；非 Org Admin 不能做訂閱/付款方式/成員管理；多組織切換正確；IDOR 防護 100%。

**Independent Test**:
- 用同一帳號：在 orgA 是 END_USER、在 orgB 是 ORG_ADMIN
- 切換 org 後資料完全切換
- END_USER 嘗試管理 API → 403（或 404），且 UI 隱藏/禁用
- 嘗試用非所屬 org header 或猜測 invoiceId → 403/404

### Tests（US2 security / isolation）

- [x] T072 [P] [US2] 建立 RBAC guard 測試（END_USER 對管理端點回 403）（apps/api/src/guards/rbac.guard.spec.ts）
- [x] T073 [P] [US2] 建立 org guard 測試（非成員 org header 回 403/404）（apps/api/src/guards/org.guard.spec.ts）

### Backend（US2 implementation）

- [x] T074 [US2] 完成 /orgs 與 /orgs/active 的行為（列出 membership role + 設定 activeOrgId convenience）（apps/api/src/modules/org/org.controller.ts）
- [x] T075 [US2] 實作 usage rollup + meter policy 輸出（nearLimit/overLimit + resetAt）（apps/api/src/modules/usage/usage.service.ts）
- [x] T076 [US2] 實作 GET /app/usage（apps/api/src/modules/usage/usage.controller.ts）

- [x] T077 [US2] 實作 payment methods GET/POST（Org Admin only，token/reference only） （apps/api/src/modules/billing/payment-methods.controller.ts）
- [x] T078 [US2] 實作 members：GET/POST（invite）已存在的 contract 對應（apps/api/src/modules/org/members.controller.ts）
- [x] T079 [US2] 依補齊的 OpenAPI 實作 members PATCH role（apps/api/src/modules/org/members.controller.ts）
- [x] T080 [US2] 依補齊的 OpenAPI 實作 members DELETE remove（soft delete + audit）（apps/api/src/modules/org/members.controller.ts）

- [x] T081 [US2] 在所有 org-scoped invoice 查詢強制 (orgId, invoiceId) 校驗避免 IDOR（apps/api/src/modules/billing/invoices.repo.ts）

- [x] T082 [US2] 建立 usage 事件寫入策略（API_CALLS 每次 request +1；PROJECT_COUNT/USER_COUNT 由 DB 推導或 peak） （apps/api/src/middleware/usage-meter.middleware.ts, apps/api/src/modules/usage/usage.service.ts）
- [x] T083 [US2] 建立 internal/dev-only usage 注入端點（方便驗收 block/throttle/overage） （apps/api/src/modules/usage/usage-dev.controller.ts）

### Frontend（US2 UI）

- [x] T084 [P] [US2] 建立 Org switcher UI（讀 /orgs，寫 /orgs/active；儲存選擇） （apps/web/src/features/org/OrgSwitcher.tsx）
- [x] T085 [US2] 建立 Usage 頁（讀 /app/usage，顯示 meter 狀態與策略提示） （apps/web/app/app/usage/page.tsx）
- [x] T086 [US2] 建立 Invoices 頁（清單 + filter status） （apps/web/app/app/invoices/page.tsx）
- [x] T087 [US2] 建立 Invoice detail 頁（apps/web/app/app/invoices/[invoiceId]/page.tsx）


- [x] T088 [US2] 建立 Payment Methods 頁（Org Admin only；END_USER 顯示 Access Denied） （apps/web/app/app/billing/payment-methods/page.tsx）
- [x] T089 [US2] 建立 Members 頁（Org Admin only；invite/role change/remove） （apps/web/app/app/org/members/page.tsx）
- [x] T090 [US2] 建立 route-level 權限 gating（依 /auth/me 的 role + entitlements） （apps/web/src/features/auth/requireRole.tsx）

- [x] T091 [US2] 統一 loading/error/empty UI patterns（shared components） （apps/web/src/components/AsyncState.tsx）

**Checkpoint**: END_USER 能看 Dashboard/Usage/Invoices；不能看/不能操作管理頁；org 切換一致；IDOR 測試通過。

---

## Phase 5: User Story 3 — 平台管理員可資料驅動管理方案並強制停權且全程稽核（Priority: P3）

**Goal**: Platform Admin 可管理 plans（CRUD+啟停）、force override（Suspended/Expired/None）、查詢 audit logs；所有操作可追溯。

**Independent Test**:
- Platform Admin 建立新方案並啟用 → Pricing 與 Upgrade/Downgrade 選單反映
- 停用方案 → 新訂閱/變更目標必拒絕；既有訂閱仍可讀
- force Suspended/Expired → entitlements 立即受影響；Expired 不可逆
- audit query 可依 actor/org/action 篩選

### Tests（US3 core rules）

- [x] T092 [P] [US3] 建立 override precedence 與 Expired 不可逆單元測試（apps/api/src/modules/admin/override.spec.ts）
- [x] T093 [P] [US3] 建立 audit log 記錄測試（apps/api/src/modules/audit/audit.service.spec.ts）

### Backend（US3 implementation）

- [x] T094 [US3] 實作 /admin/plans GET/POST（create）與 validation（apps/api/src/modules/admin/admin-plans.controller.ts）
- [x] T095 [US3] 補齊 /admin/plans PUT（update）與 is_active 切換（packages/contracts/openapi.yaml, apps/api/src/modules/admin/admin-plans.controller.ts）
- [x] T096 [US3] 在 upgrade/downgrade 目標 plan 檢查 is_active=false 必拒絕（apps/api/src/modules/billing/subscription.service.ts）

- [x] T097 [US3] 實作 /admin/overrides（force status + reason + revoke）並寫 audit（apps/api/src/modules/admin/admin-overrides.controller.ts）
- [x] T098 [US3] 實作 /admin/audit（filters）並加上 pagination（packages/contracts/openapi.yaml, apps/api/src/modules/admin/admin-audit.controller.ts）

- [x] T099 [US3] 實作 /admin/dashboard metrics（org count、active/pastDue/suspended/expired、open invoices、revenue totals） （apps/api/src/modules/admin/admin-dashboard.controller.ts）

- [x] T100 [US3] 確保所有 admin actions 都會寫 AuditLog（plans/overrides/audit query access） （apps/api/src/modules/audit/audit.service.ts）

### Frontend（US3 UI）

- [x] T101 [US3] 建立 Admin layout 與 route guard（僅 PLATFORM_ADMIN 可進入） （apps/web/app/admin/layout.tsx, apps/web/src/features/admin/requirePlatformAdmin.tsx）
- [x] T102 [US3] 建立 Admin Dashboard 頁（讀 /admin/dashboard） （apps/web/app/admin/page.tsx）
- [x] T103 [US3] 建立 Admin Plans 頁（list + create/edit + activate/deactivate） （apps/web/app/admin/plans/page.tsx）
- [x] T104 [US3] 建立 Admin Overrides 頁（force org status） （apps/web/app/admin/overrides/page.tsx）
- [x] T105 [US3] 建立 Admin Audit 頁（filters + table） （apps/web/app/admin/audit/page.tsx）

**Checkpoint**: US3 acceptance scenarios 全部可在 UI 驗收，且 Audit Log 可追溯 who/when/what/why。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E、效能/索引、觀測性、文件與硬化。

- [x] T106 建立 Playwright E2E skeleton（apps/web/playwright.config.ts, tests/e2e/）
- [x] T107 [P] 新增 E2E：升級→proration invoice→模擬付款成功（tests/e2e/upgrade-pay-success.spec.ts）
- [x] T108 [P] 新增 E2E：付款失敗→PastDue→grace 到期→Suspended（tests/e2e/pastdue-to-suspended.spec.ts）
- [x] T109 [P] 新增 E2E：Org switch + END_USER 越權阻擋（tests/e2e/rbac-idor.spec.ts）
- [x] T110 [P] 新增 E2E：Admin override Expired 不可逆（tests/e2e/admin-expired-irreversible.spec.ts）

- [x] T111 新增必要 indexes 與 unique constraints（依 data-model.md）（packages/db/prisma/schema.prisma）
- [x] T112 增加 entitlements 短 TTL cache（避免熱路徑壓 DB；仍以 DB 為 SSOT）（apps/api/src/modules/entitlements/entitlements.cache.ts）
- [x] T113 強化 structured logging（包含 requestId、orgId、actorId、action、errorCode）（apps/api/src/common/logging/logger.ts）
- [x] T114 強化安全：cookie flags（__Host-, Secure, SameSite），Origin/Fetch-Metadata checks（apps/api/src/modules/auth/cookie.config.ts, apps/api/src/middleware/origin.middleware.ts）

- [x] T115 更新 quickstart 以反映實際 scripts/路徑（specs/001-subscription-billing-platform/quickstart.md）
- [x] T116 進行 rollback rehearsal：提供「暫停出帳 + force suspended」runbook（docs/runbooks/billing-rollback.md）

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1） → Foundational（Phase 2） → User Stories（Phase 3-5） → Polish（Phase 6）

### User Story Dependencies（Completion Order Graph）

- 建議路徑（最少阻塞）：
  - **US1（訂閱/計費/entitlements）** → **US2（讀取/隔離/RBAC UI）**
  - **US3（Admin）** 可在 Foundational 後與 US1 並行，但為了驗收「plan 資料驅動」建議在 US1 基本完成後整合

```text
Foundational
  ├── US1 (P1) ──▶ US2 (P2)
  └── US3 (P3) (可並行，與 US1/US2 共享 Plan/Entitlements/Audit)
```

---

## Parallel Execution Examples

### US1（並行例）

可同時進行（不同檔案/模組）：
- T041（subscription state tests）+ T042（invoice state tests）+ T043（proration tests）+ T044（entitlements tests）
- T056（webhook inbox tables/repo）與 T062/T063/T064（jobs）可並行，但依賴 T020（Prisma schema）
- T066（Pricing page）與 T067（Dashboard page）可並行

### US2（並行例）

- T084（Org switcher UI）與 T085/T086/T087（Usage/Invoices pages）可並行
- T072/T073（guard tests）可並行

### US3（並行例）

- T101（Admin layout/guard）與 T103/T104/T105（Admin pages）可並行
- T092/T093（tests）可並行

---

## Implementation Strategy（MVP → Complete System）

- 先完成 Setup + Foundational，確保 auth/rbac/org isolation/錯誤格式/DB migration 已穩。
- 以 US1 建立「訂閱/計費/entitlements」SSOT 核心，並讓 UI 能完整走通升級/降級/取消與付款結果。
- 接著 US2 把讀取/多組織/越權阻擋與完整 App pages 做完。
- 最後 US3 做 admin 治理能力（plans/overrides/audit/dashboard）並補齊稽核。
- Polish 用 E2E 把最重要的風險路徑鎖住，並更新 quickstart/runbook。
