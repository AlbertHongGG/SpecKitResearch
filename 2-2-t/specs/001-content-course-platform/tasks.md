---

description: "Task list for feature implementation"
---

# Tasks: 線上課程平台（內容型，非影音串流）

**Input**: Design documents from /specs/001-content-course-platform/
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 核心 domain/狀態機/權限/冪等規則必須有測試（happy path、edge case、failure）。

**Organization**: 依 User Story 分組，確保每個 Story 可獨立完成與驗證。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 專案初始化與基礎結構

- [X] T001 建立 monorepo 目錄結構（frontend/, backend/, packages/contracts/）
- [X] T002 初始化根目錄 package.json 與工作區設定於 package.json、pnpm-workspace.yaml
- [X] T003 [P] 建立共用 TypeScript 設定於 tsconfig.base.json
- [X] T004 [P] 建立共用 ESLint/Prettier 設定於 .eslintrc.cjs、.prettierrc
- [X] T005 建立 frontend 專案骨架與依賴於 frontend/package.json
- [X] T006 建立 backend 專案骨架與依賴於 backend/package.json
- [X] T007 建立 contracts 專案骨架與依賴於 packages/contracts/package.json
- [X] T008 [P] 建立環境變數範例檔案於 frontend/.env.example
- [X] T009 [P] 建立環境變數範例檔案於 backend/.env.example
- [X] T010 建立 monorepo 腳本（dev/build/test）於 package.json
- [X] T011 [P] 建立 frontend Tailwind 設定於 frontend/tailwind.config.ts、frontend/src/app/globals.css
- [X] T012 [P] 建立 frontend 基本版面與頁面框架於 frontend/src/app/layout.tsx
- [X] T013 建立 backend NestJS 主要入口與模組於 backend/src/main.ts、backend/src/app.module.ts
- [X] T014 建立 Prisma 設定與初始化於 backend/prisma/schema.prisma

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有 User Story 的共用基礎能力（完成前不可開始任何 Story）

- [X] T015 建立共用錯誤格式與錯誤碼 schema 於 packages/contracts/src/http/errors.ts
- [X] T016 建立共用 Zod schema 匯出與 barrel 於 packages/contracts/src/schemas/index.ts
- [X] T017 建立 backend Zod 驗證 pipe 於 backend/src/common/pipes/zod-validation.pipe.ts
- [X] T018 建立 backend 全域例外處理與錯誤格式統一於 backend/src/common/filters/http-exception.filter.ts
- [X] T019 建立 backend request id middleware 與 log 介面於 backend/src/common/middleware/request-id.middleware.ts
- [X] T020 建立 backend 結構化 logging helper 於 backend/src/common/logger/logger.ts
- [X] T021 建立 backend 設定管理與環境變數驗證於 backend/src/config/config.module.ts
- [X] T022 建立 frontend API client（含 cookies、錯誤映射）於 frontend/src/services/api-client.ts
- [X] T023 [P] 建立 frontend 共用 UI 元件（Button/Input/Alert/EmptyState）於 frontend/src/components/ui/
- [X] T024 [P] 建立 frontend 錯誤頁面 /403 /404 /500（App Router + Pages error pages）於 frontend/src/app/403/page.tsx、frontend/src/app/not-found.tsx、frontend/src/pages/404.tsx、frontend/src/pages/500.tsx
- [X] T025 建立 frontend loading skeleton 基礎元件於 frontend/src/components/ui/skeleton.tsx
- [X] T026 建立 Prisma 基礎 schema（全部核心 entity）於 backend/prisma/schema.prisma
- [X] T027 建立 Prisma migration 與初始化指令於 backend/prisma/migrations/
- [X] T028 建立 backend 資料庫連線模組於 backend/src/database/prisma.module.ts
- [X] T029 建立 backend 權限工具與資源政策 helper 於 backend/src/common/auth/policies.ts
- [X] T030 建立 backend RBAC 角色與 guard 於 backend/src/common/auth/roles.guard.ts
- [X] T031 建立 frontend 角色常數與導覽判斷 helper 於 frontend/src/lib/roles.ts
- [X] T032 建立 frontend header/navigation 基礎結構於 frontend/src/components/layout/header.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 瀏覽已上架課程（行銷資訊）(Priority: P1)

**Goal**: Guest/已登入使用者可瀏覽 published 課程列表與詳情，非可見課程回 404

**Independent Test**: 建立一門 published 課程，即可驗證列表與詳情、不可見課程 404

### Tests for User Story 1

