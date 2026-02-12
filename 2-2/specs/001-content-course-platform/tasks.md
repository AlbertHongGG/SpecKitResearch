# Tasks: Content-based Online Course Platform (No Streaming)

**Input**: Design documents from /specs/001-content-course-platform/  
**Prerequisites**: plan.md (required), spec.md, research.md, data-model.md, contracts/  
**Tests**: 核心業務規則需測試（狀態機、權限、購買/進度）。已在各 User Story 與 Foundational 階段納入測試任務。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與基礎結構

- [x] T001 Create backend/ and frontend/ base structure at backend/ and frontend/
- [x] T002 Initialize NestJS app scaffold in backend/src/main.ts and backend/src/app.module.ts
- [x] T003 Initialize Next.js app scaffold in frontend/src/app/layout.tsx and frontend/src/app/page.tsx
- [x] T004 [P] Configure backend lint/format in backend/.eslintrc.cjs and backend/.prettierrc
- [x] T005 [P] Configure frontend lint/format in frontend/.eslintrc.cjs and frontend/.prettierrc
- [x] T006 [P] Configure Tailwind CSS in frontend/tailwind.config.ts and frontend/src/app/globals.css
- [x] T007 [P] Configure TypeScript settings in backend/tsconfig.json and frontend/tsconfig.json
- [x] T008 [P] Configure Prisma + SQLite in backend/prisma/schema.prisma and backend/.env.example
- [x] T009 [P] Add env templates in backend/.env.example and frontend/.env.local.example
- [x] T010 [P] Add dev/test scripts in backend/package.json and frontend/package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 User Story 的共同基礎（完成前不可開始故事）

- [x] T011 Implement Prisma models per data-model in backend/prisma/schema.prisma
- [x] T012 Create initial migration in backend/prisma/migrations/
- [x] T013 Implement Prisma service/repository base in backend/src/repositories/prisma.service.ts
- [x] T014 Implement password hashing utilities in backend/src/lib/password.ts
- [x] T015 Implement session repository/service in backend/src/modules/auth/session.service.ts
- [x] T016 Implement auth controller (register/login/logout) in backend/src/modules/auth/auth.controller.ts
- [x] T017 Implement auth guard + session middleware in backend/src/modules/auth/auth.guard.ts and backend/src/modules/auth/session.middleware.ts
- [x] T018 Implement RBAC roles guard/decorator in backend/src/modules/auth/roles.guard.ts and backend/src/modules/auth/roles.decorator.ts
- [x] T019 Implement error response filter in backend/src/filters/http-exception.filter.ts
- [x] T020 Implement request/trace id middleware in backend/src/middleware/request-id.middleware.ts
- [x] T021 Implement logging interceptor in backend/src/interceptors/logging.interceptor.ts
- [x] T022 Define error codes in backend/src/lib/error-codes.ts
- [x] T023 Implement course visibility/access helpers in backend/src/modules/courses/access-control.ts
- [x] T024 Implement protected file download module in backend/src/modules/files/files.controller.ts and backend/src/modules/files/files.service.ts
- [x] T025 Wire core modules in backend/src/app.module.ts
- [x] T026 Setup API client with error redirects in frontend/src/lib/api.ts
- [x] T027 Setup TanStack Query provider in frontend/src/lib/query-client.ts and frontend/src/app/providers.tsx
- [x] T028 Setup auth context/session hook in frontend/src/features/auth/auth-context.tsx and frontend/src/features/auth/use-session.ts
- [x] T029 Setup route guard + role guard in frontend/src/components/route-guard.tsx and frontend/src/components/role-guard.tsx
- [x] T030 Setup global error pages in frontend/src/app/403/page.tsx, frontend/src/app/404/page.tsx, frontend/src/app/500/page.tsx
- [x] T031 Setup header navigation in frontend/src/components/header.tsx and frontend/src/app/layout.tsx
- [x] T032 Setup shared UI components in frontend/src/components/ui/
- [x] T033 Setup validation schemas in frontend/src/lib/validation.ts
- [x] T034 [P] Add auth/session unit tests in backend/test/unit/auth/session.spec.ts
- [x] T035 [P] Add RBAC/access-control unit tests in backend/test/unit/auth/rbac.spec.ts and backend/test/unit/courses/access-control.spec.ts
- [x] T036 [P] Add auth integration test in backend/test/integration/auth.e2e-spec.ts

**Checkpoint**: Foundation ready - user story work can begin

---

## Phase 3: User Story 1 - 購買並閱讀課程內容 (Priority: P1)

**Goal**: 學員可瀏覽已上架課程、購買並永久存取課程內容與附件

