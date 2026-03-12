# Tasks: Enterprise Jira Lite RBAC Tracking

**Input**: Design documents from `/specs/001-jira-lite-rbac/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/openapi.yaml, quickstart.md

**Tests**: Core domain/business rules MUST have tests (happy path, edge cases, failures).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize complete frontend/backend workspace and developer tooling.

- [X] T001 Create backend workspace structure in `backend/src/main.ts`
- [X] T002 Create frontend workspace structure in `frontend/src/app/layout.tsx`
- [X] T003 Initialize backend dependencies in `backend/package.json`
- [X] T004 Initialize frontend dependencies in `frontend/package.json`
- [X] T005 [P] Configure backend TypeScript build in `backend/tsconfig.json`
- [X] T006 [P] Configure frontend TypeScript build in `frontend/tsconfig.json`
- [X] T007 [P] Configure backend lint/format in `backend/.eslintrc.cjs`
- [X] T008 [P] Configure frontend lint/format in `frontend/.eslintrc.cjs`
- [X] T009 [P] Add backend environment template in `backend/.env.example`
- [X] T010 [P] Add frontend environment template in `frontend/.env.example`
- [X] T011 Configure backend test runner scripts in `backend/package.json`
- [X] T012 Configure frontend test runner scripts in `frontend/package.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared infrastructure required by all user stories.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T013 Implement initial Prisma schema skeleton in `backend/prisma/schema.prisma`
- [X] T014 Create initial Prisma migration in `backend/prisma/migrations/202603080001_init/migration.sql`
- [X] T015 [P] Implement Prisma service bootstrap in `backend/src/common/prisma/prisma.service.ts`
- [X] T016 [P] Define global error code constants in `backend/src/common/errors/error-codes.ts`
- [X] T017 [P] Implement standard error response filter in `backend/src/common/errors/http-exception.filter.ts`
- [X] T018 [P] Implement request/trace id middleware in `backend/src/common/observability/request-context.middleware.ts`
- [X] T019 [P] Implement structured logger wrapper in `backend/src/common/observability/logger.service.ts`
- [X] T020 Implement cookie session setup in `backend/src/common/auth/session.config.ts`
- [X] T021 [P] Implement CSRF guard for write APIs in `backend/src/common/guards/csrf.guard.ts`
- [X] T022 [P] Implement authentication guard in `backend/src/common/guards/authenticated.guard.ts`
- [X] T023 [P] Implement organization membership guard in `backend/src/common/guards/org-membership.guard.ts`
- [X] T024 [P] Implement project membership guard in `backend/src/common/guards/project-membership.guard.ts`
- [X] T025 [P] Implement role authorization guard in `backend/src/common/guards/role.guard.ts`
- [X] T026 [P] Implement read-only policy guard in `backend/src/common/guards/read-only-policy.guard.ts`
- [X] T027 Implement guard execution order helper in `backend/src/common/guards/guard-pipeline.ts`
- [X] T028 Implement audit log writer service in `backend/src/modules/audit/audit-log.service.ts`
- [X] T029 [P] Implement audit log repository in `backend/src/modules/audit/audit-log.repository.ts`
- [X] T030 [P] Implement shared API error parser in `frontend/src/lib/api/error-mapper.ts`
- [X] T031 [P] Implement frontend query client provider in `frontend/src/lib/query/query-provider.tsx`
- [X] T032 [P] Implement frontend session context store in `frontend/src/lib/auth/session-context.tsx`
- [X] T033 [P] Implement frontend capability map resolver in `frontend/src/lib/auth/capability-map.ts`
- [X] T034 Implement protected route middleware in `frontend/src/middleware.ts`

**Checkpoint**: Foundation ready; all user stories can start.

---

## Phase 3: User Story 1 - Secure Multi-Tenant Access (Priority: P1)

**Goal**: 完成登入、邀請接受、租戶切換、路由保護與導覽可見性，確保跨租戶隔離與 401/403/404 一致語意。

