---

description: "Task list for implementing the Multi-Role Forum & Community Platform"
---

# Tasks: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Input**: 設計文件（spec/plan/research/data-model/contracts/quickstart）位於 `specs/001-multi-role-forum/`

**Prerequisites**: plan.md（required）、spec.md（required）、data-model.md、contracts/openapi.yaml、research.md、quickstart.md

**Tests（必做）**: 核心 domain 規則（RBAC + scope、狀態機、可見性、冪等）必須有 Vitest；主要用戶旅程必須有 Playwright E2E。

**Organization**: 以 user stories（US1~US4）分組，確保每個 story 都能獨立驗收；但本任務清單目標是「完整系統」，因此會把 P1~P3 全部做完。

## Format: `- [ ] T### [P?] [US?] Description with file path`

- **[P]**：可平行（不同檔案或互不依賴）
- **[US#]**：對應 spec.md 的 User Story

---

## Phase 1: Setup（專案骨架與工具鏈）

**Purpose**: 建立可開發/可測試/可部署的 Next.js 專案基礎（本 repo 目前只有 specs，尚未有 app 程式碼）。

- [x] T001 初始化 Next.js App Router + TypeScript 專案（產出/更新 package.json、next.config.ts、tsconfig.json）
- [x] T002 設定 Tailwind（新增/更新 tailwind.config.ts、postcss.config.js、app/globals.css）
- [x] T003 [P] 建立 App Router 路由骨架（建立 app/(public)/page.tsx、app/(auth)/login/page.tsx、app/(auth)/register/page.tsx、app/(forum)/boards/[boardId]/page.tsx、app/(forum)/threads/[threadId]/page.tsx、app/(forum)/search/page.tsx）
- [x] T004 [P] 建立 UI 基礎元件（建立 src/ui/components/Button.tsx、src/ui/components/Input.tsx、src/ui/components/Toast.tsx、src/ui/components/Modal.tsx）
- [x] T005 [P] 建立全站 layout 與導覽（新增 app/layout.tsx、src/ui/components/NavBar.tsx、src/ui/components/Footer.tsx）
- [x] T006 [P] 安裝並接好 TanStack Query Provider（新增 app/providers.tsx、src/ui/query/queryClient.ts）
- [x] T007 [P] 安裝並接好 React Hook Form + Zod（新增 src/ui/forms/zodSchemas.ts、src/ui/forms/formHelpers.ts）
- [x] T008 [P] 設定 Day.js 格式化工具（新增 src/ui/lib/datetime.ts）
- [x] T009 設定 Prisma（新增 prisma/schema.prisma、prisma/seed.ts、更新 package.json scripts）
- [x] T010 設定 Vitest（新增 vitest.config.ts、tests/unit/setup.ts、更新 package.json scripts）
- [x] T011 設定 Playwright（新增 playwright.config.ts、tests/e2e/global.setup.ts、tests/e2e/fixtures.ts、更新 package.json scripts）
- [x] T012 [P] 建立環境變數管理與範本（新增 .env.example、src/lib/env.ts）
- [x] T013 [P] 加入 ESLint/Prettier（新增/更新 .eslintrc.json、.prettierrc、.prettierignore）
- [x] T014 [P] 建立 README 與開發指令對齊 quickstart（新增/更新 README.md；引用 specs/001-multi-role-forum/quickstart.md）

**Checkpoint**: `pnpm dev` 可以起站；`pnpm test`（vitest）與 `pnpm playwright test` 可跑起來（即使暫時只有 smoke test）。

---

## Phase 2: Foundational（所有故事都依賴的基礎能力；必須先完成）

**Purpose**: DB/交易、錯誤語意、Auth+CSRF、RBAC/scope、可觀測性、Repository/Usecase 分層。

### 2.1 Database + Prisma + Transaction

- [x] T015 依 data-model 建立 Prisma models（更新 prisma/schema.prisma：User/Session/Board/ModeratorAssignment/Thread/Post/Like/Favorite/Report/AuditLog）
- [x] T016 設定 SQLite pragma（WAL、busy_timeout）與 singleton PrismaClient（新增 src/infra/db/prisma.ts）
- [x] T017 建立 transaction helper（新增 src/infra/db/transaction.ts）
- [x] T018 建立 seed（admin/user/moderator/board/thread/post）（更新 prisma/seed.ts）
- [x] T019 建立 test 專用資料庫初始化（新增 tests/helpers/testDb.ts，使用 file:./test.db 或 temp file）
- [x] T020 建立「migration 前 DB 備份」腳本（新增 scripts/backup-db.ts、更新 package.json scripts）

### 2.2 Error Semantics + API Response Shape

- [x] T021 定義語意化錯誤碼與 AppError（新增 src/lib/errors/errorCodes.ts、src/lib/errors/AppError.ts）
- [x] T022 建立 error -> JSON response mapper（新增 src/lib/errors/toErrorResponse.ts）
- [x] T023 建立 Route Handler 共用 wrapper（try/catch + 統一錯誤格式）（新增 src/lib/http/route.ts）
- [x] T024 建立 Zod request validation helper（新增 src/lib/http/validate.ts）

### 2.3 Observability（requestId + logging）

- [x] T025 建立 requestId 產生/傳遞策略（新增 src/lib/observability/requestId.ts，讀取/回寫 x-request-id）
- [x] T026 建立 logger（新增 src/lib/observability/logger.ts；至少支援 info/warn/error + requestId）
- [x] T027 在所有 Route Handlers 套用 wrapper 與 requestId（新增/更新 app/api/**/route.ts，先做一個範例：app/api/session/me/route.ts）

### 2.4 Auth（HttpOnly cookie session）

- [x] T028 建立 session repository（新增 src/infra/auth/sessionRepo.ts，CRUD Session）
- [x] T029 建立 password hashing（新增 src/infra/auth/password.ts，bcrypt/argon2 二擇一並固定）
- [x] T030 建立 auth usecases（新增 src/usecases/auth/register.ts、src/usecases/auth/login.ts、src/usecases/auth/logout.ts）
- [x] T031 建立 session 讀取 helper（從 __Host-session cookie 讀取 session + user）（新增 src/infra/auth/getAuthContext.ts）
- [x] T032 建立 returnTo 驗證（只允許站內相對路徑）（新增 src/infra/auth/returnTo.ts）
- [x] T033 建立 auth API（新增 app/api/auth/register/route.ts、app/api/auth/login/route.ts、app/api/auth/logout/route.ts）
- [x] T034 建立 session/me API（新增 app/api/session/me/route.ts，回傳 user + moderatorBoards）

### 2.5 CSRF（defense-in-depth）

- [x] T035 定義 CSRF token 方案並補齊合約（更新 specs/001-multi-role-forum/contracts/openapi.yaml：新增 /api/csrf 或明確描述 token 發放點）
- [x] T036 實作 CSRF token 發放（新增 app/api/csrf/route.ts 或等效；更新 src/infra/auth/csrf.ts）
- [x] T037 在所有 state-changing API 強制 CSRF 驗證（更新 src/lib/http/route.ts 或新增 src/lib/http/requireCsrf.ts）

### 2.6 RBAC / Scope Policies

- [x] T038 實作角色與 scope 判斷（新增 src/domain/policies/rbac.ts、src/domain/policies/moderatorScope.ts）
- [x] T039 建立 anti-IDOR helper（所有讀寫都從 server-side 重新查目標並驗證 scope）（新增 src/domain/policies/antiIdor.ts）

### 2.7 Domain State Machines

- [x] T040 實作 Thread 狀態機（新增 src/domain/state-machines/threadState.ts）
- [x] T041 實作 Post 狀態機（新增 src/domain/state-machines/postState.ts）
- [x] T042 實作 Report 狀態機（新增 src/domain/state-machines/reportState.ts）

### 2.8 AuditLog（原子性）

- [x] T043 建立 audit repo（新增 src/infra/repos/auditRepo.ts）
- [x] T044 建立 audit writer helper（transaction 內寫入 audit）（新增 src/usecases/audit/writeAudit.ts）
- [x] T045 建立「敏感操作必寫 audit」規約測試（新增 tests/unit/auditAtomicity.test.ts，模擬 audit 失敗 → 主操作 rollback）

### 2.9 Vitest：Foundational 單元測試（必做）

- [x] T046 [P] 測試 Thread 狀態機合法/非法轉換（新增 tests/unit/threadState.test.ts）
- [x] T047 [P] 測試 Report 狀態機 + 接受檢舉副作用規則（新增 tests/unit/reportState.test.ts）
- [x] T048 [P] 測試 RBAC + moderator scope（新增 tests/unit/rbacScope.test.ts）
- [x] T049 [P] 測試 returnTo 安全（新增 tests/unit/returnTo.test.ts）

**Checkpoint**: DB schema/migrate/seed 可用；所有 API 都能回一致錯誤格式；Auth/CSRF/RBAC/狀態機與 audit 原子性已有單元測試。

---

## Phase 3: User Story 1 - 訪客可瀏覽與搜尋公開內容（Priority: P1）

**Goal**: 未登入即可閱讀公開內容（boards/threads/posts），且可搜尋公開 thread；hidden/draft 不得被洩漏。

**Independent Test**: 不登入，走訪首頁 → 看板 → 主題 → 搜尋 → 點擊結果可讀；hidden thread 以 NotFound 呈現。

### Contracts（若合約未覆蓋，先補）

- [x] T050 [US1] 補齊 boards/threads/posts/search 的 OpenAPI（更新 specs/001-multi-role-forum/contracts/openapi.yaml）

### Backend（Read APIs）

- [x] T051 [US1] 建立 board repo（新增 src/infra/repos/boardRepo.ts）
- [x] T052 [US1] 建立 thread repo（新增 src/infra/repos/threadRepo.ts）
- [x] T053 [US1] 建立 post repo（新增 src/infra/repos/postRepo.ts）
- [x] T054 [US1] 實作 list boards usecase（新增 src/usecases/boards/listBoards.ts）
- [x] T055 [US1] 實作 board detail + list threads usecase（新增 src/usecases/threads/listThreadsByBoard.ts）
- [x] T056 [US1] 實作 thread detail usecase（新增 src/usecases/threads/getThread.ts，未授權者對 hidden/draft 需 NotFound）
- [x] T057 [US1] 實作 list posts usecase（新增 src/usecases/posts/listPosts.ts，過濾 hidden post）
- [x] T058 [US1] 建立 boards API（新增 app/api/boards/route.ts）
- [x] T059 [US1] 建立 board threads API（新增 app/api/boards/[boardId]/threads/route.ts）
- [x] T060 [US1] 建立 thread detail API（新增 app/api/threads/[threadId]/route.ts）
- [x] T061 [US1] 建立 thread posts API（新增 app/api/threads/[threadId]/posts/route.ts）

### Search（FTS5）

- [x] T062 [US1] 新增 FTS5 migration（新增 prisma/migrations/*/migration.sql：thread_fts + triggers 或 app-managed 同步）
- [x] T063 [US1] 實作 search repo（raw SQL + 可見性過濾）（新增 src/infra/repos/searchRepo.ts）
- [x] T064 [US1] 實作 search usecase（新增 src/usecases/search/searchThreads.ts）
- [x] T065 [US1] 建立 search API（新增 app/api/search/route.ts）

### Frontend（Public UI）

- [x] T066 [US1] 建立 API client（fetch wrapper + error handling）（新增 src/ui/api/client.ts）
- [x] T067 [US1] 首頁 boards 列表 UI（更新 app/(public)/page.tsx）
- [x] T068 [US1] 看板頁 threads 列表 UI（更新 app/(forum)/boards/[boardId]/page.tsx）
- [x] T069 [US1] 主題頁 thread + posts 顯示（更新 app/(forum)/threads/[threadId]/page.tsx）
- [x] T070 [US1] 搜尋頁 UI + 結果列表（更新 app/(forum)/search/page.tsx）
- [x] T071 [US1] 互動按鈕（Like/Favorite/回覆/檢舉）在未登入時顯示 disabled 並導向登入（新增 src/ui/components/AuthRequiredAction.tsx；更新相關頁面）

### Tests（Playwright E2E）

- [x] T072 [US1] E2E：Guest 可瀏覽 boards/threads/posts（新增 tests/e2e/guest-browse.spec.ts）
- [x] T073 [US1] E2E：hidden thread 對 Guest 不洩漏（NotFound） （新增 tests/e2e/guest-hidden-notfound.spec.ts）
- [x] T074 [US1] E2E：search 只回公開可見內容（新增 tests/e2e/guest-search.spec.ts）

**Checkpoint**: US1 完整可驗收（含搜尋），且不洩漏 hidden/draft。

---

## Phase 4: User Story 2 - 註冊/登入後可發文、回文與互動（Priority: P1）

**Goal**: User 可註冊/登入/登出；可存草稿→發布；可回覆（locked 禁止）；Like/Favorite 冪等。

**Independent Test**: 建立 user → 草稿 → 發布 → 回覆 → Like/Favorite 反覆操作不出錯且狀態正確。

### Contracts

- [x] T075 [US2] 補齊 threads create/update/publish、posts create/edit、likes/favorites 的 OpenAPI（更新 specs/001-multi-role-forum/contracts/openapi.yaml）

### Backend（Write APIs + Idempotency）

- [x] T076 [US2] 實作 create thread draft usecase（新增 src/usecases/threads/createDraft.ts，檢查 board active）
- [x] T077 [US2] 實作 update draft usecase（新增 src/usecases/threads/updateDraft.ts，僅作者；locked 不適用）
- [x] T078 [US2] 實作 publish thread usecase（新增 src/usecases/threads/publishDraft.ts，套用狀態機）
- [x] T079 [US2] 實作 create post usecase（新增 src/usecases/posts/createPost.ts，locked/board inactive 禁止）
- [x] T080 [US2] 實作 edit post usecase（新增 src/usecases/posts/editPost.ts，僅作者；locked 禁止）
- [x] T081 [US2] 實作 set like usecase（新增 src/usecases/reactions/setLike.ts，UNIQUE 約束 + desired-state 冪等）
- [x] T082 [US2] 實作 set favorite usecase（新增 src/usecases/reactions/setFavorite.ts，UNIQUE 約束 + desired-state 冪等）
- [x] T083 [US2] 建立 threads create API（新增 app/api/threads/route.ts）
- [x] T084 [US2] 建立 draft publish API（新增 app/api/threads/[threadId]/publish/route.ts）
- [x] T085 [US2] 建立 posts create/edit API（新增 app/api/threads/[threadId]/posts/route.ts、app/api/posts/[postId]/route.ts）
- [x] T086 [US2] 建立 likes API（新增 app/api/likes/route.ts）
- [x] T087 [US2] 建立 favorites API（新增 app/api/favorites/route.ts）
- [x] T088 [US2] 對所有寫入行為補齊 AuditLog（更新各 usecase：create/publish/post/like/favorite）

### Frontend（Auth UI + Editor + Optimistic）

- [x] T089 [US2] Register UI（更新 app/(auth)/register/page.tsx，RHF+Zod；成功導向 returnTo）
- [x] T090 [US2] Login UI（更新 app/(auth)/login/page.tsx，RHF+Zod；成功導向 returnTo）
- [x] T091 [US2] Logout 行為（新增 src/ui/auth/logout.ts；更新 NavBar）
- [x] T092 [US2] 建立 auth state hook（Query: /api/session/me）（新增 src/ui/auth/useSession.ts）
- [x] T093 [US2] Thread editor（草稿/發布）（新增 src/ui/thread/ThreadEditor.tsx；更新看板頁新增按鈕）
- [x] T094 [US2] Reply editor（新增 src/ui/post/PostEditor.tsx；更新 thread 頁）
- [x] T095 [US2] Like button optimistic（新增 src/ui/reactions/LikeButton.tsx；使用 TanStack mutation + rollback）
- [x] T096 [US2] Favorite button optimistic（新增 src/ui/reactions/FavoriteButton.tsx；使用 TanStack mutation + rollback）
- [x] T097 [US2] Board inactive / Thread locked 的 UI 禁用與原因提示（更新相關 components/page.tsx）

### Tests

- [x] T098 [US2] Unit：Like/Favorite desired-state 冪等（新增 tests/unit/reactionsIdempotency.test.ts）
- [x] T099 [US2] E2E：User 草稿→發布→回覆（新增 tests/e2e/user-create-thread-post.spec.ts）
- [x] T100 [US2] E2E：Like/Favorite 重複操作不出錯（新增 tests/e2e/user-like-favorite-idempotent.spec.ts）
- [x] T101 [US2] E2E：locked thread 禁止回覆/編輯（新增 tests/e2e/user-locked-thread.spec.ts）
- [x] T102 [US2] E2E：board inactive 禁止互動（新增 tests/e2e/user-board-inactive.spec.ts）

**Checkpoint**: US2 完整可驗收（含冪等、locked/inactive）。

---

## Phase 5: User Story 3 - 看板治理（Moderator/Admin）（Priority: P2）

**Goal**: Moderator（board scope）可處理檢舉與內容管理；跨看板必須拒絕；所有治理操作必寫 audit。

**Independent Test**: user 檢舉 → moderator 受理 → 內容 hidden → guest/user 不可見 → audit 可查。

### Contracts

- [x] T103 [US3] 補齊 moderation/report/list/resolve、thread hide/unhide/lock/unlock、post hide/unhide 的 OpenAPI（更新 specs/001-multi-role-forum/contracts/openapi.yaml）

### Backend（Moderation）

- [x] T104 [US3] 實作 create report usecase（新增 src/usecases/reports/createReport.ts；UNIQUE 防重複；board inactive 禁止）
- [x] T105 [US3] 實作 list reports usecase（新增 src/usecases/reports/listReports.ts；以 boardId + status 查）
- [x] T106 [US3] 實作 resolve report usecase（新增 src/usecases/reports/resolveReport.ts；accepted 副作用：內容 hidden；同 transaction 寫 audit）
- [x] T107 [US3] 實作 hide/unhide thread usecase（新增 src/usecases/moderation/threadVisibility.ts）
- [x] T108 [US3] 實作 lock/unlock thread usecase（新增 src/usecases/moderation/threadLock.ts）
- [x] T109 [US3] 實作 hide/unhide post usecase（新增 src/usecases/moderation/postVisibility.ts）
- [x] T110 [US3] 建立 reports API（新增 app/api/reports/route.ts、app/api/reports/[reportId]/resolve/route.ts）
- [x] T111 [US3] 建立 moderation API（新增 app/api/mod/boards/[boardId]/reports/route.ts、app/api/mod/threads/[threadId]/hide/route.ts、app/api/mod/threads/[threadId]/unhide/route.ts、app/api/mod/threads/[threadId]/lock/route.ts、app/api/mod/threads/[threadId]/unlock/route.ts、app/api/mod/posts/[postId]/hide/route.ts、app/api/mod/posts/[postId]/unhide/route.ts）

### Frontend（Moderation UI）

- [x] T112 [US3] Report button（新增 src/ui/reports/ReportButton.tsx；更新 thread/post 顯示）
- [x] T113 [US3] Moderator dashboard（board selector + reports list）（新增 app/(forum)/mod/page.tsx、app/(forum)/mod/boards/[boardId]/reports/page.tsx）
- [x] T114 [US3] 報告審核 UI（accept/reject + note）（新增 src/ui/mod/ReportQueue.tsx、src/ui/mod/ResolveReportDialog.tsx）
- [x] T115 [US3] Thread/Post 管理 UI（hide/unhide/lock/unlock）（新增 src/ui/mod/ModerationActions.tsx；只在有權限時顯示）

### Tests

- [x] T116 [US3] Unit：resolve report 的副作用（accepted 必 hidden）（新增 tests/unit/resolveReportSideEffects.test.ts）
- [x] T117 [US3] E2E：Moderator scope 限制（跨 board 被拒）（新增 tests/e2e/mod-scope.spec.ts）
- [x] T118 [US3] E2E：接受檢舉後內容對 Guest 不可見（新增 tests/e2e/mod-accept-report-hides-content.spec.ts）

**Checkpoint**: US3 完整可驗收（scope、安全、audit、可見性）。

---

## Phase 6: User Story 4 - 後台治理與系統管理（Admin）（Priority: P3）

**Goal**: Admin 可管理 boards、指派 moderators、ban/unban users、檢視全站 reports/audit logs。

**Independent Test**: admin 建 board → 排序/停用 → 指派 moderator → ban user → audit/report 皆可查。

### Contracts

- [x] T119 [US4] 補齊 admin boards CRUD、moderator assignment、user ban/unban、audit logs 的 OpenAPI（更新 specs/001-multi-role-forum/contracts/openapi.yaml）

### Backend（Admin）

- [x] T120 [US4] 實作 boards admin CRUD usecases（新增 src/usecases/admin/boards/*.ts）
- [x] T121 [US4] 實作 moderator assignment usecases（新增 src/usecases/admin/moderators/*.ts）
- [x] T122 [US4] 實作 user ban/unban usecases（新增 src/usecases/admin/users/banUser.ts、unbanUser.ts）
- [x] T123 [US4] 實作 audit log 查詢 usecase（新增 src/usecases/admin/audit/listAuditLogs.ts）
- [x] T124 [US4] 建立 admin APIs（新增 app/api/admin/boards/route.ts、app/api/admin/boards/[boardId]/route.ts、app/api/admin/moderators/route.ts、app/api/admin/users/[userId]/ban/route.ts、app/api/admin/users/[userId]/unban/route.ts、app/api/admin/audit/route.ts、app/api/admin/reports/route.ts）
- [x] T125 [US4] 對所有 admin 操作補齊 AuditLog（更新 usecases：admin/boards、admin/moderators、admin/users）

### Frontend（Admin UI）

- [x] T126 [US4] Admin dashboard layout（新增 app/(forum)/admin/page.tsx、src/ui/admin/AdminNav.tsx）
- [x] T127 [US4] Boards 管理 UI（列表/新增/編輯/停用/排序）（新增 app/(forum)/admin/boards/page.tsx、src/ui/admin/BoardsAdmin.tsx）
- [x] T128 [US4] Moderator 指派 UI（搜尋 user、指定 board）（新增 app/(forum)/admin/moderators/page.tsx、src/ui/admin/ModeratorsAdmin.tsx）
- [x] T129 [US4] Users 管理 UI（ban/unban）（新增 app/(forum)/admin/users/page.tsx、src/ui/admin/UsersAdmin.tsx）
- [x] T130 [US4] Reports 全站檢視 UI（新增 app/(forum)/admin/reports/page.tsx、src/ui/admin/ReportsAdmin.tsx）
- [x] T131 [US4] Audit logs 檢視 UI（新增 app/(forum)/admin/audit/page.tsx、src/ui/admin/AuditAdmin.tsx）

### Tests

- [x] T132 [US4] Unit：ban user 後禁止登入/操作（新增 tests/unit/bannedUserAuth.test.ts）
- [x] T133 [US4] E2E：Admin boards 管理（新增 tests/e2e/admin-boards.spec.ts）
- [x] T134 [US4] E2E：Admin 指派 moderator 生效（新增 tests/e2e/admin-assign-moderator.spec.ts）
- [x] T135 [US4] E2E：Admin ban user 生效（新增 tests/e2e/admin-ban-user.spec.ts）

**Checkpoint**: US4 完整可驗收（含後台 UI/權限/稽核）。

---

## Phase 7: Polish & Cross-Cutting Concerns（完整系統收尾）

**Purpose**: 規格一致性、UX、可維運性、安全與效能收斂。

- [x] T136 補齊 OpenAPI 中所有 error code 語意與範例（更新 specs/001-multi-role-forum/contracts/openapi.yaml）
- [x] T137 建立「錯誤呈現策略」：使用者訊息 vs 開發者訊息（新增 src/ui/errors/errorPresenter.ts、更新 Toast 顯示）
- [x] T138 建立全站 loading/empty/error UI 一致化（更新 src/ui/components/* 與 page.tsx）
- [x] T139 增加基本可及性（labels/aria/keyboard）（更新 app/**/page.tsx、src/ui/components/*）
- [x] T140 加入安全 header 與基本硬化（新增/更新 next.config.ts）
- [x] T141 加入「寫入 API」的簡易節流/防爆（視需求，新增 src/lib/http/rateLimit.ts 並套用在 app/api/**/route.ts）
- [x] T142 效能檢查：列表 API 加上必要索引與分頁；避免 N+1（更新 prisma/schema.prisma 與 repo 查詢）
- [x] T143 建立「資料一致性自檢」腳本（例如：Report.boardId 與 target 推導一致）（新增 scripts/integrity-check.ts）
- [x] T144 依 quickstart 實際跑通：migrate/seed/dev/e2e（更新 specs/001-multi-role-forum/quickstart.md 與 README.md）

---

## Dependencies & Execution Order

- Phase 1（Setup）→ Phase 2（Foundational）→ US1 → US2 → US3 → US4 → Polish
- 原則：任何新增/修改 endpoint 或行為 → 先更新 OpenAPI（contract-first）→ 再做 usecase/repo/api/ui/test。

## Parallel Opportunities（例）

- Setup：T003/T004/T006/T007/T008/T012/T013 可平行
- Foundational：T021~T027（errors/obs）與 T028~T034（auth）可局部平行，但 CSRF（T035~T037）需在寫入 API 前完成
- US2：UI（T089~T097）可與 backend usecases（T076~T088）並行，只要合約（T075）先定

## Implementation Strategy（完整系統）

1. 先完成 Phase 1/2，讓 Auth/CSRF/RBAC/交易/audit/error/obs 都可用且有 unit tests
2. 依 US1→US4 逐一交付，每個 story 交付都要通過對應 Playwright E2E
3. 最後做 Phase 7 收斂（UX/安全/效能/文件）