**Independent Test**: 單一課程完成「瀏覽 → 購買 → 閱讀內容 → 標記完成」

### Tests for User Story 1

- [x] T037 [P] [US1] Add purchase/access integration test in backend/test/integration/purchase.e2e-spec.ts
- [x] T038 [P] [US1] Add progress aggregation test in backend/test/integration/progress.e2e-spec.ts
- [x] T039 [P] [US1] Add Playwright student flow in frontend/tests/e2e/student-purchase.spec.ts

### Implementation for User Story 1

- [x] T040 [P] [US1] Implement published course list service in backend/src/modules/courses/course.service.ts
- [x] T041 [P] [US1] Implement course marketing endpoints in backend/src/modules/courses/course.controller.ts
- [x] T042 [P] [US1] Implement purchase service/repo with idempotency in backend/src/modules/purchases/purchase.service.ts
- [x] T043 [P] [US1] Implement purchase endpoint in backend/src/modules/purchases/purchase.controller.ts
- [x] T044 [P] [US1] Implement my-courses + progress aggregation in backend/src/modules/courses/my-courses.service.ts
- [x] T045 [P] [US1] Implement course reader endpoint in backend/src/modules/courses/reader.controller.ts
- [x] T046 [P] [US1] Implement lesson progress endpoint in backend/src/modules/progress/progress.controller.ts
- [x] T047 [P] [US1] Enforce 403/404 visibility rules in backend/src/modules/courses/access-control.ts
- [x] T048 [US1] Wire US1 modules in backend/src/app.module.ts
- [x] T049 [P] [US1] Build home page CTA in frontend/src/app/page.tsx
- [x] T050 [P] [US1] Build login/register pages in frontend/src/app/login/page.tsx and frontend/src/app/register/page.tsx
- [x] T051 [P] [US1] Build courses list page in frontend/src/app/courses/page.tsx
- [x] T052 [P] [US1] Build course detail page in frontend/src/app/courses/[courseId]/page.tsx
- [x] T053 [P] [US1] Build my-courses page in frontend/src/app/my-courses/page.tsx
- [x] T054 [P] [US1] Build course reader page in frontend/src/app/my-courses/[courseId]/page.tsx
- [x] T055 [P] [US1] Implement courses/purchase/progress API hooks in frontend/src/features/courses/api.ts and frontend/src/features/progress/api.ts
- [x] T056 [P] [US1] Implement loading/error/empty UI in frontend/src/features/courses/components/
- [x] T057 [US1] Enforce auth redirect on 401 for /my-courses in frontend/src/components/route-guard.tsx

**Checkpoint**: User Story 1 完成且可獨立測試

---

## Phase 4: User Story 2 - 教師建立並送審課程 (Priority: P2)

**Goal**: 教師可建立課程、編排章節與單元，並提交審核

**Independent Test**: 完成「建立 → 編排 → 送審 → submitted 鎖定」

### Tests for User Story 2

- [x] T058 [P] [US2] Add submit state transition test in backend/test/integration/course-submit.e2e-spec.ts
- [x] T059 [P] [US2] Add curriculum permission test in backend/test/integration/curriculum.e2e-spec.ts
- [x] T060 [P] [US2] Add Playwright instructor flow in frontend/tests/e2e/instructor-flow.spec.ts

### Implementation for User Story 2

- [x] T061 [P] [US2] Implement instructor course CRUD in backend/src/modules/instructor/instructor-courses.controller.ts
- [x] T062 [P] [US2] Implement submitted lock validation in backend/src/modules/instructor/instructor-courses.service.ts
- [x] T063 [P] [US2] Implement section/lesson CRUD + ordering in backend/src/modules/curriculum/curriculum.controller.ts
- [x] T064 [P] [US2] Implement submit-for-review endpoint in backend/src/modules/instructor/course-submit.controller.ts
- [x] T065 [US2] Wire instructor/curriculum modules in backend/src/app.module.ts
- [x] T066 [P] [US2] Build instructor courses list in frontend/src/app/instructor/courses/page.tsx
- [x] T067 [P] [US2] Build new course page in frontend/src/app/instructor/courses/new/page.tsx
- [x] T068 [P] [US2] Build edit course page in frontend/src/app/instructor/courses/[courseId]/edit/page.tsx
- [x] T069 [P] [US2] Build curriculum editor in frontend/src/app/instructor/courses/[courseId]/curriculum/page.tsx
- [x] T070 [P] [US2] Implement instructor API hooks in frontend/src/features/instructor/api.ts
- [x] T071 [P] [US2] Implement submit UI disable + status UI in frontend/src/features/instructor/components/
- [x] T072 [US2] Enforce instructor-only routes in frontend/src/components/role-guard.tsx

