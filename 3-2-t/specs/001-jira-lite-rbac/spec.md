# Feature Specification: Enterprise Jira Lite RBAC Tracking

**Feature Branch**: `001-jira-lite-rbac`  
**Created**: 2026-03-08  
**Status**: Draft  
**Input**: User description: "Jira Lite（Multi-Tenant Project & Issue Tracking System）企業級規格，含多層 RBAC、Workflow、Scrum/Kanban、稽核與完整頁面狀態機"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Secure Multi-Tenant Access (Priority: P1)

As a platform user, I can only see and operate data that belongs to my authorized organization and project scopes, with strict separation between platform, organization, and project roles.

**Why this priority**: Tenant isolation and authorization correctness are the baseline for enterprise adoption and legal/compliance trust.

**Independent Test**: Can be fully tested by creating two organizations with overlapping users and verifying all protected routes and APIs return expected `401/403/404` behavior with no cross-tenant leakage.

**Acceptance Scenarios**:

1. **Given** a logged-in user not in target organization, **When** they request `/orgs/:orgId*` or `/projects/:projectId*`, **Then** the system returns `404` under existence-hiding policy and reveals no resource details.
2. **Given** a logged-in project member with insufficient role, **When** they perform a write action (for example updating workflow), **Then** the system returns `403` and the UI hides or disables the action entry point.
3. **Given** an unauthenticated user, **When** they access protected routes, **Then** the system returns `401` and redirects to `/login` with a safe, in-site `returnUrl`.

---

### User Story 2 - Issue Lifecycle Governance (Priority: P1)

As a project team member, I can create, assign, transition, and trace issues according to project workflow rules, while preserving auditability and consistency.

**Why this priority**: Issue lifecycle integrity is the primary business value of a Jira-like system.

**Independent Test**: Can be fully tested within one project by configuring workflow, creating issue types, executing valid/invalid transitions, and validating timeline and audit events.

**Acceptance Scenarios**:

1. **Given** an active project with active workflow, **When** Project Manager or authorized Developer creates and updates an issue, **Then** issue fields and `issue_key` are persisted with required validations.
2. **Given** a transition not defined in workflow, **When** a user tries to move status, **Then** the request is rejected and status remains unchanged.
3. **Given** workflow changes that deprecate an existing status, **When** an issue remains in deprecated status, **Then** issue is still viewable but further transition is blocked with `ISSUE_STATUS_DEPRECATED`.

---

### User Story 3 - Org and Platform Administration (Priority: P2)

As Platform Admin and Org Admin, I can manage organizations, members, projects, and roles through scope-correct permissions without inheriting unrelated lower-scope powers.

**Why this priority**: Enterprise operations require delegated administration with strict scope boundaries.

**Independent Test**: Can be fully tested by creating organizations, inviting users, assigning org/project roles, and confirming role visibility and operation boundaries.

**Acceptance Scenarios**:

1. **Given** Platform Admin, **When** creating or suspending an organization, **Then** organization status and plan update and are audit logged.
2. **Given** Org Admin without Project membership, **When** trying project-manager-only operations, **Then** operation is rejected until explicit project role assignment is granted.
3. **Given** Org Member role, **When** visiting org pages, **Then** they can view project lists but cannot access member management or org audit pages.

---

### User Story 4 - Read-Only Safeguards and Auditability (Priority: P2)

As an auditor or manager, I can trust that suspended organizations and archived projects become read-only immediately, and all critical actions are traceable by who/when/what.

**Why this priority**: Governance and compliance require immutable records and enforceable read-only controls.

**Independent Test**: Can be fully tested by toggling organization status and archiving projects, then attempting all write operations and validating audit trail completeness.

**Acceptance Scenarios**:

1. **Given** organization status `suspended`, **When** any write operation is attempted, **Then** system rejects with `403` and `ORG_SUSPENDED` while allowing reads.
2. **Given** project status `archived`, **When** issue edit/transition/comment/sprint operations are attempted, **Then** system rejects with `403` and `PROJECT_ARCHIVED`.
3. **Given** critical operations (invite, role change, workflow update, archive), **When** they succeed, **Then** audit entries include actor, timestamp, action, entity, and before/after snapshots.

### Edge Cases

