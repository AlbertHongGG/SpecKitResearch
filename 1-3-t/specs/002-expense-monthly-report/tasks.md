---

description: "Task list for 個人記帳＋月報表網站（Personal Expense Tracking & Monthly Reports）"
---

# Tasks: 個人記帳＋月報表網站（Personal Expense Tracking & Monthly Reports）

**Input**: Design documents from `specs/002-expense-monthly-report/`

**Prerequisites**:
- `plan.md` (required): `specs/002-expense-monthly-report/plan.md`
- `spec.md` (required): `specs/002-expense-monthly-report/spec.md`
- `research.md`: `specs/002-expense-monthly-report/research.md`
- `data-model.md`: `specs/002-expense-monthly-report/data-model.md`
- `contracts/`: `specs/002-expense-monthly-report/contracts/openapi.yaml`
- `quickstart.md`: `specs/002-expense-monthly-report/quickstart.md`

**Scope note（依使用者要求）**: 本 tasks 清單目標是「完成的專案結果」，包含後端邏輯、前端 UI 介面、資料庫、測試與跨切面（安全/可觀測/一致錯誤），並滿足 spec 所有需求（US1~US5 + Polish）。

**Tests（憲章要求，必做）**: 核心 domain/business rules MUST 有測試涵蓋 happy path、edge cases、failures；E2E 測試需覆蓋狀態機 verify（導向/可見性/空狀態/錯誤狀態）。

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: 可並行（不同檔案/不同模組、且不依賴未完成任務）
- **[Story]**: User story label（[US1]..[US5]），僅 user story phases 使用
- 每個 task 描述 MUST 含精確檔案路徑（可多個檔案）

## Path Conventions

本 feature 採 plan.md 指定的 web app 結構：
- Backend: `backend/src/`, tests in `backend/tests/`
- Frontend: `frontend/src/`, E2E in `frontend/tests/e2e/`
- Shared: `packages/shared/src/`

---

## Phase 1: Setup（Project Initialization）

**Purpose**: 建立 monorepo 與基礎專案骨架（尚未進入任何 user story）

