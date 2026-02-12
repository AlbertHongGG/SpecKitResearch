---
description: "Task list for feature implementation"
---

# Tasks: 多使用者協作待辦系統（Trello Lite）

**Input**: Design documents from `/specs/001-collab-task-board/`

- Spec: [spec.md](spec.md)
- Plan: [plan.md](plan.md)
- Research: [research.md](research.md)
- Data model: [data-model.md](data-model.md)
- Contracts: [contracts/openapi.yaml](contracts/openapi.yaml), [contracts/realtime-events.md](contracts/realtime-events.md)

**Project structure (monorepo)**
- API: `apps/api/` (Fastify + TS + Prisma + SQLite)
- Web: `apps/web/` (Next.js App Router + TS + Tailwind + TanStack Query + RHF + Zod)
- Shared: `packages/shared/` (types + Zod schemas)

**Tests**: 核心 domain/business rules 必須有測試（happy path / edge cases / failures）。

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 初始化 monorepo、開發工具與基礎目錄，讓後續任務可以落地到明確檔案路徑。

- [X] T001 建立 pnpm workspace 設定於 pnpm-workspace.yaml
- [X] T002 建立 repo root 套件與 scripts 於 package.json（含 dev/test/e2e/lint/format）
- [X] T003 [P] 建立共用 TypeScript 設定於 tsconfig.base.json
- [X] T004 [P] 建立共用 ESLint 設定於 .eslintrc.cjs
- [X] T005 [P] 建立共用 Prettier 設定於 .prettierrc
- [X] T006 [P] 建立共用 EditorConfig 於 .editorconfig
- [X] T007 [P] 建立環境變數範本於 .env.example
- [X] T008 Scaffold API 專案骨架於 apps/api/package.json 與 apps/api/tsconfig.json
- [X] T009 Scaffold Web 專案骨架於 apps/web/package.json 與 apps/web/tsconfig.json
- [X] T010 Scaffold shared 套件於 packages/shared/package.json 與 packages/shared/tsconfig.json
- [X] T011 [P] 加入 shared exports（types/schemas）於 packages/shared/src/index.ts
- [X] T012 [P] 建立 Vitest 設定於 apps/api/vitest.config.ts
- [X] T013 [P] 建立 Vitest 設定於 packages/shared/vitest.config.ts
- [X] T014 [P] 建立 Playwright 設定於 apps/web/playwright.config.ts
- [X] T015 [P] 建立 Tailwind 設定於 apps/web/tailwind.config.ts 與 apps/web/postcss.config.js
- [X] T016 [P] 建立 Next.js app router 基礎 layout 於 apps/web/src/app/layout.tsx
- [X] T017 [P] 建立全站樣式入口於 apps/web/src/app/globals.css
- [X] T018 [P] 建立 Fastify server 入口於 apps/api/src/server.ts
- [X] T019 [P] 建立 Fastify app 工廠於 apps/api/src/app.ts（供測試/啟動共用）
- [X] T020 [P] 建立 shared 的 Zod 契約骨架於 packages/shared/src/schemas/index.ts

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: DB/錯誤格式/觀測性/Auth/RBAC 等基礎設施，完成後才能開始各 user story 的實作。

### 2.1 Configuration / Observability / Error Semantics

- [X] T021 建立 API 端環境變數解析（Zod）於 apps/api/src/config.ts
- [X] T022 [P] 建立 Web 端環境變數解析（Zod）於 apps/web/src/config.ts
- [X] T023 定義統一錯誤回應格式（error.code/message/requestId/details）於 apps/api/src/http/errors.ts
- [X] T024 [P] 建立 Fastify error handler plugin 於 apps/api/src/plugins/error-handler.ts
- [X] T025 [P] 建立 request id plugin（每 request 注入 requestId）於 apps/api/src/plugins/request-id.ts
- [X] T026 [P] 建立基礎 logger（pino）設定於 apps/api/src/plugins/logger.ts
- [X] T027 [P] 建立 API route 註冊入口於 apps/api/src/routes/index.ts
- [X] T028 [P] 建立 API auth preHandler 骨架於 apps/api/src/http/auth/require-auth.ts
- [X] T029 [P] 建立 API RBAC/roles 型別於 apps/api/src/domain/rbac/roles.ts

### 2.2 Database / Prisma / SQLite