**Independent Test**: 建立兩個 organization 與多角色帳號，驗證未登入/非成員/權限不足時的路由與 API 回應、導覽顯示與存在性隱藏策略。

### Tests for User Story 1

- [X] T035 [P] [US1] Add contract tests for auth endpoints in `backend/tests/contract/auth.contract.spec.ts`
- [X] T036 [P] [US1] Add contract tests for invite acceptance endpoint in `backend/tests/contract/invites.contract.spec.ts`
- [X] T037 [P] [US1] Add integration tests for `401/403/404` semantics in `backend/tests/integration/access-semantics.int.spec.ts`
- [X] T038 [P] [US1] Add integration tests for existence-hiding on org/project routes in `backend/tests/integration/existence-policy.int.spec.ts`
- [X] T039 [P] [US1] Add frontend unit tests for navigation visibility matrix in `frontend/tests/unit/navigation-visibility.spec.tsx`
- [X] T040 [P] [US1] Add Playwright E2E for login and returnUrl flow in `frontend/tests/e2e/login-return-url.spec.ts`

### Implementation for User Story 1

- [X] T041 [P] [US1] Implement user/session repository in `backend/src/modules/auth/auth.repository.ts`
- [X] T042 [US1] Implement login/logout service in `backend/src/modules/auth/auth.service.ts`
- [X] T043 [US1] Implement login/logout controller in `backend/src/modules/auth/auth.controller.ts`
- [X] T044 [P] [US1] Implement invite token validation repository in `backend/src/modules/organizations/invites.repository.ts`
- [X] T045 [US1] Implement invite acceptance service in `backend/src/modules/organizations/invites.service.ts`
- [X] T046 [US1] Implement invite acceptance controller in `backend/src/modules/organizations/invites.controller.ts`
- [X] T047 [US1] Implement organization switch query service in `backend/src/modules/organizations/org-switch.service.ts`
- [X] T048 [US1] Implement organization list controller in `backend/src/modules/organizations/org-switch.controller.ts`
- [X] T049 [US1] Implement not-member to 404 policy mapper in `backend/src/common/errors/resource-visibility.policy.ts`
- [X] T050 [US1] Wire audit events for login/invite accepted/member joined in `backend/src/modules/auth/auth.audit.ts`
- [X] T051 [P] [US1] Implement login page UI in `frontend/src/app/login/page.tsx`
- [X] T052 [P] [US1] Implement invite accept page UI in `frontend/src/app/invite/[token]/page.tsx`
- [X] T053 [US1] Implement organization switch page UI in `frontend/src/app/orgs/page.tsx`
- [X] T054 [US1] Implement global navigation component with capability visibility in `frontend/src/components/navigation/app-navigation.tsx`
- [X] T055 [US1] Implement auth service client in `frontend/src/services/auth/auth-api.ts`
- [X] T056 [US1] Implement invite service client in `frontend/src/services/invites/invite-api.ts`

**Checkpoint**: US1 complete with strict multi-tenant access control and navigation behavior.

---

## Phase 4: User Story 2 - Issue Lifecycle Governance (Priority: P1)

**Goal**: 完成 issue 全生命週期（建立、編輯、狀態流轉、epic 關聯、留言、Scrum/Kanban 互動）與 workflow 版本化治理。

**Independent Test**: 在單一 project 內完成 issue create/update/transition、workflow 更新、deprecated status 驗證、board/backlog/sprints 流程。

### Tests for User Story 2