- [X] T001 Create pnpm workspace config in pnpm-workspace.yaml
- [X] T002 Create root scripts/workspace metadata in package.json
- [X] T003 [P] Add editor and git hygiene configs in .editorconfig and .gitignore
- [X] T004 [P] Add dockerized Postgres for local dev in docker-compose.yml
- [X] T005 [P] Add environment variable templates in backend/.env.example and frontend/.env.example
- [X] T006 Initialize shared package skeleton in packages/shared/package.json and packages/shared/src/index.ts
- [X] T007 Initialize backend package skeleton in backend/package.json and backend/tsconfig.json
- [X] T008 Initialize frontend package skeleton (Vite + React) in frontend/package.json and frontend/vite.config.ts
- [X] T009 [P] Setup TypeScript project references/shared tsconfig in tsconfig.base.json and packages/*/tsconfig.json
- [X] T010 [P] Setup lint/format tooling in .prettierrc and eslint.config.js
- [X] T011 [P] Setup backend test runner config in backend/vitest.config.ts and backend/tests/README.md
- [X] T012 [P] Setup frontend unit test runner config in frontend/vitest.config.ts and frontend/src/test/setupTests.ts
- [X] T013 [P] Setup Playwright in frontend/playwright.config.ts and frontend/tests/e2e/smoke.spec.ts
- [X] T014 [P] Add shared OpenAPI type generation script in packages/shared/package.json (scripts) and packages/shared/src/api-types.ts
- [X] T015 Add quickstart commands/scripts alignment in specs/002-expense-monthly-report/quickstart.md

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 user stories 都會用到的基礎設施（完成後 US1~US5 才能開始）

- [X] T016 Setup Prisma schema and migrations baseline in backend/prisma/schema.prisma
- [X] T017 [P] Add Prisma client wrapper and DB lifecycle helpers in backend/src/infra/db/prisma.ts
- [X] T018 [P] Add DB migration/seeding scripts in backend/package.json (scripts) and backend/prisma/seed.ts

- [X] T019 [P] Implement standardized error types in backend/src/api/http/errors.ts
- [X] T020 [P] Implement request id propagation middleware in backend/src/api/http/requestId.ts
- [X] T021 [P] Implement Fastify global error handler returning ErrorResponse in backend/src/api/http/errorHandler.ts
- [X] T022 [P] Implement structured logger setup in backend/src/infra/logging/logger.ts

- [X] T023 [P] Implement CORS config (APP_ORIGIN allowlist + credentials) in backend/src/api/plugins/cors.ts
- [X] T024 [P] Implement cookie parsing + secure cookie defaults in backend/src/api/plugins/cookies.ts
- [X] T025 [P] Implement CSRF protection (double-submit + Origin/Referer checks) in backend/src/api/plugins/csrf.ts

- [X] T026 [P] Implement password hashing/verification (argon2id) in backend/src/infra/auth/password.ts
- [X] T027 [P] Implement session store backed by DB (Session table) in backend/src/infra/auth/sessionStore.ts
- [X] T028 [P] Implement auth context loader (sid cookie → user) in backend/src/api/middleware/authContext.ts
- [X] T029 [P] Implement requireAuth middleware in backend/src/api/middleware/requireAuth.ts

- [X] T030 Create Fastify app bootstrap and plugin wiring in backend/src/app.ts and backend/src/main.ts
- [X] T031 [P] Add health endpoint for local dev in backend/src/api/routes/health.ts

- [X] T032 [P] Implement shared fetch wrapper with credentials + requestId handling in frontend/src/services/http.ts
- [X] T033 [P] Implement shared ErrorResponse parsing and UX mapping in frontend/src/services/apiErrors.ts
- [X] T034 [P] Setup TanStack Query provider in frontend/src/providers/QueryClientProvider.tsx and frontend/src/main.tsx
- [X] T035 [P] Implement route guard components in frontend/src/routes/ProtectedRoute.tsx and frontend/src/routes/GuestOnlyRoute.tsx
- [X] T036 [P] Implement page-level async states (Loading/Empty/Error/Ready) in frontend/src/components/AsyncState.tsx

- [X] T037 [P] Setup TailwindCSS + base styles in frontend/tailwind.config.ts and frontend/src/styles.css
- [X] T038 [P] Implement responsive header shell (Logo + nav + hamburger) in frontend/src/components/AppHeader.tsx and frontend/src/components/MobileNav.tsx
- [X] T039 [P] Implement app layout shell with header and outlet in frontend/src/components/AppShell.tsx
- [X] T040 Configure frontend routes skeleton in frontend/src/routes/router.tsx

- [X] T041 [P] Create backend integration test app helper in backend/tests/helpers/testApp.ts
- [X] T042 [P] Add backend test DB strategy (separate schema or transaction rollback) in backend/tests/helpers/testDb.ts
- [X] T043 [P] Add Playwright auth helpers (cookie/session bootstrap) in frontend/tests/e2e/helpers/auth.ts

**Checkpoint**: Foundation ready — user story implementation can begin

---

## Phase 3: User Story 1 - 註冊/登入並被正確導向（Priority: P1）

**Goal**: 完成 Guest/User 狀態機：註冊、登入、登出、session 檢查、路由導向、導覽列可見性與 CTA 去重。

**Independent Test**: 只靠「註冊/登入/登出/直接進入受保護頁」即可驗證 redirect 與 nav 可見性符合 spec。

### Tests（US1）

- [X] T044 [P] [US1] Add backend auth integration tests for /session in backend/tests/integration/session.test.ts
- [X] T045 [P] [US1] Add backend auth integration tests for /auth/register in backend/tests/integration/authRegister.test.ts
- [X] T046 [P] [US1] Add backend auth integration tests for /auth/login and /auth/logout in backend/tests/integration/authLoginLogout.test.ts
- [X] T047 [P] [US1] Add Playwright tests for guest redirect to /login for protected routes in frontend/tests/e2e/auth-redirect.spec.ts
- [X] T048 [P] [US1] Add Playwright tests for nav visibility (Guest vs User) in frontend/tests/e2e/nav-visibility.spec.ts

### Implementation（US1）

- [X] T049 [P] [US1] Implement User model + repo in backend/src/domain/users/userRepo.ts and backend/src/infra/db/userRepoPrisma.ts
- [X] T050 [P] [US1] Implement Session model + repo in backend/src/domain/sessions/sessionRepo.ts and backend/src/infra/db/sessionRepoPrisma.ts
- [X] T051 [US1] Implement POST /auth/register route in backend/src/api/routes/authRegister.ts
- [X] T052 [US1] Implement POST /auth/login route in backend/src/api/routes/authLogin.ts
- [X] T053 [US1] Implement POST /auth/logout route in backend/src/api/routes/authLogout.ts
- [X] T054 [US1] Implement GET /session route in backend/src/api/routes/sessionGet.ts
- [X] T055 [US1] Wire auth routes into app in backend/src/api/routes/index.ts and backend/src/app.ts


- [X] T056 [P] [US1] Implement session client hooks (GET /session + cache) in frontend/src/services/session.ts and frontend/src/auth/useSession.ts
- [X] T057 [US1] Implement login page UI + validation in frontend/src/pages/LoginPage.tsx
- [X] T058 [US1] Implement register page UI + validation in frontend/src/pages/RegisterPage.tsx
- [X] T059 [US1] Implement logout action + UX feedback in frontend/src/components/LogoutButton.tsx
- [X] T060 [US1] Enforce route access control redirects in frontend/src/routes/router.tsx
- [X] T061 [US1] Enforce CTA de-dup rules in frontend/src/components/AppHeader.tsx and frontend/src/pages/LoginPage.tsx

- [X] T062 [US1] Handle session expiry during operations (401 → clear cache → redirect) in frontend/src/services/http.ts
- [X] T063 [US1] Add consistent auth error messaging (user vs dev) in frontend/src/services/apiErrors.ts

**Checkpoint**: US1 flows pass E2E; protected routes are safe and consistent

---

## Phase 4: User Story 2 - 新增一筆帳務並在日期分組列表中看到（Priority: P1）

**Goal**: 使用者可新增 income/expense 交易，並在依日期分組列表看到；同時每日總計正確更新。

**Independent Test**: 以一筆支出驗證：新增 → 進入正確日期分組 → 日總計更新 → 空狀態轉列表。

### Tests（US2）

- [X] T064 [P] [US2] Add backend integration tests for GET /categories filtering needs in backend/tests/integration/categoriesList.test.ts
- [X] T065 [P] [US2] Add backend integration tests for POST /transactions validation rules in backend/tests/integration/transactionsCreate.test.ts
- [X] T066 [P] [US2] Add backend integration tests for GET /transactions pagination in backend/tests/integration/transactionsList.test.ts
- [X] T067 [P] [US2] Add Playwright tests for creating a transaction and seeing grouped list + totals in frontend/tests/e2e/transactions-create.spec.ts

### Implementation（US2）

- [X] T068 [P] [US2] Implement Category domain rules (type compatibility, isActive) in backend/src/domain/categories/categoryRules.ts
- [X] T069 [P] [US2] Implement Transaction domain rules (amount/date/note) in backend/src/domain/transactions/transactionRules.ts
- [X] T070 [P] [US2] Implement Category repo in backend/src/domain/categories/categoryRepo.ts and backend/src/infra/db/categoryRepoPrisma.ts
- [X] T071 [P] [US2] Implement Transaction repo in backend/src/domain/transactions/transactionRepo.ts and backend/src/infra/db/transactionRepoPrisma.ts

- [X] T072 [US2] Implement GET /categories (includeInactive query) route in backend/src/api/routes/categoriesList.ts
- [X] T073 [US2] Implement POST /transactions route with validations in backend/src/api/routes/transactionsCreate.ts
- [X] T074 [US2] Implement GET /transactions route (page/pageSize/fromDate/toDate) in backend/src/api/routes/transactionsList.ts
- [X] T075 [US2] Wire category/transaction routes into app in backend/src/api/routes/index.ts

- [X] T076 [P] [US2] Implement transactions API client in frontend/src/services/transactions.ts
- [X] T077 [P] [US2] Implement categories API client (includeInactive) in frontend/src/services/categories.ts
- [X] T078 [US2] Implement transactions page shell + loading/empty/error states in frontend/src/pages/TransactionsPage.tsx
- [X] T079 [US2] Implement grouped-by-date list UI + daily totals UI in frontend/src/components/transactions/TransactionGroupList.tsx
- [X] T080 [US2] Implement “新增帳務” modal + form validation in frontend/src/components/transactions/TransactionCreateDialog.tsx
- [X] T081 [US2] Implement category select filtering by isActive + type compatibility in frontend/src/components/transactions/CategorySelect.tsx
- [X] T082 [US2] Ensure create transaction invalidates list queries and updates UI in frontend/src/pages/TransactionsPage.tsx

**Checkpoint**: US2 新增流程可用；列表與每日總計一致

---

## Phase 5: User Story 3 - 編輯/刪除帳務且所有統計同步（Priority: P2）

**Goal**: 可編輯/刪除交易，包含改日期造成分組搬移；刪除含二次確認；刪除最後一筆回到空狀態。

**Independent Test**: 用一筆交易驗證「改日期搬移」與「刪除最後一筆→空狀態」。

### Tests（US3）

- [X] T083 [P] [US3] Add backend integration tests for PUT /transactions/{id} in backend/tests/integration/transactionsUpdate.test.ts
- [X] T084 [P] [US3] Add backend integration tests for DELETE /transactions/{id} authz + notfound in backend/tests/integration/transactionsDelete.test.ts
- [X] T085 [P] [US3] Add Playwright tests for editing transaction date moves groups in frontend/tests/e2e/transactions-edit-move-date.spec.ts
- [X] T086 [P] [US3] Add Playwright tests for delete confirm + cancel does nothing in frontend/tests/e2e/transactions-delete-confirm.spec.ts

### Implementation（US3）

- [X] T087 [US3] Implement PUT /transactions/{transactionId} route in backend/src/api/routes/transactionsUpdate.ts
- [X] T088 [US3] Implement DELETE /transactions/{transactionId} route in backend/src/api/routes/transactionsDelete.ts
- [X] T089 [US3] Ensure server-side authz enforcement (user_id scope) in backend/src/domain/transactions/transactionRepo.ts
- [X] T090 [US3] Wire update/delete routes into app in backend/src/api/routes/index.ts

- [X] T091 [P] [US3] Implement transaction update/delete API client in frontend/src/services/transactions.ts
- [X] T092 [US3] Implement “編輯帳務” dialog + form in frontend/src/components/transactions/TransactionEditDialog.tsx
- [X] T093 [US3] Implement delete confirmation dialog in frontend/src/components/transactions/TransactionDeleteConfirmDialog.tsx
- [X] T094 [US3] Ensure edit/delete invalidates list queries and preserves UX state in frontend/src/pages/TransactionsPage.tsx
- [X] T095 [US3] Ensure empty state shown after deleting last item in frontend/src/pages/TransactionsPage.tsx

**Checkpoint**: US3 編輯/刪除一致更新；確認視窗符合需求

---

## Phase 6: User Story 4 - 管理類別（新增/編輯/停用/啟用）且不破壞歷史資料（Priority: P2）

**Goal**: 類別管理頁可新增自訂類別、編輯名稱/類型、停用/啟用；停用不可用於新增/編輯交易但歷史保留顯示。

**Independent Test**: 自訂類別「新增→停用→交易表單不可選→再啟用」；歷史交易仍顯示該類別名稱。

### Tests（US4）

- [X] T096 [P] [US4] Add backend integration tests for POST /categories uniqueness rules in backend/tests/integration/categoriesCreate.test.ts
- [X] T097 [P] [US4] Add backend integration tests for PUT /categories/{id} in backend/tests/integration/categoriesUpdate.test.ts
- [X] T098 [P] [US4] Add backend integration tests for PATCH /categories/{id}/active in backend/tests/integration/categoriesToggleActive.test.ts
- [X] T099 [P] [US4] Add Playwright tests for categories CRUD UI in frontend/tests/e2e/categories-manage.spec.ts
- [X] T100 [P] [US4] Add Playwright tests verifying disabled category not selectable in transaction form in frontend/tests/e2e/categories-affects-transaction-form.spec.ts

### Implementation（US4）

- [X] T101 [P] [US4] Implement category unique-name enforcement (DB + domain mapping) in backend/src/domain/categories/categoryRepo.ts
- [X] T102 [US4] Implement POST /categories route in backend/src/api/routes/categoriesCreate.ts
- [X] T103 [US4] Implement PUT /categories/{categoryId} route in backend/src/api/routes/categoriesUpdate.ts
- [X] T104 [US4] Implement PATCH /categories/{categoryId}/active route in backend/src/api/routes/categoriesToggleActive.ts
- [X] T105 [US4] Ensure categories cannot be deleted (no route + repo safeguard) in backend/src/domain/categories/categoryRepo.ts
- [X] T106 [US4] Wire category routes into app in backend/src/api/routes/index.ts

- [X] T107 [US4] Implement categories management page shell in frontend/src/pages/CategoriesPage.tsx
- [X] T108 [US4] Implement category create/edit dialog in frontend/src/components/categories/CategoryUpsertDialog.tsx
- [X] T109 [US4] Implement active toggle UI + optimistic update handling in frontend/src/components/categories/CategoryActiveToggle.tsx
- [X] T110 [US4] Ensure transactions forms consume only active + type-compatible categories in frontend/src/components/transactions/CategorySelect.tsx
- [X] T111 [US4] Ensure historical transactions still render categoryName even if inactive in frontend/src/components/transactions/TransactionRow.tsx

**Checkpoint**: US4 類別管理完成；不破壞歷史資料一致性

---

## Phase 7: User Story 5 - 查看月報表、切換年月、可選匯出 CSV（Priority: P3）

**Goal**: 月報表頁提供 totals、支出類別圓餅、每日收支長條；支援年月切換；當月有資料可匯出 CSV。

**Independent Test**: 以一個月份資料驗證：統計卡正確、圓餅僅支出、長條 X 軸只顯示有資料日期、CSV 與畫面一致。

### Tests（US5）

- [X] T112 [P] [US5] Add backend integration tests for GET /reports/monthly aggregation correctness in backend/tests/integration/reportsMonthly.test.ts
- [X] T113 [P] [US5] Add backend integration tests for GET /reports/monthly/csv (filename + BOM + content) in backend/tests/integration/reportsMonthlyCsv.test.ts
- [X] T114 [P] [US5] Add Playwright tests for reports page totals + charts + empty state in frontend/tests/e2e/reports-monthly.spec.ts
- [X] T115 [P] [US5] Add Playwright tests for CSV export button gating in frontend/tests/e2e/reports-export-csv.spec.ts

### Implementation（US5）

- [X] T116 [P] [US5] Implement report aggregation queries (totals/byCategory/byDay) in backend/src/domain/reports/monthlyReportService.ts
- [X] T117 [US5] Implement GET /reports/monthly route in backend/src/api/routes/reportsMonthlyGet.ts
- [X] T118 [P] [US5] Implement CSV generator (streaming preferred, BOM, escaping) in backend/src/domain/reports/monthlyCsvExport.ts
- [X] T119 [US5] Implement GET /reports/monthly/csv route in backend/src/api/routes/reportsMonthlyCsv.ts
- [X] T120 [US5] Wire report routes into app in backend/src/api/routes/index.ts

- [X] T121 [P] [US5] Implement reports API client in frontend/src/services/reports.ts
- [X] T122 [US5] Implement reports page shell + year/month selectors in frontend/src/pages/ReportsPage.tsx
- [X] T123 [US5] Implement summary cards UI in frontend/src/components/reports/MonthlySummaryCards.tsx
- [X] T124 [US5] Implement expense pie chart + accessible data table fallback in frontend/src/components/reports/ExpenseByCategoryPieChart.tsx
- [X] T125 [US5] Implement daily income/expense bar chart (X-axis only dates with data) + fallback table in frontend/src/components/reports/DailyIncomeExpenseBarChart.tsx
- [X] T126 [US5] Implement CSV export UX (download + disabled on empty month) in frontend/src/components/reports/ExportCsvButton.tsx

**Checkpoint**: US5 報表/匯出與資料一致性完成

---

## Phase 8: Polish & Cross-Cutting Concerns（Complete System Quality）

**Purpose**: 跨 user stories 的一致性、可用性、安全性、可觀測性、效能與文件收斂

- [X] T127 [P] Add backend error code taxonomy + mapping table in backend/src/api/http/errorCodes.ts
- [X] T128 Ensure all API routes return consistent ErrorResponse and include requestId in backend/src/api/http/errorHandler.ts
- [X] T129 [P] Add rate limiting for auth endpoints in backend/src/api/plugins/rateLimit.ts
- [X] T130 [P] Add security headers (CSP baseline, frame/ct) in backend/src/api/plugins/securityHeaders.ts

- [X] T131 [P] Add frontend toast notifications for success/error actions in frontend/src/components/ToastProvider.tsx
- [X] T132 Ensure all pages implement Loading/Ready/Empty/Error + retry patterns in frontend/src/components/AsyncState.tsx
- [X] T133 Ensure mobile nav usability + keyboard navigation in frontend/src/components/MobileNav.tsx

- [X] T134 [P] Add accessibility pass for charts (ARIA labels + tabular fallback visible/sr-only) in frontend/src/components/reports/*
- [X] T135 [P] Add a11y-friendly form components (labels, errors, focus) in frontend/src/components/forms/*

- [X] T136 [P] Add data consistency invariants tests (list vs report vs csv) in backend/tests/integration/dataConsistency.test.ts
- [X] T137 [P] Add E2E “happy path full flow” test (register → add tx → report → export) in frontend/tests/e2e/full-flow.spec.ts

- [X] T138 [P] Add observability notes + runbook snippets in docs/observability.md
- [X] T139 [P] Validate and update quickstart for real commands in specs/002-expense-monthly-report/quickstart.md
- [X] T140 [P] Add production build scripts and verify they run in package.json and frontend/package.json and backend/package.json

---

## Phase 9: Database Migration - SQLite（Single-File, Local）

**Purpose**: 依使用者最新要求，將本專案 DB 從 PostgreSQL 完整改為 SQLite（本機單檔），並維持所有既有功能與測試全綠。

- [X] T141 Switch Prisma datasource to sqlite and remove Postgres-only schema types in backend/prisma/schema.prisma
- [X] T142 Update backend env template for SQLite DATABASE_URL in backend/.env.example
- [X] T143 Update test env defaults and ensure migrations are applied for SQLite tests in backend/tests/setupEnv.ts and backend/tests/helpers/integrationContext.ts
- [X] T144 Ignore SQLite db artifacts in .gitignore
- [X] T145 Remove Postgres docker-compose and related root scripts in docker-compose.yml and package.json
- [X] T146 Update quickstart to reflect SQLite workflow (no Docker) in specs/002-expense-monthly-report/quickstart.md
- [X] T147 Regenerate Prisma migrations for SQLite and verify Prisma client generation in backend/prisma/migrations/
- [X] T148 Run backend integration tests and ensure they pass with SQLite (pnpm -C backend test)
- [X] T149 Run frontend unit tests and ensure they pass (pnpm -C frontend test)
- [X] T150 Run Playwright E2E suite and ensure it passes (pnpm -C frontend test:e2e)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; BLOCKS all user stories
- **User Stories (Phase 3~7)**: depend on Foundational
- **Polish (Phase 8)**: depends on desired user stories being complete (target: US1~US5)

### User Story Dependencies（completion order / dependency graph）

- **US1** → enables authenticated app shell; blocks everything else
- **US2** depends on US1 (needs authenticated user + seeded categories) and Foundation
- **US3** depends on US2 (needs existing transactions)
- **US4** depends on US1 (auth) and Foundation; can run in parallel with US3 after US2 baseline exists
- **US5** depends on US2 (needs transactions data) and Foundation; can run after US2 even if US3/US4 still in progress

---

## Parallel Execution Examples（per User Story）

### US1 parallel example

- Implement backend routes in parallel:
  - Task: T051 in backend/src/api/routes/authRegister.ts
  - Task: T052 in backend/src/api/routes/authLogin.ts
  - Task: T054 in backend/src/api/routes/sessionGet.ts
- Implement frontend pages in parallel:
  - Task: T057 in frontend/src/pages/LoginPage.tsx
  - Task: T058 in frontend/src/pages/RegisterPage.tsx

### US2 parallel example

- Backend domain/repo tasks can run in parallel:
  - Task: T068 in backend/src/domain/categories/categoryRules.ts
  - Task: T069 in backend/src/domain/transactions/transactionRules.ts
  - Task: T070 in backend/src/infra/db/categoryRepoPrisma.ts
  - Task: T071 in backend/src/infra/db/transactionRepoPrisma.ts
- Frontend UI tasks can run in parallel:
  - Task: T079 in frontend/src/components/transactions/TransactionGroupList.tsx
  - Task: T080 in frontend/src/components/transactions/TransactionCreateDialog.tsx

### US3 parallel example

- Backend routes can run in parallel:
  - Task: T087 in backend/src/api/routes/transactionsUpdate.ts
  - Task: T088 in backend/src/api/routes/transactionsDelete.ts
- Frontend dialogs can run in parallel:
  - Task: T092 in frontend/src/components/transactions/TransactionEditDialog.tsx
  - Task: T093 in frontend/src/components/transactions/TransactionDeleteConfirmDialog.tsx

### US4 parallel example

- Backend routes can run in parallel:
  - Task: T102 in backend/src/api/routes/categoriesCreate.ts
  - Task: T103 in backend/src/api/routes/categoriesUpdate.ts
  - Task: T104 in backend/src/api/routes/categoriesToggleActive.ts
- Frontend page/dialog can run in parallel:
  - Task: T107 in frontend/src/pages/CategoriesPage.tsx
  - Task: T108 in frontend/src/components/categories/CategoryUpsertDialog.tsx

### US5 parallel example

- Backend aggregation and CSV can run in parallel:
  - Task: T116 in backend/src/domain/reports/monthlyReportService.ts
  - Task: T118 in backend/src/domain/reports/monthlyCsvExport.ts
- Frontend charts can run in parallel:
  - Task: T124 in frontend/src/components/reports/ExpenseByCategoryPieChart.tsx
  - Task: T125 in frontend/src/components/reports/DailyIncomeExpenseBarChart.tsx

---

## Implementation Strategy

### Incremental Delivery（still reaches full completion）

1. Phase 1 + Phase 2 完成（基礎設施可跑、可測、可觀測）
2. US1 完成（登入/導向/導覽列/安全）
3. US2 完成（新增交易 + 分組列表 + 日總計）
4. US3、US4、US5 依優先與人力並行推進
5. Phase 8 收斂跨切面（安全、可用性、a11y、資料一致性、文件）

### Full System Acceptance（end state）

- US1~US5 全部完成且對照 spec 驗收情境可通過
- E2E 覆蓋：Auth redirects/nav visibility、交易 CRUD、類別管理、報表與 CSV
- Backend integration tests 覆蓋：核心 domain rules 與錯誤語意（ErrorResponse + requestId）
