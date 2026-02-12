---

description: "Task list for feature implementation"
---

# Tasks: 個人記帳與月報表網站

**Input**: Design documents from `/specs/001-expense-tracker-reports/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Core domain/business rules MUST have tests (happy path, edge cases, failures).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Next.js project at repository root
- Source paths follow plan.md: `src/`, `prisma/`, `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure (Next.js 14 + TS + Tailwind + shadcn + TanStack Query + RHF/Zod + Prisma + NextAuth)

- [x] T001 Create base project scaffold (Next.js App Router + src/ layout) in package.json
- [x] T002 [P] Add Node/pnpm scripts (dev/build/start/lint/test/prisma) in package.json
- [x] T003 [P] Add TypeScript base config in tsconfig.json
- [x] T004 [P] Add ESLint config aligned with Next.js in .eslintrc.json
- [x] T005 [P] Add Prettier config + ignore rules in .prettierrc and .prettierignore
- [x] T006 [P] Add Tailwind + PostCSS config in tailwind.config.ts and postcss.config.mjs
- [x] T007 [P] Add global styles + CSS variables baseline in src/app/globals.css
- [x] T008 [P] Initialize shadcn/ui config in components.json
- [x] T009 [P] Add Vitest + RTL configuration in vitest.config.ts and tests/setup.ts
- [x] T010 [P] Add Testing Library helpers (render wrapper/providers) in tests/utils/render.tsx
- [x] T011 [P] Add base app layout shell + metadata in src/app/layout.tsx
- [x] T012 [P] Add landing redirect (e.g., to /transactions or /login) in src/app/page.tsx
- [x] T013 [P] Add route groups skeleton per plan (auth/protected) in src/app/(auth)/ and src/app/(protected)/
- [x] T014 [P] Add basic UI primitives via shadcn (Button/Input/Select/Dialog/DropdownMenu/Toast) in src/components/ui/
- [x] T015 [P] Add global providers (TanStack Query + Toaster) in src/app/providers.tsx
- [x] T016 [P] Add React Query client factory + defaults in src/lib/shared/queryClient.ts
- [x] T017 [P] Add repo-level env template in .env.example
- [x] T018 [P] Add project README quick commands in README.md
- [x] T019 [P] Add workspace gitignore for env/db artifacts in .gitignore
- [x] T020 [P] Create initial folder structure per plan in src/lib/domain/ and src/lib/server/ and src/lib/shared/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Design alignment (resolve spec vs data-model mismatch)

- [x] T021 Reconcile default category strategy (per-user defaults to allow editing “default categories”) by updating specs/001-expense-tracker-reports/data-model.md
- [x] T022 Update research decision notes to match per-user default categories in specs/001-expense-tracker-reports/research.md

### Environment, DB, and Prisma

- [x] T023 Define env schema validation (DATABASE_URL, AUTH_SECRET, AUTH_COOKIE_NAME, APP_URL) in src/lib/server/env.ts
- [x] T024 [P] Add Prisma schema (User/Category/Transaction) in prisma/schema.prisma
- [x] T025 [P] Add Prisma client singleton (dev-safe) in src/lib/server/db.ts
- [x] T026 [P] Add Prisma seed entrypoint wiring in package.json (prisma.db.seed)
- [x] T027 Implement seed for development demo data (optional) in prisma/seed.ts
- [x] T028 Add initial migration for core tables in prisma/migrations/0001_init/migration.sql
- [x] T029 Add indexes for transactions reporting/listing in prisma/migrations/0002_indexes/migration.sql

### Security, authn/authz, and request context

