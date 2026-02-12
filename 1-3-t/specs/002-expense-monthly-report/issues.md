# Issues Plan: 個人記帳＋月報表網站（Personal Expense Tracking & Monthly Reports）

> 目的：把 [tasks.md](specs/002-expense-monthly-report/tasks.md) 轉成「可直接開 issue」的分組（含依賴順序）。

## Important

- 本 repo 目前未設定 `remote.origin.url`（非 GitHub remote），因此**無法自動建立 GitHub issues**。
- 你可以：
  1) 先設定 GitHub remote，再用 `/speckit.taskstoissues`（若環境支援 GitHub MCP issue_write）；或
  2) 直接照本檔案的 Issue 分組手動建立 issues（每個 Issue body 內已含完整 checklist）。

---

## Dependency Graph（Issue completion order）

- I01 → I02 → I03 → I04 →（I05 / I06 / I07 可並行）→ I08

---

## Issue Index

- I01 Setup（T001–T015）
- I02 Foundational（T016–T043）
- I03 US1 Auth + Redirect + Nav（T044–T063）
- I04 US2 Create Transaction + Grouped List（T064–T082）
- I05 US3 Edit/Delete Transaction（T083–T095）
- I06 US4 Categories Management（T096–T111）
- I07 US5 Monthly Reports + CSV（T112–T126）
- I08 Polish & Cross-Cutting（T127–T140）

---

## I01 — Setup（Project Initialization）

**Depends on**: none

**Goal**: 建立 monorepo 與基礎專案骨架（尚未進入任何 user story）

**Tasks**

