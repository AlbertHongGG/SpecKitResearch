---

description: "Task list for feature implementation"

---

# Tasks: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Input**: Design documents from `/specs/001-multi-role-forum/`

**Docs used**:
- Required: [plan.md](plan.md), [spec.md](spec.md)
- Available: [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)

**Tests**: 核心 domain / usecase 規則 MUST 有單元測試（happy path、edge cases、failures）。E2E（Playwright）用來覆蓋跨頁面流程與 RBAC/board-scope/狀態機整合。

**Organization**: 依 user story 分 phase，讓每個故事可獨立實作、獨立驗證。

## Format

- 每個 task 必須嚴格符合：`- [ ] T### [P?] [US?] 動作 + 檔案路徑`
- `[P]` 表示可平行執行（不同檔案、無未完成相依）

---

## Phase 1: Setup（專案初始化與工具鏈）

- [X] T001 初始化 Next.js App Router 專案（TypeScript + Tailwind + ESLint + src-dir）在 package.json
- [X] T002 [P] 新增/整理專案目錄骨架（依 plan.md）在 src/components/、src/lib/、src/server/、src/db/、tests/、prisma/
- [X] T003 [P] 設定 Prettier + Tailwind 排序 + ESLint 整合在 .prettierrc、.prettierignore、eslint.config.*
- [X] T004 [P] 設定 TypeScript path alias（@/*）在 tsconfig.json
- [X] T005 [P] 安裝前端依賴（@tanstack/react-query、react-hook-form、zod、@hookform/resolvers、dayjs）在 package.json
- [X] T006 [P] 安裝後端/infra 依賴（@prisma/client、prisma、bcryptjs、cookie、iron-session 或自製 cookie signer）在 package.json
- [X] T007 [P] 安裝測試依賴（playwright、vitest、@vitest/coverage-v8、@testing-library/react、@testing-library/jest-dom）在 package.json
- [X] T008 [P] 初始化 Playwright 設定在 playwright.config.ts 與 tests/e2e/
- [X] T009 [P] 建立環境變數範本與文件在 .env.example、README.md（含 DATABASE_URL、SESSION_SECRET、CSRF_SECRET）
- [X] T010 [P] 建立 Next runtime 設定（node runtime）與基本 middleware 檔案在 src/middleware.ts

---

## Phase 2: Foundational（阻塞所有故事的基礎能力）

**Checkpoint**: 完成後應具備「可啟動、可 migrate、API error 形狀一致、session + CSRF 可用、RBAC/board-scope 基礎函式、AuditLog 可寫入」。

### 2.1 Database / Prisma

- [X] T011 建立 Prisma schema（依 data-model.md）在 prisma/schema.prisma
- [X] T012 建立 Prisma client 載入器在 src/db/prisma.ts
- [X] T013 建立 SQLite 併發設定（WAL + busy timeout）初始化在 src/db/sqlite.ts
- [X] T014 建立 DB 操作有限重試（SQLITE_BUSY 指數退避 + jitter）在 src/db/withRetry.ts
- [X] T015 建立初始 migration 並驗證可建立資料表在 prisma/migrations/**/migration.sql
- [X] T016 [P] 建立 seed 腳本（最小：Boards + Admin）在 prisma/seed.ts 與 package.json scripts

### 2.2 Error Semantics / RequestId / Logging

- [X] T017 定義標準 API 錯誤型別與代碼（對齊 spec.md FR-027）在 src/lib/errors/codes.ts
- [X] T018 建立 ApiError 與 error-to-response 序列化（含 requestId）在 src/lib/errors/apiError.ts、src/lib/errors/toResponse.ts
- [X] T019 建立 requestId 產生與傳遞（header 或 response body）在 src/lib/observability/requestId.ts
- [X] T020 建立 Route Handler wrapper（統一 try/catch、requestId、錯誤 shape）在 src/lib/http/route.ts
- [X] T021 建立 AuditLog writer（最小 insert + metadata JSON）在 src/server/repositories/auditLogRepository.ts
- [X] T022 建立 AuditLog usecase facade（供各 usecase 呼叫）在 src/server/usecases/auditLog.ts