- [x] T030 Implement password hashing/verification util in src/lib/server/password.ts
- [x] T031 Implement cookie-based JWT session helpers (create/verify/set/clear) in src/lib/server/auth/session.ts
- [x] T032 Wire login session cookie issuance/clearing via REST auth endpoints in src/app/api/auth/login/route.ts and src/app/api/auth/logout/route.ts
- [x] T033 Implement current-user id helpers (server-only) in src/lib/server/auth/requireUser.ts and src/lib/server/auth/requireUserPage.ts
- [x] T034 Implement same-origin guard for mutating requests in src/lib/server/security/sameOrigin.ts
- [x] T035 Implement auth guard for Route Handlers (returns 401) in src/lib/server/auth/requireUser.ts
- [x] T036 Implement auth guard for server components/pages (redirects to /login) in src/lib/server/auth/requireUserPage.ts
- [x] T037 Add middleware redirect for protected pages (UX only; not security boundary) in src/middleware.ts

### Error handling & observability

- [x] T038 Define canonical API error shape + error codes in src/lib/shared/apiError.ts
- [x] T039 Implement Route Handler error wrapper (maps thrown errors to responses) in src/lib/server/http/routeError.ts
- [x] T040 Implement request id generator + propagation helper in src/lib/server/observability/requestId.ts
- [x] T041 Implement server logger wrapper (include request id, user id when available) in src/lib/server/observability/logger.ts

### Shared contracts & validation

- [x] T042 Define shared Zod schemas for auth payloads in src/lib/shared/schemas/auth.ts
- [x] T043 Define shared Zod schemas for categories in src/lib/shared/schemas/category.ts
- [x] T044 Define shared Zod schemas for transactions in src/lib/shared/schemas/transaction.ts
- [x] T045 Define shared Zod schemas for reports + CSV params in src/lib/shared/schemas/report.ts

### Repositories/services foundations

- [x] T046 Create CategoryRepository with per-user ownership constraints in src/lib/server/repositories/categoryRepo.ts
- [x] T047 Create TransactionRepository with per-user ownership constraints in src/lib/server/repositories/transactionRepo.ts
- [x] T048 Create ReportRepository (aggregate queries) in src/lib/server/repositories/reportRepo.ts
- [x] T049 Create CategoryService (business rules) in src/lib/server/services/categoryService.ts
- [x] T050 Create TransactionService (business rules) in src/lib/server/services/transactionService.ts
- [x] T051 Create ReportService (month range + aggregation consistency) in src/lib/server/services/reportService.ts

### Date/money utilities + query consistency

- [x] T052 Implement money formatting helpers (int cents/units) in src/lib/shared/money.ts
- [x] T053 Implement month range utilities (startOfMonth/startOfNextMonth) in src/lib/shared/dateRange.ts
- [x] T054 Implement shared month filter builder (year/month -> [from,to)) in src/lib/server/queries/monthRange.ts
- [x] T055 Implement shared per-user where builder for transactions in src/lib/server/queries/transactionWhere.ts

### Frontend API client + query keys

- [x] T056 Implement fetch wrapper with typed error parsing in src/lib/shared/apiClient.ts
- [x] T057 Define TanStack Query keys for categories/transactions/reports in src/lib/shared/queryKeys.ts

### Base UI shell (nav, layout, protected layout)

- [x] T058 Implement top navigation (links + user menu + logout) in src/components/nav/TopNav.tsx
- [x] T059 Implement protected layout wrapper (server-side guard) in src/app/(protected)/layout.tsx
- [x] T060 Implement auth layout wrapper (redirect away when already signed-in) in src/app/(auth)/layout.tsx

### Foundational tests (must exist before stories)

- [x] T061 Add unit tests for date range utilities (edge cases) in tests/unit/dateRange.test.ts
- [x] T062 Add unit tests for money formatting helpers in tests/unit/money.test.ts
- [x] T063 Add unit tests for API error mapping in tests/unit/apiError.test.ts
- [x] T064 Add unit tests for password hashing/verification in tests/unit/password.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 註冊/登入後新增一筆帳務 (Priority: P1)

**Goal**: 使用者能註冊/登入，並新增一筆帳務且在自己的列表中立即可見

**Independent Test**: 全新帳號註冊→自動進入列表→新增一筆支出→列表可見且僅自己可見

### Tests for User Story 1

