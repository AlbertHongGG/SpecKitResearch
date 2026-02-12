---
description: "Task list for Jira Lite implementation"
---

# Tasks: Jira Lite（多租戶專案與議題追蹤系統）

**Input**: Design documents from /specs/001-jira-lite/
- Required: plan.md, spec.md
- Available: research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests (Required)**: 依 spec.md「User Scenarios & Testing (mandatory)」與 tasks-template 規則，核心 domain/business rules 與安全邊界必須有測試（unit + E2E）。

**Path conventions (per plan.md)**
- Frontend: apps/frontend/
- Backend: apps/backend/
- Shared contracts/types: packages/contracts/
- Unit tests: tests/unit/
- E2E tests: tests/e2e/

## Format (STRICT)

每個 task 必須符合：

	- [ ] T### [P?] [US?] Description with file path

---

## Phase 1: Setup（Shared Infrastructure）

- [x] T001 Create monorepo workspace root config in package.json
- [x] T002 [P] Add root TypeScript config in tsconfig.base.json
- [x] T003 [P] Configure formatting/linting in .prettierrc, .prettierignore, .eslintrc.cjs
- [x] T004 [P] Add root scripts (dev/build/test/lint/typecheck) in package.json
- [x] T005 [P] Add environment example values in .env.example
- [x] T006 Scaffold Next.js app shell in apps/frontend/package.json
- [x] T007 [P] Add Next.js App Router base routes in apps/frontend/src/app/layout.tsx and apps/frontend/src/app/page.tsx
- [x] T008 [P] Configure Tailwind in apps/frontend/tailwind.config.ts and apps/frontend/postcss.config.cjs
- [x] T009 Scaffold NestJS app shell in apps/backend/package.json
- [x] T010 [P] Add Nest bootstrap with global pipes/filters in apps/backend/src/main.ts
- [x] T011 Create Prisma folder layout in apps/backend/prisma/schema.prisma
- [x] T012 Create shared contracts package in packages/contracts/package.json
- [x] T013 Copy OpenAPI source into packages/contracts/openapi.yaml
- [x] T014 [P] Add OpenAPI validation script in packages/contracts/package.json
- [x] T015 [P] Add openapi-typescript generation script in packages/contracts/package.json
- [x] T016 [P] Add generated types export barrel in packages/contracts/src/index.ts
- [x] T017 [P] Add TanStack Query provider wrapper in apps/frontend/src/app/providers.tsx
- [x] T018 [P] Add base page state components in apps/frontend/src/components/PageStates.tsx
- [x] T019 [P] Add Playwright config in tests/e2e/playwright.config.ts
- [x] T020 [P] Add Vitest config in tests/unit/vitest.config.ts
- [x] T021 [P] Add workspace README dev commands in README.md

---

## Phase 2: Foundational（Blocking Prerequisites）

### Contracts baseline（source of truth）

- [ ] T022 Add missing endpoints to contracts in packages/contracts/openapi.yaml (invites, members, workflows, issue comments, sprints, platform org admin)
- [ ] T023 [P] Add error code enum list to contracts documentation in packages/contracts/README.md
- [ ] T024 [P] Add pagination/sorting conventions to contracts in packages/contracts/openapi.yaml

### Backend platform plumbing

- [x] T025 Setup backend env config loader in apps/backend/src/common/config/env.ts
- [x] T026 Setup requestId propagation middleware in apps/backend/src/common/middleware/request-id.middleware.ts
- [x] T027 Setup global error filter (ErrorResponse shape) in apps/backend/src/common/filters/http-exception.filter.ts
- [x] T028 Define stable error codes in apps/backend/src/common/errors/error-codes.ts
- [x] T029 [P] Add Zod validation pipe in apps/backend/src/common/pipes/zod-validation.pipe.ts
- [ ] T030 [P] Add structured logger wrapper in apps/backend/src/common/logging/logger.ts
- [ ] T031 [P] Add security log helper for authz denials in apps/backend/src/common/logging/security-log.ts

### Database + Prisma