- [X] T057 [P] [US2] Add contract tests for issue CRUD and transition in `backend/tests/contract/issues.contract.spec.ts`
- [X] T058 [P] [US2] Add contract tests for workflow update endpoint in `backend/tests/contract/workflows.contract.spec.ts`
- [X] T059 [P] [US2] Add contract tests for sprint endpoints in `backend/tests/contract/sprints.contract.spec.ts`
- [X] T060 [P] [US2] Add unit tests for issue key generation concurrency in `backend/tests/unit/issue-key-generator.spec.ts`
- [X] T061 [P] [US2] Add unit tests for transition validation rules in `backend/tests/unit/workflow-transition.spec.ts`
- [X] T062 [P] [US2] Add integration tests for deprecated status rejection in `backend/tests/integration/deprecated-status.int.spec.ts`
- [X] T063 [P] [US2] Add integration tests for optimistic concurrency conflict in `backend/tests/integration/issue-conflict.int.spec.ts`
- [X] T064 [P] [US2] Add frontend unit tests for issue form validation in `frontend/tests/unit/issue-form.spec.tsx`
- [X] T065 [P] [US2] Add Playwright E2E for board transition flow in `frontend/tests/e2e/board-transition.spec.ts`
- [X] T066 [P] [US2] Add Playwright E2E for scrum sprint workflow in `frontend/tests/e2e/scrum-sprint-flow.spec.ts`

### Implementation for User Story 2

- [X] T067 [P] [US2] Implement workflow repository in `backend/src/modules/workflows/workflows.repository.ts`
- [X] T068 [P] [US2] Implement workflow status service in `backend/src/modules/workflows/workflow-status.service.ts`
- [X] T069 [US2] Implement workflow versioning service in `backend/src/modules/workflows/workflows.service.ts`
- [X] T070 [US2] Implement workflow controller in `backend/src/modules/workflows/workflows.controller.ts`
- [X] T071 [P] [US2] Implement issue repository in `backend/src/modules/issues/issues.repository.ts`
- [X] T072 [P] [US2] Implement issue label repository in `backend/src/modules/issues/issue-labels.repository.ts`
- [X] T073 [P] [US2] Implement epic link repository in `backend/src/modules/issues/issue-epic-links.repository.ts`
- [X] T074 [P] [US2] Implement issue comment repository in `backend/src/modules/issues/issue-comments.repository.ts`
- [X] T075 [US2] Implement issue key generator with transaction safety in `backend/src/modules/issues/issue-key-generator.service.ts`
- [X] T076 [US2] Implement issue create/update service in `backend/src/modules/issues/issues.service.ts`
- [X] T077 [US2] Implement issue transition service in `backend/src/modules/issues/issue-transition.service.ts`
- [X] T078 [US2] Implement epic link service in `backend/src/modules/issues/issue-epic-links.service.ts`
- [X] T079 [US2] Implement issue comment service in `backend/src/modules/issues/issue-comments.service.ts`
- [X] T080 [US2] Implement issue controller in `backend/src/modules/issues/issues.controller.ts`
- [X] T081 [P] [US2] Implement sprint repository in `backend/src/modules/sprints/sprints.repository.ts`
- [X] T082 [US2] Implement sprint lifecycle service in `backend/src/modules/sprints/sprints.service.ts`
- [X] T083 [US2] Implement sprint controller in `backend/src/modules/sprints/sprints.controller.ts`
- [X] T084 [US2] Implement issue audit event mapping in `backend/src/modules/issues/issues.audit.ts`
- [X] T085 [P] [US2] Implement board data query service in `backend/src/modules/projects/project-board.service.ts`
- [X] T086 [P] [US2] Implement issue API client in `frontend/src/services/issues/issues-api.ts`
- [X] T087 [P] [US2] Implement workflow API client in `frontend/src/services/workflows/workflows-api.ts`
- [X] T088 [P] [US2] Implement sprint API client in `frontend/src/services/sprints/sprints-api.ts`
- [X] T089 [US2] Implement project board page in `frontend/src/app/projects/[projectId]/board/page.tsx`
- [X] T090 [US2] Implement project issues list page in `frontend/src/app/projects/[projectId]/issues/page.tsx`
- [X] T091 [US2] Implement issue detail page in `frontend/src/app/projects/[projectId]/issues/[issueKey]/page.tsx`
- [X] T092 [US2] Implement scrum backlog page in `frontend/src/app/projects/[projectId]/backlog/page.tsx`
- [X] T093 [US2] Implement scrum sprints page in `frontend/src/app/projects/[projectId]/sprints/page.tsx`
- [X] T094 [US2] Implement issue editor form component in `frontend/src/features/issues/components/issue-form.tsx`
- [X] T095 [US2] Implement workflow editor component in `frontend/src/features/workflows/components/workflow-editor.tsx`
- [X] T096 [US2] Implement board column component with transition action in `frontend/src/features/issues/components/board-column.tsx`