- [x] T065 [P] [US1] Add auth/register API contract tests (201/409/422) in tests/integration/api/auth.register.test.ts
- [x] T066 [P] [US1] Add auth/login API contract tests (200/401) in tests/integration/api/auth.login.test.ts
- [x] T067 [P] [US1] Add categories list API tests (200/401) in tests/integration/api/categories.list.test.ts
- [x] T068 [P] [US1] Add transactions create API tests (201/401/403/404/422) in tests/integration/api/transactions.create.test.ts
- [x] T069 [P] [US1] Add TransactionService business-rule tests (amount/date/category ownership) in tests/unit/transactionService.create.test.ts

### Backend/API implementation for User Story 1

- [x] T070 [US1] Implement register endpoint (create user + seed per-user default categories) in src/app/api/auth/register/route.ts
- [x] T071 [US1] Implement login endpoint semantics (delegate to NextAuth or return signedIn) in src/app/api/auth/login/route.ts
- [x] T072 [US1] Implement logout endpoint semantics in src/app/api/auth/logout/route.ts
- [x] T073 [US1] Implement categories list endpoint (defaults + user categories) in src/app/api/categories/route.ts
- [x] T074 [US1] Implement transactions list endpoint (flat list, paged) in src/app/api/transactions/route.ts
- [x] T075 [US1] Implement transactions create endpoint in src/app/api/transactions/route.ts

### Frontend/UI implementation for User Story 1

- [x] T076 [US1] Implement login page UI + form validation in src/app/(auth)/login/page.tsx
- [x] T077 [US1] Implement register page UI + form validation in src/app/(auth)/register/page.tsx
- [x] T078 [US1] Implement signed-in redirect after auth in src/app/(auth)/login/page.tsx
- [x] T079 [US1] Implement categories query hook in src/lib/shared/hooks/useCategories.ts
- [x] T080 [US1] Implement transactions query hook (paged) in src/lib/shared/hooks/useTransactions.ts
- [x] T081 [US1] Implement create-transaction mutation hook in src/lib/shared/hooks/useCreateTransaction.ts
- [x] T082 [US1] Implement transactions page shell in src/app/(protected)/transactions/page.tsx
- [x] T083 [US1] Implement transaction create form component (type/amount/category/date/note) in src/components/transactions/TransactionForm.tsx
- [x] T084 [US1] Implement transaction list component (flat list) in src/components/transactions/TransactionList.tsx
- [x] T085 [US1] Add loading/empty/error UI states for transactions list in src/components/transactions/TransactionList.tsx
- [x] T086 [US1] Add logout action in nav user menu in src/components/nav/TopNav.tsx

**Checkpoint**: US1 is fully functional and independently testable

---

## Phase 4: User Story 2 - 依日期分組檢視與管理帳務 (Priority: P2)

**Goal**: 帳務列表依日期分組並顯示每日收支小計，支援編輯/刪除且同步反映

**Independent Test**: 同日新增多筆→看到日期分組與小計→編輯金額/日期→分組與小計更新→刪除→移除且小計更新

### Tests for User Story 2

- [x] T087 [P] [US2] Add transactions list with dailySummaries tests in tests/integration/api/transactions.list.test.ts
- [x] T088 [P] [US2] Add transactions update API tests (200/401/403/404/422) in tests/integration/api/transactions.update.test.ts
- [x] T089 [P] [US2] Add transactions delete API tests (200/401/403/404) in tests/integration/api/transactions.delete.test.ts
- [x] T090 [P] [US2] Add TransactionService update/delete business-rule tests in tests/unit/transactionService.mutate.test.ts
- [x] T091 [P] [US2] Add UI grouping helper tests (date groups + subtotals) in tests/unit/transactionGrouping.test.ts

### Backend/API implementation for User Story 2

- [x] T092 [US2] Extend transactions list response to include dailySummaries in src/app/api/transactions/route.ts
- [x] T093 [US2] Implement transactions update endpoint in src/app/api/transactions/[transactionId]/route.ts
- [x] T094 [US2] Implement transactions delete endpoint in src/app/api/transactions/[transactionId]/route.ts

### Frontend/UI implementation for User Story 2