- [X] T030 建立 Prisma schema 於 apps/api/prisma/schema.prisma（對齊 data-model.md）
- [X] T031 [P] 建立 Prisma client 初始化於 apps/api/src/db/prisma.ts
- [X] T032 建立 migrate scripts 並產出初始 migration（init，產物位於 apps/api/prisma/migrations/）與 SQLite DB 檔於 apps/api/package.json 與 data/app.db
- [X] T033 [P] 建立 DB 連線啟動檢查（含 WAL pragmas）於 apps/api/src/db/sqlite.ts
- [X] T034 [P] 建立可重試錯誤分類（busy/locked/unique conflict）於 apps/api/src/db/retry.ts
- [X] T035 [P] 建立 transaction helper（短交易）於 apps/api/src/db/tx.ts

### 2.3 Auth（cookie session + refresh rotation）

- [X] T036 建立密碼雜湊與驗證（argon2/bcrypt）於 apps/api/src/domain/auth/password.ts
- [X] T037 [P] 建立 session cookie utilities（set/clear）於 apps/api/src/http/auth/cookies.ts
- [X] T038 建立 refresh token hash 與 rotation 邏輯於 apps/api/src/domain/auth/refresh-tokens.ts
- [X] T039 [P] 建立 AuthSession repository 於 apps/api/src/repos/auth-session-repo.ts
- [X] T040 [P] 建立 User repository 於 apps/api/src/repos/user-repo.ts
- [X] T041 [P] 建立 rate limit plugin（login/register/refresh）於 apps/api/src/plugins/rate-limit.ts
- [X] T042 建立 CSRF 防護（Origin/Referer 檢查）於 apps/api/src/http/security/csrf.ts

### 2.4 RBAC / Project Scoping（403/404 policy）

- [X] T043 建立 ProjectMembership repository 於 apps/api/src/repos/membership-repo.ts
- [X] T044 [P] 建立 Project repository 於 apps/api/src/repos/project-repo.ts
- [X] T045 建立 project scope preHandler（載入 membership + role）於 apps/api/src/http/rbac/project-scope.ts
- [X] T046 建立 403 vs 404 策略（不洩露資源）於 apps/api/src/http/rbac/not-found-policy.ts

### 2.5 Activity Log（append-only）

- [X] T047 [P] 建立 ActivityLog repository（insert-only + list）於 apps/api/src/repos/activity-repo.ts
- [X] T048 建立 ActivityLog service（同交易 append）於 apps/api/src/domain/activity/activity-service.ts
- [X] T049 [P] 建立 shared 的 error codes 列舉於 packages/shared/src/schemas/error-codes.ts
- [X] T050 [P] 建立 shared 的基本 entities schemas（User/Project/Board/List/Task/Comment/Activity）於 packages/shared/src/schemas/entities.ts

**Checkpoint**: Foundation ready（DB + error semantics + auth + RBAC + activity 基礎）

---

## Phase 3: User Story 1 - 註冊/登入與專案列表（Priority: P1）

**Goal**: Visitor → 註冊/登入成為 User；User 能看專案列表並登出；未登入受保護資源 401 + 導向。

**Independent Test**:
- API：register/login/logout/refresh/me + GET /projects
- Web：`/register`、`/login`、`/projects`，且未登入存取 `/projects` 會導到 `/login?next=...`

### Tests（US1）

- [X] T051 [P] [US1] 建立 auth 單元測試於 apps/api/src/domain/auth/password.test.ts
- [X] T052 [P] [US1] 建立 auth refresh rotation 單元測試於 apps/api/src/domain/auth/refresh-tokens.test.ts
- [X] T053 [P] [US1] 建立 API integration 測試（register/login/me/logout）於 apps/api/src/routes/auth.test.ts
- [X] T054 [P] [US1] 建立 API integration 測試（projects list 401/200）於 apps/api/src/routes/projects.test.ts
- [X] T055 [P] [US1] 建立 Playwright flow（register→projects→logout）於 apps/web/tests/e2e/us1-auth.spec.ts

### Backend（US1）

- [X] T056 [US1] 實作 /auth/register route 於 apps/api/src/routes/auth.ts
- [X] T057 [US1] 實作 /auth/login route 於 apps/api/src/routes/auth.ts
- [X] T058 [US1] 實作 /auth/me route 於 apps/api/src/routes/auth.ts
- [X] T059 [US1] 實作 /auth/logout route 於 apps/api/src/routes/auth.ts
- [X] T060 [US1] 實作 /auth/refresh route（rotation + reuse detection）於 apps/api/src/routes/auth.ts
- [X] T061 [US1] 實作 GET /projects（回傳 projects + invitations）於 apps/api/src/routes/projects.ts
- [X] T062 [US1] 將 routes 掛載到 server 於 apps/api/src/routes/index.ts

