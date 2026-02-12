---

description: "Task list for helpdesk ticket system implementation"
---

# Tasks: 客服工單系統（Helpdesk / Ticket System）

**Input**: Design documents in `specs/001-helpdesk-ticket-system/` (`plan.md`, `spec.md`, `data-model.md`, `research.md`, `contracts/openapi.yaml`, `sla-metrics.md`)

**Goal**: 產出「完成的系統」（後端邏輯 + 前端 UI + 權限/錯誤 UX + 併發一致性 + append-only/audit + Admin 管理），而不是僅 MVP。

## Checklist Format（REQUIRED）

- [ ] `T### [P?] [US?] 描述（含檔案路徑）`

規則：
- **[P]**：可平行（不同檔案、互不依賴）
- **[US#]**：僅用於 user story phases（US1/US2/US3）；Setup/Foundational/Polish 不加
- 每個 task 必須包含至少一個明確路徑（檔案或資料夾）

## Path Conventions

- Backend: `backend/src/`, `backend/prisma/`, `backend/test/`
- Frontend: `frontend/src/`, `frontend/test/`

---

## Phase 1: Setup（腳手架、依賴、工具鏈）

- [x] T001 初始化後端 NestJS 專案骨架於 backend/（產生 backend/src/main.ts 與 backend/src/app.module.ts）
- [x] T002 在 backend/package.json 加入 dev/test scripts（dev、test、test:watch、lint、format）
- [x] T003 [P] 安裝後端依賴（Prisma、Zod、JWT、hash、測試工具）並鎖定版本於 backend/package.json
- [x] T004 [P] 設定後端 ESLint/Prettier 於 backend/.eslintrc.* 與 backend/.prettierrc
- [x] T005 初始化前端 Vite + React + TypeScript 於 frontend/（產生 frontend/src/main.tsx）
- [x] T006 [P] 安裝前端依賴（React Router、TanStack Query、RHF、Zod、Tailwind、Recharts、date-fns）於 frontend/package.json
- [x] T007 [P] 設定前端 ESLint/Prettier 於 frontend/.eslintrc.* 與 frontend/.prettierrc
- [x] T008 [P] 設定前端 Tailwind CSS 於 frontend/tailwind.config.*、frontend/postcss.config.*、frontend/src/index.css
- [x] T009 [P] 建立前端測試基礎（Vitest + RTL）設定於 frontend/vitest.config.* 與 frontend/src/test/setup.ts
- [x] T010 [P] 建立後端測試基礎（Jest）設定於 backend/test/jest.config.*
- [x] T011 [P] 建立環境變數範本：backend/.env.example、frontend/.env.example
- [x] T012 [P] （選用）建立根目錄 package.json 統一腳本（dev:fe/dev:be/dev）於 package.json
- [x] T013 將 quickstart 指令對齊實際腳本與環境變數於 specs/001-helpdesk-ticket-system/quickstart.md

---

## Phase 2: Foundational（阻塞性基礎：契約、DB、Auth、Error、核心 domain）

**⚠️ CRITICAL**：Phase 2 完成前，不開始 US1/US2/US3。

### 2A. Contracts / Spec alignment（先把合約補齊，避免實作返工）

- [x] T014 補齊 Admin 使用者管理 endpoints（/admin/users GET/POST/PATCH disable/role）於 specs/001-helpdesk-ticket-system/contracts/openapi.yaml
- [x] T015 補齊 Admin 使用者管理 schemas（AdminUserListResponse/Create/Update）於 specs/001-helpdesk-ticket-system/contracts/openapi.yaml
- [x] T016 決定並落地 Auth token 策略（bearer-only 或 access+refresh）並更新 schemas/endpoints 於 specs/001-helpdesk-ticket-system/contracts/openapi.yaml
- [x] T017 將上述契約差異同步回 spec（Contracts/Errors/Security 一致）於 specs/001-helpdesk-ticket-system/spec.md

### 2B. Backend: config / error / observability（全站一致的錯誤語意）

- [x] T018 建立 env schema（Zod）與載入（含 DATABASE_URL/JWT secrets/TTL）於 backend/src/common/config/env.ts
- [x] T019 建立 ErrorResponse 結構與 builder（含 request_id）於 backend/src/common/errors/error-response.ts
- [x] T020 建立 domain error codes 常數（INVALID_TRANSITION / NOT_VISIBLE / ALREADY_TAKEN / CLOSED_FINAL …）於 backend/src/common/errors/error-codes.ts
- [x] T021 建立全域 exception filter：把 HttpException/unknown 映射成 ErrorResponse 於 backend/src/common/errors/http-exception.filter.ts
- [x] T022 建立 request id interceptor（讀 x-request-id 或生成）於 backend/src/common/interceptors/request-id.interceptor.ts
- [x] T023 建立 ZodValidationPipe（request body/params/query）於 backend/src/common/validation/zod-validation.pipe.ts
- [x] T024 在 backend/src/main.ts 掛載全域 pipes/filters/interceptors（Zod + request-id + error filter）

### 2C. Backend: Prisma / SQLite schema / migrations / seed（資料層先穩）

- [x] T025 初始化 Prisma 並設定 DATABASE_URL 於 backend/prisma/schema.prisma 與 backend/package.json
- [x] T026 [P] 建立 Role/TicketStatus/TicketCategory enums（與 data-model 對齊）於 backend/prisma/schema.prisma
- [x] T027 [P] 建立 User model（email unique、role、is_active）於 backend/prisma/schema.prisma
- [x] T028 [P] 建立 Ticket model（status/assignee/customer/closed_at/updated_at indexes）於 backend/prisma/schema.prisma
- [x] T029 [P] 建立 TicketMessage model（append-only、is_internal、(ticket_id, created_at) index）於 backend/prisma/schema.prisma
- [x] T030 [P] 建立 AuditLog model（append-only、metadata_json、索引）於 backend/prisma/schema.prisma
- [x] T031 產生並套用初始 migration 於 backend/prisma/migrations/
- [x] T032 加入 SQLite triggers 阻止 UPDATE/DELETE（ticket_messages、audit_log）於 backend/prisma/migrations/*/migration.sql
- [x] T033 建立 PrismaModule（PrismaClient lifecycle + onModuleDestroy）於 backend/src/common/prisma/prisma.module.ts
- [x] T034 建立 seed 腳本（至少能建立初始 Admin 或 dev accounts）於 backend/prisma/seed.ts

### 2D. Backend: auth / RBAC / current user（安全與權限）

- [x] T035 建立 UsersModule 基礎（UsersService 查詢 user by id/email）於 backend/src/modules/users/users.module.ts
- [x] T036 建立 password hashing util（argon2/bcrypt）於 backend/src/modules/auth/password.util.ts
- [x] T037 建立 AuthModule 基礎 wiring 於 backend/src/modules/auth/auth.module.ts
- [x] T038 建立 JWT sign/verify service（含 TTL）於 backend/src/modules/auth/jwt.service.ts
- [x] T039 建立 JwtAuthGuard（解析 token、查 user、is_active=false -> 401）於 backend/src/common/guards/jwt-auth.guard.ts
- [x] T040 建立 RolesGuard（@Roles metadata + role check）於 backend/src/common/guards/roles.guard.ts
- [x] T041 建立 decorators：@Roles、@CurrentUser 於 backend/src/common/decorators/

### 2E. Backend: tickets domain primitives（狀態機 + policy + audit）

- [x] T042 定義 ticket types/enums（對齊 OpenAPI）於 backend/src/modules/tickets/ticket.types.ts
- [x] T043 實作 ticket 狀態機允許集合與 validateTransition（含 Closed 終態 + cancel_take）於 backend/src/modules/tickets/ticket.state-machine.ts
- [x] T044 實作 ticket 可見性 policy（Customer/Agent/Admin；不可見一律 404）於 backend/src/modules/tickets/ticket.policy.ts
- [x] T045 建立 AuditModule wiring 於 backend/src/modules/audit/audit.module.ts
- [x] T046 實作 AuditService.append（同交易寫入、metadata before/after）於 backend/src/modules/audit/audit.service.ts

### 2F. Backend foundational tests（核心規則必測）

- [x] T047 建立 Jest 測試工具：建立測試用 sqlite db、PrismaClient、資料清理 於 backend/test/test-utils.ts
- [x] T048 [P] 狀態機 unit tests（允許/拒絕集合 + Closed 終態）於 backend/test/unit/ticket.state-machine.spec.ts
- [x] T049 [P] policy unit tests（Customer/Agent/Admin、404 anti-IDOR）於 backend/test/unit/ticket.policy.spec.ts
- [x] T050 [P] triggers smoke test：ticket_messages/audit_log update/delete 被拒絕 於 backend/test/integration/append-only-triggers.spec.ts

### 2G. Frontend: foundation（router/query/auth state/通用 UI 狀態）

- [x] T051 建立前端 ApiError 型別與 parseError（含 request_id）於 frontend/src/api/errors.ts
- [x] T052 建立 api client（baseUrl、JSON、throw ApiError、附 Authorization）於 frontend/src/api/client.ts
- [x] T053 建立 auth store（user/token、login/logout、初始化）於 frontend/src/app/auth/authStore.ts
- [x] T054 建立 QueryClient（401 全域登出 + 導向 /login?redirectTo=）於 frontend/src/app/query/queryClient.ts
- [x] T055 建立 Router（Data Router + loaders 做 role gate）於 frontend/src/app/router/router.tsx
- [x] T056 建立 AppLayout（nav 依 role 顯示，含 logout）於 frontend/src/app/layout/AppLayout.tsx
- [x] T057 建立通用狀態元件（Loading/Empty/Error/Forbidden/NotFound/Conflict）於 frontend/src/components/states/
- [x] T058 建立共用表單元件（Input/TextArea/Button/FormError）於 frontend/src/components/form/

**Checkpoint**：Phase 2 結束後，專案具備 DB + auth guard + 錯誤格式 + domain primitives + 前端 router/query 骨架。

---

## Phase 3: User Story 1 - 客戶建立工單並完成結案（P1）

**Goal**：Customer 可註冊/登入、建立工單、查看列表/詳情與留言時間軸、在 Resolved 後關閉為 Closed。

**Independent Test**：Customer 完成「建立→查看→（等待客服）→Resolved 時關閉→Closed 後任何寫入被拒絕」。

### Backend（US1）

- [x] T059 [P] [US1] 建立 Auth DTO schemas（Register/Login）於 backend/src/modules/auth/auth.dto.ts
- [x] T060 [US1] 實作 register（建立 Customer user、回傳 token/user）於 backend/src/modules/auth/auth.service.ts
- [x] T061 [US1] 實作 login（驗證密碼、回傳 token/user）於 backend/src/modules/auth/auth.service.ts
- [x] T062 [US1] 實作 logout（若採 refresh 需撤銷；否則回 ok）於 backend/src/modules/auth/auth.service.ts
- [x] T063 [US1] 實作 /auth endpoints controller（register/login/logout/me）於 backend/src/modules/auth/auth.controller.ts
- [x] T064 [P] [US1] 建立 tickets DTO schemas（create/list/detail）於 backend/src/modules/tickets/tickets.dto.ts
- [x] T065 [P] [US1] 建立 messages DTO schemas（public message）於 backend/src/modules/tickets/messages.dto.ts
- [x] T066 [P] [US1] 建立 status DTO schemas（from_status/to_status）於 backend/src/modules/tickets/status.dto.ts
- [x] T067 [US1] 實作 TicketsService.createTicket（同交易：ticket+初始留言+audit）於 backend/src/modules/tickets/tickets.service.ts
- [x] T068 [US1] 實作 TicketsService.listForCustomer（status filter）於 backend/src/modules/tickets/tickets.service.ts
- [x] T069 [US1] 實作 TicketsService.getDetail（含 messages；Customer 過濾 internal）於 backend/src/modules/tickets/tickets.service.ts
- [x] T070 [US1] 實作 MessagesService.postPublicMessage（Customer 僅 Waiting for Customer；成功後回 In Progress）於 backend/src/modules/tickets/messages.service.ts
- [x] T071 [US1] 實作 StatusService.changeStatus（Resolved→Closed for Customer/Admin）於 backend/src/modules/tickets/status.service.ts
- [x] T072 [US1] 實作 TicketsController（/tickets GET/POST、/tickets/:id GET）於 backend/src/modules/tickets/tickets.controller.ts
- [x] T073 [US1] 實作 MessagesController（/tickets/:id/messages POST）於 backend/src/modules/tickets/messages.controller.ts
- [x] T074 [US1] 實作 StatusController（/tickets/:id/status POST）於 backend/src/modules/tickets/status.controller.ts

### Backend tests（US1）

- [x] T075 [P] [US1] integration：register/login/me happy path 於 backend/test/integration/auth-happy.spec.ts
- [x] T076 [P] [US1] integration：CreateTicket 會產生初始留言與 audit 於 backend/test/integration/customer-create-ticket.spec.ts
- [x] T077 [P] [US1] integration：Customer reply 僅 Waiting for Customer；成功後狀態回 In Progress 於 backend/test/integration/customer-reply-transition.spec.ts
- [x] T078 [P] [US1] integration：Close（Resolved→Closed）後任何寫入（message/status/assign）都被拒絕 於 backend/test/integration/closed-final.spec.ts

### Frontend（US1）

- [x] T079 [P] [US1] 建立 auth API hooks（useLogin/useRegister/useMe/useLogout）於 frontend/src/api/auth.ts
- [x] T080 [US1] 實作 LoginPage（RHF+Zod、redirectTo、防 open redirect）於 frontend/src/pages/login/LoginPage.tsx
- [x] T081 [US1] 實作 RegisterPage（RHF+Zod）於 frontend/src/pages/register/RegisterPage.tsx
- [x] T082 [P] [US1] 建立 tickets API hooks（useMyTickets/useCreateTicket/useTicketDetail）於 frontend/src/api/tickets.ts
- [x] T083 [US1] 實作 TicketsPage（列表、status filter、Empty/Loading/Error）於 frontend/src/pages/tickets/TicketsPage.tsx
- [x] T084 [US1] 實作 CreateTicketDialog（title/category/description）於 frontend/src/pages/tickets/CreateTicketDialog.tsx
- [x] T085 [P] [US1] 建立 ticket actions hooks（usePostMessage/useChangeStatus）於 frontend/src/api/ticketActions.ts
- [x] T086 [US1] 實作 TicketDetailPage（timeline、狀態 badge、錯誤狀態）於 frontend/src/pages/ticket-detail/TicketDetailPage.tsx
- [x] T087 [P] [US1] 實作 MessageTimeline（按時間排序、純文字安全輸出）於 frontend/src/pages/ticket-detail/MessageTimeline.tsx
- [x] T088 [US1] 實作 CustomerReplyBox（只在 Waiting for Customer 顯示）於 frontend/src/pages/ticket-detail/CustomerReplyBox.tsx
- [x] T089 [US1] 實作 CloseTicketButton（只在 Resolved 顯示；成功後 UI lock）於 frontend/src/pages/ticket-detail/CloseTicketButton.tsx

### Frontend tests（US1）

- [x] T090 [P] [US1] 測試 login redirectTo 安全檢查（只允許站內相對路徑）於 frontend/test/unit/login-redirect.spec.tsx
- [x] T091 [P] [US1] 測試 TicketDetail：Closed 狀態不渲染可寫入 controls 於 frontend/test/unit/ticket-detail-closed.spec.tsx

---

## Phase 4: User Story 2 - 客服接手與處理工單（含內部備註）（P2）

**Goal**：Agent 可工作台檢視、併發安全接手/取消接手、推進狀態、公開留言與內部備註（Customer 永不可見）。

**Independent Test**：兩個 Agent 同時接手只一人成功；cancel_take 回 Open 且 unassigned；internal note Customer detail 不可見。

### Backend（US2）

- [x] T092 [P] [US2] 建立 agent workspace DTO（view/status）於 backend/src/modules/tickets/agent-workspace.dto.ts
- [x] T093 [US2] 實作 AgentWorkspaceService.list（unassigned/mine）於 backend/src/modules/tickets/agent-workspace.service.ts
- [x] T094 [US2] 實作 AgentWorkspaceController（/agent/tickets GET）於 backend/src/modules/tickets/agent-workspace.controller.ts
- [x] T095 [P] [US2] 建立 assignment DTO（take/cancel）於 backend/src/modules/tickets/assignment.dto.ts
- [x] T096 [US2] 實作 AssignmentService.takeTicket（CAS + 409）於 backend/src/modules/tickets/assignment.service.ts
- [x] T097 [US2] 實作 AssignmentService.cancelTake（assignee+In Progress；回 Open+null）於 backend/src/modules/tickets/assignment.service.ts
- [x] T098 [US2] 實作 AssignmentController（/tickets/:id/take、/cancel-take）於 backend/src/modules/tickets/assignment.controller.ts
- [x] T099 [US2] 擴充 StatusService：Agent transitions（In Progress→Waiting/Resolved；Resolved→In Progress）於 backend/src/modules/tickets/status.service.ts
- [x] T100 [US2] 擴充 MessagesService：PostInternalNote（Agent/Admin only；Closed 拒絕）於 backend/src/modules/tickets/messages.service.ts
- [x] T101 [US2] 實作 InternalNotesController（/tickets/:id/internal-notes POST）於 backend/src/modules/tickets/internal-notes.controller.ts

### Backend tests（US2）

- [x] T102 [P] [US2] integration：take concurrency（最多一人成功，其餘 409）於 backend/test/integration/take-concurrency.spec.ts
- [x] T103 [P] [US2] integration：cancel_take rule（assignee+In Progress 才允許）於 backend/test/integration/cancel-take.spec.ts
- [x] T104 [P] [US2] integration：internal note visibility（Customer detail 不含 internal）於 backend/test/integration/internal-visibility.spec.ts

### Frontend（US2）

- [x] T105 [P] [US2] 建立 agent workspace API hooks（useAgentTickets）於 frontend/src/api/agent.ts
- [x] T106 [US2] 實作 AgentTicketsPage（view tabs、filter、empty/loading/error）於 frontend/src/pages/agent-tickets/AgentTicketsPage.tsx
- [x] T107 [P] [US2] 建立 take/cancel/status/internal hooks 於 frontend/src/api/agentActions.ts
- [x] T108 [US2] 實作 AgentActionsPanel（take/cancel，顯示 409 ConflictBanner）於 frontend/src/pages/ticket-detail/AgentActionsPanel.tsx
- [x] T109 [US2] 實作 AgentStatusControls（set Waiting/Resolved/Reopen）於 frontend/src/pages/ticket-detail/AgentStatusControls.tsx
- [x] T110 [US2] 實作 InternalNoteBox（only Agent/Admin；送出後刷新 timeline）於 frontend/src/pages/ticket-detail/InternalNoteBox.tsx
- [x] T111 [US2] 實作 ConflictBanner（409 顯示 + reload/invalidate）於 frontend/src/components/states/ConflictBanner.tsx
- [x] T112 [US2] 更新 MessageTimeline：Agent/Admin 顯示 internal badge，Customer 永不渲染 於 frontend/src/pages/ticket-detail/MessageTimeline.tsx

### Frontend tests（US2）

- [x] T113 [P] [US2] 測試 AgentTicketsPage tab 切換會切換 query key 於 frontend/test/unit/agent-tickets-tabs.spec.tsx
- [x] T114 [P] [US2] 測試 MessageTimeline：Customer 視角不渲染 internal message 於 frontend/test/unit/internal-visibility-ui.spec.tsx

---

## Phase 5: User Story 3 - 管理員監控服務品質與管理負載（P3）

**Goal**：Admin dashboard 指標（依 sla-metrics 定義）、改派、客服帳號管理（建立/停用/角色）。

**Independent Test**：dashboard 7 天可顯示指標且與列表一致；改派有 audit；停用後 token 下一次驗證 401。

### Backend（US3）

- [x] T115 [P] [US3] 建立 dashboard DTO（range/response）於 backend/src/modules/dashboard/dashboard.dto.ts
- [x] T116 [US3] 實作 DashboardService.metrics（first response/resolution/status distribution/agent load）於 backend/src/modules/dashboard/dashboard.service.ts
- [x] T117 [US3] 實作 DashboardController（/admin/dashboard GET；Admin only）於 backend/src/modules/dashboard/dashboard.controller.ts
- [x] T118 [US3] 實作 AdminAssignmentService.assign（assignee change + audit + 409）於 backend/src/modules/tickets/admin-assignment.service.ts
- [x] T119 [US3] 實作 AdminAssignmentController（/admin/tickets/:id/assignee PUT）於 backend/src/modules/tickets/admin-assignment.controller.ts
- [x] T120 [P] [US3] 建立 admin users DTO（list/create/patch）於 backend/src/modules/users/admin-users.dto.ts
- [x] T121 [US3] 實作 AdminUsersService（list/create/disable/setRole）於 backend/src/modules/users/admin-users.service.ts
- [x] T122 [US3] 實作 AdminUsersController（/admin/users）於 backend/src/modules/users/admin-users.controller.ts

### Backend tests（US3）

- [x] T123 [P] [US3] integration：dashboard consistency（status_distribution sum = tickets count）於 backend/test/integration/dashboard-consistency.spec.ts
- [x] T124 [P] [US3] integration：assign/reassign 會寫 audit 且詳情/列表一致更新 於 backend/test/integration/admin-assign.spec.ts
- [x] T125 [P] [US3] integration：disable user 後 /auth/me 回 401 於 backend/test/integration/disabled-user-auth.spec.ts

### Frontend（US3）

- [x] T126 [P] [US3] 建立 admin API hooks（useDashboardMetrics/useAssignTicket/useAdminUsers）於 frontend/src/api/admin.ts
- [x] T127 [US3] 實作 AdminDashboardPage（range selector、loading/error/empty）於 frontend/src/pages/admin-dashboard/AdminDashboardPage.tsx
- [x] T128 [P] [US3] 實作 DashboardCharts（Recharts：SLA、status distribution）於 frontend/src/pages/admin-dashboard/DashboardCharts.tsx
- [x] T129 [P] [US3] 實作 AgentLoadTable（負載表格）於 frontend/src/pages/admin-dashboard/AgentLoadTable.tsx
- [x] T130 [US3] 實作 UserManagementPanel（list/create/disable/set role）於 frontend/src/pages/admin-dashboard/UserManagementPanel.tsx
- [x] T131 [US3] 實作 AdminAssignmentPanel（ticket detail 指派）於 frontend/src/pages/ticket-detail/AdminAssignmentPanel.tsx

### Frontend tests（US3）

- [x] T132 [P] [US3] 測試 AdminDashboard range 切換會 refetch 並顯示 loading 於 frontend/test/unit/admin-dashboard-range.spec.tsx
- [x] T133 [P] [US3] 測試 UserManagementPanel：停用成功後 UI 反映 is_active 於 frontend/test/unit/user-management.spec.tsx

---

## Phase 6: Polish & Cross-Cutting Concerns（完整系統收尾）

- [x] T134 建立前端系統頁（Forbidden/NotFound/ServerError）並接到 router errorElement 於 frontend/src/pages/system/
- [x] T135 [P] 增加前端 a11y（dialog/tab/表單錯誤提示 aria）於 frontend/src/components/
- [x] T136 [P] 增加前端 RWD（tickets/detail/dashboard）於 frontend/src/pages/
- [x] T137 增加後端 SQLite BUSY 短暫重試（transaction wrapper）於 backend/src/common/prisma/sqlite-retry.ts
- [x] T138 更新契約與實作以支援列表分頁參數（limit/offset）於 specs/001-helpdesk-ticket-system/contracts/openapi.yaml
- [x] T139 [P] 後端 tickets list 加入分頁（customer/agent workspace）於 backend/src/modules/tickets/tickets.service.ts
- [x] T140 [P] 前端 tickets/agent workspace 加入分頁 UI 於 frontend/src/pages/tickets/TicketsPage.tsx
- [x] T141 實際跑一次 quickstart 流程並修正文件（migrate/seed/dev）於 specs/001-helpdesk-ticket-system/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup（Phase 1）→ blocks Foundational（Phase 2）
- Foundational（Phase 2）→ blocks ALL user stories（US1/US2/US3）
- US1/US2/US3（Phase 3-5）→ 可在 Foundational 後並行，但建議至少先完成 US1 的 auth+tickets 基礎路徑
- Polish（Phase 6）→ 建議所有 user stories 完成後再做

### User Story Dependencies

- US1：可獨立完成（Customer 端閉環）
- US2：依賴 tickets/messages 的共用資料流，但可與 US1 並行實作
- US3：建議在 tickets/audit 流穩定後開始（dashboard 指標與改派最可靠）

---

## Parallel Execution Examples（per story）

### US1 parallel example

- [P] frontend/src/pages/login/LoginPage.tsx + frontend/src/pages/register/RegisterPage.tsx
- [P] backend/src/modules/auth/auth.service.ts + backend/src/modules/auth/auth.controller.ts
- [P] frontend/src/pages/tickets/TicketsPage.tsx + frontend/src/pages/tickets/CreateTicketDialog.tsx

### US2 parallel example

- [P] backend/src/modules/tickets/assignment.service.ts + backend/src/modules/tickets/agent-workspace.service.ts
- [P] frontend/src/pages/agent-tickets/AgentTicketsPage.tsx
- [P] frontend/src/pages/ticket-detail/AgentActionsPanel.tsx + frontend/src/pages/ticket-detail/InternalNoteBox.tsx

### US3 parallel example

- [P] backend/src/modules/dashboard/dashboard.service.ts
- [P] frontend/src/pages/admin-dashboard/DashboardCharts.tsx + frontend/src/pages/admin-dashboard/UserManagementPanel.tsx


## Parallel Execution Examples (per story)

### US1 parallel example

- [P] 建 UI：frontend/src/pages/login/LoginPage.tsx、frontend/src/pages/register/RegisterPage.tsx
- [P] 建 API：backend/src/modules/auth/auth.controller.ts、backend/src/modules/auth/auth.service.ts
- [P] 建 tickets UI：frontend/src/pages/tickets/TicketsPage.tsx、frontend/src/pages/tickets/CreateTicketDialog.tsx

### US2 parallel example

- [P] 併發與 assignment：backend/src/modules/tickets/assignment.service.ts
- [P] Agent UI：frontend/src/pages/agent-tickets/AgentTicketsPage.tsx
- [P] Ticket detail actions：frontend/src/pages/ticket-detail/AgentActionsPanel.tsx

### US3 parallel example

- [P] Dashboard 後端查詢：backend/src/modules/dashboard/dashboard.service.ts
- [P] Dashboard 前端圖表：frontend/src/pages/admin-dashboard/DashboardCharts.tsx
- [P] 使用者管理：backend/src/modules/users/admin-users.controller.ts + frontend/src/pages/admin-dashboard/UserManagementPanel.tsx

---

## Implementation Strategy（完整系統交付）

1. 先完成 Phase 1-2（骨架 + DB + auth + error UX + domain rules），確保可登入、可正確擋權限與 404 anti-IDOR。
2. 依優先順序完成 US1→US2→US3，每個 story 都要能「獨立驗證」其 end-to-end 使用情境。
3. 最後做 Polish：分頁、RWD、a11y、retry、debug 能力、quickstart 驗證。