- [x] T095 [US2] Update transactions list UI to group by date in src/components/transactions/TransactionList.tsx
- [x] T096 [US2] Render daily income/expense subtotal per date group in src/components/transactions/DailyGroupHeader.tsx
- [x] T097 [US2] Implement edit transaction dialog UI in src/components/transactions/EditTransactionDialog.tsx
- [x] T098 [US2] Implement update-transaction mutation hook in src/lib/shared/hooks/useUpdateTransaction.ts
- [x] T099 [US2] Implement delete transaction confirm dialog in src/components/transactions/DeleteTransactionDialog.tsx
- [x] T100 [US2] Implement delete-transaction mutation hook in src/lib/shared/hooks/useDeleteTransaction.ts
- [x] T101 [US2] Ensure mutations invalidate transactions + reports queries in src/lib/shared/queryKeys.ts
- [x] T102 [US2] Ensure “stale data” prevention when paging/filters change in src/lib/shared/hooks/useTransactions.ts

**Checkpoint**: US2 works and remains independently testable (on top of foundation)

---

## Phase 5: User Story 3 - 管理收支類別（新增/編輯/停用） (Priority: P3)

**Goal**: 使用者可新增/改名/停用類別；停用類別不可用於新帳務但歷史帳務仍保留顯示

**Independent Test**: 新增類別→用它新增帳務→停用→新增帳務時不可選→舊帳務仍顯示且報表統計不變

### Tests for User Story 3

- [x] T103 [P] [US3] Add categories create API tests (201/401/409/422) in tests/integration/api/categories.create.test.ts
- [x] T104 [P] [US3] Add categories update API tests (200/401/403/404/409) in tests/integration/api/categories.update.test.ts
- [x] T105 [P] [US3] Add CategoryService business-rule tests (unique name, deactivate rules) in tests/unit/categoryService.test.ts
- [x] T106 [P] [US3] Add TransactionService rule test (cannot create with inactive category) in tests/unit/transactionService.inactiveCategory.test.ts

### Backend/API implementation for User Story 3

- [x] T107 [US3] Implement categories create endpoint in src/app/api/categories/route.ts
- [x] T108 [US3] Implement categories update (rename/type/isActive toggle) in src/app/api/categories/[categoryId]/route.ts
- [x] T109 [US3] Ensure category ownership checks enforced server-side in src/lib/server/repositories/categoryRepo.ts
- [x] T110 [US3] Ensure transaction create/update rejects inactive categories in src/lib/server/services/transactionService.ts

### Frontend/UI implementation for User Story 3

- [x] T111 [US3] Implement categories page shell in src/app/(protected)/categories/page.tsx
- [x] T112 [US3] Implement categories list component (active/inactive sections) in src/components/categories/CategoryList.tsx
- [x] T113 [US3] Implement create category dialog in src/components/categories/CreateCategoryDialog.tsx
- [x] T114 [US3] Implement update category dialog (rename/type/toggle active) in src/components/categories/EditCategoryDialog.tsx
- [x] T115 [US3] Implement category mutations hooks (create/update) in src/lib/shared/hooks/useCategoryMutations.ts
- [x] T116 [US3] Ensure transaction form hides inactive categories in src/components/transactions/TransactionForm.tsx

**Checkpoint**: US3 is functional; inactive categories behavior is enforced end-to-end

---

## Phase 6: User Story 4 - 查看月報表與圖表 (Priority: P4)

**Goal**: 顯示指定年月總收入/總支出/淨收支，並呈現支出類別分布與每日收支趨勢圖表

**Independent Test**: 同月新增多筆不同類別/日期→報表 totals 與圖表正確→切換月份顯示對應資料→無資料月份顯示空狀態

### Tests for User Story 4

- [x] T117 [P] [US4] Add reports monthly API tests (200/401/422) in tests/integration/api/reports.monthly.test.ts
- [x] T118 [P] [US4] Add ReportService aggregation correctness tests (totals/byCategory/byDay) in tests/unit/reportService.test.ts
- [x] T119 [P] [US4] Add month range builder tests (timezone-agnostic) in tests/unit/monthRange.test.ts