### Frontend（US1）

- [X] T063 [P] [US1] 建立 API client（fetch wrapper + error decode）於 apps/web/src/lib/api-client.ts
- [X] T064 [P] [US1] 建立 TanStack Query provider 於 apps/web/src/app/providers.tsx
- [X] T065 [US1] 建立 landing 頁 `/` 於 apps/web/src/app/page.tsx（Visitor vs User 導覽）
- [X] T066 [US1] 建立 register 頁 `/register` 於 apps/web/src/app/register/page.tsx（RHF+Zod）
- [X] T067 [US1] 建立 login 頁 `/login` 於 apps/web/src/app/login/page.tsx（支援 next 參數）
- [X] T068 [US1] 建立 projects 頁 `/projects` 於 apps/web/src/app/projects/page.tsx（需 auth guard）
- [X] T069 [P] [US1] 建立 auth guard（401 導向 login）於 apps/web/src/lib/require-auth.ts
- [X] T070 [P] [US1] 建立 Header（Visitor/User 變體）於 apps/web/src/components/Header.tsx
- [X] T071 [US1] 在 projects 頁串接 GET /projects 並呈現 loading/empty/error 於 apps/web/src/app/projects/page.tsx
- [X] T072 [US1] 實作 logout button（呼叫 /auth/logout + 清 cache）於 apps/web/src/components/Header.tsx

---

## Phase 4: User Story 2 - 建立專案與成員邀請/角色（Priority: P1）

**Goal**: 建立專案、邀請/接受/拒絕、角色調整與專案隔離（403/404 policy）。

**Independent Test**:
- API：create project、create invitation、accept invitation、list/update/remove membership、403/404 行為
- Web：projects 頁可建立專案；members 頁可邀請/改角色/移除；非成員進入專案頁顯示 403

### Tests（US2）

- [X] T073 [P] [US2] 建立 RBAC unit tests（role matrix）於 apps/api/src/domain/rbac/rbac.test.ts
- [X] T074 [P] [US2] 建立 invitation flow integration test 於 apps/api/src/routes/invitations.test.ts
- [X] T075 [P] [US2] 建立 membership update/remove integration test 於 apps/api/src/routes/memberships.test.ts
- [X] T076 [P] [US2] 建立 Playwright flow（create project → invite → accept）於 apps/web/tests/e2e/us2-invite.spec.ts

### Backend（US2）

- [X] T077 [US2] 實作 POST /projects（建立專案 + ActivityLog）於 apps/api/src/routes/projects.ts
- [X] T078 [US2] 實作 PATCH /projects/{projectId}（OCC）於 apps/api/src/routes/projects.ts
- [X] T079 [US2] 實作 POST /projects/{projectId}/archive（唯讀）於 apps/api/src/routes/projects.ts
- [X] T080 [US2] 實作 GET /projects/{projectId}/invitations 於 apps/api/src/routes/invitations.ts
- [X] T081 [US2] 實作 POST /projects/{projectId}/invitations（owner/admin）於 apps/api/src/routes/invitations.ts
- [X] T082 [US2] 實作 POST /invitations/{invitationId}/accept 於 apps/api/src/routes/invitations.ts
- [X] T083 [US2] 實作 POST /invitations/{invitationId}/reject 於 apps/api/src/routes/invitations.ts
- [X] T084 [US2] 實作 GET /projects/{projectId}/memberships 於 apps/api/src/routes/memberships.ts
- [X] T085 [US2] 實作 PATCH /projects/{projectId}/memberships/{membershipId}（OCC）於 apps/api/src/routes/memberships.ts
- [X] T086 [US2] 實作移除成員（含解除指派/ActivityLog）於 apps/api/src/routes/memberships.ts
- [X] T087 [US2] 在 project-scope preHandler 套用 role rules 於 apps/api/src/http/rbac/project-scope.ts

### Frontend（US2）

