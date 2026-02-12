---
description: "Task list for feature implementation"
---

# Tasks: 客服工單系統（Helpdesk / Ticket System）

**Input**: Design documents in `specs/001-helpdesk-ticket-system/` (plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md)

**Tests**: 核心 domain/business rules MUST 有 Jest/Vitest 測試（happy path、edge cases、failures）。

**Organization**: Tasks 依 User Story 分組，並提供 story 獨立驗收方式。

## Phase 1: Setup（Shared Infrastructure）

**Purpose**: 初始化專案骨架（frontend + backend），建立可執行/可測試的基本環境。

- [x] T001 Create repo folders `backend/` and `frontend/` (repo root)
- [x] T002 Initialize NestJS backend in `backend/` (creates `backend/package.json`, `backend/src/main.ts`)
- [x] T003 Initialize Prisma + SQLite in `backend/prisma/` (creates `backend/prisma/schema.prisma`, `backend/prisma/migrations/`)
- [x] T004 Initialize React + Vite + TS frontend in `frontend/` (creates `frontend/package.json`, `frontend/src/main.tsx`, `frontend/vite.config.ts`)
- [x] T005 [P] Add root workspace scripts in `package.json` to run `backend/` + `frontend/` together
- [x] T006 [P] Add `.gitignore` rules for SQLite DB and env files in `.gitignore`
- [x] T007 [P] Configure backend lint/format in `backend/eslint.config.js` and `backend/.prettierrc`
- [x] T008 [P] Configure frontend lint/format in `frontend/eslint.config.js` and `frontend/.prettierrc`
- [x] T009 [P] Configure Tailwind CSS in `frontend/tailwind.config.ts`, `frontend/postcss.config.js`, `frontend/src/index.css`
- [x] T010 Add env templates `backend/.env.example` and `frontend/.env.example`
- [x] T011 Add backend Jest scaffolding in `backend/jest.config.ts` and `backend/test/setup.ts`
- [x] T012 Add frontend Vitest scaffolding in `frontend/vitest.config.ts` and `frontend/src/test/setup.ts`

---

## Phase 2: Foundational（Blocking Prerequisites）

**Purpose**: 所有 user stories 都會用到的基礎能力（DB、Auth/RBAC、錯誤語意、logging、API client、route guards）。

**⚠️ CRITICAL**: Phase 2 完成前，不開始任何 user story。

### Backend foundation (NestJS)

- [x] T013 Implement env loading + Zod validation in `backend/src/common/config/env.ts`
- [x] T014 Wire config into app bootstrap in `backend/src/main.ts`
- [x] T015 Create PrismaService + PrismaModule in `backend/src/common/prisma/prisma.service.ts` and `backend/src/common/prisma/prisma.module.ts`
- [x] T016 Implement Prisma schema (User/AuthSession/Ticket/TicketMessage/AuditLog + enums) in `backend/prisma/schema.prisma`
- [x] T017 Create initial DB migration in `backend/prisma/migrations/` via Prisma Migrate
- [x] T018 Implement standardized error codes + response shape in `backend/src/common/errors/error-codes.ts` and `backend/src/common/errors/http-exception.filter.ts`
- [x] T019 Implement request id middleware/interceptor in `backend/src/common/request/request-id.middleware.ts`
- [x] T020 Implement app logger wrapper in `backend/src/common/logging/logger.service.ts`
- [x] T021 Implement Zod validation pipe for request DTOs in `backend/src/common/validation/zod-validation.pipe.ts`
- [x] T022 Implement UsersService (lookup, active check, role, tokenVersion) in `backend/src/users/users.service.ts`
- [x] T023 Implement password hashing helper in `backend/src/auth/password.ts`
- [x] T024 Implement JWT access token service (sub/ver) in `backend/src/auth/jwt.service.ts`
- [x] T025 Implement refresh session storage + rotation in `backend/src/auth/auth-session.service.ts`
- [x] T026 Implement AuthService (register/login/refresh/logout) in `backend/src/auth/auth.service.ts`
- [x] T027 Implement AuthController endpoints per OpenAPI in `backend/src/auth/auth.controller.ts`
- [x] T028 Implement JwtAuthGuard (validate token + isActive + tokenVersion) in `backend/src/auth/guards/jwt-auth.guard.ts`
- [x] T029 Implement Roles decorator + RolesGuard in `backend/src/auth/roles.decorator.ts` and `backend/src/auth/guards/roles.guard.ts`
- [x] T030 Implement CurrentUser decorator in `backend/src/auth/current-user.decorator.ts`
- [x] T031 Implement AuditLog append service in `backend/src/audit/audit.service.ts`
- [x] T032 Add seed script for default users (admin/agent/customer) in `backend/prisma/seed.ts` and `backend/package.json`
- [x] T033 Add backend auth smoke tests in `backend/test/integration/auth.smoke.spec.ts`