- [X] T033 [P] [US1] 建立課程行銷列表/詳情 API contract 測試於 backend/test/contract/courses.marketing.spec.ts
- [X] T034 [P] [US1] 建立可見性 404 規則整合測試於 backend/test/integration/course-visibility.spec.ts
- [X] T035 [P] [US1] 建立前端 E2E 測試：/courses 列表與 404 於 frontend/tests/e2e/courses-marketing.spec.ts

### Implementation for User Story 1

- [X] T036 [P] [US1] 建立課程查詢 repository 於 backend/src/courses/course.repository.ts
- [X] T037 [US1] 實作課程行銷可見性政策於 backend/src/courses/course-visibility.policy.ts
- [X] T038 [US1] 實作 GET /courses handler 於 backend/src/courses/courses.controller.ts
- [X] T039 [US1] 實作 GET /courses/:id 行銷詳情 handler 於 backend/src/courses/courses.controller.ts
- [X] T040 [US1] 建立行銷 DTO/Zod schema 於 packages/contracts/src/schemas/course-marketing.ts
- [X] T041 [P] [US1] 建立前端課程列表頁 UI 於 frontend/src/app/courses/page.tsx
- [X] T042 [P] [US1] 建立前端課程詳情頁 UI 於 frontend/src/app/courses/[courseId]/page.tsx
- [X] T043 [US1] 建立前端課程卡片元件於 frontend/src/components/courses/course-card.tsx
- [X] T044 [US1] 建立前端課程列表服務層於 frontend/src/services/courses.ts
- [X] T045 [US1] 建立前端詳情頁 outline 顯示元件於 frontend/src/components/courses/course-outline.tsx
- [X] T046 [US1] 加入 404 導向處理（行銷不可見）於 frontend/src/services/api-client.ts

**Checkpoint**: User Story 1 可獨立使用與驗證

---

## Phase 4: User Story 2 - 註冊/登入/登出與 Session 失效一致性 (Priority: P1)

**Goal**: Email+密碼註冊/登入/登出，session 可撤銷，受保護頁 401 導向登入

**Independent Test**: 單一帳號即可完成註冊/登入/登出/失效導向驗證

### Tests for User Story 2

- [X] T047 [P] [US2] 建立註冊/登入/登出 contract 測試於 backend/test/contract/auth.spec.ts
- [X] T048 [P] [US2] 建立 session 失效 401 整合測試於 backend/test/integration/session-invalid.spec.ts
- [X] T049 [P] [US2] 建立前端 E2E：401 導向 /login?redirect= 於 frontend/tests/e2e/auth-redirect.spec.ts

### Implementation for User Story 2

- [X] T050 [P] [US2] 建立使用者密碼雜湊工具於 backend/src/auth/password.service.ts
- [X] T051 [US2] 實作 Session token 產生與 hash 於 backend/src/auth/session.service.ts
- [X] T052 [US2] 實作註冊/登入/登出/Session introspection 於 backend/src/auth/auth.controller.ts
- [X] T053 [US2] 實作 Auth 模組 wiring 於 backend/src/auth/auth.module.ts
- [X] T054 [US2] 實作 backend session guard 於 backend/src/common/auth/session.guard.ts
- [X] T055 [P] [US2] 建立前端登入頁面與表單於 frontend/src/app/login/page.tsx
- [X] T056 [P] [US2] 建立前端註冊頁面與表單於 frontend/src/app/register/page.tsx
- [X] T057 [US2] 建立前端 auth 服務層於 frontend/src/services/auth.ts
- [X] T058 [US2] 實作前端 server component guard layout 於 frontend/src/app/(protected)/layout.tsx
- [X] T059 [US2] 實作 Header 角色顯示與登入狀態切換於 frontend/src/components/layout/header.tsx
- [X] T060 [US2] 加入停用帳號錯誤訊息顯示於 frontend/src/app/login/page.tsx

**Checkpoint**: User Story 2 可獨立使用與驗證

---

## Phase 5: User Story 3 - 購買課程並永久存取內容（含進度）(Priority: P2)

**Goal**: 購買 published 課程、閱讀內容、受保護附件下載、進度完成標記

**Independent Test**: 單一使用者+單一 published 課程即可驗證購買、內容存取、進度

### Tests for User Story 3

- [X] T061 [P] [US3] 建立購買冪等整合測試於 backend/test/integration/purchase-idempotency.spec.ts
- [X] T062 [P] [US3] 建立內容存取 403/401 測試於 backend/test/integration/content-access.spec.ts
- [X] T063 [P] [US3] 建立進度冪等測試於 backend/test/integration/progress-idempotency.spec.ts
- [X] T064 [P] [US3] 建立附件下載存取測試於 backend/test/integration/attachment-download.spec.ts
- [X] T065 [P] [US3] 建立前端 E2E：購買/閱讀/進度於 frontend/tests/e2e/purchase-reader-progress.spec.ts