- Accept-invite token is expired, already used, or bound to another email identity.
- Membership is revoked between page load and action submission.
- Concurrent issue updates from two users produce conflict and one submission must fail deterministically.
- Workflow update removes a status currently in use by existing issues.
- User attempts direct URL access to pages hidden in navigation.
- Project key collision under same organization during parallel project creation.
- Issue key generation under concurrent issue creation in one project.
- Scrum-only routes requested from Kanban projects.
- Retry after network/server error must not create duplicate writes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST support the role model and scope separation exactly as: Guest (unauthenticated), Platform Admin (platform scope), Org Admin/Org Member (organization scope), Project Manager/Developer/Viewer (project scope).
- **FR-002**: System MUST evaluate authorization by target resource scope per request and MUST NOT infer project privileges from platform or organization roles.
- **FR-003**: System MUST support email/password login, logout, and authenticated session continuity, and MUST identify current user on every protected request.
- **FR-004**: System MUST support organization invite acceptance with token constraints: bound organization, expiry, single-use, and accepted timestamp recording.
- **FR-005**: System MUST enforce email identity matching on invite acceptance; mismatched logged-in email must be rejected.
- **FR-006**: System MUST return `401` for unauthenticated protected access and redirect UI to `/login` with safe in-site return URL.
- **FR-007**: System MUST enforce tenant isolation so users cannot access cross-organization resources by guessed identifiers.
- **FR-008**: System MUST enforce existence-hiding semantics: non-members accessing org/project scoped resources receive `404`; members lacking action privilege receive `403`.
- **FR-009**: System MUST support organization lifecycle management with statuses `active` and `suspended`, and plans `free` and `paid`.
- **FR-010**: Platform Admin MUST be able to create organizations and set plan/status, including suspend/unsuspend.
- **FR-011**: Org Admin MUST be able to invite/manage organization members, create/manage projects, and view organization audit logs.
- **FR-012**: Org Member MUST be able to view organization overview and projects but MUST NOT manage members, projects, or org audit.
- **FR-013**: System MUST enforce organization suspended read-only mode for all writes with `403` and `ORG_SUSPENDED`.
- **FR-014**: System MUST support project types `scrum` and `kanban`, with project key uniqueness within organization.
- **FR-015**: System MUST support project membership and project roles assignment only for organization members.
- **FR-016**: System MUST support project settings for issue types and workflow, with workflow history/version retention.
- **FR-017**: System MUST support project status `active` and irreversible `archived`.
- **FR-018**: System MUST reject all project write actions after archive with `403` and `PROJECT_ARCHIVED`.
- **FR-019**: System MUST support issue types story/task/bug/epic and required issue fields/validations as defined in scope.
- **FR-020**: System MUST generate readable issue keys unique within project, with server-guaranteed monotonic sequence under concurrency.
- **FR-021**: System MUST support issue list sorting by at least `created_at` and `updated_at`.
- **FR-022**: System MUST enforce workflow status transitions server-side and reject invalid transitions.
- **FR-023**: System MUST keep issues visible if their status becomes deprecated by workflow changes, while blocking further transitions with `ISSUE_STATUS_DEPRECATED`.
- **FR-024**: System MUST support epic-child issue linking without mutating child issue status.
- **FR-025**: System MUST allow comments by Project Manager and Developer only; Viewer cannot comment.
- **FR-026**: System MUST support Scrum sprint lifecycle (planned/active/closed), backlog planning, and issue-sprint membership updates.
- **FR-027**: System MUST map Kanban board columns to workflow statuses and permit status updates only through legal transitions.
- **FR-028**: System MUST provide required page inventory and route access rules for `/login`, `/invite/:token`, `/orgs*`, `/platform*`, `/projects*` paths.
- **FR-029**: System MUST enforce navigation visibility rules so unauthorized entries are hidden, not merely click-to-fail.
- **FR-030**: System MUST provide loading/empty/error states consistently for all primary list/detail/settings pages.
- **FR-031**: System MUST implement optimistic concurrency for issue writes and return `409` with `CONFLICT` on stale updates.
- **FR-032**: System MUST prevent duplicate writes on resubmission/retry by requiring in-flight submission lock in UI and idempotent server behavior where applicable.
- **FR-033**: System MUST record immutable audit logs for critical actions including issue lifecycle, role/membership changes, suspend/archive events, and workflow/config changes.
- **FR-034**: System MUST ensure audit records include who/when/what with before/after payload for state-changing operations.

### Data Contract & API Semantics *(mandatory if feature has frontend/backend or external integration)*

- **Contract**: Authentication session contract.
  Request: login with `email`, `password`; logout with current session context.
  Response: authenticated user identity and session establishment/termination confirmation.
