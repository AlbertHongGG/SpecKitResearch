
---

description: "Task list for implementing the Activity Management Platform"

---

# Tasks: 社團活動管理平台（Activity Management Platform）

**Input**: Design documents from `/specs/002-activity-management-platform/`

**Prerequisites**:
- Required: `plan.md`, `spec.md`
- Available: `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: 使用者要求交付「完成的專案結果」（含測試）。本 tasks 會包含必要的自動化測試：後端以 Jest+Supertest e2e 為主（含並發報名 0 超賣），前端以 Vitest+RTL 覆蓋關鍵流程/guard。

**Organization**: Tasks 依 user story 分 phase，確保每個故事都能獨立驗收（透過 seed/測試資料降低跨故事依賴）。

## Format (STRICT)

每個 task 必須符合：

`- [ ] T### [P?] [US#?] Description with file path`

- **[P]**: 可平行（不同檔案/子專案、無未完成依賴）
- **[US#]**: user story 標籤（Setup/Foundational/Polish 不加；User Story phases 必加）
- **File path**: 每個 task 描述必須包含明確檔案路徑

## Path Conventions

- Backend app: `backend/src/`
- Backend tests: `backend/test/`
- Prisma: `backend/prisma/`
- Frontend app: `frontend/src/`
- Frontend tests: `frontend/src/**/__tests__/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 建立 repo 結構、前後端專案骨架、品質工具、契約驗證腳本

- [X] T001 建立 root 說明與目錄結構（README.md）
- [X] T002 建立 root 通用設定（.gitignore、.editorconfig）
- [X] T003 [P] 建立 root 格式化設定（.prettierrc、.prettierignore）
- [X] T004 [P] 初始化 backend NestJS 專案（backend/package.json、backend/src/main.ts、backend/src/app.module.ts）
- [X] T005 [P] 初始化 frontend Vite+React+TS 專案（frontend/package.json、frontend/src/main.tsx、frontend/index.html）
- [X] T006 [P] 設定 backend lint/format（backend/eslint.config.mjs、backend/.prettierrc）
- [X] T007 [P] 設定 frontend lint/format（frontend/eslint.config.mjs、frontend/.prettierrc）
- [X] T008 [P] 設定 Tailwind（frontend/tailwind.config.ts、frontend/postcss.config.js、frontend/src/index.css）
- [X] T009 建立本機啟動腳本（scripts/dev.sh）
- [X] T010 建立本機測試腳本（scripts/test.sh）
- [X] T011 [P] 建立 OpenAPI 驗證腳本（scripts/validate-openapi.sh）
- [X] T012 [P] 建立 root scripts 註冊（package.json）
- [X] T013 [P] 建立 .env.example（backend/.env.example、frontend/.env.example）
- [X] T014 [P] 建立 VS Code workspace 設定（.vscode/settings.json）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 資料模型、auth/roles、錯誤格式、logging、seed、測試框架（阻塞所有 user stories）

**⚠️ CRITICAL**: 完成前禁止進入任何 user story 實作

### Backend: Database + common infrastructure

- [X] T015 初始化 Prisma + SQLite（backend/prisma/schema.prisma、backend/.env.example）
- [X] T016 建立 Prisma models/relations（User/Activity/Registration/AuditEvent）(backend/prisma/schema.prisma)
- [X] T017 建立初始 migration（backend/prisma/migrations/）
- [X] T018 [P] 建立 PrismaService（Nest provider）（backend/src/common/prisma/prisma.service.ts）
- [X] T019 [P] 建立 env 讀取與驗證（JWT_SECRET、DATABASE_URL、TZ）(backend/src/common/config/env.ts)
- [X] T020 [P] 設定 Pino logging（含 request id）（backend/src/common/logging/pino.ts、backend/src/main.ts）
- [X] T021 [P] 定義 ErrorResponse DTO 與錯誤碼列舉（backend/src/common/http/error-response.ts、backend/src/common/errors/error-codes.ts）
- [X] T022 [P] 實作全域 ExceptionFilter 對齊 ErrorResponse（backend/src/common/http/http-exception.filter.ts）
- [X] T023 [P] 設定全域 ValidationPipe（backend/src/main.ts）
- [X] T024 [P] 建立時間/時區 helper（UTC 存取、Asia/Taipei 解讀）(backend/src/common/time/time.ts)
- [X] T025 [P] 建立 AuditService（寫入 AuditEvent）（backend/src/audit/audit.service.ts）

### Backend: Auth/Roles

- [X] T026 建立 Auth module/service/controller（backend/src/auth/auth.module.ts、backend/src/auth/auth.service.ts、backend/src/auth/auth.controller.ts）
- [X] T027 [P] 建立 password hashing helper（bcrypt）（backend/src/auth/password.ts）
- [X] T028 [P] 建立 JWT strategy/guard（backend/src/auth/jwt.strategy.ts、backend/src/auth/jwt.guard.ts）
- [X] T029 [P] 建立 Roles decorator/guard 與 Role enum（backend/src/auth/roles.decorator.ts、backend/src/auth/roles.guard.ts、backend/src/auth/roles.ts）
- [X] T030 建立 Users/Me controller + presenter（不回傳 passwordHash）（backend/src/users/users.controller.ts、backend/src/users/user.presenter.ts）

### Backend: Seed + scripts

- [X] T031 建立 seed：admin/member + 範例活動（draft/published/full/closed）(backend/prisma/seed.ts)
- [X] T032 建立 DB scripts（migrate/seed/reset）(backend/package.json)

### Backend: Test harness

- [X] T033 [P] 設定 Jest e2e 設定檔（backend/test/jest-e2e.json）
- [X] T034 [P] 建立 e2e bootstrap（含 app init、Prisma cleanup）(backend/test/bootstrap.ts)
- [X] T035 [P] 建立 e2e helpers（註冊/登入拿 token、建立活動）(backend/test/test-utils.ts)

### Frontend: App foundation

- [X] T036 建立路由結構（含 /login、/register、/、/activities/:id、/me/activities、/admin/*）(frontend/src/app/router.tsx)
- [X] T037 [P] 設定 TanStack Query Provider（frontend/src/app/queryClient.ts、frontend/src/main.tsx）
- [X] T038 [P] 建立 http client（baseURL、token、錯誤解析）(frontend/src/api/httpClient.ts、frontend/src/api/errors.ts)
- [X] T039 [P] 建立 auth store（token 儲存/清除）(frontend/src/auth/authStore.ts)
- [X] T040 [P] 建立 RouteGuards（RequireAuth/RequireAdmin）(frontend/src/auth/RouteGuards.tsx)
- [X] T041 [P] 建立 AppShell/Navbar（frontend/src/components/layout/AppShell.tsx）
- [X] T042 [P] 建立 Toast/Alert（frontend/src/components/feedback/Toast.tsx、frontend/src/components/feedback/toastStore.ts）
- [X] T043 [P] 建立 Loading/ErrorState（frontend/src/components/feedback/Loading.tsx、frontend/src/components/feedback/ErrorState.tsx）

### Frontend: Test harness

- [X] T044 [P] 設定 Vitest + RTL（frontend/vitest.config.ts、frontend/src/test/setup.ts）

**Checkpoint**: Foundation ready — user stories 可開始（可平行）

---

## Phase 3: User Story 1 - 會員瀏覽活動並完成報名/取消 (Priority: P1)

**Goal**: Member 可完成「列表 → 詳情 → 報名 → 我的活動 → 取消」閉環；不超賣、不重複有效報名。

**Independent Test Criteria**:
- 使用 seed 的 member 帳號登入
- 列表只顯示 published/full
- 詳情可報名；重送不重複扣名額
- 取消後釋放名額；full 可回到 published

### Tests (Backend e2e)

- [X] T045 [P] [US1] e2e：/activities 只回 published/full（backend/test/us1.activities.list.e2e-spec.ts）
- [X] T046 [P] [US1] e2e：/activities/:id 不存在回 404（backend/test/us1.activities.detail404.e2e-spec.ts）
- [X] T047 [P] [US1] e2e：未登入報名回 401（backend/test/us1.registrations.auth.e2e-spec.ts）
- [X] T048 [P] [US1] e2e：報名成功 registeredCount +1（backend/test/us1.registrations.register.e2e-spec.ts）
- [X] T049 [P] [US1] e2e：重複送出報名冪等（backend/test/us1.registrations.idempotent.e2e-spec.ts）
- [X] T050 [P] [US1] e2e：並發搶最後名額 0 超賣（backend/test/us1.registrations.concurrent.e2e-spec.ts）
- [X] T051 [P] [US1] e2e：取消釋放名額 full->published（backend/test/us1.registrations.cancel.e2e-spec.ts）
- [X] T052 [P] [US1] e2e：/me/activities 只回有效報名（backend/test/us1.me.activities.e2e-spec.ts）

### Backend implementation

- [X] T053 [US1] 建立 Activities module/service（backend/src/activities/activities.module.ts、backend/src/activities/activities.service.ts）
- [X] T054 [US1] 實作 GET /activities（published/full）(backend/src/activities/activities.controller.ts)
- [X] T055 [US1] 實作 GET /activities/:activityId（對齊 ActivityDetail）(backend/src/activities/activities.controller.ts)
- [X] T056 [US1] 建立 OptionalJwt guard（允許未登入但可解析 token）(backend/src/auth/optional-jwt.guard.ts)
- [X] T057 [US1] 定義 registrationStatus 推導（auth_required/registered/can_register/full/closed/ended）(backend/src/activities/registration-status.ts)
- [X] T058 [US1] 建立 activity status updater（published<->full）(backend/src/activities/activity-status-updater.ts)
- [X] T059 [US1] 建立 Registrations module/service/controller（backend/src/registrations/registrations.module.ts、backend/src/registrations/registrations.service.ts、backend/src/registrations/registrations.controller.ts）
- [X] T060 [US1] 實作 POST /activities/:id/registrations（交易 + conditional update 防超賣）(backend/src/registrations/registrations.service.ts)
- [X] T061 [US1] 實作 DELETE /activities/:id/registrations/me（交易 + 名額釋放）(backend/src/registrations/registrations.service.ts)
- [X] T062 [US1] 實作冪等：唯一列 userId+activityId + canceledAt（backend/src/registrations/registrations.service.ts）
- [X] T063 [US1] 建立 Me controller：GET /me/activities（backend/src/me/me.controller.ts、backend/src/me/me.module.ts）
- [X] T064 [US1] 報名/取消寫入 AuditEvent（backend/src/audit/audit.service.ts）

### Frontend tests (minimal)

- [X] T065 [P] [US1] RTL：未登入在詳情點報名導向 /login（frontend/src/pages/__tests__/ActivityDetailPage.auth.test.tsx）
- [X] T066 [P] [US1] RTL：報名按鈕 loading/disable 防重送（frontend/src/pages/__tests__/ActivityDetailPage.submit.test.tsx）

### Frontend implementation

- [X] T067 [P] [US1] 建立 ActivityListPage（frontend/src/pages/ActivityListPage.tsx）
- [X] T068 [P] [US1] 建立 ActivityDetailPage（frontend/src/pages/ActivityDetailPage.tsx）
- [X] T069 [P] [US1] 建立 MyActivitiesPage（frontend/src/pages/MyActivitiesPage.tsx）
- [X] T070 [P] [US1] 建立 ActivityCard（frontend/src/components/activity/ActivityCard.tsx）
- [X] T071 [P] [US1] 建立 StatusBadge（frontend/src/components/activity/StatusBadge.tsx）
- [X] T072 [US1] 建立活動查詢 hooks（frontend/src/api/hooks/useActivities.ts、frontend/src/api/hooks/useActivityDetail.ts）
- [X] T073 [US1] 建立報名/取消 mutations（含 Idempotency-Key、toast）(frontend/src/api/hooks/useRegistrationMutations.ts)
- [X] T074 [US1] 報名/取消後 cache invalidation（frontend/src/api/hooks/useRegistrationMutations.ts）
- [X] T075 [US1] 詳情頁依 registrationStatus 顯示操作/提示（frontend/src/pages/ActivityDetailPage.tsx）
- [X] T076 [US1] 我的活動頁顯示有效報名列表（frontend/src/pages/MyActivitiesPage.tsx）

**Checkpoint**: US1 完成後，member 可不依賴後台完成閉環驗收

---

## Phase 4: User Story 2 - 管理員建立與管理活動（含狀態機） (Priority: P2)

**Goal**: Admin 可建立草稿、編輯、發布/取消發布、關閉報名、下架；轉移遵守狀態機規則。

**Independent Test Criteria**:
- 使用 seed 的 admin 帳號登入
- 建立 draft → publish 後 member 列表可見
- date/deadline/capacity 驗證正確
- close/archive/unpublish 依規則成功/失敗

### Tests (Backend e2e)

- [X] T077 [P] [US2] e2e：非 admin 存取 /admin/* 回 403（backend/test/us2.admin.authz.e2e-spec.ts）
- [X] T078 [P] [US2] e2e：date <= deadline 驗證失敗（backend/test/us2.activities.validation.e2e-spec.ts）
- [X] T079 [P] [US2] e2e：draft->published 後 /activities 可見（backend/test/us2.publish.visibility.e2e-spec.ts）
- [X] T080 [P] [US2] e2e：published->draft 後 /activities 不可見（backend/test/us2.unpublish.visibility.e2e-spec.ts）
- [X] T081 [P] [US2] e2e：published/full -> closed 後拒絕新報名（backend/test/us2.close.blocksRegistration.e2e-spec.ts）
- [X] T082 [P] [US2] e2e：closed/draft -> archived 後 member 不可見（backend/test/us2.archive.hidden.e2e-spec.ts）

### Backend implementation

- [X] T083 [US2] 建立 activity state machine（允許轉移表）(backend/src/activities/activity-state-machine.ts)
- [X] T084 [US2] 建立 AdminActivities module/service/controller（backend/src/admin/admin-activities.module.ts、backend/src/admin/admin-activities.service.ts、backend/src/admin/admin-activities.controller.ts）
- [X] T085 [US2] 實作 GET /admin/activities（backend/src/admin/admin-activities.controller.ts）
- [X] T086 [US2] 實作 POST /admin/activities（建立 draft）（backend/src/admin/admin-activities.controller.ts）
- [X] T087 [US2] 實作 PATCH /admin/activities/:id（更新欄位+驗證）（backend/src/admin/admin-activities.controller.ts）
- [X] T088 [US2] 實作 POST /admin/activities/:id/transitions（publish/close/archive/unpublish）(backend/src/admin/admin-activities.controller.ts)
- [X] T089 [US2] capacity 調整限制：capacity >= registeredCount（backend/src/admin/admin-activities.service.ts）
- [X] T090 [US2] 管理操作寫入 AuditEvent（backend/src/audit/audit.service.ts）

### Frontend tests (minimal)

- [X] T091 [P] [US2] RTL：RequireAdmin 非 admin 顯示 403（frontend/src/auth/__tests__/RequireAdmin.test.tsx）

### Frontend implementation

- [X] T092 [P] [US2] 建立 AdminPanelPage（frontend/src/pages/admin/AdminPanelPage.tsx）
- [X] T093 [P] [US2] 建立 AdminActivityEditorPage（RHF+Zod）（frontend/src/pages/admin/AdminActivityEditorPage.tsx）
- [X] T094 [P] [US2] 建立 ActivityTable（frontend/src/components/admin/ActivityTable.tsx）
- [X] T095 [P] [US2] 建立 ActivityActions（frontend/src/components/admin/ActivityActions.tsx）
- [X] T096 [US2] 建立 admin activities hooks（frontend/src/api/hooks/useAdminActivities.ts）
- [X] T097 [US2] 建立 editor schema（date/deadline/capacity）(frontend/src/lib/zodSchemas.ts)
- [X] T098 [US2] 將 /admin 路由掛 RequireAdmin（frontend/src/app/router.tsx）

**Checkpoint**: US2 完成後，admin 可獨立建立/管理活動並驗收狀態機

---

## Phase 5: User Story 3 - 管理員掌握報名名單與匯出 (Priority: P3)

**Goal**: Admin 可查看報名名單（姓名/Email/報名時間）並匯出 CSV（UTF-8 + BOM）。

**Independent Test Criteria**:
- 用 seed 或測試先建立至少 1 筆有效報名
- 名單預設不含已取消；includeCancelled 可包含
- CSV 下載可用 Excel 開啟不亂碼

### Tests (Backend e2e)

- [X] T099 [P] [US3] e2e：名單預設不含已取消（backend/test/us3.registrations.list.e2e-spec.ts）
- [X] T100 [P] [US3] e2e：includeCancelled=true 包含已取消（backend/test/us3.registrations.listCancelled.e2e-spec.ts）
- [X] T101 [P] [US3] e2e：CSV 匯出含 BOM 且欄位正確（backend/test/us3.registrations.exportCsv.e2e-spec.ts）

### Backend implementation

- [X] T102 [US3] 建立 AdminRegistrations module/service/controller（backend/src/admin/admin-registrations.module.ts、backend/src/admin/admin-registrations.service.ts、backend/src/admin/admin-registrations.controller.ts）
- [X] T103 [US3] 實作 GET /admin/activities/:id/registrations（backend/src/admin/admin-registrations.controller.ts）
- [X] T104 [US3] 實作 query includeCancelled（backend/src/admin/admin-registrations.service.ts）
- [X] T105 [US3] 實作 GET /admin/activities/:id/registrations.csv（串流 + UTF-8 BOM）(backend/src/admin/admin-registrations.controller.ts)
- [X] T106 [US3] 匯出操作寫入 AuditEvent（backend/src/audit/audit.service.ts）

### Frontend implementation

- [X] T107 [P] [US3] 建立 AdminRegistrationsPage（frontend/src/pages/admin/AdminRegistrationsPage.tsx）
- [X] T108 [P] [US3] 建立 RegistrationsTable（frontend/src/components/admin/RegistrationsTable.tsx）
- [X] T109 [US3] 建立 admin registrations hooks（frontend/src/api/hooks/useAdminRegistrations.ts）
- [X] T110 [US3] includeCancelled toggle + query 連動（frontend/src/pages/admin/AdminRegistrationsPage.tsx）
- [X] T111 [US3] CSV 下載（帶 auth header）(frontend/src/pages/admin/AdminRegistrationsPage.tsx)

**Checkpoint**: US3 完成後，admin 可掌握名單並匯出 CSV

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: 全域品質、可用性、安全性、文件/腳本收尾

- [X] T112 [P] 建立 LoginPage/RegisterPage（RHF+Zod）(frontend/src/pages/LoginPage.tsx、frontend/src/pages/RegisterPage.tsx)
- [X] T113 [P] 建立 Error pages（401/403/404）（frontend/src/pages/Error401Page.tsx、frontend/src/pages/Error403Page.tsx、frontend/src/pages/Error404Page.tsx）
- [X] T114 強化 RWD（列表/表格手機可用）（frontend/src/pages/ActivityListPage.tsx、frontend/src/pages/admin/AdminPanelPage.tsx）
- [X] T115 [P] 前端 ErrorResponse 映射到 toast（frontend/src/api/errors.ts、frontend/src/components/feedback/Toast.tsx）
- [X] T116 [P] 後端統一 401/403/404/409 錯誤碼與訊息（backend/src/common/errors/error-codes.ts）
- [X] T117 [P] OpenAPI 驗證腳本接到 root scripts（scripts/validate-openapi.sh、package.json）
- [X] T118 更新 quickstart 與 README 指令（specs/002-activity-management-platform/quickstart.md、README.md）
- [X] T119 執行全套測試與 smoke test 並修正不一致（backend/test/、frontend/src/）

---

## Dependencies & Execution Order

### Story Completion Order

- Setup → Foundational → (US1 / US2 / US3 可平行) → Polish

### Dependency Graph (story-level)

- Setup → Foundational → {US1, US2, US3} → Polish

---

## Parallel Execution Examples

### After Foundational (Phase 2)

- [US1] Backend（T053–T064）與 Frontend（T067–T076）可分工
- [US2] Backend（T083–T090）與 Frontend（T092–T098）可分工
- [US3] Backend（T102–T106）與 Frontend（T107–T111）可分工

---

## Implementation Strategy

- 先完成 Phase 1–2，確保 DB/auth/錯誤格式/logging/seed/測試框架穩定。
- 以 US1/US2/US3 各自端到端完成（含必要 e2e），每個故事都可獨立跑起來驗收。
- 最後做 Polish，收斂 UX、文件與 OpenAPI 驗證流程。