- [x] T032 Define Prisma datasource/generator in apps/backend/prisma/schema.prisma
- [x] T033 Add User + PlatformRole models in apps/backend/prisma/schema.prisma
- [x] T034 Add Organization + OrganizationMembership models in apps/backend/prisma/schema.prisma
- [x] T035 Add OrganizationInvite model in apps/backend/prisma/schema.prisma
- [x] T036 Add Project + ProjectMembership + ProjectIssueType models in apps/backend/prisma/schema.prisma
- [x] T037 Add Workflow + WorkflowStatus + WorkflowTransition models in apps/backend/prisma/schema.prisma
- [x] T038 Add ProjectIssueCounter model in apps/backend/prisma/schema.prisma
- [x] T039 Add Sprint model in apps/backend/prisma/schema.prisma
- [x] T040 Add Issue + IssueLabel + IssueComment + IssueEpicLink models in apps/backend/prisma/schema.prisma
- [x] T041 Add AuditLog model (append-only) in apps/backend/prisma/schema.prisma
- [x] T042 Add Session model in apps/backend/prisma/schema.prisma
- [x] T043 Create PrismaService in apps/backend/src/prisma/prisma.service.ts
- [x] T046 Add migrate/generate scripts in apps/backend/package.json
- [x] T047 Create dev seed script in apps/backend/prisma/seed.ts
- [X] T046 Add migrate/generate scripts in apps/backend/package.json
- [X] T047 Create dev seed script in apps/backend/prisma/seed.ts

### Authn + CSRF foundation

- [X] T048 Implement password hashing util (argon2) in apps/backend/src/common/auth/password.ts
- [X] T049 Implement session cookie settings helper in apps/backend/src/common/auth/session-cookie.ts
- [x] T050 Implement session service (create/get/destroy) in apps/backend/src/modules/auth/session.service.ts
- [x] T051 Implement Auth module wiring in apps/backend/src/modules/auth/auth.module.ts
- [x] T052 Implement CSRF token endpoint in apps/backend/src/modules/auth/csrf.controller.ts
- [x] T053 Implement CSRF middleware for mutations in apps/backend/src/modules/auth/csrf.middleware.ts
- [x] T054 Implement login endpoint in apps/backend/src/modules/auth/auth.controller.ts
- [x] T055 Implement logout endpoint in apps/backend/src/modules/auth/auth.controller.ts
- [x] T056 Implement current-user decorator in apps/backend/src/common/auth/current-user.decorator.ts
- [x] T057 Implement session guard (401) in apps/backend/src/common/auth/session.guard.ts

### Authz + tenant boundary foundation

- [ ] T058 Implement RBAC role enums/helpers in apps/backend/src/common/rbac/roles.ts
- [ ] T059 Implement tenant access resolver service in apps/backend/src/common/rbac/tenant-access.service.ts
- [x] T060 Implement existence strategy helper (404 vs 403) in apps/backend/src/common/rbac/existence-strategy.ts
- [x] T063 Implement org member guard (404 if not member) in apps/backend/src/common/guards/org-member.guard.ts
- [x] T064 Implement org role guard (org_admin) in apps/backend/src/common/guards/org-role.guard.ts
- [X] T063 Implement org member guard (404 if not member) in apps/backend/src/common/guards/org-member.guard.ts
- [X] T064 Implement org role guard (org_admin) in apps/backend/src/common/guards/org-role.guard.ts
- [ ] T065 Implement project member guard (404 if not member) in apps/backend/src/common/guards/project-member.guard.ts
- [ ] T066 Implement project role guard (project_manager/developer/viewer) in apps/backend/src/common/guards/project-role.guard.ts

### Audit foundation

- [x] T067 Implement audit actions constants in apps/backend/src/modules/audit/audit.actions.ts
- [x] T068 Implement AuditLog append-only service in apps/backend/src/modules/audit/audit.service.ts
- [x] T069 Implement audit query endpoint in apps/backend/src/modules/audit/audit.controller.ts

### Frontend foundation

- [X] T070 Implement API client wrapper (credentials, JSON, requestId) in apps/frontend/src/lib/api/client.ts
- [X] T071 Implement CSRF token fetch + header injection helper in apps/frontend/src/lib/api/csrf.ts
- [X] T072 Implement session hook (me + caching) in apps/frontend/src/features/auth/useSession.ts
- [X] T073 [P] Implement returnTo allowlist helper in apps/frontend/src/lib/routing/returnTo.ts
- [ ] T074 Implement typed API client bindings using generated types in apps/frontend/src/lib/api/types.ts
- [X] T075 Implement global error mapper (401/403/404/409) in apps/frontend/src/lib/api/errors.ts

**Checkpoint**: Foundation ready（contracts + DB + authn/authz + audit + FE API foundation）

