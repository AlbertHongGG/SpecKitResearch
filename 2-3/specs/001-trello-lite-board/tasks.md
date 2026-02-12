---

description: "Tasks for Trello Lite feature implementation"
---

# Tasks: Trello Lite（多人協作待辦看板）

**Input**: Design documents from `specs/001-trello-lite-board/`（[plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml), [quickstart.md](quickstart.md)）

本 tasks 目標是完成「可用的完整系統」（後端 + DB + Realtime + 前端 UI），並對齊：
- `spec.md` 的 P1–P4 user stories 與 FR-001~FR-048
- `contracts/openapi.yaml` 的現有 API 合約（並補齊與 spec 不一致/缺漏處）

> 測試任務：spec 未明確要求 TDD，因此本清單以「可獨立驗收的手動/端到端驗證條件」為主；若你想採 Vitest/Playwright，可在各 story phase 前追加 test tasks。

## Checklist Format（REQUIRED）

每個 task 必須符合：
`- [ ] T### [P?] [US?] Description with file path`

- **[P]**：可平行（不同檔案/無未完成依賴）
- **[US#]**：僅用在 user story phase（US1~US4）；Setup/Foundational/Polish 不標
- 每個 task 描述必須包含「主要檔案路徑」（或明確資料夾路徑）

---

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 依 plan 的 `backend/` + `frontend/` 結構初始化專案、工具鏈與最小可跑的 dev scripts。

- [x] T001 建立 repo 目錄骨架 `backend/src/`、`backend/prisma/`、`backend/tests/`、`frontend/src/`（含 `frontend/src/app/`、`frontend/src/components/`、`frontend/src/features/`、`frontend/src/lib/`）
- [x] T002 初始化後端套件與 scripts 於 `backend/package.json`（dev/build/start/prisma/migrate）
- [x] T003 初始化前端 Next.js（App Router）與 scripts 於 `frontend/package.json`
- [x] T004 [P] 建立根目錄 `.gitignore`
- [x] T005 [P] 建立一致的 `.editorconfig`
- [x] T006 [P] 建立工作區設定於 `.vscode/settings.json`（format on save、eslint、typescript）
- [x] T007 [P] 後端 TypeScript 設定於 `backend/tsconfig.json`
- [x] T008 [P] 前端 TypeScript 設定於 `frontend/tsconfig.json`
- [x] T009 [P] 後端 ESLint/Prettier 設定於 `backend/eslint.config.js`、`backend/prettier.config.cjs`
- [x] T010 [P] 前端 ESLint/Prettier 設定於 `frontend/eslint.config.js`、`frontend/prettier.config.cjs`
- [x] T011 [P] 前端 Tailwind 設定於 `frontend/tailwind.config.ts`、`frontend/postcss.config.mjs`、`frontend/src/app/globals.css`
- [x] T012 建立根目錄啟動說明（同時啟動前後端）於 `README.md`
- [x] T013 [P] 建立 backend README（env、migrate、run）於 `backend/README.md`
- [x] T014 [P] 建立 frontend README（env、run）於 `frontend/README.md`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 user stories 共用的基礎：DB schema、Auth/RBAC、錯誤格式、SSE 基礎、前端 API client。

**⚠️ CRITICAL**：本 phase 未完成前，不應開始任何 user story 的功能 UI 細節。

### Contracts alignment（spec ↔ OpenAPI）

- [x] T015 補齊 OpenAPI：新增 `version` 欄位至 `Project/Board/List/Membership` schemas 於 `specs/001-trello-lite-board/contracts/openapi.yaml`
- [x] T016 補齊 OpenAPI：為 `PATCH /projects/{projectId}` 增加 `expectedVersion` 於 `specs/001-trello-lite-board/contracts/openapi.yaml`
- [x] T017 補齊 OpenAPI：新增 Board reorder endpoint（例如 `POST /projects/{projectId}/boards/reorder`）於 `specs/001-trello-lite-board/contracts/openapi.yaml`
- [x] T018 補齊 OpenAPI：新增 List reorder endpoint（例如 `POST /boards/{boardId}/lists/reorder`）於 `specs/001-trello-lite-board/contracts/openapi.yaml`


### Backend foundation

- [x] T019 建立環境變數與型別安全讀取於 `backend/src/config/env.ts`
- [x] T020 [P] 建立 Fastify app 入口與 plugin 註冊於 `backend/src/index.ts`
- [x] T021 [P] 建立 routes 註冊表（集中掛載）於 `backend/src/api/routes/index.ts`
- [x] T022 [P] 建立統一錯誤回應格式（對齊 OpenAPI Error/Validation/Conflict）於 `backend/src/api/httpErrors.ts`
- [x] T023 [P] 建立 Fastify error handler（含 Zod fieldErrors）於 `backend/src/api/plugins/errorHandler.ts`
- [x] T024 [P] 建立 request-id + 結構化 logging plugin 於 `backend/src/api/plugins/logger.ts`
- [x] T025 [P] 建立 Zod schema 驗證 helper（body/query/params）於 `backend/src/api/plugins/validate.ts`


- [x] T026 初始化 Prisma schema（SQLite）於 `backend/prisma/schema.prisma`
- [x] T027 建立 Prisma client 包裝與連線管理於 `backend/src/db/prisma.ts`
- [x] T028 建立核心資料表（依 data-model）於 `backend/prisma/schema.prisma`
- [x] T029 建立資料庫索引/約束（membership unique、(listId, position) index/unique、activity index）於 `backend/prisma/schema.prisma`
- [x] T030 產生初始 migration 於 `backend/prisma/migrations/`，並確保 `DATABASE_URL=file:./dev.db` 可啟動

- [x] T031 [P] 建立密碼雜湊/驗證於 `backend/src/domain/auth/password.ts`
- [x] T032 [P] 建立 access token 簽發/驗證於 `backend/src/domain/auth/accessToken.ts`
- [x] T033 [P] 建立 refresh session（rotation + revoke + replay detection）於 `backend/src/domain/auth/refreshSessionService.ts`
- [x] T034 [P] 建立 cookie 設定（HttpOnly/SameSite/Secure）於 `backend/src/domain/auth/cookies.ts`
- [x] T035 建立 requireAuth middleware 於 `backend/src/api/middleware/requireAuth.ts`

- [x] T036 [P] 建立 RBAC 權限矩陣（Owner/Admin/Member/Viewer）於 `backend/src/domain/rbac/permissions.ts`
- [x] T037 [P] 建立 project membership 載入 + 404/403 判斷 helper 於 `backend/src/domain/rbac/projectAccess.ts`
- [x] T038 建立 requireProjectRole middleware 於 `backend/src/api/middleware/requireProjectRole.ts`

- [x] T039 [P] 建立封存唯讀 guard（project/board/list/task）於 `backend/src/domain/guards/archiveGuards.ts`
- [x] T040 [P] 建立 ActivityLog append-only 寫入服務於 `backend/src/domain/activity/activityService.ts`
- [x] T041 [P] 建立 ActivityLog 查詢（cursor/limit）於 `backend/src/domain/activity/activityQuery.ts`

- [x] T042 [P] 建立即時事件 bus（fanout + ring buffer backfill）於 `backend/src/realtime/bus.ts`
- [x] T043 [P] 建立事件型別/序列化（含 eventId）於 `backend/src/realtime/events.ts`
- [x] T044 建立 SSE handler（Last-Event-ID + ?after backfill + heartbeat）於 `backend/src/realtime/sseRoute.ts`
- [x] T045 建立 publish helper（domain events → SSE）於 `backend/src/realtime/publish.ts`

- [x] T046 建立 snapshot 組裝服務（含 latestEventId）於 `backend/src/domain/snapshot/snapshotService.ts`

### Frontend foundation

- [x] T047 建立前端 env 讀取（API base URL）於 `frontend/src/lib/env.ts`
- [x] T048 [P] 建立 fetch wrapper（含 `credentials: 'include'` 與錯誤解析）於 `frontend/src/lib/api/http.ts`
- [x] T049 [P] 建立 API client（對齊 OpenAPI paths）於 `frontend/src/lib/api/client.ts`
- [x] T050 [P] 建立 TanStack Query Provider 於 `frontend/src/app/providers.tsx`
- [x] T051 [P] 建立 toast/notification 基礎於 `frontend/src/components/Toast.tsx`
- [x] T052 [P] 建立 RHF + Zod adapter 於 `frontend/src/lib/forms/zodForm.ts`

- [x] T053 建立 `useMe` hook（登入狀態、401 handling）於 `frontend/src/features/auth/useMe.ts`
- [x] T054 建立路由保護（未登入導向 `/login?returnTo=...`）於 `frontend/src/middleware.ts`

- [x] T055 [P] 建立 error pages：`frontend/src/app/401/page.tsx`、`frontend/src/app/403/page.tsx`、`frontend/src/app/not-found.tsx`、`frontend/src/app/error.tsx`
- [x] T056 [P] 建立 AppShell（導覽、使用者區塊、專案入口）於 `frontend/src/components/AppShell.tsx`
- [x] T057 [P] 建立 AsyncState（loading/empty/error）於 `frontend/src/components/AsyncState.tsx`
- [x] T058 [P] 建立 RBAC UI gating（features/links/actions）於 `frontend/src/lib/rbac/uiPermissions.ts`

**Checkpoint**: Foundation ready（DB + Auth/RBAC + Error format + Snapshot/SSE infra + API client）。

---

## Phase 3: User Story 1（P1）— 註冊/登入後建立專案並查看看板

**Goal**: 使用者能註冊/登入、建立專案並進入看板頁，看到 Board/List/Task 最新狀態（含空狀態）。

**Independent Test Criteria**:
- 未登入存取 `/projects` 會被導向 `/login?returnTo=/projects`
- 註冊→登入→建立專案→建立 board/list 後，在看板頁能看到欄位與空任務狀態
- 存取不存在的 project 顯示 404（已登入但非成員顯示 403）

### Backend（US1）

- [x] T059 [P] [US1] 實作 `POST /auth/register` 於 `backend/src/api/routes/auth.ts`
- [x] T060 [P] [US1] 實作 `POST /auth/login`（Set-Cookie refresh）於 `backend/src/api/routes/auth.ts`
- [x] T061 [P] [US1] 實作 `POST /auth/refresh`（rotation）於 `backend/src/api/routes/auth.ts`
- [x] T062 [P] [US1] 實作 `POST /auth/logout`（revoke refresh）於 `backend/src/api/routes/auth.ts`
- [x] T063 [P] [US1] 實作 `GET /auth/me` 於 `backend/src/api/routes/auth.ts`

- [x] T064 [P] [US1] 實作 `GET /projects`（回 projects + invitations）於 `backend/src/api/routes/projects.ts`
- [x] T065 [US1] 實作 `POST /projects`（建立 project + owner membership + ActivityLog）於 `backend/src/api/routes/projects.ts`
- [x] T066 [P] [US1] 實作 `GET /projects/{projectId}`（403/404 規則）於 `backend/src/api/routes/projects.ts`

- [x] T067 [P] [US1] 實作 `GET /projects/{projectId}/boards` 於 `backend/src/api/routes/boards.ts`
- [x] T068 [P] [US1] 實作 `POST /projects/{projectId}/boards`（Owner/Admin）於 `backend/src/api/routes/boards.ts`
- [x] T069 [P] [US1] 實作 `GET /boards/{boardId}/lists` 於 `backend/src/api/routes/lists.ts`
- [x] T070 [P] [US1] 實作 `POST /boards/{boardId}/lists`（Owner/Admin）於 `backend/src/api/routes/lists.ts`

- [x] T071 [US1] 實作 `GET /projects/{projectId}/snapshot`（含 latestEventId）於 `backend/src/api/routes/snapshot.ts`

### Frontend（US1）

- [x] T072 [P] [US1] 建立首頁 `/` 導向（已登入→/projects；未登入→/login）於 `frontend/src/app/page.tsx`
- [x] T073 [P] [US1] 建立註冊頁與表單於 `frontend/src/app/register/page.tsx`
- [x] T074 [P] [US1] 建立登入頁與表單（含 returnTo）於 `frontend/src/app/login/page.tsx`

- [x] T075 [P] [US1] 建立 `/projects` 頁（projects + invitations 區塊）於 `frontend/src/app/projects/page.tsx`
- [x] T076 [P] [US1] 建立 CreateProject modal 於 `frontend/src/features/projects/CreateProjectModal.tsx`

- [x] T077 [US1] 建立 `/projects/[projectId]/board` 頁（snapshot 載入 + empty state）於 `frontend/src/app/projects/[projectId]/board/page.tsx`
- [x] T078 [P] [US1] 建立 Board 選擇/建立 UI（Owner/Admin 可見）於 `frontend/src/features/board/BoardHeader.tsx`
- [x] T079 [P] [US1] 建立看板基本視圖（lists 橫向 scroll + empty list state）於 `frontend/src/features/board/BoardView.tsx`
- [x] T080 [P] [US1] 建立 List 欄位 UI（標題、WIP badge、空欄位）於 `frontend/src/features/board/ListColumn.tsx`

**Checkpoint**: US1 可單人完成註冊/登入/建專案/看板瀏覽。

---

## Phase 4: User Story 2（P2）— 邀請成員與角色權限（RBAC）可驗證

**Goal**: Owner/Admin 可邀請成員並設定角色；RBAC 在 UI 與 server 強制一致；Owner 可進入 settings 更新專案資訊。

**Independent Test Criteria**:
- 兩帳號：Owner 邀請→受邀者在 `/projects` 接受→能進入看板
- Viewer UI 看不到寫入入口，且呼叫寫入 API 會得到 403
- `/projects/:projectId/settings` 只有 Owner 可進入

### Backend（US2）

- [x] T081 [P] [US2] 實作 `GET /projects/{projectId}/invitations`（Owner/Admin）於 `backend/src/api/routes/membership.ts`
- [x] T082 [P] [US2] 實作 `POST /projects/{projectId}/invitations`（Owner/Admin）於 `backend/src/api/routes/membership.ts`
- [x] T083 [P] [US2] 實作 `POST /invitations/{invitationId}/accept` 於 `backend/src/api/routes/membership.ts`
- [x] T084 [P] [US2] 實作 `POST /invitations/{invitationId}/reject` 於 `backend/src/api/routes/membership.ts`

- [x] T085 [P] [US2] 實作 `GET /projects/{projectId}/members` 於 `backend/src/api/routes/membership.ts`
- [x] T086 [P] [US2] 實作 `PATCH /projects/{projectId}/members`（Owner/Admin）於 `backend/src/api/routes/membership.ts`
- [x] T087 [US2] 實作 `DELETE /projects/{projectId}/members?userId=...`（Owner；含解除指派）於 `backend/src/api/routes/membership.ts`

- [x] T088 [P] [US2] 實作 `PATCH /projects/{projectId}`（Owner；expectedVersion）於 `backend/src/api/routes/projects.ts`
- [x] T089 [US2] membership/invitation 變更追加 ActivityLog 於 `backend/src/domain/activity/activityService.ts`

### Frontend（US2）

- [x] T090 [P] [US2] 建立 invitations panel（accept/reject）於 `frontend/src/features/projects/InvitationsPanel.tsx`
- [x] T091 [US2] 建立 members 頁 `/projects/[projectId]/members` 於 `frontend/src/app/projects/[projectId]/members/page.tsx`
- [x] T092 [P] [US2] 建立 InviteMemberForm（Owner/Admin 可見）於 `frontend/src/features/members/InviteMemberForm.tsx`
- [x] T093 [P] [US2] 建立 MembersTable（角色調整/移除）於 `frontend/src/features/members/MembersTable.tsx`

- [x] T094 [US2] 建立 settings 頁 `/projects/[projectId]/settings`（Owner only）於 `frontend/src/app/projects/[projectId]/settings/page.tsx`
- [x] T095 [P] [US2] 建立 ProjectSettingsForm（name/description/visibility）於 `frontend/src/features/projects/ProjectSettingsForm.tsx`

**Checkpoint**: US2 完成後，可驗證 RBAC + 成員管理 + settings。

---

## Phase 5: User Story 3（P3）— 任務協作：拖拉排序一致、WIP 限制、衝突可處理

**Goal**: Member+ 可建立/編輯/指派/拖拉 Task；server authoritative ordering；WIP 限制（含 override）；版本衝突回 409；SSE 讓多端收斂一致。

**Independent Test Criteria**:
- 兩個瀏覽器視窗同專案：拖拉 task 後兩邊順序一致
- WIP 達上限：Member 被拒絕；Owner/Admin 可填理由 override
- 同時編輯同一 task：後送者收到 409 並可套用最新資料

### Backend（US3）

- [x] T096 [P] [US3] 實作 `generateBetween(prev,next)`（fractional indexing）於 `backend/src/domain/ordering/position.ts`
- [x] T097 [P] [US3] 實作 list rebalance（門檻 + 交易內重寫）於 `backend/src/domain/ordering/rebalance.ts`
- [x] T098 [P] [US3] 實作 WIP policy（計數 + override reason 需求）於 `backend/src/domain/wip/wipPolicy.ts`
- [x] T099 [P] [US3] 實作 Task 狀態機（done/archived 不變量）於 `backend/src/domain/tasks/taskStateMachine.ts`

- [x] T100 [P] [US3] 實作 `PATCH /lists/{listId}/wip`（Owner/Admin）於 `backend/src/api/routes/lists.ts`
- [x] T101 [P] [US3] 實作 `POST /boards/{boardId}/lists/reorder`（Owner/Admin；server authoritative order）於 `backend/src/api/routes/lists.ts`
- [x] T102 [P] [US3] 實作 `POST /projects/{projectId}/boards/reorder`（Owner/Admin）於 `backend/src/api/routes/boards.ts`

- [x] T103 [P] [US3] 實作 `GET /lists/{listId}/tasks`（position 排序）於 `backend/src/api/routes/tasks.ts`
- [x] T104 [P] [US3] 實作 `POST /lists/{listId}/tasks`（Member+；WIP 檢查；idempotencyKey）於 `backend/src/api/routes/tasks.ts`
- [x] T105 [P] [US3] 實作 `GET /tasks/{taskId}` 於 `backend/src/api/routes/tasks.ts`
- [x] T106 [P] [US3] 實作 `PATCH /tasks/{taskId}`（expectedVersion；assignees 驗證）於 `backend/src/api/routes/tasks.ts`
- [x] T107 [P] [US3] 實作 `POST /tasks/{taskId}/status`（expectedVersion）於 `backend/src/api/routes/tasks.ts`

- [x] T108 [US3] 實作 `POST /tasks/{taskId}/move`（expectedVersion；before/afterTaskId；權威排序回傳）於 `backend/src/domain/tasks/moveTask.ts`
- [x] T109 [P] [US3] 將 MoveTask use-case 掛到 route（含 409 ConflictResponse.latest）於 `backend/src/api/routes/tasks.ts`

- [x] T110 [P] [US3] 實作 assignee 約束（同專案成員才可指派）於 `backend/src/domain/tasks/assignees.ts`
- [x] T111 [P] [US3] 實作 CreateTask idempotency（儲存 key→回放 response）於 `backend/src/domain/idempotency/idempotencyService.ts`

- [x] T112 [US3] Move/Update/Status/WIP/Reorder 操作追加 ActivityLog 於 `backend/src/domain/activity/activityService.ts`
- [x] T113 [US3] 發布 TaskMoved/TaskUpdated/ListWipUpdated/ListReordered/BoardReordered 事件於 `backend/src/realtime/publish.ts`
- [x] T114 [US3] 實作 `GET /projects/{projectId}/events`（membership required；after/backfill）於 `backend/src/realtime/sseRoute.ts`

### Frontend（US3）


- [x] T115 [P] [US3] 建立 TaskCard（title/status/assignees/due）於 `frontend/src/features/board/TaskCard.tsx`
- [x] T116 [P] [US3] 建立 TaskDrawer（以 `taskId` 控制開關）於 `frontend/src/features/tasks/TaskDrawer.tsx`
- [x] T117 [P] [US3] 建立 TaskEditor（title/desc/due/priority/assignees）於 `frontend/src/features/tasks/TaskEditor.tsx`

- [x] T118 [P] [US3] 建立 CreateTaskForm（含 idempotencyKey 生成）於 `frontend/src/features/tasks/CreateTaskForm.tsx`
- [x] T119 [US3] 在 ListColumn 內整合建立 task（Member+ 可見）於 `frontend/src/features/board/ListColumn.tsx`


- [x] T120 [US3] 實作 DnD：task 拖拉跨 list（drop 後呼叫 move）於 `frontend/src/features/board/dnd/useBoardDnd.ts`
- [x] T121 [US3] 套用 MoveTask authoritativeOrder 更新 cache 於 `frontend/src/features/board/cache/updateOrdering.ts`


- [x] T122 [P] [US3] 建立 WIP 設定 UI（Owner/Admin）於 `frontend/src/features/lists/WipSettingsPanel.tsx`
- [x] T123 [P] [US3] 建立 WIP 超限提示 + override modal（Owner/Admin）於 `frontend/src/features/wip/WipOverrideModal.tsx`

- [x] T124 [US3] 實作 409 conflict UI（顯示 latest + 重新套用）於 `frontend/src/features/tasks/conflicts/ConflictBanner.tsx`


- [x] T125 [US3] 建立 SSE 訂閱（EventSource；Last-Event-ID；reconnect）於 `frontend/src/features/realtime/useProjectEvents.ts`
- [x] T126 [US3] 事件套用器：TaskMoved/TaskUpdated/ListWipUpdated/Reorder 於 `frontend/src/features/realtime/applyEvents.ts`
- [x] T127 [US3] 斷線重連後 snapshot/backfill 對齊（GET snapshot）於 `frontend/src/features/realtime/reconnect.ts`

**Checkpoint**: US3 完成後，核心協作（拖拉/排序/WIP/衝突/即時）可在兩端收斂。

---

## Phase 6: User Story 4（P4）— 留言與 Activity Log 即時追加、封存後唯讀

**Goal**: Member+ 可新增 comment；ActivityLog 可檢視且即時更新；封存後唯讀但可檢視；提供 archived 視圖。

**Independent Test Criteria**:
- 兩人同專案：新增 comment 後另一端即時看到（SSE）
- Owner 封存 project 後所有寫入 API 被拒絕，UI 顯示唯讀
- Viewer 可檢視 activity 與 archived，但不能寫入

### Backend（US4）

- [x] T128 [P] [US4] 實作 `GET /tasks/{taskId}/comments` 於 `backend/src/api/routes/comments.ts`
- [x] T129 [P] [US4] 實作 `POST /tasks/{taskId}/comments`（Owner/Admin/Member；XSS safety）於 `backend/src/api/routes/comments.ts`
- [x] T130 [US4] comment 新增追加 ActivityLog + 發布 CommentAdded/ActivityAppended 於 `backend/src/domain/comments/addComment.ts`

- [x] T131 [P] [US4] 實作 `GET /projects/{projectId}/activity`（cursor/limit）於 `backend/src/api/routes/activity.ts`
- [x] T132 [US4] 實作 `POST /projects/{projectId}/archive`（Owner；全域唯讀）於 `backend/src/api/routes/projects.ts`
- [x] T133 [P] [US4] 實作 `POST /boards/{boardId}/archive`（Owner/Admin）於 `backend/src/api/routes/boards.ts`
- [x] T134 [P] [US4] 實作 `POST /lists/{listId}/archive`（Owner/Admin）於 `backend/src/api/routes/lists.ts`
- [x] T135 [P] [US4] 實作 `POST /tasks/{taskId}/archive`（Member+；expectedVersion）於 `backend/src/api/routes/tasks.ts`

- [x] T136 [US4] 封存操作追加 ActivityLog + 發布 Archived 事件於 `backend/src/realtime/publish.ts`

### Frontend（US4）

- [x] T137 [US4] 建立 activity 頁 `/projects/[projectId]/activity` 於 `frontend/src/app/projects/[projectId]/activity/page.tsx`
- [x] T138 [P] [US4] 建立 ActivityFeed（游標分頁 + 即時插入）於 `frontend/src/features/activity/ActivityFeed.tsx`

- [x] T139 [US4] 在 TaskDrawer 整合 CommentsPanel（列表 + 新增）於 `frontend/src/features/comments/CommentsPanel.tsx`

- [x] T140 [US4] 建立 archived 頁 `/projects/[projectId]/archived`（按 board/list/task 分群）於 `frontend/src/app/projects/[projectId]/archived/page.tsx`
- [x] T141 [P] [US4] 建立 ArchivedBadge 與唯讀提示元件於 `frontend/src/components/ArchivedBadge.tsx`
- [x] T142 [US4] 建立唯讀原因 hook（來自 snapshot + role + status）於 `frontend/src/lib/readonly/useReadonlyReason.ts`

- [x] T143 [US4] SSE 套用 CommentAdded/ActivityAppended/Archived 事件於 `frontend/src/features/realtime/applyEvents.ts`

**Checkpoint**: US4 完成後，留言/稽核/封存唯讀與即時更新完整。

---

## Phase 7: Polish & Cross-Cutting Concerns（完整系統收尾）

**Purpose**: 安全性、可用性、文件、效能與一致性補強，讓系統「可交付」。

- [x] T144 [P] 統一日期格式工具（date-fns）於 `frontend/src/lib/dates.ts`
- [x] T145 [P] Modal/Drawer 可用性（focus trap、ESC、aria）於 `frontend/src/components/Modal.tsx`
- [x] T146 [P] Board 響應式優化（橫向 scroll、sticky header）於 `frontend/src/features/board/BoardView.tsx`

- [x] T147 後端 rate limit（login/refresh）於 `backend/src/api/plugins/rateLimit.ts`
- [x] T148 後端安全 headers（CSP baseline、X-Frame-Options、Referrer-Policy）於 `backend/src/api/plugins/securityHeaders.ts`
- [x] T149 後端 CSRF 最小防護（unsafe methods require header/token）於 `backend/src/api/middleware/csrf.ts`
- [x] T150 前端所有寫入請求附帶 CSRF header 於 `frontend/src/lib/api/http.ts`
- [x] T151 後端輸入/輸出 XSS safety（comment/task text 轉義策略）於 `backend/src/domain/safety/sanitize.ts`

- [x] T152 後端 busy/backoff 重試（SQLITE_BUSY）封裝於 `backend/src/db/sqliteRetry.ts`
- [x] T153 後端 MoveTask/Reorder 使用 sqliteRetry（短交易）於 `backend/src/domain/tasks/moveTask.ts`

- [x] T154 更新 quickstart：實際 scripts、驗證步驟對齊於 `specs/001-trello-lite-board/quickstart.md`
- [x] T155 更新 spec：補齊最終 API/錯誤語意（若合約變更）於 `specs/001-trello-lite-board/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1（Setup）→ Phase 2（Foundational）→ US1 → US2 → US3 → US4 → Polish

### User Story Dependencies (Graph)

- Foundational → US1
- US1 → US2
- US1 → US3
- US3 → US4

---

## Parallel Execution Examples（per story）

### Setup / Foundational

- 可同時進行：`backend/tsconfig.json`（T007）、`frontend/tsconfig.json`（T008）、`backend/src/api/plugins/logger.ts`（T024）、`frontend/src/lib/api/client.ts`（T049）

### US1

- 可同時進行：`frontend/src/app/register/page.tsx`（T073）、`frontend/src/app/login/page.tsx`（T074）、`backend/src/api/routes/auth.ts`（T059~T063）

### US2

- 可同時進行：`frontend/src/features/members/MembersTable.tsx`（T093）、`backend/src/api/routes/membership.ts`（T081~T087）

### US3

- 可同時進行：`backend/src/domain/ordering/position.ts`（T079）、`frontend/src/features/board/TaskCard.tsx`（T092）、`frontend/src/features/realtime/useProjectEvents.ts`（T099）

### US4

- 可同時進行：`backend/src/api/routes/comments.ts`（T101）、`frontend/src/features/activity/ActivityFeed.tsx`（T110）

---

## Implementation Strategy（完成系統路線）

1. 先完成 Setup + Foundational：確保 DB、Auth、RBAC、錯誤格式、API client、SSE 基礎都能跑起來
2. 依 US1→US4 逐步補齊功能與 UI（每個 story 都要能獨立驗收）
3. 最後做 Polish：安全性、可用性、文件對齊與 quickstart 驗證