### 2.3 Authn: Password + Session (DB-backed)

- [X] T023 定義密碼雜湊/比對（bcrypt）在 src/lib/auth/password.ts
- [X] T024 定義 session cookie 常數（__Host-session、HttpOnly、Secure、SameSite）在 src/lib/auth/cookies.ts
- [X] T025 建立 Session repository（create/get/invalidate/touch）在 src/server/repositories/sessionRepository.ts
- [X] T026 建立 session service（從 request 解析 session、載入 user、產出 viewer）在 src/lib/auth/session.ts
- [X] T027 建立 requireUser / optionalUser helper（含 banned 拒絕）在 src/lib/auth/guards.ts

### 2.4 CSRF (Signed Double-Submit + Origin/Fetch-Metadata)

- [X] T028 定義 CSRF token 產生/驗證（cookie-to-header，與 session 綁定）在 src/lib/security/csrf.ts
- [X] T029 定義 Origin 與 Fetch Metadata 檢查（defense-in-depth）在 src/lib/security/requestIntegrity.ts
- [X] T030 建立 API 寫入請求的通用 CSRF 驗證 middleware（供 Route Handler wrapper 使用）在 src/lib/security/enforceCsrf.ts
- [X] T031 建立取得 CSRF token 的 endpoint（設 cookie + 回傳 token）在 src/app/api/csrf/route.ts

### 2.5 RBAC / Board Scope / Visibility

- [X] T032 定義角色與權限計算（Guest/User/Moderator/Admin）在 src/lib/rbac/roles.ts
- [X] T033 建立 Moderator board-scope 查詢（ModeratorAssignment）在 src/server/repositories/moderatorRepository.ts
- [X] T034 建立 canModerateBoard / canPostToBoard / canViewThread 等判斷在 src/lib/rbac/permissions.ts
- [X] T035 建立可見性規則（draft/hidden/locked/board inactive）集中函式在 src/server/domain/visibility.ts

### 2.6 Shared Validation Schemas (Zod)

- [X] T036 建立共用 zod schemas（ids、page/pageSize、email/password）在 src/lib/validation/common.ts
- [X] T037 建立 Threads/Posts/Reports 的 request schemas 在 src/lib/validation/threads.ts、src/lib/validation/posts.ts、src/lib/validation/reports.ts
- [X] T038 建立 Admin 的 request schemas 在 src/lib/validation/admin.ts

### 2.7 Unit-test Harness for Domain/Usecases

- [X] T039 建立 Vitest 設定（node + ts）在 vitest.config.ts
- [X] T040 建立 domain/usecase 測試 utilities（fixtures、factories、fake clock）在 tests/unit/testUtils.ts

---

## Phase 3: User Story 1 - 公開瀏覽與搜尋（Priority: P1）

**Goal**: 訪客/使用者可瀏覽啟用看板、看板內主題、主題內容與回覆，並做公開搜尋；不可看見 draft/hidden；看板停用時仍可唯讀。

**Independent Test**: 未登入狀態下可完成「首頁→看板→主題→搜尋命中主題」，且 hidden/draft 不可透過列表/搜尋/直連看到。

### Tests (Domain/Usecase)

- [X] T041 [P] [US1] 測試可見性：Guest 對 draft/hidden 一律不可見在 tests/unit/visibility.guest.test.ts
- [X] T042 [P] [US1] 測試 board inactive：可讀但所有互動 permission false 在 tests/unit/permissions.boardInactive.test.ts

### Backend APIs (Read-only)