- [ ] T001 Create pnpm workspace config in pnpm-workspace.yaml
- [ ] T002 Create root scripts/workspace metadata in package.json
- [ ] T003 [P] Add editor and git hygiene configs in .editorconfig and .gitignore
- [ ] T004 [P] Add dockerized Postgres for local dev in docker-compose.yml
- [ ] T005 [P] Add environment variable templates in backend/.env.example and frontend/.env.example
- [ ] T006 Initialize shared package skeleton in packages/shared/package.json and packages/shared/src/index.ts
- [ ] T007 Initialize backend package skeleton in backend/package.json and backend/tsconfig.json
- [ ] T008 Initialize frontend package skeleton (Vite + React) in frontend/package.json and frontend/vite.config.ts
- [ ] T009 [P] Setup TypeScript project references/shared tsconfig in tsconfig.base.json and packages/*/tsconfig.json
- [ ] T010 [P] Setup lint/format tooling in .prettierrc and eslint.config.js
- [ ] T011 [P] Setup backend test runner config in backend/vitest.config.ts and backend/tests/README.md
- [ ] T012 [P] Setup frontend unit test runner config in frontend/vitest.config.ts and frontend/src/test/setupTests.ts
- [ ] T013 [P] Setup Playwright in frontend/playwright.config.ts and frontend/tests/e2e/smoke.spec.ts
- [ ] T014 [P] Add shared OpenAPI type generation script in packages/shared/package.json (scripts) and packages/shared/src/api-types.ts
- [ ] T015 Add quickstart commands/scripts alignment in specs/002-expense-monthly-report/quickstart.md

---

## I02 — Foundational（Blocking Prerequisites）

**Depends on**: I01

**Goal**: 所有 user stories 都會用到的基礎設施（完成後 US1~US5 才能開始）

**Tasks**

- [ ] T016 Setup Prisma schema and migrations baseline in backend/prisma/schema.prisma
- [ ] T017 [P] Add Prisma client wrapper and DB lifecycle helpers in backend/src/infra/db/prisma.ts
- [ ] T018 [P] Add DB migration/seeding scripts in backend/package.json (scripts) and backend/prisma/seed.ts

- [ ] T019 [P] Implement standardized error types in backend/src/api/http/errors.ts
- [ ] T020 [P] Implement request id propagation middleware in backend/src/api/http/requestId.ts
- [ ] T021 [P] Implement Fastify global error handler returning ErrorResponse in backend/src/api/http/errorHandler.ts
- [ ] T022 [P] Implement structured logger setup in backend/src/infra/logging/logger.ts

- [ ] T023 [P] Implement CORS config (APP_ORIGIN allowlist + credentials) in backend/src/api/plugins/cors.ts
- [ ] T024 [P] Implement cookie parsing + secure cookie defaults in backend/src/api/plugins/cookies.ts
- [ ] T025 [P] Implement CSRF protection (double-submit + Origin/Referer checks) in backend/src/api/plugins/csrf.ts

- [ ] T026 [P] Implement password hashing/verification (argon2id) in backend/src/infra/auth/password.ts
- [ ] T027 [P] Implement session store backed by DB (Session table) in backend/src/infra/auth/sessionStore.ts
- [ ] T028 [P] Implement auth context loader (sid cookie → user) in backend/src/api/middleware/authContext.ts
- [ ] T029 [P] Implement requireAuth middleware in backend/src/api/middleware/requireAuth.ts

- [ ] T030 Create Fastify app bootstrap and plugin wiring in backend/src/app.ts and backend/src/main.ts
- [ ] T031 [P] Add health endpoint for local dev in backend/src/api/routes/health.ts

- [ ] T032 [P] Implement shared fetch wrapper with credentials + requestId handling in frontend/src/services/http.ts
- [ ] T033 [P] Implement shared ErrorResponse parsing and UX mapping in frontend/src/services/apiErrors.ts
- [ ] T034 [P] Setup TanStack Query provider in frontend/src/providers/QueryClientProvider.tsx and frontend/src/main.tsx
- [ ] T035 [P] Implement route guard components in frontend/src/routes/ProtectedRoute.tsx and frontend/src/routes/GuestOnlyRoute.tsx
- [ ] T036 [P] Implement page-level async states (Loading/Empty/Error/Ready) in frontend/src/components/AsyncState.tsx

- [ ] T037 [P] Setup TailwindCSS + base styles in frontend/tailwind.config.ts and frontend/src/styles.css
- [ ] T038 [P] Implement responsive header shell (Logo + nav + hamburger) in frontend/src/components/AppHeader.tsx and frontend/src/components/MobileNav.tsx
- [ ] T039 [P] Implement app layout shell with header and outlet in frontend/src/components/AppShell.tsx
- [ ] T040 Configure frontend routes skeleton in frontend/src/routes/router.tsx

- [ ] T041 [P] Create backend integration test app helper in backend/tests/helpers/testApp.ts
- [ ] T042 [P] Add backend test DB strategy (separate schema or transaction rollback) in backend/tests/helpers/testDb.ts
- [ ] T043 [P] Add Playwright auth helpers (cookie/session bootstrap) in frontend/tests/e2e/helpers/auth.ts

**Checkpoint**: Foundation ready — user story implementation can begin

---

## I03 — US1: 註冊/登入並被正確導向（P1）

**Depends on**: I02

**Goal**: 完成 Guest/User 狀態機：註冊、登入、登出、session 檢查、路由導向、導覽列可見性與 CTA 去重。

**Independent Test**: 只靠「註冊/登入/登出/直接進入受保護頁」即可驗證 redirect 與 nav 可見性符合 spec。

**Tasks**

- [ ] T044 [P] [US1] Add backend auth integration tests for /session in backend/tests/integration/session.test.ts
- [ ] T045 [P] [US1] Add backend auth integration tests for /auth/register in backend/tests/integration/authRegister.test.ts
- [ ] T046 [P] [US1] Add backend auth integration tests for /auth/login and /auth/logout in backend/tests/integration/authLoginLogout.test.ts
- [ ] T047 [P] [US1] Add Playwright tests for guest redirect to /login for protected routes in frontend/tests/e2e/auth-redirect.spec.ts
- [ ] T048 [P] [US1] Add Playwright tests for nav visibility (Guest vs User) in frontend/tests/e2e/nav-visibility.spec.ts

- [ ] T049 [P] [US1] Implement User model + repo in backend/src/domain/users/userRepo.ts and backend/src/infra/db/userRepoPrisma.ts
- [ ] T050 [P] [US1] Implement Session model + repo in backend/src/domain/sessions/sessionRepo.ts and backend/src/infra/db/sessionRepoPrisma.ts
- [ ] T051 [US1] Implement POST /auth/register route in backend/src/api/routes/authRegister.ts
- [ ] T052 [US1] Implement POST /auth/login route in backend/src/api/routes/authLogin.ts
- [ ] T053 [US1] Implement POST /auth/logout route in backend/src/api/routes/authLogout.ts
- [ ] T054 [US1] Implement GET /session route in backend/src/api/routes/sessionGet.ts
- [ ] T055 [US1] Wire auth routes into app in backend/src/api/routes/index.ts and backend/src/app.ts

- [ ] T056 [P] [US1] Implement session client hooks (GET /session + cache) in frontend/src/services/session.ts and frontend/src/auth/useSession.ts
- [ ] T057 [US1] Implement login page UI + validation in frontend/src/pages/LoginPage.tsx
- [ ] T058 [US1] Implement register page UI + validation in frontend/src/pages/RegisterPage.tsx
- [ ] T059 [US1] Implement logout action + UX feedback in frontend/src/components/LogoutButton.tsx
- [ ] T060 [US1] Enforce route access control redirects in frontend/src/routes/router.tsx
- [ ] T061 [US1] Enforce CTA de-dup rules in frontend/src/components/AppHeader.tsx and frontend/src/pages/LoginPage.tsx

- [ ] T062 [US1] Handle session expiry during operations (401 → clear cache → redirect) in frontend/src/services/http.ts
- [ ] T063 [US1] Add consistent auth error messaging (user vs dev) in frontend/src/services/apiErrors.ts

**Checkpoint**: US1 flows pass E2E; protected routes are safe and consistent

---

## I04 — US2: 新增一筆帳務並在日期分組列表中看到（P1）

**Depends on**: I03

**Goal**: 使用者可新增 income/expense 交易，並在依日期分組列表看到；同時每日總計正確更新。

**Independent Test**: 以一筆支出驗證：新增 → 進入正確日期分組 → 日總計更新 → 空狀態轉列表。

**Tasks**

- [ ] T064 [P] [US2] Add backend integration tests for GET /categories filtering needs in backend/tests/integration/categoriesList.test.ts
- [ ] T065 [P] [US2] Add backend integration tests for POST /transactions validation rules in backend/tests/integration/transactionsCreate.test.ts
- [ ] T066 [P] [US2] Add backend integration tests for GET /transactions pagination in backend/tests/integration/transactionsList.test.ts
- [ ] T067 [P] [US2] Add Playwright tests for creating a transaction and seeing grouped list + totals in frontend/tests/e2e/transactions-create.spec.ts

- [ ] T068 [P] [US2] Implement Category domain rules (type compatibility, isActive) in backend/src/domain/categories/categoryRules.ts
- [ ] T069 [P] [US2] Implement Transaction domain rules (amount/date/note) in backend/src/domain/transactions/transactionRules.ts
- [ ] T070 [P] [US2] Implement Category repo in backend/src/domain/categories/categoryRepo.ts and backend/src/infra/db/categoryRepoPrisma.ts
- [ ] T071 [P] [US2] Implement Transaction repo in backend/src/domain/transactions/transactionRepo.ts and backend/src/infra/db/transactionRepoPrisma.ts

- [ ] T072 [US2] Implement GET /categories (includeInactive query) route in backend/src/api/routes/categoriesList.ts
- [ ] T073 [US2] Implement POST /transactions route with validations in backend/src/api/routes/transactionsCreate.ts
- [ ] T074 [US2] Implement GET /transactions route (page/pageSize/fromDate/toDate) in backend/src/api/routes/transactionsList.ts
- [ ] T075 [US2] Wire category/transaction routes into app in backend/src/api/routes/index.ts

- [ ] T076 [P] [US2] Implement transactions API client in frontend/src/services/transactions.ts
- [ ] T077 [P] [US2] Implement categories API client (includeInactive) in frontend/src/services/categories.ts
- [ ] T078 [US2] Implement transactions page shell + loading/empty/error states in frontend/src/pages/TransactionsPage.tsx
- [ ] T079 [US2] Implement grouped-by-date list UI + daily totals UI in frontend/src/components/transactions/TransactionGroupList.tsx
- [ ] T080 [US2] Implement “新增帳務” modal + form validation in frontend/src/components/transactions/TransactionCreateDialog.tsx
- [ ] T081 [US2] Implement category select filtering by isActive + type compatibility in frontend/src/components/transactions/CategorySelect.tsx
- [ ] T082 [US2] Ensure create transaction invalidates list queries and updates UI in frontend/src/pages/TransactionsPage.tsx

**Checkpoint**: US2 新增流程可用；列表與每日總計一致

---

## I05 — US3: 編輯/刪除帳務且所有統計同步（P2）

**Depends on**: I04

**Goal**: 可編輯/刪除交易，包含改日期造成分組搬移；刪除含二次確認；刪除最後一筆回到空狀態。

**Independent Test**: 用一筆交易驗證「改日期搬移」與「刪除最後一筆→空狀態」。

**Tasks**

- [ ] T083 [P] [US3] Add backend integration tests for PUT /transactions/{id} in backend/tests/integration/transactionsUpdate.test.ts
- [ ] T084 [P] [US3] Add backend integration tests for DELETE /transactions/{id} authz + notfound in backend/tests/integration/transactionsDelete.test.ts
- [ ] T085 [P] [US3] Add Playwright tests for editing transaction date moves groups in frontend/tests/e2e/transactions-edit-move-date.spec.ts
- [ ] T086 [P] [US3] Add Playwright tests for delete confirm + cancel does nothing in frontend/tests/e2e/transactions-delete-confirm.spec.ts

- [ ] T087 [US3] Implement PUT /transactions/{transactionId} route in backend/src/api/routes/transactionsUpdate.ts
- [ ] T088 [US3] Implement DELETE /transactions/{transactionId} route in backend/src/api/routes/transactionsDelete.ts
- [ ] T089 [US3] Ensure server-side authz enforcement (user_id scope) in backend/src/domain/transactions/transactionRepo.ts
- [ ] T090 [US3] Wire update/delete routes into app in backend/src/api/routes/index.ts

- [ ] T091 [P] [US3] Implement transaction update/delete API client in frontend/src/services/transactions.ts
- [ ] T092 [US3] Implement “編輯帳務” dialog + form in frontend/src/components/transactions/TransactionEditDialog.tsx
- [ ] T093 [US3] Implement delete confirmation dialog in frontend/src/components/transactions/TransactionDeleteConfirmDialog.tsx
- [ ] T094 [US3] Ensure edit/delete invalidates list queries and preserves UX state in frontend/src/pages/TransactionsPage.tsx
- [ ] T095 [US3] Ensure empty state shown after deleting last item in frontend/src/pages/TransactionsPage.tsx

**Checkpoint**: US3 編輯/刪除一致更新；確認視窗符合需求

---

## I06 — US4: 管理類別（新增/編輯/停用/啟用）且不破壞歷史資料（P2）

**Depends on**: I03（auth）+ I02（foundation）；但建議在 I04（交易基本流）後驗收「停用類別不可選」更直覺

**Goal**: 類別管理頁可新增自訂類別、編輯名稱/類型、停用/啟用；停用不可用於新增/編輯交易但歷史保留顯示。

**Independent Test**: 自訂類別「新增→停用→交易表單不可選→再啟用」；歷史交易仍顯示該類別名稱。

**Tasks**

- [ ] T096 [P] [US4] Add backend integration tests for POST /categories uniqueness rules in backend/tests/integration/categoriesCreate.test.ts
- [ ] T097 [P] [US4] Add backend integration tests for PUT /categories/{id} in backend/tests/integration/categoriesUpdate.test.ts
- [ ] T098 [P] [US4] Add backend integration tests for PATCH /categories/{id}/active in backend/tests/integration/categoriesToggleActive.test.ts
- [ ] T099 [P] [US4] Add Playwright tests for categories CRUD UI in frontend/tests/e2e/categories-manage.spec.ts
- [ ] T100 [P] [US4] Add Playwright tests verifying disabled category not selectable in transaction form in frontend/tests/e2e/categories-affects-transaction-form.spec.ts

- [ ] T101 [P] [US4] Implement category unique-name enforcement (DB + domain mapping) in backend/src/domain/categories/categoryRepo.ts
- [ ] T102 [US4] Implement POST /categories route in backend/src/api/routes/categoriesCreate.ts
- [ ] T103 [US4] Implement PUT /categories/{categoryId} route in backend/src/api/routes/categoriesUpdate.ts
- [ ] T104 [US4] Implement PATCH /categories/{categoryId}/active route in backend/src/api/routes/categoriesToggleActive.ts
- [ ] T105 [US4] Ensure categories cannot be deleted (no route + repo safeguard) in backend/src/domain/categories/categoryRepo.ts
- [ ] T106 [US4] Wire category routes into app in backend/src/api/routes/index.ts

- [ ] T107 [US4] Implement categories management page shell in frontend/src/pages/CategoriesPage.tsx
- [ ] T108 [US4] Implement category create/edit dialog in frontend/src/components/categories/CategoryUpsertDialog.tsx
- [ ] T109 [US4] Implement active toggle UI + optimistic update handling in frontend/src/components/categories/CategoryActiveToggle.tsx
- [ ] T110 [US4] Ensure transactions forms consume only active + type-compatible categories in frontend/src/components/transactions/CategorySelect.tsx
- [ ] T111 [US4] Ensure historical transactions still render categoryName even if inactive in frontend/src/components/transactions/TransactionRow.tsx

**Checkpoint**: US4 類別管理完成；不破壞歷史資料一致性

---

## I07 — US5: 查看月報表、切換年月、可選匯出 CSV（P3）

**Depends on**: I04（需要交易資料）

**Goal**: 月報表頁提供 totals、支出類別圓餅、每日收支長條；支援年月切換；當月有資料可匯出 CSV。

**Independent Test**: 以一個月份資料驗證：統計卡正確、圓餅僅支出、長條 X 軸只顯示有資料日期、CSV 與畫面一致。

**Tasks**

- [ ] T112 [P] [US5] Add backend integration tests for GET /reports/monthly aggregation correctness in backend/tests/integration/reportsMonthly.test.ts
- [ ] T113 [P] [US5] Add backend integration tests for GET /reports/monthly/csv (filename + BOM + content) in backend/tests/integration/reportsMonthlyCsv.test.ts
- [ ] T114 [P] [US5] Add Playwright tests for reports page totals + charts + empty state in frontend/tests/e2e/reports-monthly.spec.ts
- [ ] T115 [P] [US5] Add Playwright tests for CSV export button gating in frontend/tests/e2e/reports-export-csv.spec.ts

- [ ] T116 [P] [US5] Implement report aggregation queries (totals/byCategory/byDay) in backend/src/domain/reports/monthlyReportService.ts
- [ ] T117 [US5] Implement GET /reports/monthly route in backend/src/api/routes/reportsMonthlyGet.ts
- [ ] T118 [P] [US5] Implement CSV generator (streaming preferred, BOM, escaping) in backend/src/domain/reports/monthlyCsvExport.ts
- [ ] T119 [US5] Implement GET /reports/monthly/csv route in backend/src/api/routes/reportsMonthlyCsv.ts
- [ ] T120 [US5] Wire report routes into app in backend/src/api/routes/index.ts

- [ ] T121 [P] [US5] Implement reports API client in frontend/src/services/reports.ts
- [ ] T122 [US5] Implement reports page shell + year/month selectors in frontend/src/pages/ReportsPage.tsx
- [ ] T123 [US5] Implement summary cards UI in frontend/src/components/reports/MonthlySummaryCards.tsx
- [ ] T124 [US5] Implement expense pie chart + accessible data table fallback in frontend/src/components/reports/ExpenseByCategoryPieChart.tsx
- [ ] T125 [US5] Implement daily income/expense bar chart (X-axis only dates with data) + fallback table in frontend/src/components/reports/DailyIncomeExpenseBarChart.tsx
- [ ] T126 [US5] Implement CSV export UX (download + disabled on empty month) in frontend/src/components/reports/ExportCsvButton.tsx

**Checkpoint**: US5 報表/匯出與資料一致性完成

---

## I08 — Polish & Cross-Cutting Concerns（Complete System Quality）

**Depends on**: I03 + I04 + I05 + I06 + I07（目標是全系統收斂）

**Goal**: 跨 user stories 的一致性、可用性、安全性、可觀測性、效能與文件收斂

**Tasks**

- [ ] T127 [P] Add backend error code taxonomy + mapping table in backend/src/api/http/errorCodes.ts
- [ ] T128 Ensure all API routes return consistent ErrorResponse and include requestId in backend/src/api/http/errorHandler.ts
- [ ] T129 [P] Add rate limiting for auth endpoints in backend/src/api/plugins/rateLimit.ts
- [ ] T130 [P] Add security headers (CSP baseline, frame/ct) in backend/src/api/plugins/securityHeaders.ts

- [ ] T131 [P] Add frontend toast notifications for success/error actions in frontend/src/components/ToastProvider.tsx
- [ ] T132 Ensure all pages implement Loading/Ready/Empty/Error + retry patterns in frontend/src/components/AsyncState.tsx
- [ ] T133 Ensure mobile nav usability + keyboard navigation in frontend/src/components/MobileNav.tsx

- [ ] T134 [P] Add accessibility pass for charts (ARIA labels + tabular fallback visible/sr-only) in frontend/src/components/reports/*
- [ ] T135 [P] Add a11y-friendly form components (labels, errors, focus) in frontend/src/components/forms/*

- [ ] T136 [P] Add data consistency invariants tests (list vs report vs csv) in backend/tests/integration/dataConsistency.test.ts
- [ ] T137 [P] Add E2E “happy path full flow” test (register → add tx → report → export) in frontend/tests/e2e/full-flow.spec.ts

- [ ] T138 [P] Add observability notes + runbook snippets in docs/observability.md
- [ ] T139 [P] Validate and update quickstart for real commands in specs/002-expense-monthly-report/quickstart.md
- [ ] T140 [P] Add production build scripts and verify they run in package.json and frontend/package.json and backend/package.json