- **Contract**: Invite acceptance contract.
  Request: `token`, optional account setup fields when user does not exist.
  Response: invite validation result, membership creation result, and post-accept navigation mode (auto-login or login required).
- **Contract**: Organization/project guarded resource contract.
  Request: route/resource identifiers with authenticated context.
  Response: scope-filtered resource content only when membership and role checks pass.
- **Contract**: Issue create/update contract.
  Request: issue fields plus concurrency token/value for updates.
  Response: canonical issue representation including stable `issue_key`, timestamps, and latest status.
- **Contract**: Workflow transition contract.
  Request: target transition and current issue state context.
  Response: accepted transition with new state or deterministic rejection reason.
- **Contract**: Audit query contract (org/platform scope).
  Request: scope and optional filters.
  Response: ordered event stream including actor identity, action, entity, timestamp, before/after snapshots.
- **Errors**:
  `401` -> unauthenticated -> redirect to `/login` with validated in-site return URL.
  `403` -> authenticated but forbidden (including `ORG_SUSPENDED`, `PROJECT_ARCHIVED`, `ISSUE_STATUS_DEPRECATED`) -> show forbidden/read-only messaging and disable write CTAs.
  `404` -> non-member or non-existent hidden resource -> show not found without existence disclosure.
  `409` (`CONFLICT`) -> optimistic concurrency conflict -> prompt reload/merge retry.
  `5xx` -> transient system failure -> show retryable error state.

### State Transitions & Invariants *(mandatory if feature changes state/data)*

This feature adopts and must comply with the provided transition hierarchy:
- Global App State -> Page State Machine -> Role-specific Page State -> Feature/Function State Machine.

Referenced transition sets included in scope:
- Global and page-level: 1-16.
- Role-specific page behavior: 17-29.
- Cross-feature and domain state machines: 30-45.

State invariants:
- **Invariant**: Every protected request is evaluated in strict order: authentication -> membership/visibility policy -> role permission -> read-only policy.
- **Invariant**: Scope boundaries are immutable at evaluation time: Platform, Organization, and Project permissions are independent.
- **Invariant**: Organization `suspended` allows read operations but blocks every write operation in that organization.
- **Invariant**: Project `archived` is irreversible and blocks every project/issue write operation permanently.
- **Invariant**: Workflow transitions are legal only if explicitly defined in active workflow transition set.
- **Invariant**: Deprecated issue status remains viewable but not transitionable.
- **Invariant**: Viewer role is always read-only for project and issue operations.
- **Invariant**: Hidden navigation entries must not appear for unauthorized users.

Critical transitions:
- **Transition**: Given guest user, when requesting protected route, then return `401` and route to login with safe return URL.
- **Transition**: Given authenticated non-member, when requesting org/project resource, then return `404` under existence-hiding policy.
- **Transition**: Given member with insufficient role, when requesting privileged write action, then return `403`.
- **Transition**: Given active project, when archive is confirmed by authorized role, then project becomes archived and remains archived.
- **Transition**: Given legal workflow transition request, when validated, then issue status and audit timeline update atomically.
- **Transition**: Given invalid/deprecated transition request, when validated, then operation rejects and issue status remains unchanged.

### Failure Modes & Recovery *(mandatory)*

- **Failure mode**: Login failure (`401`) due to wrong credentials.
  **Recovery**: Keep user on login page, show actionable message, allow retry without losing entered email.
- **Failure mode**: Invite token invalid/expired/used.
  **Recovery**: Show deterministic token status, block acceptance action, provide path back to login or re-invite workflow.
- **Failure mode**: Write attempt during org suspended/project archived state.
  **Recovery**: Reject with explicit code (`ORG_SUSPENDED` or `PROJECT_ARCHIVED`), preserve existing data, switch UI to read-only indicators.
- **Failure mode**: Workflow transition invalid or status deprecated.
  **Recovery**: Reject request, keep original status, display correction guidance.
- **Failure mode**: Optimistic concurrency conflict on issue update.
  **Recovery**: Return `409 CONFLICT`, preserve user draft for reconciliation, reload latest issue snapshot.
- **Failure mode**: Network/service failure (`5xx`).
  **Recovery**: Render retry state with preserved navigation context (organization/project).
- **Failure mode**: Duplicate submission from repeated click/retry.
  **Recovery**: Disable primary submit CTA while pending; enforce non-duplication semantics for state-changing operations.

### Security & Permissions *(mandatory)*