- [X] T043 [US1] 實作 Boards.List repository 查詢（sortOrder 穩定排序）在 src/server/repositories/boardRepository.ts
- [X] T044 [US1] 實作 Boards.Get（含 permissions: canPost/canModerate）在 src/server/usecases/boardsGet.ts
- [X] T045 [US1] Route: GET /api/boards 在 src/app/api/boards/route.ts
- [X] T046 [US1] Route: GET /api/boards/[boardId] 在 src/app/api/boards/[boardId]/route.ts
- [X] T047 [US1] 實作 Threads.ListByBoard（只回傳公開可見 thread）在 src/server/usecases/threadsListByBoard.ts
- [X] T048 [US1] Route: GET /api/boards/[boardId]/threads 在 src/app/api/boards/[boardId]/threads/route.ts
- [X] T049 [US1] 實作 Threads.Get（viewer 權限 + 依可見性回應 403/404 策略）在 src/server/usecases/threadsGet.ts
- [X] T050 [US1] Route: GET /api/threads/[threadId] 在 src/app/api/threads/[threadId]/route.ts
- [X] T051 [US1] 實作 Posts.ListByThread（Guest 只見 visible；moderator/admin 可含 hidden 由後續 US3 啟用）在 src/server/usecases/postsListByThread.ts
- [X] T052 [US1] Route: GET /api/threads/[threadId]/posts 在 src/app/api/threads/[threadId]/posts/route.ts

### Search (FTS5)