- [X] T088 [US2] projects 頁新增「建立專案」表單/對話框於 apps/web/src/app/projects/page.tsx
- [X] T089 [P] [US2] 建立 project layout（side nav）於 apps/web/src/app/projects/[projectId]/layout.tsx
- [X] T090 [US2] 建立 members 頁 `/projects/:projectId/members` 於 apps/web/src/app/projects/[projectId]/members/page.tsx
- [X] T091 [US2] 建立 settings 頁 `/projects/:projectId/settings`（Owner-only UI）於 apps/web/src/app/projects/[projectId]/settings/page.tsx
- [X] T092 [P] [US2] 建立 membership hooks（role / permissions）於 apps/web/src/lib/use-membership.ts
- [X] T093 [US2] members 頁實作邀請（POST invitations）於 apps/web/src/app/projects/[projectId]/members/page.tsx
- [X] T094 [US2] members 頁實作改角色（PATCH memberships）於 apps/web/src/app/projects/[projectId]/members/page.tsx
- [X] T095 [US2] members 頁實作移除成員（DELETE/PATCH 實作）於 apps/web/src/app/projects/[projectId]/members/page.tsx
- [X] T096 [US2] projects 頁呈現 invitations inbox（accept/reject）於 apps/web/src/app/projects/page.tsx
- [X] T097 [US2] 實作 403/404/5xx 頁面路由於 apps/web/src/app/403/page.tsx、apps/web/src/app/404/page.tsx、apps/web/src/app/5xx/page.tsx
- [X] T098 [US2] 實作 settings 頁的 project archive/visibility 更新 UI 於 apps/web/src/app/projects/[projectId]/settings/page.tsx

---

## Phase 5: User Story 3 - 看板結構（Board/List）與封存唯讀（Priority: P1）

**Goal**: Board/List CRUD、重排、WIP 設定、Board/List 封存唯讀與 UI 顯示。

**Independent Test**:
- API：board/list create/update/archive/reorder；WIP 設定；封存後寫入一致拒絕
- Web：board 頁可建立 board/list、重排 list、設定 WIP、封存 board/list 後 UI 轉唯讀

### Tests（US3）

- [X] T099 [P] [US3] 建立 archived read-only domain tests 於 apps/api/src/domain/archived/archived.test.ts
- [X] T100 [P] [US3] 建立 list WIP policy domain tests 於 apps/api/src/domain/wip/wip.test.ts
- [X] T101 [P] [US3] 建立 boards/lists integration tests 於 apps/api/src/routes/boards-lists.test.ts
- [X] T102 [P] [US3] 建立 Playwright flow（create list + reorder + archive）於 apps/web/tests/e2e/us3-boards-lists.spec.ts

### Backend（US3）

- [X] T103 [P] [US3] 建立 Board repository 於 apps/api/src/repos/board-repo.ts
- [X] T104 [P] [US3] 建立 List repository 於 apps/api/src/repos/list-repo.ts
- [X] T105 [US3] 實作 POST /projects/{projectId}/boards 於 apps/api/src/routes/boards.ts
- [X] T106 [US3] 實作 PATCH /projects/{projectId}/boards/{boardId}（OCC）於 apps/api/src/routes/boards.ts
- [X] T107 [US3] 實作 POST /projects/{projectId}/boards/{boardId}/archive 於 apps/api/src/routes/boards.ts
- [X] T108 [US3] 實作 POST /projects/{projectId}/lists（建立 list）於 apps/api/src/routes/lists.ts
- [X] T109 [US3] 實作 PATCH /projects/{projectId}/lists/{listId}（title/WIP/OCC）於 apps/api/src/routes/lists.ts
- [X] T110 [US3] 實作 POST /projects/{projectId}/lists/{listId}/archive 於 apps/api/src/routes/lists.ts
- [X] T111 [US3] 實作 POST /projects/{projectId}/boards/{boardId}/lists/reorder（權威順序）於 apps/api/src/routes/lists.ts
- [X] T112 [US3] 實作 GET /projects/{projectId}/snapshot（含 boards/lists/tasks/memberships）於 apps/api/src/routes/snapshot.ts

### Frontend（US3）