### Backend/API implementation for User Story 4

- [x] T120 [US4] Implement monthly report endpoint in src/app/api/reports/monthly/route.ts
- [x] T121 [US4] Implement report aggregation queries (sum/groupBy) in src/lib/server/repositories/reportRepo.ts
- [x] T122 [US4] Implement percent calculation + fill missing days in src/lib/server/services/reportService.ts
- [x] T123 [US4] Enforce no-store caching for per-user report endpoints in src/app/api/reports/monthly/route.ts

### Frontend/UI implementation for User Story 4

- [x] T124 [US4] Implement monthly report page shell + routing in src/app/(protected)/reports/page.tsx
- [x] T125 [US4] Implement report query hook in src/lib/shared/hooks/useMonthlyReport.ts
- [x] T126 [US4] Implement month picker (year/month) component in src/components/reports/MonthPicker.tsx
- [x] T127 [US4] Implement totals summary cards UI in src/components/reports/MonthlyTotalsCards.tsx
- [x] T128 [US4] Implement expense-by-category chart (Recharts) in src/components/reports/ExpenseByCategoryChart.tsx
- [x] T129 [US4] Implement daily income/expense bar chart (Recharts) in src/components/reports/DailySeriesChart.tsx
- [x] T130 [US4] Implement empty-state UI for no-data months in src/components/reports/ReportEmptyState.tsx
- [x] T131 [US4] Prevent stale report UI on month switch (loading + keying) in src/app/(protected)/reports/page.tsx

**Checkpoint**: US4 report page is correct, consistent, and resilient to empty/error states

---

## Phase 7: User Story 5 - 匯出當月帳務 CSV (Priority: P5)

**Goal**: 匯出目前所選月份的帳務為 CSV，內容與畫面一致

**Independent Test**: 選有資料月份→匯出 CSV→欄位/筆數/日期/類別/金額一致；選無資料月份→依決策下載空檔或提示無資料（一致）

### Tests for User Story 5

- [x] T132 [P] [US5] Add CSV export API tests (200/401/422) in tests/integration/api/reports.export.test.ts
- [x] T133 [P] [US5] Add CSV serialization unit tests (escaping, header, ordering) in tests/unit/csvExport.test.ts

### Backend/API implementation for User Story 5

- [x] T134 [US5] Implement CSV export endpoint in src/app/api/reports/monthly/export/route.ts
- [x] T135 [US5] Implement shared CSV serializer (RFC4180-ish) in src/lib/server/export/csv.ts
- [x] T136 [US5] Ensure export uses the same month/user where builder as reports in src/lib/server/queries/transactionWhere.ts
- [x] T137 [US5] Implement Content-Disposition filename logic (transactions_YYYY_MM.csv) in src/app/api/reports/monthly/export/route.ts
- [x] T138 [US5] Decide and enforce “no data” behavior (empty CSV vs error) in src/app/api/reports/monthly/export/route.ts

### Frontend/UI implementation for User Story 5

- [x] T139 [US5] Add export button to reports page in src/app/(protected)/reports/page.tsx
- [x] T140 [US5] Implement download helper (fetch blob + trigger download) in src/lib/shared/download.ts
- [x] T141 [US5] Implement export UI states (disabled/loading/error) in src/components/reports/ExportCsvButton.tsx

**Checkpoint**: US5 export matches report/list data and has consistent empty/error semantics

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories (UX, security, performance, observability, docs)