- **Authentication**: Required for all non-guest routes and APIs; session-backed identity must be available server-side on every protected request.
- **Authorization**: RBAC with strict scope isolation across platform, organization, and project; authorization checks enforced server-side for every read/write action.
- **Sensitive data**: Password material, invite tokens, session credentials, and tenant-scoped resources must never be exposed across tenants or in unsafe logs.
- **Data isolation**: Every domain object must resolve to organization tenant context and reject cross-tenant access attempts.
- **Output safety**: User-authored content (issue fields/comments) must be safely rendered to prevent script injection.

### Observability *(mandatory)*

- **Logging**: Security-relevant and domain-critical events are logged, including auth outcomes, invite acceptance, role/membership changes, workflow/config changes, issue lifecycle changes, and read-only policy rejections.
- **Tracing**: Requests carry correlation identifiers across route handling and state-changing operations for cross-service troubleshooting.
- **User-facing errors**: Error surfaces are consistent by class (`401/403/404/409/5xx`) with clear next steps.
- **Developer diagnostics**: Domain error codes (`ORG_SUSPENDED`, `PROJECT_ARCHIVED`, `ISSUE_STATUS_DEPRECATED`, `CONFLICT`) are emitted for operational debugging.

### Backward Compatibility & Change Risk *(mandatory)*

- **Breaking change?**: Yes, for teams migrating from single-tenant or simpler role models.
- **Migration plan**:
  1. Map existing users into organization and project memberships.
  2. Backfill tenant identifiers and audit fields for historical records where available.
  3. Introduce route guards and navigation visibility enforcement before enabling write actions.
  4. Roll out workflow validation and optimistic concurrency with staged monitoring.
- **Rollback plan**:
  1. Freeze write operations for affected modules.
  2. Revert to previous permission policy snapshot and navigation rules.
  3. Reconcile audit events generated during rollback window.

### Performance & Scale Assumptions *(mandatory)*

- **Growth assumption**: System serves many organizations, each with multiple projects and high-volume issue/comment activity.
- **Constraints**:
  - Primary navigation pages should load in under 2 seconds for typical organization/project sizes.
  - User-triggered state changes (issue update, transition, comment) should confirm within 1 second in normal conditions.
  - Audit queries should return first page of results within 3 seconds under common filters.

### Key Entities *(include if feature involves data)*

- **User**: Authenticated identity with unique email and profile metadata.
- **PlatformRole**: Platform-scope authority assignment.
- **Organization**: Tenant boundary with plan and status lifecycle.
- **OrganizationMembership**: User-to-organization access and organization role.
- **OrganizationInvite**: Time-bound, single-use invitation artifact for membership onboarding.
- **Project**: Work container under one organization, typed as Scrum or Kanban, with immutable archived state.
- **ProjectMembership**: User-to-project role assignment.
- **Workflow / WorkflowStatus / WorkflowTransition**: Configurable status graph and versioned transition rules per project.
- **ProjectIssueType**: Enabled/disabled issue type configuration per project.
- **Issue**: Core tracked work item with typed fields, assignee/reporter, workflow status, and issue key.
- **IssueLabel / IssueComment / IssueEpicLink**: Issue metadata, discussion, and epic-child associations.
- **Sprint**: Scrum-only planning unit with planned/active/closed lifecycle.
- **AuditLog**: Immutable event record for actor, action, entity, and before/after state.

### Assumptions

- Invite expiration default duration is governed by organization policy and can be configured without changing role model.
- Organization switch page may display suspended organizations with explicit suspended badge.
- Route-level response policy follows strict consistency: `404` for non-membership visibility hiding, `403` for known-membership forbidden actions.
- Project settings page can contain role-specific sections (Org Admin membership section and Project Manager workflow section) while enforcing action-level authorization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of protected route checks return policy-correct outcomes (`401/403/404/200`) across defined role and membership test matrix.
- **SC-002**: 0 confirmed cross-organization data exposure incidents in authorization and IDOR test suites.
- **SC-003**: At least 99% of valid issue write operations complete successfully on first attempt, with all rejected writes returning explicit, correct error codes.
- **SC-004**: 100% of critical state changes listed in scope produce queryable audit records containing actor, timestamp, action, entity, and before/after snapshots.
- **SC-005**: In conflict simulation tests, 100% of stale issue updates are rejected with `409 CONFLICT` and no partial data corruption.
- **SC-006**: In suspended/archive policy tests, 100% of write attempts are blocked while 100% of authorized reads remain available.