**Checkpoint**: US2 complete with end-to-end issue lifecycle governance and workflow control.

---

## Phase 5: User Story 3 - Org and Platform Administration (Priority: P2)

**Goal**: 完成 Platform/Org 管理操作（organization 建立/plan/status、member invite/管理、project 建立、project role 指派）與對應 UI。

**Independent Test**: 以 Platform Admin、Org Admin、Org Member 三類帳號驗證 admin 操作、禁止行為與角色邊界。

### Tests for User Story 3

- [X] T097 [P] [US3] Add contract tests for platform organization endpoints in `backend/tests/contract/platform-orgs.contract.spec.ts`
- [X] T098 [P] [US3] Add contract tests for organization member management endpoints in `backend/tests/contract/org-members.contract.spec.ts`
- [X] T099 [P] [US3] Add contract tests for project role assignment endpoint in `backend/tests/contract/project-members.contract.spec.ts`
- [X] T100 [P] [US3] Add integration tests for role-scope separation in `backend/tests/integration/role-scope-separation.int.spec.ts`
- [X] T101 [P] [US3] Add frontend unit tests for admin CTA visibility in `frontend/tests/unit/admin-cta-visibility.spec.tsx`
- [X] T102 [P] [US3] Add Playwright E2E for platform admin management flow in `frontend/tests/e2e/platform-admin-flow.spec.ts`

### Implementation for User Story 3

- [X] T103 [P] [US3] Implement platform organization repository in `backend/src/modules/organizations/platform-orgs.repository.ts`
- [X] T104 [US3] Implement platform organization service in `backend/src/modules/organizations/platform-orgs.service.ts`
- [X] T105 [US3] Implement platform organization controller in `backend/src/modules/organizations/platform-orgs.controller.ts`
- [X] T106 [P] [US3] Implement organization membership repository in `backend/src/modules/organizations/org-members.repository.ts`
- [X] T107 [US3] Implement organization member admin service in `backend/src/modules/organizations/org-members.service.ts`
- [X] T108 [US3] Implement organization member admin controller in `backend/src/modules/organizations/org-members.controller.ts`
- [X] T109 [P] [US3] Implement project membership repository in `backend/src/modules/projects/project-members.repository.ts`
- [X] T110 [US3] Implement project role assignment service in `backend/src/modules/projects/project-members.service.ts`
- [X] T111 [US3] Implement project role assignment controller in `backend/src/modules/projects/project-members.controller.ts`
- [X] T112 [US3] Implement organization project creation service in `backend/src/modules/projects/projects.service.ts`
- [X] T113 [US3] Implement organization project creation controller in `backend/src/modules/projects/projects.controller.ts`
- [X] T114 [US3] Implement admin audit event mapping in `backend/src/modules/organizations/organizations.audit.ts`
- [X] T115 [P] [US3] Implement platform API client in `frontend/src/services/platform/platform-api.ts`
- [X] T116 [P] [US3] Implement organization members API client in `frontend/src/services/organizations/org-members-api.ts`
- [X] T117 [P] [US3] Implement projects admin API client in `frontend/src/services/projects/project-admin-api.ts`
- [X] T118 [US3] Implement platform organizations page in `frontend/src/app/platform/orgs/page.tsx`
- [X] T119 [US3] Implement organization overview page in `frontend/src/app/orgs/[orgId]/page.tsx`
- [X] T120 [US3] Implement organization members page in `frontend/src/app/orgs/[orgId]/members/page.tsx`
- [X] T121 [US3] Implement organization projects page in `frontend/src/app/orgs/[orgId]/projects/page.tsx`
- [X] T122 [US3] Implement project settings role-management section in `frontend/src/features/projects/components/project-members-settings.tsx`

**Checkpoint**: US3 complete with full platform/org administration and role-bound UX.

---