---

## Phase 3: User Story 1 - 登入與加入組織（邀請流程）(Priority: P1)

**Goal**: 使用者可登入/登出；Org Admin 可寄出邀請；受邀者可用 token 加入 org（必要時建立帳號）。

**Independent Test**: 寄出邀請 → 以邀請連結加入 → 登入 → 在 /orgs 看見組織。

### Tests（US1）

- [ ] T076 [P] [US1] Unit test password hashing verify/rehash in tests/unit/auth/password.test.ts
- [ ] T077 [P] [US1] Unit test CSRF middleware allow/deny matrix in tests/unit/auth/csrf.test.ts
- [ ] T078 [P] [US1] Unit test invite token lifecycle (pending/expired/used) in tests/unit/invites/invite-lifecycle.test.ts
- [ ] T079 [P] [US1] E2E test login returnTo redirect in tests/e2e/auth-login-returnto.spec.ts
- [ ] T080 [P] [US1] E2E test org admin sends invite (dev mail outbox) in tests/e2e/invite-send.spec.ts
- [ ] T081 [P] [US1] E2E test accept invite creates membership + consumes token in tests/e2e/invite-accept.spec.ts

### Backend（US1）

- [x] T082 [US1] Implement org list for switcher endpoint in apps/backend/src/modules/orgs/orgs.controller.ts
- [x] T083 [US1] Implement org invites create endpoint in apps/backend/src/modules/orgs/org-invites.controller.ts
- [x] T084 [US1] Implement mailer abstraction in apps/backend/src/common/mailer/mailer.ts
- [x] T085 [US1] Implement dev console mailer in apps/backend/src/common/mailer/console-mailer.ts
- [x] T086 [US1] Implement invite service (create token, expiry) in apps/backend/src/modules/orgs/org-invites.service.ts
- [x] T087 [US1] Implement invite accept endpoint in apps/backend/src/modules/orgs/org-invites.controller.ts
- [ ] T088 [US1] Enforce accept edge cases (expired/used/email mismatch) in apps/backend/src/modules/orgs/org-invites.service.ts
- [ ] T089 [US1] Emit audit events for invite created/accepted in apps/backend/src/modules/orgs/org-invites.audit.ts

### Frontend（US1）

- [X] T090 [US1] Implement /login page with RHF+Zod in apps/frontend/src/app/login/page.tsx
- [X] T091 [US1] Implement /invite/[token] accept page in apps/frontend/src/app/invite/[token]/page.tsx
- [X] T092 [US1] Implement /orgs org switcher page in apps/frontend/src/app/orgs/page.tsx
- [X] T093 [US1] Implement logout button/action in apps/frontend/src/features/auth/LogoutButton.tsx
- [X] T094 [US1] Add auth error display component in apps/frontend/src/features/auth/AuthErrors.tsx

**Checkpoint**: US1 end-to-end 可用（登入 + 邀請寄送/接受 + org list）

---

## Phase 4: User Story 2 - 多租戶存取與導覽可見性（不該看見就不顯示）(Priority: P1)

**Goal**: 伺服端強制 tenant isolation + scope RBAC + existence strategy；UI 導覽依權限顯示/隱藏。

**Independent Test**: 兩個 org 的帳號互相無法讀取對方 org/project/issue；導覽不顯示未授權入口。

### Tests（US2）

- [ ] T095 [P] [US2] Unit test existence strategy (non-member=404, member-no-role=403) in tests/unit/rbac/existence-strategy.test.ts
- [ ] T096 [P] [US2] Unit test platform role does not grant org/project access in tests/unit/rbac/scope-separation.test.ts
- [ ] T097 [P] [US2] E2E test guest protected route redirects to /login in tests/e2e/auth-redirect.spec.ts
- [ ] T098 [P] [US2] E2E test non-member org routes return 404 in tests/e2e/existence-org-404.spec.ts
- [ ] T099 [P] [US2] E2E test non-member project routes return 404 in tests/e2e/existence-project-404.spec.ts

### Backend（US2）

- [ ] T100 [US2] Apply org member guard to org-scoped controllers in apps/backend/src/modules/orgs/orgs.controller.ts
- [ ] T101 [US2] Apply project member guard to project-scoped controllers in apps/backend/src/modules/issues/issues.controller.ts
- [ ] T102 [US2] Add navigation model endpoint (server-driven) in apps/backend/src/modules/nav/nav.controller.ts
- [ ] T103 [US2] Ensure 401/403/404/409 use ErrorResponse with requestId in apps/backend/src/common/filters/http-exception.filter.ts