### Frontend foundation (React)

- [x] T034 Implement API base config in `frontend/src/api/config.ts`
- [x] T035 Implement token storage + auth API (login/register/refresh/logout) in `frontend/src/api/auth.ts`
- [x] T036 Implement fetch wrapper with JSON + error mapping in `frontend/src/api/http.ts`
- [x] T037 Implement TanStack Query client setup in `frontend/src/app/queryClient.ts`
- [x] T038 Wire QueryClientProvider in `frontend/src/main.tsx`
- [x] T039 Implement Auth state (current user, login/logout, bootstrapping) in `frontend/src/app/auth.tsx`
- [x] T040 Implement route definitions in `frontend/src/routes/router.tsx`
- [x] T041 Implement route guards (GuestOnly/RequireAuth/RequireRole) in `frontend/src/routes/guards.tsx`
- [x] T042 Implement AppShell + role-based navigation in `frontend/src/components/AppShell.tsx` and `frontend/src/components/Nav.tsx`
- [x] T043 Implement shared UX state components in `frontend/src/components/states/LoadingState.tsx`, `frontend/src/components/states/ErrorState.tsx`, `frontend/src/components/states/EmptyState.tsx`, `frontend/src/components/states/ForbiddenPage.tsx`, `frontend/src/components/states/NotFoundPage.tsx`

**Checkpoint**: Foundation ready（可登入、RBAC guard 可運作、DB/migrations/seed 可跑、錯誤語意與 logging 框架就位）。

---

## Phase 3: User Story 1 - 客戶建立與追蹤自己的工單（Priority: P1）

**Goal**: Customer 可註冊/登入後建立工單、查看自己的列表與詳情時間軸、在允許狀態回覆、在 Resolved 關閉。

**Independent Test**: 用 seed 的 Customer 帳號完成「建立工單 → 查看列表/詳情 →（模擬客服推進）→ Waiting for Customer 回覆 → Resolved 後關閉」。

### Backend (US1)

- [x] T044 [US1] Implement ticket state machine rules in `backend/src/tickets/ticket-state-machine.ts`
- [x] T045 [US1] Implement ticket visibility helper (Customer own tickets) in `backend/src/tickets/ticket-visibility.ts`
- [x] T046 [US1] Implement TicketsService createTicket() with tx (Ticket + initial message + audit) in `backend/src/tickets/tickets.service.ts`
- [x] T047 [US1] Implement TicketsController `POST /tickets` in `backend/src/tickets/tickets.controller.ts`
- [x] T048 [US1] Implement TicketsService listForCustomer() in `backend/src/tickets/tickets.service.ts`
- [x] T049 [US1] Implement TicketsController `GET /tickets` (status filter) in `backend/src/tickets/tickets.controller.ts`
- [x] T050 [US1] Implement TicketsService getDetailForCustomer() (timeline excludes internal) in `backend/src/tickets/tickets.service.ts`
- [x] T051 [US1] Implement TicketsController `GET /tickets/:ticketId` with 404-on-not-visible in `backend/src/tickets/tickets.controller.ts`
- [x] T052 [US1] Implement MessagesService createCustomerReply() (WAITING_FOR_CUSTOMER only, append-only, updates ticket.updatedAt, audit) in `backend/src/messages/messages.service.ts`
- [x] T053 [US1] Implement TicketsController `POST /tickets/:ticketId/messages` (Customer public message only) in `backend/src/tickets/tickets.controller.ts`
- [x] T054 [US1] Implement TicketsService closeTicketAsCustomer() (RESOLVED → CLOSED, sets closedAt, audit) in `backend/src/tickets/tickets.service.ts`
- [x] T055 [US1] Implement TicketsController `POST /tickets/:ticketId/status` (Customer close only) in `backend/src/tickets/tickets.controller.ts`
- [x] T056 [US1] Add US1 logging points (create/list/detail/reply/close) in `backend/src/tickets/tickets.controller.ts`