- [X] T113 [US3] 建立 board 頁 `/projects/:projectId/board` 於 apps/web/src/app/projects/[projectId]/board/page.tsx
- [X] T114 [P] [US3] 建立 Board UI components 於 apps/web/src/components/board/BoardHeader.tsx、apps/web/src/components/board/ListColumn.tsx、apps/web/src/components/board/index.ts
- [X] T115 [US3] 串接 snapshot API 並渲染 boards/lists（含 loading/empty/error）於 apps/web/src/app/projects/[projectId]/board/page.tsx
- [X] T116 [US3] 建立建立 list/board 的表單（RHF+Zod）於 apps/web/src/components/board/CreateListForm.tsx 與 apps/web/src/components/board/CreateBoardForm.tsx
- [X] T117 [US3] 實作 list reorder UI（拖拉欄位）於 apps/web/src/components/board/ListReorder.tsx
- [X] T118 [US3] 實作 WIP 設定 UI（Owner/Admin）於 apps/web/src/components/board/WipSettings.tsx
- [X] T119 [US3] 實作 archive board/list UI（唯讀提示）於 apps/web/src/components/board/ArchiveControls.tsx
- [X] T120 [US3] 建立 archived 頁 `/projects/:projectId/archived` 於 apps/web/src/app/projects/[projectId]/archived/page.tsx

---

## Phase 6: User Story 4 - 任務協作（Task）與稽核（Priority: P1）

**Goal**: Task CRUD、狀態機、指派、封存、留言、Activity Log 查詢；拖拉排序與 WIP/唯讀/權限一致。

**Independent Test**:
- API：create/update/status/assignees/move/archive + comment create + activity list；done 不可回退；archived 唯讀
- Web：board 上可新增卡片、拖拉排序、開 side panel 編輯/留言/指派/改狀態/封存；activity 頁可查看 append-only

### Tests（US4）

- [X] T121 [P] [US4] 建立 task state machine domain tests 於 apps/api/src/domain/tasks/task-state.test.ts
- [X] T122 [P] [US4] 建立 ordering generateBetween unit tests 於 apps/api/src/domain/ordering/position.test.ts
- [X] T123 [P] [US4] 建立 move task integration tests（unique conflict retry + 409）於 apps/api/src/routes/tasks-move.test.ts
- [X] T124 [P] [US4] 建立 comments/activity integration tests 於 apps/api/src/routes/comments-activity.test.ts
- [X] T125 [P] [US4] 建立 Playwright flow（create task → drag → edit → comment）於 apps/web/tests/e2e/us4-tasks.spec.ts

### Backend（US4）

- [X] T126 [P] [US4] 建立 Task repository 於 apps/api/src/repos/task-repo.ts
- [X] T127 [P] [US4] 建立 Comment repository（insert-only）於 apps/api/src/repos/comment-repo.ts
- [X] T128 [P] [US4] 建立 ordering position 產生器於 apps/api/src/domain/ordering/position.ts
- [X] T129 [P] [US4] 建立 list rebalance（有界重排）於 apps/api/src/domain/ordering/rebalance.ts
- [X] T130 [P] [US4] 建立 task domain rules（archived/WIP/state machine）於 apps/api/src/domain/tasks/task-rules.ts
- [X] T131 [US4] 實作 POST /projects/{projectId}/tasks（建立 + position）於 apps/api/src/routes/tasks.ts
- [X] T132 [US4] 實作 PATCH /projects/{projectId}/tasks/{taskId}（OCC）於 apps/api/src/routes/tasks.ts
- [X] T133 [US4] 實作 POST /projects/{projectId}/tasks/{taskId}/move（權威排序 + bounded retry）於 apps/api/src/routes/tasks.ts
- [X] T134 [US4] 實作 POST /projects/{projectId}/tasks/{taskId}/archive（OCC）於 apps/api/src/routes/tasks.ts
- [X] T135 [US4] 實作 Task assignees 設定（僅 project members）於 apps/api/src/routes/tasks.ts
- [X] T136 [US4] 實作 Task status change（FR-033/034）於 apps/api/src/routes/tasks.ts
- [X] T137 [US4] 實作 POST comment（append-only + ActivityLog）於 apps/api/src/routes/comments.ts
- [X] T138 [US4] 實作 GET /projects/{projectId}/activity（cursor/limit）於 apps/api/src/routes/activity.ts
- [X] T139 [US4] 確保所有關鍵操作寫入 ActivityLog（同交易）於 apps/api/src/domain/activity/activity-service.ts

### Frontend（US4）

