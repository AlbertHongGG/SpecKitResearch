---

description: "Task list for feature implementation"
---

# Tasks: 線上課程平台（非影音串流）

**Input**: Design documents from `/specs/001-content-course-platform/`

- Required: `plan.md`, `spec.md`
- Available: `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: 本 tasks 清單不強制採 TDD，也不強制新增測試任務（除非你要我改成測試優先）。但每個 User Story 都提供「獨立驗收/手動測試」標準。

## Format: `[ID] [P?] [Story] Description with file path`

- **[P]**: 可平行（不同檔案/模組，且不依賴未完成任務）
- **[Story]**: User Story 標記（僅 User Story phases 使用）：`[US1]`, `[US2]`, `[US3]`
- 每個 task 描述必須包含明確檔案路徑

## Path Conventions (per plan.md)

- Next.js App Router fullstack
- UI pages: `app/**`
- API route handlers: `app/api/**/route.ts`
- Shared libs/services: `src/**`
- Prisma: `prisma/**`
- Protected local files: `uploads/` (不提交)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 初始化 Next.js 專案與共用開發工具（不含任何特定 user story 業務）

- [X] T001 建立 Next.js(App Router)+TS 專案骨架（package.json, next.config.ts, tsconfig.json, app/, src/, app/(public)/page.tsx）
- [X] T002 [P] 設定 Tailwind 基礎樣式（tailwind.config.ts, postcss.config.mjs, app/globals.css）
- [X] T003 [P] 設定 ESLint/Prettier 與格式化腳本（eslint.config.mjs, .prettierrc, .prettierignore）
- [X] T004 [P] 新增 Git ignore（.gitignore：.env*, dev.db, prisma/dev.db, uploads/, .next/）
- [X] T005 補齊 npm scripts（package.json：dev/build/start/lint/format/prisma:*）
- [X] T006 [P] 建立環境變數範本（.env.example：DATABASE_URL, SESSION_SECRET, UPLOAD_DIR）
- [X] T007 [P] 建立 env 驗證（src/lib/env.ts：Zod schema + runtime checks）
- [X] T008 初始化 Prisma 目錄（prisma/schema.prisma, prisma/migrations/）
- [X] T009 [P] Prisma client 初始化（src/db/prisma.ts：singleton pattern）
- [X] T010 建立全站 Providers（app/providers.tsx：TanStack Query Provider + 自訂 UI providers）
- [X] T011 套用根 layout（app/layout.tsx：引入 globals.css + Providers）
- [X] T012 [P] 建立路由群組 layouts（app/(public)/layout.tsx, app/(protected)/layout.tsx, app/(protected)/instructor/layout.tsx, app/(protected)/admin/layout.tsx）
- [X] T013 [P] 建立通用 UI 元件（src/components/ui/Button.tsx, Input.tsx, Textarea.tsx, Select.tsx, Badge.tsx）
- [X] T014 [P] 建立 loading/empty/error 元件（src/components/ui/Loading.tsx, EmptyState.tsx, InlineError.tsx）
- [X] T015 建立導覽列骨架（src/components/NavBar.tsx + app/(public)/layout.tsx 使用）
- [X] T016 建立受保護導覽列骨架（src/components/ProtectedNavBar.tsx + app/(protected)/layout.tsx 使用）
- [X] T017 [P] 建立共用型別（src/lib/types.ts：Role, CourseStatus, LessonContentType）
- [X] T018 [P] 建立共用日期/格式化工具（src/lib/format.ts）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心基礎設施（DB/Auth/RBAC/錯誤處理/狀態機/檔案存取）— 完成後才能開始任何 User Story

- [X] T019 建立 Prisma schema（prisma/schema.prisma：User, Session, Category, Tag, Course, CourseTag, Section, Lesson, Purchase, LessonProgress, CourseReview, FileAsset[visibility+storagePath+courseId?/lessonId?]）
- [X] T020 建立 Prisma migration（prisma/migrations/**：透過 prisma migrate dev 產生）
- [X] T021 [P] 建立 Prisma seed（prisma/seed.ts：admin/instructor/student 範例、分類/標籤、示範課程）
- [X] T022 [P] 補齊 Prisma seed 入口（package.json scripts：prisma:seed）
- [X] T023 [P] 建立密碼雜湊工具（src/lib/auth/password.ts：hash/verify，使用 Node crypto）
- [X] T024 [P] 建立 session token 工具（src/lib/auth/sessionToken.ts：產生 random token + hash）
- [X] T025 建立 session DB 操作（src/lib/auth/sessionStore.ts：create/revoke/findValid/updateLastSeen）
- [X] T026 建立 cookie helpers（src/lib/auth/cookies.ts：setSessionCookie/clearSessionCookie）
- [X] T027 建立 current user 取得（src/lib/auth/currentUser.ts：從 cookie 讀 token → 查 Session+User → 驗證 isActive）
- [X] T028 建立 requireUser/requireRole（src/lib/auth/guards.ts：requireUser, requireRole）
- [X] T029 [P] 建立 RBAC helpers（src/lib/rbac/rbac.ts：isAdmin/isInstructor/isStudent）
- [X] T030 [P] 建立 course 可見性/內容存取規則（src/lib/access/courseAccess.ts：canViewMarketing, canReadContent, shouldHideMarketingAs404）
- [X] T031 [P] 建立課程狀態機（src/lib/courses/stateMachine.ts：合法轉換表 + 轉換函式）
- [X] T032 [P] 建立 API 錯誤模型（src/lib/errors/AppError.ts：code/status/message/details）
- [X] T033 [P] 建立 API response helpers（src/lib/http/apiResponse.ts：ok/created/fail；統一 ErrorResponse）
- [X] T034 [P] 建立 Route Handler 包裝器（src/lib/http/withErrorHandling.ts：try/catch→映射 400/401/403/404/409/500）
- [X] T035 [P] 建立 Zod 驗證工具（src/lib/http/validate.ts：parseJson + zod schema + 400 errors）
- [X] T036 [P] 建立 same-origin 基礎防護（src/lib/security/sameOrigin.ts：檢查 Origin/Host + Sec-Fetch-Site）
- [X] T037 [P] 建立 logging 介面（src/lib/observability/logger.ts：info/warn/error，避免記錄敏感資訊）
- [X] T038 [P] 建立 request id（src/lib/observability/requestId.ts：從 header 取得或生成）
- [X] T039 [P] 建立 uploads 路徑工具（src/lib/storage/paths.ts：resolveUploadPath + path traversal guard）
- [X] T040 [P] 建立檔案儲存/讀取工具（src/lib/storage/files.ts：saveFile/readStream/stat，使用 UPLOAD_DIR）
- [X] T041 [P] 建立 mime type 驗證與 FileAsset DB 存取（src/lib/storage/mime.ts, src/services/fileRepo.ts：含 visibility=public/protected + course/lesson 綁定）
- [X] T042 [P] 建立 DB access layer：Course 查詢（src/services/courseRepo.ts：getById, listPublished, listByInstructor, getOutline）
- [X] T043 [P] 建立 DB access layer：Purchase/Progress（src/services/purchaseRepo.ts, src/services/progressRepo.ts）
- [X] T044 [P] 建立 DB access layer：Admin Review/Taxonomy/User（src/services/adminRepo.ts）
- [X] T045 建立共用 Fetch wrapper（src/lib/http/fetchJson.ts：前端用，統一處理 401/403/404/409）
- [X] T046 [P] 建立 TanStack Query keys（src/lib/queryKeys.ts）
- [X] T047 [P] 建立 form 驗證 helper（src/lib/forms/zodResolver.ts：封裝 RHF+Zod）
- [X] T048 建立全站錯誤頁（app/not-found.tsx, app/error.tsx）
- [X] T049 建立 403/500 UI（app/403/page.tsx, pages/500.tsx）
- [X] T050 建立 protected route guard（app/(protected)/layout.tsx：用 server component 檢查 currentUser，未登入 redirect /login）
- [X] T051 建立 instructor route guard（app/(protected)/instructor/layout.tsx：requireRole instructor|admin，否則導向 /403）
- [X] T052 建立 admin route guard（app/(protected)/admin/layout.tsx：requireRole admin，否則導向 /403）

**Checkpoint**: Foundation ready — 可以開始 User Stories（可平行開發 UI/API）

---

## Phase 3: User Story 1 - 學員瀏覽、購買並閱讀課程 (Priority: P1)

**Goal**: 公開瀏覽上架課程行銷資訊與大綱；登入後可購買；購買後可閱讀內容（text/image/pdf）並標記進度

**Independent Test**:
- 未登入：能看 `/courses` 與 `/courses/:courseId`（僅行銷資訊與大綱標題）
- 已登入未購買：進 `/my-courses/:courseId` 或讀內容 API 回 403
- 已登入已購買：可閱讀內容、下載附件、標記完成並看到進度變化
- 重複購買：回 409 且不產生重複紀錄

### API (US1)

- [X] T053 [P] [US1] 定義 Auth API 請求/回應 schema（src/lib/validators/auth.ts）
- [X] T054 [P] [US1] 註冊 Route Handler（app/api/auth/register/route.ts）
- [X] T055 [P] [US1] 登入 Route Handler（app/api/auth/login/route.ts）
- [X] T056 [P] [US1] 登出 Route Handler（app/api/auth/logout/route.ts）
- [X] T057 [P] [US1] 定義 Courses API schema（src/lib/validators/courses.ts）
- [X] T058 [P] [US1] 列出 published 課程 + 公開 taxonomy（app/api/courses/route.ts, app/api/taxonomy/categories/route.ts, app/api/taxonomy/tags/route.ts）
- [X] T059 [US1] 取得課程詳情（app/api/courses/[courseId]/route.ts：GET，套用 404 隱藏規則）
- [X] T060 [P] [US1] 定義 Purchase API schema（src/lib/validators/purchases.ts）
- [X] T061 [US1] 購買課程（app/api/courses/[courseId]/purchase/route.ts：POST，published 才可買，unique 衝突→409）
- [X] T062 [P] [US1] 定義 MyCourses/Content schema（src/lib/validators/content.ts）
- [X] T063 [US1] 我的課程列表（app/api/my-courses/route.ts：GET，含 progress summary）
- [X] T064 [US1] 課程閱讀資料（app/api/my-courses/[courseId]/route.ts：GET，未購買→403，作者/管理員允許）
- [X] T065 [US1] 標記單元完成（app/api/lessons/[lessonId]/progress/route.ts：PUT，未購買→403）
- [X] T066 [P] [US1] 建立內容一致性驗證（src/lib/courses/lessonContentValidation.ts：text/image/pdf 欄位互斥）

### Protected Content / Files (US1)

- [X] T067 [P] [US1] 新增檔案下載 Route Handler（app/api/files/[fileId]/route.ts：GET 串流 + no-store，依 FileAsset.visibility 決定是否需購買/作者/管理員授權；cover 可 public）
- [X] T068 [P] [US1] 建立 fileId → FileAsset 對應（src/lib/storage/fileId.ts：encode/decode + 防路徑穿越）
- [X] T069 [US1] 將 LessonContent 回應中的 contentImageUrl/contentFileUrl 改為指向 /api/files/{fileId}（src/services/courseRepo.ts + app/api/my-courses/[courseId]/route.ts + src/services/fileRepo.ts）

### UI: Public browse + Auth (US1)

- [X] T070 [P] [US1] 建立登入頁 UI（app/(public)/login/page.tsx）
- [X] T071 [P] [US1] 建立註冊頁 UI（app/(public)/register/page.tsx）
- [X] T072 [P] [US1] 建立 auth API client（src/services/authClient.ts：register/login/logout）
- [X] T073 [US1] 在 NavBar 加上登入/登出狀態（src/components/NavBar.tsx + src/services/authClient.ts）
- [X] T074 [P] [US1] 建立課程列表頁 UI（app/(public)/courses/page.tsx）
- [X] T075 [P] [US1] 建立課程卡片元件（src/components/CourseCard.tsx）
- [X] T076 [US1] 建立課程列表/Taxonomy 資料抓取（src/services/coursesClient.ts, src/services/taxonomyClient.ts + TanStack Query in app/(public)/courses/page.tsx）
- [X] T077 [P] [US1] 建立課程詳情頁 UI（app/(public)/courses/[courseId]/page.tsx）
- [X] T078 [US1] 課程詳情資料抓取與 404 呈現（src/services/coursesClient.ts + app/(public)/courses/[courseId]/page.tsx）
- [X] T079 [P] [US1] 建立課綱顯示元件（src/components/Outline.tsx：僅標題/順序）
- [X] T080 [US1] 購買按鈕與狀態（src/components/PurchaseButton.tsx：未登入導向 /login，已購買顯示 Disabled）

### UI: My Courses + Reader (US1)

- [X] T081 [P] [US1] 建立我的課程頁（app/(protected)/my-courses/page.tsx）
- [X] T082 [P] [US1] 建立我的課程 API client（src/services/myCoursesClient.ts：listMyCourses/getReaderData）
- [X] T083 [US1] 我的課程列表 UI 綁定資料（app/(protected)/my-courses/page.tsx + src/components/MyCourseCard.tsx）
- [X] T084 [P] [US1] 建立進度 badge 元件（src/components/ProgressBadge.tsx）
- [X] T085 [P] [US1] 建立閱讀頁（app/(protected)/my-courses/[courseId]/page.tsx）
- [X] T086 [P] [US1] 建立 Lesson 列表/選取元件（src/components/LessonList.tsx）
- [X] T087 [P] [US1] 建立 Lesson 內容呈現元件（src/components/LessonContentViewer.tsx：text/image/pdf link）
- [X] T088 [US1] 建立 LessonProgress API client（src/services/progressClient.ts：setCompletion）
- [X] T089 [US1] 建立「完成/未完成」切換 UI（src/components/LessonCompletionToggle.tsx：呼叫 progress API + 更新 query cache）
- [X] T090 [US1] Reader 頁整合 outline/content/progress（app/(protected)/my-courses/[courseId]/page.tsx）

**Checkpoint**: US1 完整可用（含 UI + API + 權限規則）

---

## Phase 4: User Story 2 - 教師建立課程、編排內容並送審/上下架 (Priority: P2)

**Goal**: 教師可建立 draft、編輯基本資訊與課綱（章節/單元/排序/內容）、上傳圖片/PDF、送審；被駁回可回 draft 修改再送審；published 可下架/重新上架

**Independent Test**:
- instructor 登入後可建立 draft、編輯並新增章節/單元、設定 order 且衝突會被拒絕
- draft → submitted 成功；submitted 狀態教師無法直接回 draft（必須走 rejected→draft）
- published ↔ archived 可切換且可見性符合規格（非作者/非管理員看到 404）

### Contracts updates (US2)

- [X] T091 [P] [US2] 擴充 OpenAPI：教師課程更新/上下架/課綱 CRUD（specs/001-content-course-platform/contracts/openapi.yaml）

### API: Instructor Course Management (US2)

- [X] T092 [P] [US2] 定義 Instructor API schemas（src/lib/validators/instructor.ts：create/update/status/curriculum）
- [X] T093 [US2] 教師課程列表（app/api/instructor/courses/route.ts：GET）
- [X] T094 [US2] 建立課程（app/api/instructor/courses/route.ts：POST，draft）
- [X] T095 [US2] 更新課程基本資訊（app/api/instructor/courses/[courseId]/route.ts：PATCH）
- [X] T096 [US2] 送審（app/api/instructor/courses/[courseId]/submit/route.ts：POST，draft→submitted）
- [X] T097 [US2] rejected→draft（app/api/instructor/courses/[courseId]/back-to-draft/route.ts：POST）
- [X] T098 [US2] published↔archived（app/api/instructor/courses/[courseId]/status/route.ts：POST，使用狀態機驗證）

### API: Curriculum (Sections/Lessons) (US2)

- [X] T099 [P] [US2] 定義 curriculum schemas（src/lib/validators/curriculum.ts：section/lesson create/update/reorder）
- [X] T100 [US2] 新增章節（app/api/instructor/courses/[courseId]/sections/route.ts：POST）
- [X] T101 [US2] 更新/刪除章節（app/api/instructor/sections/[sectionId]/route.ts：PATCH/DELETE）
- [X] T102 [US2] 章節排序更新（app/api/instructor/courses/[courseId]/sections/reorder/route.ts：PUT，衝突→400）
- [X] T103 [US2] 新增單元（app/api/instructor/sections/[sectionId]/lessons/route.ts：POST）
- [X] T104 [US2] 更新/刪除單元（app/api/instructor/lessons/[lessonId]/route.ts：PATCH/DELETE）
- [X] T105 [US2] 單元排序更新（app/api/instructor/sections/[sectionId]/lessons/reorder/route.ts：PUT，衝突→400）

### API: Uploads (US2)

- [X] T106 [P] [US2] 定義 upload schemas（src/lib/validators/uploads.ts：metadata/limits）
- [X] T107 [US2] 上傳圖片/PDF（app/api/instructor/uploads/route.ts：POST multipart/form-data，存 UPLOAD_DIR + 建 FileAsset 記錄）
- [X] T108 [US2] 回傳 fileId 與可用 URL（app/api/instructor/uploads/route.ts：回傳 { fileId, url, originalName, mimeType }；fileId 對應 FileAsset.id）
- [X] T109 [US2] 封面上傳與綁定（app/api/instructor/courses/[courseId]/cover/route.ts：POST，更新 coverImageUrl）

### UI: Instructor (US2)

- [X] T110 [P] [US2] 建立教師課程列表頁（app/(protected)/instructor/courses/page.tsx）
- [X] T111 [P] [US2] 建立教師課程列表 client（src/services/instructorClient.ts：list/create/update/submit/status）
- [X] T112 [US2] 教師課程列表 UI 綁定（app/(protected)/instructor/courses/page.tsx + src/components/instructor/InstructorCourseTable.tsx）
- [X] T113 [P] [US2] 建立新增課程頁（app/(protected)/instructor/courses/new/page.tsx：RHF+Zod）
- [X] T114 [US2] 新增課程表單元件（src/components/instructor/CourseForm.tsx）
- [X] T115 [P] [US2] 建立編輯課程頁（app/(protected)/instructor/courses/[courseId]/edit/page.tsx）
- [X] T116 [US2] 編輯課程資料載入/保存（app/(protected)/instructor/courses/[courseId]/edit/page.tsx + src/services/instructorClient.ts）
- [X] T117 [P] [US2] 建立課綱管理頁（app/(protected)/instructor/courses/[courseId]/curriculum/page.tsx）
- [X] T118 [P] [US2] 建立章節/單元編輯元件（src/components/instructor/CurriculumEditor.tsx）
- [X] T119 [US2] 課綱 CRUD 與 reorder 整合（src/components/instructor/CurriculumEditor.tsx + src/services/instructorClient.ts）
- [X] T120 [P] [US2] 建立檔案上傳元件（src/components/instructor/FileUpload.tsx：圖片/PDF，顯示上傳結果 URL）
- [X] T121 [US2] 在 Lesson 編輯中整合內容型態（src/components/instructor/CurriculumEditor.tsx：text/image/pdf，並強制一致性）
- [X] T122 [US2] 建立送審 UI（app/(protected)/instructor/courses/[courseId]/submit/page.tsx：顯示必要欄位檢查 + submit）
- [X] T123 [US2] 建立上下架切換 UI（src/components/instructor/CoursePublishToggle.tsx）

**Checkpoint**: US2 完整可用（教師可從 0 建課→編排→送審→上下架）

---

## Phase 5: User Story 3 - 管理員審核與治理 (Priority: P3)

**Goal**: 管理員可審核 submitted（核准/駁回理由必填）、查審核紀錄、管理使用者角色/啟用、管理分類/標籤、查看統計；並可強制存取任何內容

**Independent Test**:
- admin 可看到 review queue 並核准/駁回；駁回不填理由→400
- 審核後 course 狀態正確，且 CourseReview 會新增紀錄
- 管理員停用使用者後：該使用者所有受保護 API 都回 401/403（依流程）且需重新登入
- 管理分類/標籤可新增/編輯/停用，並影響課程建立與列表顯示
- stats 可看到：課程狀態統計、購買數、使用者數

### Contracts updates (US3)

- [X] T124 [P] [US3] 擴充 OpenAPI：管理員 users/categories/tags/stats/review history（specs/001-content-course-platform/contracts/openapi.yaml）

### API: Admin Review (US3)

- [X] T125 [P] [US3] 定義 admin review schemas（src/lib/validators/adminReview.ts）
- [X] T126 [US3] 待審清單（app/api/admin/review-queue/route.ts：GET）
- [X] T127 [US3] 審核操作（app/api/admin/courses/[courseId]/review/route.ts：POST，submitted→published/rejected）
- [X] T128 [US3] 審核紀錄查詢（app/api/admin/courses/[courseId]/reviews/route.ts：GET）

### API: Admin Users (US3)

- [X] T129 [P] [US3] 定義 admin users schemas（src/lib/validators/adminUsers.ts）
- [X] T130 [US3] 使用者列表（app/api/admin/users/route.ts：GET，支援 query/filter）
- [X] T131 [US3] 使用者更新（app/api/admin/users/[userId]/route.ts：PATCH，role/isActive）
- [X] T132 [US3] 停用後 session 撤銷策略（src/lib/auth/sessionStore.ts：revokeAllForUser + admin 更新時呼叫）

### API: Admin Taxonomy (US3)

- [X] T133 [P] [US3] 定義 taxonomy schemas（src/lib/validators/taxonomy.ts：category/tag create/update/toggle）
- [X] T134 [US3] 分類列表/新增（app/api/admin/categories/route.ts：GET/POST）
- [X] T135 [US3] 分類更新/停用（app/api/admin/categories/[categoryId]/route.ts：PATCH）
- [X] T136 [US3] 標籤列表/新增（app/api/admin/tags/route.ts：GET/POST）
- [X] T137 [US3] 標籤更新/停用（app/api/admin/tags/[tagId]/route.ts：PATCH）

### API: Admin Stats (US3)

- [X] T138 [P] [US3] 定義 stats schemas（src/lib/validators/stats.ts）
- [X] T139 [US3] 統計端點（app/api/admin/stats/route.ts：GET，courseCountsByStatus/purchaseCount/userCount）

### UI: Admin (US3)

- [X] T140 [P] [US3] 建立 admin client（src/services/adminClient.ts：reviewQueue/reviewCourse/users/taxonomy/stats）
- [X] T141 [P] [US3] 建立管理員待審頁（app/(protected)/admin/reviews/page.tsx）
- [X] T142 [US3] 待審清單 UI（src/components/admin/ReviewQueueTable.tsx）
- [X] T143 [P] [US3] 建立審核詳情頁（app/(protected)/admin/reviews/[courseId]/page.tsx：顯示 course + reviews + actions）
- [X] T144 [US3] 建立審核表單元件（src/components/admin/ReviewDecisionForm.tsx：reject reason 必填）
- [X] T145 [P] [US3] 建立使用者管理頁（app/(protected)/admin/users/page.tsx）
- [X] T146 [US3] 使用者表格與編輯（src/components/admin/UsersTable.tsx：role/isActive）
- [X] T147 [P] [US3] 建立分類/標籤管理頁（app/(protected)/admin/taxonomy/page.tsx）
- [X] T148 [US3] 分類/標籤管理 UI（src/components/admin/TaxonomyManager.tsx）
- [X] T149 [P] [US3] 建立統計頁（app/(protected)/admin/stats/page.tsx）
- [X] T150 [US3] 統計卡片/圖表（src/components/admin/StatsCards.tsx：以簡單數字卡片為主）

**Checkpoint**: US3 完整可用（審核+治理+統計）

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事的一致性、UX 完整性、安全硬化與 quickstart 驗證

- [X] T151 [P] 統一 API 錯誤碼與訊息（src/lib/errors/AppError.ts + src/lib/http/withErrorHandling.ts）
- [X] T152 [P] 補齊所有頁面 loading/empty/error 狀態（app/**/loading.tsx + 相關 components）
- [X] T153 [P] 強化可用性：表單提示/禁用狀態/aria label（src/components/**）
- [X] T154 [P] 強化安全：敏感資料不落 log（src/lib/observability/logger.ts）
- [X] T155 [P] 強化安全：uploads 檔案大小/類型限制（src/lib/storage/mime.ts + app/api/instructor/uploads/route.ts）
- [X] T156 [P] 強化安全：檔案下載 cache 策略（app/api/files/[fileId]/route.ts：Cache-Control no-store）
- [X] T157 [P] 強化一致性：課程詳情 404/內容 403 行為回歸檢查（src/lib/access/courseAccess.ts + route handlers）
- [X] T158 [P] 補齊導覽列角色入口（src/components/NavBar.tsx, src/components/ProtectedNavBar.tsx）
- [X] T159 [P] 補齊 UI 文案與錯誤訊息一致性（src/lib/copy.ts + 各 page/component）
- [X] T160 執行 quickstart smoke tests 並修正偏差（specs/001-content-course-platform/quickstart.md）

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → blocks everything else
- Foundational (Phase 2) → blocks all user stories
- User Stories (Phase 3–5) → 可在 Phase 2 完成後平行
- Polish (Phase 6) → 建議在 US1–US3 完成後執行（也可穿插進行部分 [P] 任務）

### User Story Dependencies Graph

- US1 (P1) → 無需依賴 US2/US3
- US2 (P2) → 可獨立於 US1，但通常會共用 taxonomy/user/auth（已在 Foundational）
- US3 (P3) → 可獨立於 US1/US2（基於 Foundational），但會操作同一份 Course/Users/Taxonomy 資料

建議完成順序（單人）：Phase 1 → Phase 2 → US1 → US2 → US3 → Polish

---

## Parallel Execution Examples

### Parallel Example: Foundational

- Task: "建立 course 可見性/內容存取規則 in src/lib/access/courseAccess.ts" (T030)
- Task: "建立課程狀態機 in src/lib/courses/stateMachine.ts" (T031)
- Task: "建立 API 錯誤模型 in src/lib/errors/AppError.ts" (T032)

### Parallel Example: US1

- Task: "列出 published 課程 in app/api/courses/route.ts" (T058)
- Task: "課程列表頁 UI in app/(public)/courses/page.tsx" (T074)
- Task: "課程卡片元件 in src/components/CourseCard.tsx" (T075)

### Parallel Example: US2

- Task: "Curriculum editor UI in src/components/instructor/CurriculumEditor.tsx" (T118)
- Task: "新增章節 API in app/api/instructor/courses/[courseId]/sections/route.ts" (T100)
- Task: "上傳元件 in src/components/instructor/FileUpload.tsx" (T120)

### Parallel Example: US3

- Task: "Users 管理 UI in src/components/admin/UsersTable.tsx" (T146)
- Task: "Users API in app/api/admin/users/[userId]/route.ts" (T131)
- Task: "Stats API in app/api/admin/stats/route.ts" (T139)

---

## Implementation Strategy

- 以「完整系統」為目標：所有 US1–US3 皆要完成（含 UI + API + DB + 權限 + 錯誤頁）。
- 仍採「可驗收增量」方式交付：每個 US phase 結束都有獨立驗收標準，避免最後才整合爆炸。
- 權限/狀態機/錯誤處理放在 `src/lib/**` 與 `src/services/**`，Route Handlers 僅負責 I/O 與呼叫規則層。
- 檔案永遠不放 `/public`，走 `UPLOAD_DIR` + `app/api/files/[fileId]/route.ts` 串流。