### Backend tests (US1)

- [x] T057 [P] [US1] Add integration tests for Customer ticket flow in `backend/test/integration/us1.customer-flow.spec.ts`
- [x] T058 [P] [US1] Add security test for IDOR 404 behavior in `backend/test/integration/us1.customer-idor.spec.ts`
- [x] T059 [P] [US1] Add negative tests for illegal customer actions (wrong status, closed) in `backend/test/integration/us1.customer-negative.spec.ts`

### Frontend (US1)

- [x] T060 [P] [US1] Implement Login page in `frontend/src/pages/LoginPage.tsx`
- [x] T061 [P] [US1] Implement Register page in `frontend/src/pages/RegisterPage.tsx`
- [x] T062 [US1] Implement Customer tickets list page `/tickets` in `frontend/src/pages/customer/CustomerTicketsPage.tsx`
- [x] T063 [US1] Implement Create Ticket form (RHF+Zod) in `frontend/src/pages/customer/CreateTicketPage.tsx`
- [x] T064 [US1] Implement Customer ticket detail page `/tickets/:id` (timeline, status badge, assignee display) in `frontend/src/pages/customer/CustomerTicketDetailPage.tsx`
- [x] T065 [US1] Implement customer reply form (only WAITING_FOR_CUSTOMER) in `frontend/src/features/tickets/components/CustomerReplyForm.tsx`
- [x] T066 [US1] Implement close ticket action UI (only RESOLVED) in `frontend/src/features/tickets/components/CloseTicketButton.tsx`
- [x] T067 [US1] Implement tickets API hooks (list/detail/create/message/close) with TanStack Query in `frontend/src/features/tickets/api/tickets.queries.ts`
- [x] T068 [US1] Ensure UX states (Loading/Error/Empty/Forbidden/NotFound) on US1 pages in `frontend/src/pages/customer/CustomerTicketsPage.tsx`

### Frontend tests (US1)

- [x] T069 [P] [US1] Add smoke tests for auth routing + guards in `frontend/src/routes/__tests__/guards.test.tsx`
- [x] T070 [P] [US1] Add UI tests for Customer tickets list empty/loading/error states in `frontend/src/pages/customer/__tests__/CustomerTicketsPage.test.tsx`

**Checkpoint**: US1 完成後，Customer 全流程可獨立 demo，且後端有 US1 整合測試覆蓋。

---

## Phase 4: User Story 2 - 客服人員接手與處理工單（Priority: P2）

**Goal**: Agent 可看 unassigned/mine，接手工單（避免競態）、推進狀態、與客戶互動並新增 internal note（客戶不可見）。

**Independent Test**: 用 seed 的 Agent + Customer 完成「Agent 看 unassigned → take → 狀態改 Waiting → Customer 回覆 → Agent internal note → Resolved」，並驗證競態接手只有一人成功（409）。

### Backend (US2)

