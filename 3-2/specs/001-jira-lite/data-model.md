# Data Model: Jira Lite

本文件將 Feature Spec 的資料模型整理成「實作前可驗證的設計」，包含欄位約束、關聯、索引/唯一性，以及與 RBAC / 多租戶隔離相關的不變量。

## Global Invariants

- 所有屬於 Organization 的資料（Project、Issue、Sprint、Workflow、AuditLog…）都必須能追溯到 `organizationId`。
- 任何 API/查詢都必須以 `organizationId` 作為邊界約束（避免 IDOR / cross-tenant data leak）。
- Platform/Organization/Project 三層 RBAC 不可互相推導。

## Entities

### User

- **Fields**: `id`, `email (unique)`, `passwordHash`, `displayName`, `createdAt`, `lastLoginAt?`
- **Validation**: `email` 格式有效且唯一；密碼不得明文保存。

### PlatformRole

- **Fields**: `userId (FK User)`, `role = platform_admin`
- **Cardinality**: 一個 user 可有或沒有平台角色。

### Organization

- **Fields**: `id`, `name`, `plan (free|paid)`, `status (active|suspended)`, `createdAt`, `createdByUserId (FK User)`
- **Invariants**:
  - `status=suspended` 時：組織範圍寫入一律拒絕（ORG_SUSPENDED）。

### OrganizationMembership

- **Fields**: `id`, `organizationId (FK)`, `userId (FK)`, `orgRole (org_admin|org_member)`, `status (active|removed)`, `createdAt`
- **Uniqueness**: `(organizationId, userId)` 唯一（避免重複成員）。

### OrganizationInvite

- **Fields**: `id`, `organizationId (FK)`, `email`, `token (unique)`, `expiresAt`, `acceptedAt?`, `invitedByUserId (FK User)`
- **Invariants**:
  - `acceptedAt != null` → token 不可再次使用。
  - `expiresAt < now` → token 視為無效。

### Project

- **Fields**: `id`, `organizationId (FK)`, `key`, `name`, `type (scrum|kanban)`, `status (active|archived)`, `createdAt`, `createdByUserId (FK User)`
- **Uniqueness**: `(organizationId, key)` 唯一。
- **Immutability**: `archived` 不可回復為 `active`。

### ProjectMembership

- **Fields**: `id`, `projectId (FK)`, `userId (FK)`, `projectRole (project_manager|developer|viewer)`, `createdAt`
- **Uniqueness**: `(projectId, userId)` 唯一。
- **Tenant constraint**: `projectId` 所屬 organization 必須與該 user 的 org membership 一致。

### ProjectIssueType

- **Fields**: `id`, `projectId (FK)`, `type (story|task|bug|epic)`, `isEnabled`
- **Uniqueness**: `(projectId, type)` 唯一。

### Workflow

- **Fields**: `id`, `projectId (FK)`, `name`, `version (int)`, `isActive (bool)`, `createdAt`, `createdByUserId (FK User)`
- **Invariants**: 同一 `projectId` 僅允許一個 `isActive=true`。

### WorkflowStatus

- **Fields**: `id`, `workflowId (FK)`, `key`, `name`, `position (int)`
- **Uniqueness**: `(workflowId, key)` 唯一。

### WorkflowTransition

- **Fields**: `id`, `workflowId (FK)`, `fromStatusId (FK WorkflowStatus)`, `toStatusId (FK WorkflowStatus)`
- **Uniqueness**: `(workflowId, fromStatusId, toStatusId)` 唯一。

### Sprint (Scrum only)

- **Fields**: `id`, `projectId (FK)`, `name`, `goal?`, `startDate?`, `endDate?`, `status (planned|active|closed)`
- **State transitions**: `planned → active → closed`。

### Issue

- **Fields**:
  - Identity: `id`, `projectId (FK)`
  - Human key: `issueKey`（例：`PROJ-123`）
  - Type: `type (story|task|bug|epic)`
  - Content: `title`, `description?`
  - Priority: `priority (low|medium|high|critical)`
  - Status: `statusId (FK WorkflowStatus)`
  - People: `reporterUserId (FK User)`, `assigneeUserId? (FK User)`
  - Planning: `dueDate?`, `estimate?`, `sprintId? (FK Sprint)`
  - Concurrency: `updatedAt`, `createdAt`
- **Uniqueness**: `(projectId, issueKey)` 唯一。
- **Workflow invariant**:
  - Issue 的 `statusId` 可能屬於非 active workflow（歷史狀態）；此時視為 deprecated，禁止狀態轉換（ISSUE_STATUS_DEPRECATED）。

### IssueLabel

- **Fields**: `id`, `issueId (FK Issue)`, `label`
- **Uniqueness**: `(issueId, label)` 唯一（避免重複 label）。

### IssueEpicLink

- **Fields**: `id`, `epicIssueId (FK Issue)`, `childIssueId (FK Issue)`
- **Invariants**:
  - `epicIssueId` 必須引用 `Issue.type=epic`。
  - `(epicIssueId, childIssueId)` 唯一。

### IssueComment

- **Fields**: `id`, `issueId (FK Issue)`, `authorUserId (FK User)`, `body`, `createdAt`
- **Validation**: `body` 非空；Viewer 不可留言。

### AuditLog

- **Fields**: `id`, `organizationId?`, `projectId?`, `actorUserId?`, `actorEmail`, `action`, `entityType`, `entityId`, `beforeJson?`, `afterJson?`, `createdAt`
- **Invariants**:
  - append-only（不提供一般使用者修改/刪除）。
  - `organizationId`/`projectId` 必須與事件主體一致（可用於 scope 查詢）。

## Additional Design Entity (for FR-011)

### ProjectIssueCounter

> 目的：以 transaction + 原子遞增確保 issue key 的序號在併發下不重複。

- **Fields**: `projectId (PK/FK Project)`, `nextNumber (int)`
- **Invariants**:
  - 每次建立 Issue 時，在同一 transaction 中先 `nextNumber += 1` 取得新序號，再建立 Issue。
  - 需搭配唯一約束（例如 `(projectId, issueKey)`）作為最後防線。

## Indexing Guidelines (minimum)

- `OrganizationMembership(organizationId, userId)` unique
- `Project(organizationId, key)` unique
- `ProjectMembership(projectId, userId)` unique
- `Workflow(projectId, isActive)` (enforce single active)
- `Issue(projectId, issueKey)` unique
- `AuditLog(organizationId, createdAt)` index（org audit timeline）
- `AuditLog(projectId, createdAt)` index（project audit timeline）