### Implementation for User Story 3

- [X] T066 [US3] 實作購買流程與冪等處理於 backend/src/purchases/purchases.service.ts
- [X] T067 [US3] 實作 POST /courses/:id/purchase 於 backend/src/purchases/purchases.controller.ts
- [X] T068 [US3] 實作我的課程查詢與進度彙總於 backend/src/progress/progress.service.ts
- [X] T069 [US3] 實作 GET /my-courses 與 GET /my-courses/:id 於 backend/src/my-courses/my-courses.controller.ts
- [X] T070 [US3] 實作 POST /progress/complete 於 backend/src/progress/progress.controller.ts
- [X] T071 [US3] 實作內容存取權限政策於 backend/src/courses/course-content.policy.ts
- [X] T072 [US3] 實作附件儲存 metadata 與下載串流於 backend/src/attachments/attachments.controller.ts
- [X] T073 [US3] 實作附件檔案存取服務與補償清理於 backend/src/attachments/attachments.service.ts
- [X] T074 [P] [US3] 建立前端「購買」CTA 與防重送於 frontend/src/components/courses/purchase-cta.tsx
- [X] T075 [P] [US3] 建立前端我的課程列表頁於 frontend/src/app/my-courses/page.tsx
- [X] T076 [P] [US3] 建立前端課程閱讀頁於 frontend/src/app/my-courses/[courseId]/page.tsx
- [X] T077 [US3] 建立前端課程閱讀元件（內容/附件/進度）於 frontend/src/components/reader/course-reader.tsx
- [X] T078 [US3] 建立前端進度標記服務於 frontend/src/services/progress.ts
- [X] T079 [US3] 建立前端附件下載服務於 frontend/src/services/attachments.ts

**Checkpoint**: User Story 3 可獨立使用與驗證

---

## Phase 6: User Story 4 - 教師建立課程、編排課綱、提交審核與內容維護 (Priority: P2)

**Goal**: 教師可建立/編輯課程與課綱，submitted 鎖定，並可上下架

**Independent Test**: 單一 instructor 帳號可完成建立、課綱編輯、提交審核、上下架

### Tests for User Story 4

- [X] T080 [P] [US4] 建立課程狀態機與 submitted lock 測試於 backend/test/integration/course-state-lock.spec.ts
- [X] T081 [P] [US4] 建立課綱排序唯一性測試於 backend/test/integration/curriculum-order.spec.ts
- [X] T082 [P] [US4] 建立前端 E2E：課程建立與提交審核於 frontend/tests/e2e/instructor-course.spec.ts

### Implementation for User Story 4

- [X] T083 [US4] 實作 instructor 課程 CRUD 於 backend/src/instructor/instructor-courses.controller.ts
- [X] T084 [US4] 實作課程狀態轉換 service（submitted/published/archived）於 backend/src/courses/course-state.service.ts
- [X] T085 [US4] 實作課綱 Section/Lesson CRUD 與排序於 backend/src/instructor/curriculum.controller.ts
- [X] T086 [US4] 實作 submitted lock 驗證於 backend/src/courses/course-lock.policy.ts
- [X] T087 [US4] 實作 instructor 模組 wiring 於 backend/src/instructor/instructor.module.ts
- [X] T088 [P] [US4] 建立前端教師後台入口與列表頁於 frontend/src/app/instructor/courses/page.tsx
- [X] T089 [P] [US4] 建立前端課程編輯頁（基本資訊）於 frontend/src/app/instructor/courses/[courseId]/page.tsx
- [X] T090 [P] [US4] 建立前端課綱編輯 UI 於 frontend/src/components/instructor/curriculum-editor.tsx
- [X] T091 [US4] 建立前端提交審核與狀態提示於 frontend/src/components/instructor/course-status-actions.tsx
- [X] T092 [US4] 建立前端 instructor 服務層於 frontend/src/services/instructor.ts

**Checkpoint**: User Story 4 可獨立使用與驗證

---

## Phase 7: User Story 5 - 管理員審核課程並留存審核紀錄 (Priority: P3)

**Goal**: 管理員審核 submitted 課程、留下審核紀錄，並管理分類/標籤/使用者/統計

**Independent Test**: 單一 submitted 課程可完成核准/駁回與審核紀錄查驗

### Tests for User Story 5