- [X] T140 [P] [US4] 引入 DnD library（@dnd-kit）並設定於 apps/web/package.json
- [X] T141 [P] [US4] 建立 TaskCard component 於 apps/web/src/components/board/TaskCard.tsx
- [X] T142 [P] [US4] 建立 TaskColumn component（含 dropzone + WIP 顯示）於 apps/web/src/components/board/TaskColumn.tsx
- [X] T143 [US4] 在 board 頁加入「新增 Task」入口（依權限）於 apps/web/src/app/projects/[projectId]/board/page.tsx
- [X] T144 [US4] 實作 task drag-and-drop（同 list 重排 + 跨 list 移動）於 apps/web/src/components/board/TaskDnd.tsx
- [X] T145 [US4] 實作 move API 呼叫與權威回覆對齊（reconcile positions）於 apps/web/src/lib/mutations/move-task.ts
- [X] T146 [US4] 建立 Task side panel（task detail）於 apps/web/src/components/task/TaskPanel.tsx
- [X] T147 [US4] 建立 task detail query（GET snapshot + task detail）於 apps/web/src/lib/queries/task.ts
- [X] T148 [US4] 實作 task edit 表單（title/description/due/priority）於 apps/web/src/components/task/TaskEditForm.tsx
- [X] T149 [US4] 實作 assignees selector（memberships）於 apps/web/src/components/task/AssigneesPicker.tsx
- [X] T150 [US4] 實作 status change controls（合法轉換 UI）於 apps/web/src/components/task/TaskStatusControl.tsx
- [X] T151 [US4] 實作 archive task UI（唯讀顯示）於 apps/web/src/components/task/ArchiveTaskButton.tsx
- [X] T152 [US4] 實作 comment composer + 列表（append-only）於 apps/web/src/components/task/Comments.tsx
- [X] T153 [US4] 建立 activity 頁 `/projects/:projectId/activity` 於 apps/web/src/app/projects/[projectId]/activity/page.tsx
- [X] T154 [US4] activity 頁串接 API（cursor pagination）於 apps/web/src/app/projects/[projectId]/activity/page.tsx
- [X] T155 [US4] 建立 409 conflict UX（顯示最新資料 + 重新套用提示）於 apps/web/src/components/errors/ConflictDialog.tsx
- [X] T156 [US4] 建立 WIP 超限 UX（Owner/Admin 可 override + reason）於 apps/web/src/components/board/WipOverrideDialog.tsx

---

## Phase 7: User Story 5 - 即時同步、權威排序、重連回補與衝突處理（Priority: P2）

**Goal**: WebSocket 即時同步、重連 snapshot、事件去重/續傳（seq），以及離線排隊與 409 衝突提示。

**Independent Test**:
- 兩個瀏覽器視窗同專案：一邊拖拉/編輯/留言，另一邊 1 秒內同步
- 斷線→重連：會拉 snapshot 並對齊；離線期間的 mutation 逐筆重送，衝突回 409 且 UI 顯示最新

### Tests（US5）

- [X] T157 [P] [US5] 建立 WS event envelope schema tests 於 packages/shared/src/schemas/realtime-events.test.ts
- [X] T158 [P] [US5] 建立 WS integration 測試（connect+hello+snapshot）於 apps/api/src/realtime/realtime.test.ts
- [X] T159 [P] [US5] 建立 Playwright 多分頁同步測試（基本）於 apps/web/tests/e2e/us5-realtime.spec.ts

### Backend（US5）

- [X] T160 [P] [US5] 建立 shared 的 realtime envelope Zod schema 於 packages/shared/src/schemas/realtime.ts
- [X] T161 [US5] 新增 ProjectEvent（或等效）表到 apps/api/prisma/schema.prisma（seq/eventId/payload）
- [X] T162 [US5] 建立 realtime event repo（append + list since seq）於 apps/api/src/repos/project-event-repo.ts
- [X] T163 [US5] 建立 in-process broadcaster（per project channel）於 apps/api/src/realtime/broadcaster.ts
- [X] T164 [US5] 建立 WS handler（auth + project scope + hello/ack）於 apps/api/src/realtime/handler.ts
- [X] T165 [US5] 在 Fastify 註冊 websocket route `GET /realtime` 於 apps/api/src/realtime/routes.ts
- [X] T166 [US5] 實作 snapshot 推送（REST snapshot + WS snapshot message）於 apps/api/src/realtime/snapshot.ts
- [X] T167 [US5] 在關鍵 mutation 成功後寫入 ProjectEvent + broadcast 於 apps/api/src/domain/activity/activity-service.ts
- [X] T168 [US5] 實作 resume：依 lastSeenSeq 補送 events（或回 error 要求 snapshot）於 apps/api/src/realtime/handler.ts

