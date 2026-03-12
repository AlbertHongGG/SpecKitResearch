# Phase 1 資料模型設計（Jira Lite）

## 設計原則

- 所有 tenant data 必須可追溯 `organization_id`。
- Role 與 membership 分離：Platform/Org/Project 不互推。
- 所有可變更實體需具備審計事件（before/after）。
- Issue 寫入採 optimistic concurrency（`updated_at`）。

## Entities

### 1. User
- 主鍵: `id`
- 唯一: `email`
- 欄位: `password_hash`, `display_name`, `created_at`, `last_login_at?`
- 驗證: email RFC 格式、密碼不存明文

### 2. PlatformRole
- 複合唯一: (`user_id`, `role`)
- 角色: `platform_admin`
- 關聯: N:1 User

### 3. Organization
- 主鍵: `id`
- 欄位: `name`, `plan(free|paid)`, `status(active|suspended)`, `created_by_user_id`, `created_at`
- 不變式: suspended 僅允許讀取

### 4. OrganizationMembership
- 主鍵: `id`
- 唯一: (`organization_id`, `user_id`)
- 欄位: `org_role(org_admin|org_member)`, `status(active|removed)`, `created_at`
- 不變式: removed 視同非成員（存在性策略回 404）

### 5. OrganizationInvite
- 主鍵: `id`
- 唯一: `token`
- 欄位: `organization_id`, `email`, `expires_at`, `accepted_at?`, `invited_by_user_id`
- 不變式: token 單次使用，`accepted_at` 後不可再用

### 6. Project
- 主鍵: `id`
- 唯一: (`organization_id`, `key`)
- 欄位: `name`, `type(scrum|kanban)`, `status(active|archived)`, `created_by_user_id`, `created_at`
- 不變式: `archived` 不可逆

### 7. ProjectMembership
- 主鍵: `id`
- 唯一: (`project_id`, `user_id`)
- 欄位: `project_role(project_manager|developer|viewer)`, `created_at`
- 約束: `user_id` 必須先是 Organization active 成員

### 8. ProjectIssueType
- 主鍵: `id`
- 唯一: (`project_id`, `type`)
- 欄位: `type(story|task|bug|epic)`, `is_enabled`

### 9. Workflow
- 主鍵: `id`
- 唯一: (`project_id`, `version`)
- 欄位: `name`, `version`, `is_active`, `created_at`, `created_by_user_id`
- 不變式: 每個 project 同時僅一個 active workflow

### 10. WorkflowStatus
- 主鍵: `id`
- 唯一: (`workflow_id`, `key`)
- 欄位: `name`, `position`

### 11. WorkflowTransition
- 主鍵: `id`
- 唯一: (`workflow_id`, `from_status_id`, `to_status_id`)
- 約束: from/to 狀態必須屬於同一 workflow

### 12. Sprint（Scrum only）
- 主鍵: `id`
- 唯一: (`project_id`, `name`)
- 欄位: `goal?`, `start_date?`, `end_date?`, `status(planned|active|closed)`
- 不變式: 轉換僅 `planned->active->closed`

### 13. Issue
- 主鍵: `id`
- 唯一: (`project_id`, `issue_key`)
- 欄位:
  - `type(story|task|bug|epic)`
  - `title` (required)
  - `description?`
  - `priority(low|medium|high|critical)`
  - `status_id`
  - `reporter_user_id`
  - `assignee_user_id?`
  - `due_date?`
  - `estimate?`
  - `sprint_id?`
  - `created_at`, `updated_at`
- 不變式:
  - status transition 必須存在於 active workflow transition
  - archived/suspended 狀態下不可寫
  - 更新需帶並驗證 `updated_at`

### 14. IssueLabel
- 主鍵: `id`
- 唯一: (`issue_id`, `label`)

### 15. IssueEpicLink
- 主鍵: `id`
- 唯一: (`epic_issue_id`, `child_issue_id`)
- 約束:
  - `epic_issue_id` 對應 Issue.type=epic
  - child 與 epic 必須同 project
  - 不可自我連結

### 16. IssueComment
- 主鍵: `id`
- 欄位: `issue_id`, `author_user_id`, `body`, `created_at`
- 權限: 僅 project_manager/developer

### 17. AuditLog
- 主鍵: `id`
- 查詢索引: (`organization_id`, `created_at`), (`project_id`, `created_at`), (`action`, `created_at`)
- 欄位:
  - `organization_id?`, `project_id?`
  - `actor_user_id?`, `actor_email`
  - `action`, `entity_type`, `entity_id`
  - `before_json?`, `after_json?`
  - `created_at`
- 不變式: 不可由一般使用者更新/刪除

## Relationship Summary

- Organization 1:N Project
- Organization 1:N OrganizationMembership / OrganizationInvite / AuditLog
- Project 1:N ProjectMembership / Issue / Sprint / Workflow / AuditLog
- Workflow 1:N WorkflowStatus / WorkflowTransition
- Issue 1:N IssueLabel / IssueComment
- Epic(Issue.type=epic) 1:N IssueEpicLink

## State Transitions（資料層）

### Organization
- `active -> suspended -> active`
- suspended 時任何寫入 transaction 應 fail with `ORG_SUSPENDED`

### Project
- `active -> archived`
- archived 後不可回復

### Sprint
- `planned -> active -> closed`

### Issue
- 欄位更新：需 OCC 驗證
- 狀態轉換：`from_status_id -> to_status_id` 必須存在 transition
- deprecated status：可讀不可轉換（`ISSUE_STATUS_DEPRECATED`）

## 索引與一致性建議

- `Issue(project_id, issue_key)` unique
- `Issue(project_id, updated_at)` for OCC checks
- `Project(organization_id, key)` unique
- `Workflow(project_id, is_active)` partial unique for active=1
- `AuditLog(organization_id, created_at desc)` and `AuditLog(project_id, created_at desc)`

## 稽核事件最小集合

- `organization_created`
- `organization_plan_changed`
- `organization_suspended`
- `organization_unsuspended`
- `member_invited`
- `member_joined`
- `member_removed`
- `project_created`
- `project_role_changed`
- `workflow_updated`
- `issue_created`
- `issue_updated`
- `issue_status_transition`
- `epic_link_added`
- `epic_link_removed`
- `comment_created`
- `sprint_started`
- `sprint_ended`
- `project_archived`