- [X] T093 [P] [US5] 建立審核決策與理由必填測試於 backend/test/integration/admin-review.spec.ts
- [X] T094 [P] [US5] 建立分類/標籤唯一性測試於 backend/test/integration/taxonomy.spec.ts
- [X] T095 [P] [US5] 建立使用者停用/角色變更測試於 backend/test/integration/admin-users.spec.ts
- [X] T096 [P] [US5] 建立統計彙總測試於 backend/test/integration/admin-stats.spec.ts
- [X] T097 [P] [US5] 建立前端 E2E：審核流程與後台管理於 frontend/tests/e2e/admin.spec.ts

### Implementation for User Story 5

- [X] T098 [US5] 實作審核隊列與決策 API 於 backend/src/admin/reviews.controller.ts
- [X] T099 [US5] 實作審核紀錄寫入與狀態轉換於 backend/src/admin/reviews.service.ts
- [X] T100 [US5] 實作分類/標籤管理 API 於 backend/src/taxonomy/taxonomy.controller.ts
- [X] T101 [US5] 實作分類/標籤服務層與唯一性驗證於 backend/src/taxonomy/taxonomy.service.ts
- [X] T102 [US5] 實作使用者管理 API 於 backend/src/admin/users.controller.ts
- [X] T103 [US5] 實作使用者角色/停用服務於 backend/src/admin/users.service.ts
- [X] T104 [US5] 實作統計 API 於 backend/src/stats/stats.controller.ts
- [X] T105 [US5] 實作統計查詢服務於 backend/src/stats/stats.service.ts
- [X] T106 [P] [US5] 建立前端管理員審核列表頁於 frontend/src/app/admin/reviews/page.tsx
- [X] T107 [P] [US5] 建立前端審核詳情與決策表單於 frontend/src/app/admin/reviews/[courseId]/page.tsx
- [X] T108 [P] [US5] 建立前端分類/標籤管理頁於 frontend/src/app/admin/taxonomy/page.tsx
- [X] T109 [P] [US5] 建立前端使用者管理頁於 frontend/src/app/admin/users/page.tsx
- [X] T110 [P] [US5] 建立前端統計頁於 frontend/src/app/admin/stats/page.tsx
- [X] T111 [US5] 建立前端 admin 服務層於 frontend/src/services/admin.ts

**Checkpoint**: User Story 5 可獨立使用與驗證

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事與品質強化

- [X] T112 [P] 全站 UI 一致性與 RWD 調整於 frontend/src/components/layout/、frontend/src/app/
- [X] T113 強化內容安全渲染與轉義策略於 frontend/src/components/reader/content-renderer.tsx
- [X] T114 建立 uploads 目錄管理與清理策略於 backend/src/attachments/storage.local.ts
- [X] T115 建立錯誤碼與訊息對照文件於 packages/contracts/src/http/error-codes.ts
- [X] T116 [P] 寫入基礎 seed 資料（示範課程/使用者/分類）於 backend/prisma/seed.ts
- [X] T117 強化效能與重試策略（SQLite busy/backoff）於 backend/src/common/database/retry.ts
- [X] T118 [P] 更新 quickstart 步驟驗證清單於 specs/001-content-course-platform/quickstart.md
- [X] T119 安全性檢查與權限覆蓋回顧於 backend/src/common/auth/policies.ts
- [X] T120 完成最終整合測試清單與驗收紀錄於 specs/001-content-course-platform/checklists/requirements.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → User Stories (Phase 3-7) → Polish (Phase 8)

### User Story Dependencies

- US1、US2、US3、US4、US5 皆依賴 Foundational 完成
- US3 依賴 US2 的登入/Session 能力
- US4 依賴 US2 的登入/角色能力
- US5 依賴 US2 的登入/角色能力

### Within Each User Story

- 測試先行（必須先失敗）→ service/政策 → controller → 前端 UI → E2E

---

## Parallel Execution Examples

### US1

- T033、T034、T035 可並行
- T041、T042、T043 可並行

### US2

- T047、T048、T049 可並行
- T055、T056 可並行

### US3

- T061、T062、T063、T064、T065 可並行
- T074、T075、T076 可並行

### US4

- T080、T081、T082 可並行
- T088、T089、T090 可並行

### US5

- T093、T094、T095、T096、T097 可並行
- T106、T107、T108、T109、T110 可並行

---

## Implementation Strategy

### 完整交付（非 MVP）

1. 完成 Phase 1 + Phase 2
2. 依優先序完成 US1 → US2 → US3 → US4 → US5
3. 每個 Story 完成後獨立驗證
4. 最後完成 Phase 8 的跨故事品質強化

### Incremental Delivery

- 每個 Story 均為可獨立驗證的增量，不阻斷其他 Story