**Checkpoint**: User Story 2 完成且可獨立測試

---

## Phase 5: User Story 3 - 管理員審核與營運管理 (Priority: P3)

**Goal**: 管理員可審核課程、管理分類/標籤/使用者與統計

**Independent Test**: 完成「審核 → 狀態更新 → 統計查看」

### Tests for User Story 3

- [x] T073 [P] [US3] Add admin review test in backend/test/integration/admin-review.e2e-spec.ts
- [x] T074 [P] [US3] Add taxonomy/users test in backend/test/integration/admin-taxonomy-users.e2e-spec.ts
- [x] T075 [P] [US3] Add Playwright admin flow in frontend/tests/e2e/admin-flow.spec.ts

### Implementation for User Story 3

- [x] T076 [P] [US3] Implement review queue/decision endpoints in backend/src/modules/admin/review.controller.ts
- [x] T077 [P] [US3] Implement admin course publish/archive endpoints in backend/src/modules/admin/courses.controller.ts
- [x] T078 [P] [US3] Implement taxonomy CRUD in backend/src/modules/admin/taxonomy.controller.ts
- [x] T079 [P] [US3] Implement user management endpoints in backend/src/modules/admin/users.controller.ts
- [x] T080 [P] [US3] Implement stats endpoint in backend/src/modules/admin/stats.controller.ts
- [x] T081 [US3] Wire admin modules in backend/src/app.module.ts
- [x] T082 [P] [US3] Build admin review page in frontend/src/app/admin/review/page.tsx
- [x] T083 [P] [US3] Build admin courses page in frontend/src/app/admin/courses/page.tsx
- [x] T084 [P] [US3] Build admin taxonomy page in frontend/src/app/admin/taxonomy/page.tsx
- [x] T085 [P] [US3] Build admin users page in frontend/src/app/admin/users/page.tsx
- [x] T086 [P] [US3] Build admin stats page in frontend/src/app/admin/stats/page.tsx
- [x] T087 [P] [US3] Implement admin API hooks in frontend/src/features/admin/api.ts
- [x] T088 [P] [US3] Implement admin UI states + validation in frontend/src/features/admin/components/
- [x] T089 [US3] Enforce admin-only routes in frontend/src/components/role-guard.tsx

**Checkpoint**: User Story 3 完成且可獨立測試

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事品質提升與驗證

- [x] T090 [P] Add seed script in backend/prisma/seed.ts
- [x] T091 [P] RWD + accessibility pass in frontend/src/app/**/page.tsx and frontend/src/components/
- [x] T092 [P] Add lesson content renderer + download UX in frontend/src/features/courses/components/lesson-content.tsx
- [x] T093 [P] Add query caching/invalidation strategy in frontend/src/lib/query-client.ts
- [x] T094 [P] Optimize list query performance in backend/src/modules/courses/course.service.ts
- [x] T095 [P] Security hardening review in backend/src/modules/auth/auth.guard.ts and backend/src/filters/http-exception.filter.ts
- [x] T096 [P] Validate quickstart steps in specs/001-content-course-platform/quickstart.md
- [x] T097 [P] Add critical action logging in backend/src/interceptors/logging.interceptor.ts
- [x] T098 [P] Add Playwright smoke suite in frontend/tests/e2e/smoke.spec.ts
- [x] T099 [P] Add frontend validation unit tests in frontend/tests/unit/validation.spec.ts
- [x] T100 [P] Document verification notes in specs/001-content-course-platform/verification.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup completion (BLOCKS all user stories)
- **User Stories (Phase 3-5)**: Depend on Foundational completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent after Foundational
- **US2 (P2)**: Independent after Foundational
- **US3 (P3)**: Independent after Foundational

### Within Each User Story

- Tests → Services/Repositories → Endpoints → UI → Integration

---

## Parallel Execution Examples

### US1 Parallel Set

- T040, T042, T044, T045, T046 (backend services/controllers)
- T049, T051, T052, T053, T054 (frontend pages)

### US2 Parallel Set

- T061, T063, T064 (backend) in parallel with T066, T067, T069 (frontend)

### US3 Parallel Set

- T076, T078, T079, T080 (backend) in parallel with T082, T084, T085, T086 (frontend)

---

## Implementation Strategy

### Full Delivery (Requested)

1. 完成 Setup 與 Foundational
2. 依優先序完成 US1 → US2 → US3（皆需獨立測試）
3. 進入 Polish，補齊品質與驗證
4. 完整系統交付（含邏輯、UI、測試）