- [X] T053 [US1] 建立 FTS5 SQL（thread_fts/post_fts + triggers + rebuild）在 prisma/migrations/*_fts5/migration.sql
- [X] T054 [US1] 建立 buildFtsQuery（保守 tokenization + AND）在 src/server/domain/search/buildFtsQuery.ts
- [X] T055 [US1] 建立 Search.QueryPublicContent usecase（raw MATCH + join + 可見性過濾）在 src/server/usecases/searchPublic.ts
- [X] T056 [US1] Route: GET /api/search 在 src/app/api/search/route.ts

### Frontend UI (Browse/Search)

- [X] T057 [P] [US1] 建立 TanStack Query Provider（QueryClient + Hydration）在 src/app/providers.tsx
- [X] T058 [US1] 建立共用 API client（fetch wrapper + error shape）在 src/lib/http/client.ts
- [X] T059 [P] [US1] 建立 Boards hooks（useBoards/useBoard）在 src/lib/queries/boards.ts
- [X] T060 [P] [US1] 建立 Threads hooks（useThreadsByBoard/useThread）在 src/lib/queries/threads.ts
- [X] T061 [P] [US1] 建立 Posts hooks（usePostsByThread）在 src/lib/queries/posts.ts
- [X] T062 [P] [US1] 建立 Search hook（usePublicSearch）在 src/lib/queries/search.ts
- [X] T063 [US1] 首頁：看板列表頁在 src/app/page.tsx
- [X] T064 [US1] 看板頁：主題列表（分頁）在 src/app/boards/[id]/page.tsx
- [X] T065 [US1] 主題頁：主題內容 + 回覆列表（lazy load）在 src/app/threads/[id]/page.tsx
- [X] T066 [US1] 搜尋頁：搜尋框 + 結果列表（導向主題）在 src/app/search/page.tsx
- [X] T067 [P] [US1] UI 元件：ThreadCard/BoardCard/Pagination/Loading/ErrorBanner 在 src/components/

### E2E

- [X] T068 [US1] Playwright：公開瀏覽流程（首頁→看板→主題）在 tests/e2e/us1-browse.spec.ts
- [X] T069 [US1] Playwright：搜尋不可命中 hidden/draft + 直連不可取得在 tests/e2e/us1-search-visibility.spec.ts

---

## Phase 4: User Story 2 - 註冊登入後發文與回文 + Like/Favorite（Priority: P2）

**Goal**: 使用者可註冊/登入，建立 thread 草稿並發布，回覆未鎖定主題，並對 thread/post Like、對 thread Favorite；需冪等與 optimistic 更新可回滾。

**Independent Test**: 「註冊→登入→建立草稿→發布→回覆→Like→Favorite/取消」且鎖文/看板停用限制生效。

### Tests (Domain/Usecase)

- [X] T070 [P] [US2] 測試 thread 狀態轉換（draft→published、禁止回 draft）在 tests/unit/threadState.test.ts
- [X] T071 [P] [US2] 測試 locked 禁止回覆/編輯 在 tests/unit/threadLockedRules.test.ts
- [X] T072 [P] [US2] 測試 Like/Favorite 冪等（唯一約束衝突回最終狀態）在 tests/unit/reactionsIdempotency.test.ts

### Backend APIs (Auth)

- [X] T073 [US2] 建立 User repository（create/findByEmail/findById）在 src/server/repositories/userRepository.ts
- [X] T074 [US2] Usecase: Auth.Register（正規化 email、hash 密碼、建立 session）在 src/server/usecases/authRegister.ts
- [X] T075 [US2] Route: POST /api/auth/register 在 src/app/api/auth/register/route.ts
- [X] T076 [US2] Usecase: Auth.Login（驗證密碼、banned 拒絕、建立 session、returnTo）在 src/server/usecases/authLogin.ts
- [X] T077 [US2] Route: POST /api/auth/login 在 src/app/api/auth/login/route.ts
- [X] T078 [US2] Usecase: Auth.Logout（invalidate session）在 src/server/usecases/authLogout.ts
- [X] T079 [US2] Route: POST /api/auth/logout 在 src/app/api/auth/logout/route.ts
- [X] T080 [US2] Route: GET /api/me（current user + moderatorBoards）在 src/app/api/me/route.ts

### Backend APIs (Write: Threads/Posts)

- [X] T081 [US2] Usecase: Threads.Create（intent save_draft/publish；board active；寫入 AuditLog）在 src/server/usecases/threadsCreate.ts
- [X] T082 [US2] Route: POST /api/threads 在 src/app/api/threads/route.ts
- [X] T083 [US2] Usecase: Threads.Update（作者可編輯；locked 限制；AuditLog）在 src/server/usecases/threadsUpdate.ts
- [X] T084 [US2] Route: PATCH /api/threads/[threadId] 在 src/app/api/threads/[threadId]/route.ts
- [X] T085 [US2] Usecase: Threads.Publish（作者；board active；AuditLog）在 src/server/usecases/threadsPublish.ts
- [X] T086 [US2] Route: POST /api/threads/[threadId]/publish 在 src/app/api/threads/[threadId]/publish/route.ts
- [X] T087 [US2] Usecase: Posts.Create（requireUser；thread not locked；board active；AuditLog）在 src/server/usecases/postsCreate.ts
- [X] T088 [US2] Route: POST /api/posts 在 src/app/api/posts/route.ts
- [X] T089 [US2] Usecase: Posts.Update（作者；thread not locked；AuditLog）在 src/server/usecases/postsUpdate.ts
- [X] T090 [US2] Route: PATCH /api/posts/[postId] 在 src/app/api/posts/[postId]/route.ts

### Backend APIs (Write: Reactions)

- [X] T091 [US2] Usecase: Reactions.SetLike（like/unlike；冪等；board active；AuditLog）在 src/server/usecases/reactionsSetLike.ts
- [X] T092 [US2] Route: POST /api/likes 在 src/app/api/likes/route.ts
- [X] T093 [US2] Usecase: Reactions.SetFavorite（favorite/unfavorite；冪等；board active；AuditLog）在 src/server/usecases/reactionsSetFavorite.ts
- [X] T094 [US2] Route: POST /api/favorites 在 src/app/api/favorites/route.ts

### Frontend UI (Auth + Create/Reply + Reactions)

- [X] T095 [P] [US2] 建立 auth hooks（useMe + login/register/logout mutations）在 src/lib/queries/auth.ts
- [X] T096 [US2] 登入頁（含 returnTo）在 src/app/login/page.tsx
- [X] T097 [US2] 註冊頁在 src/app/register/page.tsx
- [X] T098 [US2] 建立 session-aware navbar（登入狀態、登出、管理入口顯示）在 src/components/NavBar.tsx
- [X] T099 [US2] 新增發文頁（Threads.New；草稿/發布）在 src/app/threads/new/page.tsx
- [X] T100 [P] [US2] 建立 Thread form（RHF + Zod；草稿/發布按鈕）在 src/components/forms/ThreadForm.tsx
- [X] T101 [P] [US2] 建立 Reply form（RHF + Zod）在 src/components/forms/ReplyForm.tsx
- [X] T102 [P] [US2] 建立 reactions mutations（Like/Favorite optimistic update + rollback）在 src/lib/mutations/reactions.ts
- [X] T103 [US2] 主題頁整合：回覆送出、Like/Favorite 操作、鎖文/停用看板提示在 src/app/threads/[id]/page.tsx

### E2E

- [X] T104 [US2] Playwright：註冊→登入→建立草稿→發布流程在 tests/e2e/us2-thread-draft-publish.spec.ts
- [X] T105 [US2] Playwright：回覆 + Like/Favorite（含重複點擊冪等）在 tests/e2e/us2-reactions-idempotent.spec.ts
- [X] T106 [US2] Playwright：鎖文/看板停用限制（回覆/互動被拒絕）在 tests/e2e/us2-restrictions.spec.ts

---

## Phase 5: User Story 3 - 檢舉與看板治理（Moderator board scope）（Priority: P3）

**Goal**: 使用者可檢舉可見內容；Moderator 僅在指派看板內可檢視/處理檢舉並治理內容（含隱藏內容檢視），且不能跨看板。

**Independent Test**: 在看板 A 建內容→檢舉→Moderator(A) 處理並觸發內容 hidden；Moderator(A) 嘗試處理看板 B 被拒絕。

### Tests (Domain/Usecase)

- [X] T107 [P] [US3] 測試 Report 唯一約束（同人同目標不可重複）在 tests/unit/reportUniqueness.test.ts
- [X] T108 [P] [US3] 測試 Moderator board-scope enforcement 在 tests/unit/moderatorScope.test.ts

### Backend APIs (Reports + Moderation)

- [X] T109 [US3] Usecase: Reports.Create（可見性檢查；board active；冪等；AuditLog）在 src/server/usecases/reportsCreate.ts
- [X] T110 [US3] Route: POST /api/reports 在 src/app/api/reports/route.ts
- [X] T111 [US3] Usecase: Reports.ListByBoard（Moderator/Admin；board-scope）在 src/server/usecases/reportsListByBoard.ts
- [X] T112 [US3] Route: GET /api/boards/[boardId]/reports 在 src/app/api/boards/[boardId]/reports/route.ts
- [X] T113 [US3] Usecase: Reports.Resolve（accept/reject；記錄 resolvedBy/resolvedAt；AuditLog）在 src/server/usecases/reportsResolve.ts
- [X] T114 [US3] Route: POST /api/reports/[reportId]/resolve 在 src/app/api/reports/[reportId]/resolve/route.ts

- [X] T115 [US3] Usecase: Threads.Hide/Restore（Moderator/Admin；board-scope；狀態機）在 src/server/usecases/threadsModeration.ts
- [X] T116 [US3] Routes: /api/threads/[threadId]/moderation/hide + restore 在 src/app/api/threads/[threadId]/moderation/
- [X] T117 [US3] Usecase: Threads.Lock/Unlock/SetPinned/SetFeatured（Moderator/Admin；board-scope；AuditLog）在 src/server/usecases/threadsAdminFlags.ts
- [X] T118 [US3] Routes: /api/threads/[threadId]/moderation/lock|unlock|pinned|featured 在 src/app/api/threads/[threadId]/moderation/
- [X] T119 [US3] Usecase: Posts.Hide/Restore（Moderator/Admin；board-scope）在 src/server/usecases/postsModeration.ts
- [X] T120 [US3] Routes: /api/posts/[postId]/moderation/hide + restore 在 src/app/api/posts/[postId]/moderation/

### Frontend UI (Report + Moderator Panel)

- [X] T121 [P] [US3] 建立 report mutation（threads/posts）在 src/lib/mutations/reports.ts
- [X] T122 [US3] 在主題頁加「檢舉」入口（僅登入且可見內容）在 src/app/threads/[id]/page.tsx
- [X] T123 [P] [US3] 建立 ReportDialog（原因選擇、送出、錯誤提示）在 src/components/modals/ReportDialog.tsx
- [X] T124 [US3] 建立 Moderator dashboard 路由（依 board scope 顯示）在 src/app/mod/page.tsx
- [X] T125 [P] [US3] 建立 reports hooks（list/resolve）在 src/lib/queries/reports.ts
- [X] T126 [US3] Moderator 報表頁：pending 列表 + 內容預覽 + accept/reject 在 src/components/moderation/ReportsTable.tsx
- [X] T127 [US3] Moderator 內容治理 UI（hide/restore/lock/unlock/pin/feature）在 src/components/moderation/ThreadActions.tsx

### E2E

- [X] T128 [US3] Playwright：檢舉冪等（重複檢舉被拒絕但狀態一致）在 tests/e2e/us3-report-idempotent.spec.ts
- [X] T129 [US3] Playwright：Moderator board-scope（A 可處理、B 不可）在 tests/e2e/us3-moderator-scope.spec.ts

---

## Phase 6: User Story 4 - Admin 後台治理與可追溯性（Priority: P4）

**Goal**: Admin 可管理看板（建立/編輯/停用/排序）、指派/移除 Moderator、停權/解鎖使用者，並查看 Audit Log；所有敏感操作可追溯。

**Independent Test**: Admin 完成「建立看板→指派 Moderator→停用看板→停權/解鎖→查 AuditLog」且權限限制正確。

### Contracts (補齊 OpenAPI)

- [X] T130 [US4] 補齊 admin endpoints 契約（boards update/list、moderator assignments、users ban、audit logs list）在 specs/001-multi-role-forum/contracts/openapi.yaml

### Tests (Domain/Usecase)

- [X] T131 [P] [US4] 測試 Admin-only guards（/admin 與 admin APIs）在 tests/unit/adminGuards.test.ts
- [X] T132 [P] [US4] 測試 banned user 不可登入/不可寫入在 tests/unit/bannedUserRules.test.ts

### Backend APIs (Admin)

- [X] T133 [US4] Usecase: Admin.Boards.Create/Update/Deactivate/Reorder（寫 AuditLog）在 src/server/usecases/adminBoards.ts
- [X] T134 [US4] Routes: /api/admin/boards (POST/PATCH/GET) 在 src/app/api/admin/boards/route.ts
- [X] T135 [US4] Usecase: Admin.Moderators.SetAssignment（assign/remove；board scope）在 src/server/usecases/adminModerators.ts
- [X] T136 [US4] Route: POST /api/admin/moderators 在 src/app/api/admin/moderators/route.ts
- [X] T137 [US4] Usecase: Admin.Users.SetBanStatus（停權/解鎖；原因；AuditLog）在 src/server/usecases/adminUsers.ts
- [X] T138 [US4] Route: POST /api/admin/users/ban 在 src/app/api/admin/users/ban/route.ts
- [X] T139 [US4] Usecase: Admin.AuditLogs.List（filter + pagination）在 src/server/usecases/adminAuditLogsList.ts
- [X] T140 [US4] Route: GET /api/admin/audit-logs 在 src/app/api/admin/audit-logs/route.ts
- [X] T141 [US4] Usecase: Admin.Reports.ListAll（全站檢舉）在 src/server/usecases/adminReportsList.ts
- [X] T142 [US4] Route: GET /api/admin/reports 在 src/app/api/admin/reports/route.ts

### Frontend UI (Admin)

- [X] T143 [P] [US4] 建立 admin hooks（boards/members/audit logs/users）在 src/lib/queries/admin.ts
- [X] T144 [US4] Admin 頁入口與路由保護（非 admin 顯示 403）在 src/app/admin/page.tsx
- [X] T145 [US4] Admin 看板管理 UI（新增/編輯/停用/排序）在 src/components/admin/BoardsManager.tsx
- [X] T146 [US4] Admin Moderator 指派 UI（選 user、assign/remove）在 src/components/admin/ModeratorsManager.tsx
- [X] T147 [US4] Admin 使用者停權 UI（ban/unban）在 src/components/admin/UsersManager.tsx
- [X] T148 [US4] Admin AuditLog 檢視 UI（filters + pagination）在 src/components/admin/AuditLogTable.tsx

### E2E

- [X] T149 [US4] Playwright：Admin 治理流程（boards + moderator + ban + audit）在 tests/e2e/us4-admin-governance.spec.ts

---

## Phase 7: Polish & Cross-Cutting Concerns（安全、品質、效能、文件）

- [X] T150 [P] 補齊全站錯誤頁（401/403/404/500）在 src/app/not-found.tsx、src/app/error.tsx、src/app/forbidden/page.tsx
- [X] T151 強化 middleware：對 /admin、/threads/new 做 server-side redirect/guard 在 src/middleware.ts
- [X] T152 [P] 增加 UI 可用性（loading skeleton、empty state、disabled reason）在 src/components/
- [X] T153 建立安全檢查清單落地（CSRF 全寫入端點、cookie flags、no-store）在 src/lib/security/
- [X] T154 [P] 加入基本 rate limit（針對 login/report/reactions）在 src/lib/security/rateLimit.ts
- [X] T155 [P] 文件更新：補齊 quickstart 可跑流程（dev/migrate/seed/test）在 specs/001-multi-role-forum/quickstart.md 與 README.md
- [X] T156 執行一次全量測試（vitest + playwright）並修正本功能範圍內問題在 package.json scripts

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）→ Phase 2（Foundational）→ Phase 3+（US1~US4）→ Phase 7（Polish）

### User Story Dependencies (Completion Order)

- US1（公開瀏覽/搜尋）依賴 Foundational（DB + error + requestId + query client）但不依賴登入。
- US2（登入/發文/互動）依賴 Foundational 的 session + CSRF + RBAC 基礎。
- US3（檢舉/Moderator）依賴 US2 的登入與 Foundational 的 board-scope。
- US4（Admin 後台/Audit）依賴 US2 的登入與 AuditLog 基礎。

---

## Parallel Execution Examples

### Setup / Foundational

- 可平行：T003、T004、T005、T006、T007、T008、T009、T010（工具鏈與目錄/測試框架互不衝突）

### US1

- 可平行：T059/T060/T061/T062（hooks）、T067（components）、T041/T042（unit tests）

### US2

- 可平行：T070/T071/T072（unit tests）、T095（auth hooks）、T100/T101（forms）

### US3

- 可平行：T107/T108（unit tests）、T121（mutation）、T123（dialog）

### US4

- 可平行：T131/T132（unit tests）、T143（admin hooks）、T145~T148（admin components）

---

## Implementation Strategy (完整系統，但仍採可交付增量)

1) 先把 Phase 1~2 做到「可啟動 + 可 migrate + error/security 框架齊備」。
2) 依 P1→P4 完成 user stories；每個 story 以 unit tests（domain/usecase）+ Playwright E2E 做驗證。
3) 最後做 Phase 7：補齊錯誤頁、可用性、rate limit、文件與全量測試跑通。