### Frontend（US5）

- [X] T169 [P] [US5] 建立 WS client（connect/reconnect/backoff）於 apps/web/src/lib/realtime/ws-client.ts
- [X] T170 [P] [US5] 建立 realtime hook（project channel）於 apps/web/src/lib/realtime/use-project-realtime.ts
- [X] T171 [US5] 實作 snapshot 接收後更新 Query cache 於 apps/web/src/lib/realtime/apply-snapshot.ts
- [X] T172 [US5] 實作 events apply（task/list/board/comment/activity）於 apps/web/src/lib/realtime/apply-event.ts
- [X] T173 [US5] 實作 lastSeenSeq 持久化（localStorage）於 apps/web/src/lib/realtime/seq-store.ts
- [X] T174 [US5] 建立離線 mutation queue（idempotencyKey + 重送）於 apps/web/src/lib/offline/mutation-queue.ts
- [X] T175 [US5] 整合 move-task mutation 與 offline queue 於 apps/web/src/lib/mutations/move-task.ts
- [X] T176 [US5] 整合 task/comment mutations 與 offline queue 於 apps/web/src/lib/mutations/update-task.ts、apps/web/src/lib/mutations/create-comment.ts、apps/web/src/lib/mutations/set-task-assignees.ts、apps/web/src/lib/mutations/change-task-status.ts
- [X] T177 [US5] 重連策略：偵測 gap 或 decode error 時改走 REST snapshot 於 apps/web/src/lib/realtime/use-project-realtime.ts

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 全面完善 UX、效能、安全性、可觀測性與文件，確保「完成的專案結果」。

- [X] T178 [P] 補齊主要 routes 的 loading/error UI 於 apps/web/src/app/loading.tsx、apps/web/src/app/error.tsx、apps/web/src/app/register/loading.tsx、apps/web/src/app/login/loading.tsx、apps/web/src/app/projects/loading.tsx、apps/web/src/app/projects/[projectId]/board/loading.tsx
- [X] T179 [P] 實作統一 toast/alert 系統於 apps/web/src/components/Toast.tsx
- [X] T180 強化 XSS 防護（文字輸出轉義策略）於 apps/web/src/lib/sanitize.ts
- [X] T181 強化 API 安全 headers（CSP/helmet）於 apps/api/src/plugins/security-headers.ts
- [X] T182 [P] 補齊 API audit logs（403/404/409/WIP/WS reconnect）於 apps/api/src/plugins/logger.ts
- [X] T183 [P] 補齊 OpenAPI 與 shared schemas 的一致性檢查任務於 apps/api/src/contract/validate-openapi.test.ts
- [X] T184 [P] 補齊 DB seed（dev 專案/使用者）於 apps/api/prisma/seed.ts
- [X] T185 [P] 增加 README 開發指引與 quickstart 對齊於 README.md
- [X] T186 [P] 執行 quickstart 全流程驗證並修正文檔於 specs/001-collab-task-board/quickstart.md

---

## Dependencies & Execution Order

### User Story dependency graph

- Setup（Phase 1）→ Foundational（Phase 2）→ US1（Phase 3）
- US2（Phase 4）依賴：US1（需要登入/專案列表 UI）
- US3（Phase 5）依賴：US2（需要 project 成員邊界與 side nav）
- US4（Phase 6）依賴：US3（需要 board/list 容器）
- US5（Phase 7）依賴：US4（事件類型要涵蓋 task/comment/activity 的 mutation）

### Parallel execution examples（per story）

- US1 可平行：T063/T064/T069（web）與 T056~T061（api），以及 T051~T055（tests）
- US2 可平行：memberships 路由（T084~T086）與 invitations 路由（T080~T083），以及 web members/settings（T090~T098）
- US3 可平行：repos（T103/T104）與 web board components（T114/T116）
- US4 可平行：ordering 模組（T128/T129）與 web task panel/components（T146~T152）
- US5 可平行：shared realtime schema（T160）與 web ws client/hook（T169/T170）

---

## Implementation Strategy（完成版系統，不只 MVP）

- 先完成 Phase 1~2（可跑起來 + 有 DB + 有 auth + 有 RBAC）
- 依 P1 user stories（US1→US4）把「完整 UI + 完整 API + 測試」一次做完
- 最後做 P2（US5）把 realtime/重連/離線與衝突處理補齊，達到 spec 的一致性要求