### Frontend（US2）

- [ ] T104 [US2] Implement protected layout gate in apps/frontend/src/app/(protected)/layout.tsx
- [ ] T105 [US2] Implement nav component using nav model in apps/frontend/src/components/Nav.tsx
- [ ] T106 [US2] Implement forbidden page in apps/frontend/src/app/forbidden/page.tsx
- [ ] T107 [US2] Implement not-found handling in apps/frontend/src/app/not-found.tsx
- [ ] T108 [US2] Ensure nav hides platform/org/project links based on session roles in apps/frontend/src/components/Nav.tsx

**Checkpoint**: tenant isolation + 導覽可見性符合規格（404 隱匿、403 明確、401 導 login）

---

## Phase 5: User Story 3 - 專案與 Issue 的日常協作（建立、指派、狀態流轉、稽核）(Priority: P1)

**Goal**: 在 project 內完成 Issue 協作全套（CRUD、transition、comments、audit、併發衝突、排序）。

**Independent Test**: 建立 Issue → 指派 → 轉狀態 → 留言 → 查看 Audit（before/after）。

### Tests（US3）

- [ ] T109 [P] [US3] Unit test issue key allocator uses counter+transaction in tests/unit/issues/issue-key-counter.test.ts
- [ ] T110 [P] [US3] Unit test workflow transition allow/deny in tests/unit/workflows/transitions.test.ts
- [ ] T111 [P] [US3] Unit test deprecated status blocks transitions (ISSUE_STATUS_DEPRECATED) in tests/unit/workflows/deprecated-status.test.ts
- [ ] T112 [P] [US3] Unit test optimistic concurrency returns 409 in tests/unit/issues/optimistic-concurrency.test.ts
- [ ] T113 [P] [US3] E2E test create issue then view detail in tests/e2e/issue-create-and-view.spec.ts
- [ ] T114 [P] [US3] E2E test update issue conflict (409) UX in tests/e2e/issue-update-conflict.spec.ts
- [ ] T115 [P] [US3] E2E test transition writes audit event in tests/e2e/issue-transition-audit.spec.ts
- [ ] T116 [P] [US3] E2E test viewer cannot mutate (UI hidden + API 403) in tests/e2e/viewer-readonly.spec.ts

### Backend（US3）

- [ ] T117 [US3] Implement workflow versioning service (new version + single active) in apps/backend/src/modules/workflows/workflows.service.ts
- [ ] T118 [US3] Implement workflow read endpoints in apps/backend/src/modules/workflows/workflows.controller.ts
- [ ] T119 [US3] Implement workflow update endpoints (Project Manager) in apps/backend/src/modules/workflows/workflows.controller.ts
- [ ] T120 [US3] Implement issue types list + toggle endpoints (Project Manager) in apps/backend/src/modules/issues/issue-types.controller.ts
- [ ] T121 [US3] Implement issue key allocator service (counter + retry) in apps/backend/src/modules/issues/issue-key.service.ts
- [ ] T122 [US3] Implement issues list endpoint (sort=created_at|updated_at) in apps/backend/src/modules/issues/issues.controller.ts
- [ ] T123 [US3] Implement issue create endpoint (issueKey, labels, dates) in apps/backend/src/modules/issues/issues.controller.ts
- [ ] T124 [US3] Implement issue detail endpoint in apps/backend/src/modules/issues/issue-detail.controller.ts
- [ ] T125 [US3] Implement issue patch endpoint with expectedVersion in apps/backend/src/modules/issues/issue-detail.controller.ts
- [ ] T126 [US3] Implement issue transition endpoint with workflow enforcement in apps/backend/src/modules/issues/issue-transition.controller.ts
- [ ] T127 [US3] Implement issue comments create/list endpoints in apps/backend/src/modules/issues/issue-comments.controller.ts
- [ ] T128 [US3] Implement audit emission for issue create/update/transition/comment in apps/backend/src/modules/issues/issues.audit.ts

### Frontend（US3）