- [x] T142 [P] Add consistent skeleton/loading components in src/components/ui/skeleton.tsx
- [x] T143 Add global error boundary UI for protected pages in src/app/(protected)/error.tsx
- [x] T144 Add not-found handling for protected routes in src/app/(protected)/not-found.tsx
- [x] T145 Add accessibility pass (labels, focus trap, keyboard nav) in src/components/transactions/ and src/components/categories/
- [x] T146 Add consistent toast notifications for mutations in src/lib/shared/toast.ts
- [x] T147 Harden same-origin checks for all mutating Route Handlers in src/lib/server/security/sameOrigin.ts
- [x] T148 Add rate-limit/light abuse protection (basic) in src/lib/server/security/rateLimit.ts
- [x] T149 Ensure API responses disable caching for per-user endpoints in src/app/api/**/route.ts
- [x] T150 Add DB indexes verification + performance notes in specs/001-expense-tracker-reports/research.md
- [x] T151 Add “ownership denial” logging + error codes (403) in src/lib/server/http/routeError.ts
- [x] T152 Add observability log events for key actions (auth/transactions/categories/export) in src/lib/server/observability/logger.ts
- [x] T153 Add quickstart validation checklist (manual smoke + troubleshooting updates) in specs/001-expense-tracker-reports/quickstart.md
- [x] T154 Add contract drift check note + update policy in specs/001-expense-tracker-reports/contracts/openapi.yaml
- [x] T155 Run full test suite in CI script definition in package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies (recommended order)

- **US1 (P1)** → required before US2 (transactions mutate UI) and before US4/US5 (needs data and auth)
- **US2 (P2)** → improves list UX and correctness (daily summaries) used as reference for consistency
- **US3 (P3)** → can be done after Foundation + US1 (but before heavy report testing for realistic categories)
- **US4 (P4)** → depends on transactions existing (US1), benefits from US2 correctness and US3 categories
- **US5 (P5)** → depends on US4 month selection + shared month filters

### Within Each User Story

- Tests should be written and fail (where feasible) before implementation
- Shared schemas/repo/service logic before route handlers
- Backend endpoints before UI hooks/components
- Story-specific error/empty/loading states before marking story complete

---

## Parallel Opportunities

- Phase 1: tasks marked [P] can be done in parallel (mostly config + scaffolding)
- Phase 2: schema files, utilities, and tests marked [P] can be done in parallel
- After Phase 2: different user stories can proceed in parallel if staffed

---

## Parallel Execution Examples (per story)

### User Story 1

```bash
Task: "T076 Implement login page UI in src/app/(auth)/login/page.tsx"
Task: "T070 Implement register endpoint in src/app/api/auth/register/route.ts"
Task: "T069 Add TransactionService business-rule tests in tests/unit/transactionService.create.test.ts"
```

### User Story 2

```bash
Task: "T093 Implement transactions update endpoint in src/app/api/transactions/[transactionId]/route.ts"
Task: "T095 Update grouping UI in src/components/transactions/TransactionList.tsx"
Task: "T091 Add UI grouping helper tests in tests/unit/transactionGrouping.test.ts"
```

### User Story 3

```bash
Task: "T108 Implement categories update endpoint in src/app/api/categories/[categoryId]/route.ts"
Task: "T113 Implement create category dialog in src/components/categories/CreateCategoryDialog.tsx"
Task: "T105 Add CategoryService tests in tests/unit/categoryService.test.ts"
```

### User Story 4

```bash
Task: "T120 Implement monthly report endpoint in src/app/api/reports/monthly/route.ts"
Task: "T128 Implement expense-by-category chart in src/components/reports/ExpenseByCategoryChart.tsx"
Task: "T118 Add ReportService tests in tests/unit/reportService.test.ts"
```

### User Story 5

```bash
Task: "T134 Implement CSV export endpoint in src/app/api/reports/monthly/export/route.ts"
Task: "T141 Implement export button UI in src/components/reports/ExportCsvButton.tsx"
Task: "T133 Add CSV serialization tests in tests/unit/csvExport.test.ts"
```

---

## Implementation Strategy

### Full Delivery (requested)

1. Complete Phase 1 → 2 to establish solid foundations (auth, DB, error handling, tests)
2. Implement US1 → US2 → US3 → US4 → US5 in priority order to maintain correctness and consistency
3. Finish with Phase 8 polish (security hardening, UX, observability, docs)

### Suggested MVP scope (for milestone tracking)

- If you still want a milestone checkpoint, **US1 alone** is a good “first shippable” slice; the task list above still targets the **complete system** through US5 + Polish.