## Phase 6: User Story 4 - Read-Only Safeguards and Auditability (Priority: P2)

**Goal**: 完成 organization suspended / project archived 的全寫入封鎖、Audit 查詢頁與 timeline，可追溯 who/when/what。

**Independent Test**: 對任一已建立 organization/project 啟用 suspended/archive，驗證所有寫入拒絕與 audit 一致性。

### Tests for User Story 4

- [X] T123 [P] [US4] Add contract tests for org/project read-only error codes in `backend/tests/contract/read-only.contract.spec.ts`
- [X] T124 [P] [US4] Add contract tests for audit query endpoints in `backend/tests/contract/audit.contract.spec.ts`
- [X] T125 [P] [US4] Add integration tests for org suspended write rejection in `backend/tests/integration/org-suspended.int.spec.ts`
- [X] T126 [P] [US4] Add integration tests for project archived write rejection in `backend/tests/integration/project-archived.int.spec.ts`
- [X] T127 [P] [US4] Add integration tests for immutable archive behavior in `backend/tests/integration/archive-immutability.int.spec.ts`
- [X] T128 [P] [US4] Add Playwright E2E for read-only UI enforcement in `frontend/tests/e2e/read-only-enforcement.spec.ts`
- [X] T129 [P] [US4] Add Playwright E2E for audit log query and filters in `frontend/tests/e2e/audit-log-flow.spec.ts`

### Implementation for User Story 4

- [X] T130 [US4] Implement organization status update service in `backend/src/modules/organizations/org-status.service.ts`
- [X] T131 [US4] Implement organization status controller in `backend/src/modules/organizations/org-status.controller.ts`
- [X] T132 [US4] Implement project archive service in `backend/src/modules/projects/project-archive.service.ts`
- [X] T133 [US4] Implement project archive controller in `backend/src/modules/projects/project-archive.controller.ts`
- [X] T134 [US4] Implement read-only enforcement interceptor in `backend/src/common/interceptors/read-only.interceptor.ts`
- [X] T135 [US4] Implement organization audit query service in `backend/src/modules/audit/org-audit-query.service.ts`
- [X] T136 [US4] Implement platform audit query service in `backend/src/modules/audit/platform-audit-query.service.ts`
- [X] T137 [US4] Implement audit query controller in `backend/src/modules/audit/audit.controller.ts`
- [X] T138 [US4] Implement issue timeline query service in `backend/src/modules/issues/issue-timeline.service.ts`
- [X] T139 [P] [US4] Implement audit API client in `frontend/src/services/audit/audit-api.ts`
- [X] T140 [US4] Implement organization audit page in `frontend/src/app/orgs/[orgId]/audit/page.tsx`
- [X] T141 [US4] Implement platform audit page in `frontend/src/app/platform/audit/page.tsx`
- [X] T142 [US4] Implement read-only banner component in `frontend/src/components/state/read-only-banner.tsx`
- [X] T143 [US4] Implement project settings archive section in `frontend/src/features/projects/components/archive-project-settings.tsx`
- [X] T144 [US4] Implement issue timeline component in `frontend/src/features/issues/components/issue-timeline.tsx`

**Checkpoint**: US4 complete with strict read-only enforcement and audit traceability.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening for complete production-grade delivery.