- [ ] T129 [US3] Implement project redirect page in apps/frontend/src/app/projects/[projectId]/page.tsx
- [ ] T130 [US3] Implement board page (issues grouped by status) in apps/frontend/src/app/projects/[projectId]/board/page.tsx
- [ ] T131 [US3] Implement issue detail page in apps/frontend/src/app/projects/[projectId]/issues/[issueKey]/page.tsx
- [ ] T132 [US3] Implement create issue dialog (RHF+Zod) in apps/frontend/src/features/issues/CreateIssueDialog.tsx
- [ ] T133 [US3] Implement issue edit form with optimistic concurrency handling in apps/frontend/src/features/issues/IssueEditForm.tsx
- [ ] T134 [US3] Implement transition menu (allowed transitions) in apps/frontend/src/features/issues/TransitionMenu.tsx
- [ ] T135 [US3] Implement comments composer/list in apps/frontend/src/features/issues/IssueComments.tsx
- [ ] T136 [US3] Implement audit timeline component in apps/frontend/src/features/audit/AuditTimeline.tsx
- [ ] T137 [US3] Add Loading/Empty/Error states for board/detail in apps/frontend/src/features/issues/IssueStates.tsx

**Checkpoint**: 核心 Issue 協作完整可用（含稽核、排序、併發衝突）

---

## Phase 6: User Story 4 - 專案型態能力（Scrum Sprint / Kanban Board）(Priority: P2)

**Goal**: Scrum Sprint（planned/active/closed）與 backlog；Kanban board 互動（drag/drop）觸發合法 transition。

**Independent Test**: Scrum：建 Sprint → 啟動 → 結束；Kanban：Board 上移動卡片（合法轉換）。

### Tests（US4）

- [ ] T138 [P] [US4] Unit test sprint transitions planned→active→closed in tests/unit/sprints/state-transitions.test.ts
- [ ] T139 [P] [US4] E2E test sprint lifecycle in tests/e2e/scrum-sprint-lifecycle.spec.ts
- [ ] T140 [P] [US4] E2E test kanban drag/drop transition in tests/e2e/kanban-dnd-transition.spec.ts

### Backend（US4）

- [ ] T141 [US4] Implement sprints list/create endpoints in apps/backend/src/modules/sprints/sprints.controller.ts
- [ ] T142 [US4] Implement sprint start/close endpoints in apps/backend/src/modules/sprints/sprints.controller.ts
- [ ] T143 [US4] Implement backlog endpoint (issues without sprint) in apps/backend/src/modules/sprints/backlog.controller.ts
- [ ] T144 [US4] Emit audit events for sprint create/start/close in apps/backend/src/modules/sprints/sprints.audit.ts

### Frontend（US4）

- [ ] T145 [US4] Implement scrum backlog page in apps/frontend/src/app/projects/[projectId]/backlog/page.tsx
- [ ] T146 [US4] Implement sprints page in apps/frontend/src/app/projects/[projectId]/sprints/page.tsx
- [ ] T147 [US4] Implement sprint lifecycle actions UI in apps/frontend/src/features/sprints/SprintActions.tsx
- [ ] T148 [US4] Implement drag/drop kanban component in apps/frontend/src/features/board/KanbanBoard.tsx

**Checkpoint**: Scrum/Kanban 功能可驗收且遵循相同權限/唯讀規則

---

## Phase 7: User Story 5 - 管理控制（Org/Project 唯讀狀態與稽核查詢）(Priority: P2)

**Goal**: Platform Admin 管 org（plan/status）+ 平台稽核；Org Admin 管成員/邀請/專案/角色；Project archive；唯讀狀態一致。

**Independent Test**: org suspended → 寫入拒絕 + UI 無寫入 CTA → audit 可追溯 who/when/what。

### Tests（US5）

- [ ] T149 [P] [US5] Unit test ORG_SUSPENDED blocks org-scoped writes in tests/unit/read-only/org-suspended.test.ts
- [ ] T150 [P] [US5] Unit test PROJECT_ARCHIVED blocks project-scoped writes in tests/unit/read-only/project-archived.test.ts
- [ ] T151 [P] [US5] E2E test platform admin suspend/unsuspend org in tests/e2e/platform-org-suspend.spec.ts
- [ ] T152 [P] [US5] E2E test project archive blocks issue mutations in tests/e2e/project-archive-readonly.spec.ts
- [ ] T153 [P] [US5] E2E test audit query scopes in tests/e2e/audit-query.spec.ts

### Backend（US5）