- [x] T071 [US2] Implement Agent tickets list `GET /agent/tickets` (view=unassigned|mine) in `backend/src/agent/agent.controller.ts`
- [x] T072 [US2] Implement service query for agent workbench lists in `backend/src/agent/agent.service.ts`
- [x] T073 [US2] Implement take ticket (Open + unassigned → In Progress + assignee=agent) with CAS + audit in `backend/src/tickets/tickets.service.ts`
- [x] T074 [US2] Implement `POST /tickets/:ticketId/assignee` for Agent take/cancel rules in `backend/src/tickets/tickets.controller.ts`
- [x] T075 [US2] Implement agent status transitions (IN_PROGRESS → WAITING_FOR_CUSTOMER/RESOLVED) with deterministic 400 vs 409 in `backend/src/tickets/tickets.service.ts`
- [x] T076 [US2] Extend `POST /tickets/:ticketId/status` to support Agent transitions in `backend/src/tickets/tickets.controller.ts`
- [x] T077 [US2] Implement MessagesService createAgentMessage() (public/internal, closed forbidden, audit) in `backend/src/messages/messages.service.ts`
- [x] T078 [US2] Extend ticket detail to include internal messages for Agent/Admin in `backend/src/tickets/tickets.service.ts`
- [x] T079 [US2] Add 409 conflict mapping for CAS failures in `backend/src/common/errors/error-codes.ts`

### Backend tests (US2)

- [x] T080 [P] [US2] Add concurrency test for double-take (two agents) returns single success + 409 in `backend/test/integration/us2.agent-concurrency.spec.ts`
- [x] T081 [P] [US2] Add tests for internal note visibility (Customer never sees) in `backend/test/integration/us2.internal-visibility.spec.ts`
- [x] T082 [P] [US2] Add negative tests for illegal agent transitions and closed write rejection in `backend/test/integration/us2.agent-negative.spec.ts`

### Frontend (US2)

- [x] T083 [US2] Implement Agent workbench page `/agent/tickets` (tabs: unassigned/mine, status filter) in `frontend/src/pages/agent/AgentTicketsPage.tsx`
- [x] T084 [US2] Implement agent actions (take, status change) UI in `frontend/src/features/tickets/components/AgentTicketActions.tsx`
- [x] T085 [US2] Implement internal note composer UI in `frontend/src/features/tickets/components/InternalNoteForm.tsx`
- [x] T086 [US2] Implement agent tickets API hooks (agent list, take, status, message) in `frontend/src/features/agent/api/agent.queries.ts`
- [x] T087 [US2] Ensure 409 conflict UX (toast/banner “已被他人接手，請重新整理”) in `frontend/src/components/states/ErrorState.tsx`

### Frontend tests (US2)

- [x] T088 [P] [US2] Add UI tests for agent workbench tabs + empty states in `frontend/src/pages/agent/__tests__/AgentTicketsPage.test.tsx`

**Checkpoint**: US2 完成後，Agent 工作台可獨立 demo，並有併發接手的後端測試保障。

---

## Phase 5: User Story 3 - 管理員監控品質與管理客服（Priority: P3）

**Goal**: Admin 可檢視 dashboard（SLA/狀態分佈/負載），可指派/改派，並可建立/停用/調整角色。

**Independent Test**: 用 seed 的 Admin 完成「看 dashboard（7/30 天切換）→ 指派/改派 → 建立新 Agent → 停用 Agent 並驗證無法登入」。

### Backend (US3)

- [x] T089 [US3] Implement AdminUsersService (create/update role/disable + tokenVersion bump + revoke sessions) in `backend/src/admin/admin-users.service.ts`
- [x] T090 [US3] Implement AdminUsersController (`POST /admin/users`, `PATCH /admin/users/:id`) in `backend/src/admin/admin-users.controller.ts`
- [x] T091 [US3] Implement Admin ticket assignment (any assigneeId|null) with audit in `backend/src/tickets/tickets.service.ts`
- [x] T092 [US3] Extend `POST /tickets/:ticketId/assignee` to allow Admin reassign in `backend/src/tickets/tickets.controller.ts`
- [x] T093 [US3] Implement DashboardService (range=7/30, SLA cycles, status distribution, agent load) in `backend/src/admin/dashboard.service.ts`
- [x] T094 [US3] Implement `GET /admin/dashboard` controller in `backend/src/admin/dashboard.controller.ts`