- [X] T145 [P] Add API schema validation CI check in `backend/package.json`
- [X] T146 [P] Add seed data scenario coverage in `backend/prisma/seed.ts`
- [X] T147 [P] Add frontend loading/empty/error state consistency helpers in `frontend/src/components/state/page-state.tsx`
- [X] T148 Harden XSS sanitization for rich text fields in `backend/src/common/security/content-sanitizer.ts`
- [X] T149 Add CSRF integration tests in `backend/tests/integration/csrf.int.spec.ts`
- [X] T150 Add end-to-end regression suite for role matrix in `frontend/tests/e2e/role-matrix.spec.ts`
- [X] T151 Verify quickstart command accuracy and update instructions in `specs/001-jira-lite-rbac/quickstart.md`
- [X] T152 Add performance smoke tests for issue list and audit query in `backend/tests/integration/performance-smoke.int.spec.ts`
- [X] T153 Add observability checklist and log field contract in `docs/observability/jira-lite-observability.md`
- [X] T154 Add migration rollback rehearsal script in `backend/scripts/migration-rollback-check.sh`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies, starts immediately.
- Foundational (Phase 2): Depends on Setup completion, blocks all user stories.
- User Stories (Phase 3-6): Depend on Foundational completion.
- Polish (Phase 7): Depends on completion of User Stories 1-4.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2, no dependency on other user stories.
- **US2 (P1)**: Starts after Phase 2, independent from US1 but can reuse auth/session context.
- **US3 (P2)**: Starts after Phase 2, independent delivery possible with shared infra.
- **US4 (P2)**: Starts after Phase 2, depends functionally on entities/actions created by US2/US3 for full audit coverage.

### Within Each User Story

- Tests first (contract/integration/unit/E2E) and fail before implementation.
- Repository/model tasks before service tasks.
- Service tasks before controller/page tasks.
- UI integration after API client and contract availability.

### Parallel Opportunities

- Setup tasks marked `[P]` can run together.
- Foundational guard/observability/frontend-core tasks marked `[P]` can run together.
- After Phase 2, US1/US2/US3 can proceed in parallel by separate developers.
- US4 can start in parallel for read-only/audit backend scaffolding, then integrate with completed write flows.

---

## Parallel Example: User Story 1

```bash
Task: T035 backend/tests/contract/auth.contract.spec.ts
Task: T036 backend/tests/contract/invites.contract.spec.ts
Task: T039 frontend/tests/unit/navigation-visibility.spec.tsx
Task: T040 frontend/tests/e2e/login-return-url.spec.ts
```

## Parallel Example: User Story 2

```bash
Task: T060 backend/tests/unit/issue-key-generator.spec.ts
Task: T061 backend/tests/unit/workflow-transition.spec.ts
Task: T071 backend/src/modules/issues/issues.repository.ts
Task: T086 frontend/src/services/issues/issues-api.ts
```

## Parallel Example: User Story 3

```bash
Task: T097 backend/tests/contract/platform-orgs.contract.spec.ts
Task: T103 backend/src/modules/organizations/platform-orgs.repository.ts
Task: T115 frontend/src/services/platform/platform-api.ts
Task: T118 frontend/src/app/platform/orgs/page.tsx
```

## Parallel Example: User Story 4

```bash
Task: T123 backend/tests/contract/read-only.contract.spec.ts
Task: T124 backend/tests/contract/audit.contract.spec.ts
Task: T139 frontend/src/services/audit/audit-api.ts
Task: T142 frontend/src/components/state/read-only-banner.tsx
```

---

## Implementation Strategy

### Full-System Delivery (Requested Scope)

1. Complete Phase 1 and Phase 2 as shared foundation.
2. Deliver US1 and US2 to establish secure access and core issue lifecycle.
3. Deliver US3 for full administration capabilities.
4. Deliver US4 for read-only governance and audit traceability.
5. Execute Phase 7 hardening and regression before release.

### MVP First (Reference Only)

1. Phase 1 + Phase 2
2. US1 only
3. Validate and demo

### Incremental Delivery

1. Foundation complete.
2. Ship US1 + tests.
3. Ship US2 + tests.
4. Ship US3 + tests.
5. Ship US4 + tests.
6. Finish polish and release readiness checks.

### Parallel Team Strategy

1. Team A: Backend domain modules and contracts.
2. Team B: Frontend pages/components and UX states.
3. Team C: Automated tests and non-functional hardening.
4. Integrate by phase checkpoints and contract version pinning.

---

## Notes

- `[P]` tasks are parallel-safe by file boundary and dependency ordering.
- Every user story includes logic + UI + tests for complete-system delivery.
- Core domain rules include unit/integration/contract tests; E2E covers role flows and state transitions.
- Commit by logical slice (repository/service/controller/page/tests) and verify checkpoint before progressing.