- [ ] T154 [US5] Implement platform org create/update/status endpoints in apps/backend/src/modules/platform/platform-orgs.controller.ts
- [ ] T155 [US5] Implement platform org plan update restriction in apps/backend/src/modules/platform/platform-orgs.service.ts
- [ ] T156 [US5] Emit platform audit events for org create/update/suspend in apps/backend/src/modules/platform/platform.audit.ts
- [ ] T157 [US5] Implement org members list/update/remove endpoints in apps/backend/src/modules/orgs/org-members.controller.ts
- [ ] T158 [US5] Implement org projects list/create endpoints in apps/backend/src/modules/projects/projects.controller.ts
- [ ] T159 [US5] Enforce project key uniqueness error mapping in apps/backend/src/modules/projects/projects.service.ts
- [ ] T160 [US5] Implement project membership assign/update endpoints in apps/backend/src/modules/projects/project-members.controller.ts
- [ ] T161 [US5] Implement project archive endpoint (irreversible) in apps/backend/src/modules/projects/project-settings.controller.ts
- [ ] T162 [US5] Ensure read-only guard applied to all mutations in apps/backend/src/common/guards/read-only.guard.ts

### Frontend（US5）

- [ ] T163 [US5] Implement platform org admin page in apps/frontend/src/app/platform/orgs/page.tsx
- [ ] T164 [US5] Implement org members admin page in apps/frontend/src/app/orgs/[orgId]/members/page.tsx
- [ ] T165 [US5] Implement org invites admin page in apps/frontend/src/app/orgs/[orgId]/invites/page.tsx
- [ ] T166 [US5] Implement org projects admin page in apps/frontend/src/app/orgs/[orgId]/projects/page.tsx
- [ ] T167 [US5] Implement project settings page (archive + role mgmt link) in apps/frontend/src/app/projects/[projectId]/settings/page.tsx
- [ ] T168 [US5] Implement audit page with scope filters in apps/frontend/src/app/audit/page.tsx
- [ ] T169 [US5] Implement read-only banners + CTA disabling in apps/frontend/src/components/ReadOnlyBanner.tsx

**Checkpoint**: 管理控制與唯讀規則端到端一致可驗收

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T170 [P] Harden user-input rendering against XSS in apps/frontend/src/lib/security/sanitize.ts
- [ ] T171 Add auth rate limiting guard in apps/backend/src/common/security/rate-limit.guard.ts
- [ ] T172 [P] Add performance indexes per data-model.md in apps/backend/prisma/schema.prisma
- [ ] T173 [P] Add seed-data verification checklist in specs/001-jira-lite/quickstart.md
- [ ] T174 Update quickstart smoke scenarios after implementation in specs/001-jira-lite/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup) → Phase 2 (Foundational) → User Stories (Phase 3+)
- Phase 8 (Polish) depends on completing desired user stories

### User Story Dependency Graph (recommended)

- US1 → US2 → US3 → US4
- US5 can start after US2, but is most meaningful once US1 and US3 exist

---

## Parallel Opportunities Identified

- Setup: T002, T003, T005, T007, T008, T010, T014–T020 can run in parallel
- Foundational: T033–T042 (schema) can be split across models; T025–T031 (plumbing) can run in parallel
- US1/US2/US3 tests: most [P] tests can be developed alongside implementation tasks

---

## Parallel Execution Examples (per story)

### US1

- T076 + T077 + T078 (unit tests) can run in parallel
- T084 + T085 (mailer pieces) can run in parallel

### US2

- T095 + T096 + T097 + T098 + T099 (tests) can run in parallel
- T102 (nav endpoint) and T104–T107 (FE gating/pages) can be developed in parallel once contract shape is agreed

### US3

- T109–T112 (unit tests) can run in parallel
- T117 (workflow) + T120 (issue types) + T121 (issue key allocator) can be built in parallel after schema

### US4

- T138 (unit) + T139/T140 (E2E) can run in parallel
- T145 (backlog UI) + T146 (sprints UI) can be built in parallel after endpoints exist

### US5

- T149–T153 (tests) can run in parallel
- T163 (platform UI) + T164–T168 (org/admin/audit UI) can be split across multiple developers

---

## Implementation Strategy

- 先完成 Phase 1/2，確保 contracts、auth/security、DB schema、error semantics 與 audit foundation 穩定。
- 依 P1 → P2 交付；每個 user story 都以 E2E scenario 收尾，確保「UI + API + 規則」一致。