### Backend tests (US3)

- [x] T095 [P] [US3] Add tests for disable user invalidates refresh sessions and bumps tokenVersion in `backend/test/integration/us3.user-disable.spec.ts`
- [x] T096 [P] [US3] Add dashboard aggregation tests with seeded events in `backend/test/integration/us3.dashboard.spec.ts`

### Frontend (US3)

- [x] T097 [US3] Implement Admin dashboard page `/admin/dashboard` (range toggle, charts) in `frontend/src/pages/admin/AdminDashboardPage.tsx`
- [x] T098 [US3] Implement dashboard charts (Recharts) in `frontend/src/features/admin/components/DashboardCharts.tsx`
- [x] T099 [US3] Implement Admin user management page in `frontend/src/pages/admin/AdminUsersPage.tsx`
- [x] T100 [US3] Implement admin API hooks (dashboard/users) in `frontend/src/features/admin/api/admin.queries.ts`
- [x] T101 [US3] Implement assignment UI for Admin in ticket detail in `frontend/src/features/tickets/components/AdminAssignmentControl.tsx`

### Frontend tests (US3)

- [x] T102 [P] [US3] Add UI tests for admin dashboard empty/loading/error states in `frontend/src/pages/admin/__tests__/AdminDashboardPage.test.tsx`

**Checkpoint**: US3 完成後，Admin 管理能力與 SLA 儀表板可獨立驗收。

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事一致性、品質、可維運性與 quickstart 驗證。

- [x] T103 [P] Add centralized API error-to-UI mapping (401→login, 403/404 pages) in `frontend/src/api/http.ts`
- [x] T104 Add consistent toast/notification system in `frontend/src/components/ToastProvider.tsx`
- [x] T105 Add pagination (or explicit limit) to ticket list endpoints in `backend/src/tickets/tickets.controller.ts`
- [x] T106 Add indexes/performance review and Prisma query tuning notes in `backend/prisma/schema.prisma`
- [x] T107 Add observability checklist (what is logged + requestId propagation) in `backend/src/common/logging/README.md`
- [x] T108 [P] Run and document end-to-end manual validation steps update in `specs/001-helpdesk-ticket-system/quickstart.md`
- [x] T109 [P] Security hardening pass (rate-limit auth, consistent 404 on not-visible) in `backend/src/auth/guards/jwt-auth.guard.ts`
- [x] T110 Run full test suite and record commands in `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) → Foundational (Phase 2) → US1 → US2 → US3 → Polish

### User Story Dependencies (recommended)

- US1 (P1) has no dependencies after Foundational
- US2 (P2) depends on US1 ticket core endpoints and timeline behavior
- US3 (P3) depends on US1/US2 data being produced (audit + messages) for meaningful dashboard aggregation

---

## Parallel Opportunities

- Setup: T005–T012 can largely run in parallel after T001–T004
- Foundational: Backend foundation (T013–T033) and Frontend foundation (T034–T043) can run in parallel
- US1: Backend (T044–T056) and Frontend pages (T060–T068) can run in parallel once API shapes are stable
- US2/US3: Frontend UI tasks can run in parallel with backend endpoints for the same story

---

## Parallel Example: User Story 1

- Backend in parallel: T046 (create ticket tx) + T048 (list) + T050 (detail)
- Frontend in parallel: T060 (login) + T061 (register) + T062 (tickets list)

---

## Implementation Strategy

- 先完成 Phase 1/2，確保「可跑、可測、可 seed」與錯誤語意一致。
- 依 P1→P2→P3 逐步增加能力；每個 story 以「獨立驗收流程 + 整合測試」收斂。
- 所有寫入一律遵守：transaction + append-only + audit log（失敗整體回滾）。
