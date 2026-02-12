# Phase 1 Data Model: 內部文件審核與簽核系統

**Branch**: 001-document-review-approval
**Date**: 2026-02-02
**Source**: [spec.md](spec.md)

本文件描述「概念資料模型」與必須由資料層/服務層共同保證的約束（不可變、一次性任務、狀態機）。實作時以 Prisma + SQLite 落地。

---

## Entity: User

### Fields

- `id`: UUID (PK)
- `email`: string (unique, required)
- `password_hash`: string (required)
- `role`: enum `User | Reviewer | Admin` (required)
- `created_at`: datetime (required)

### Constraints

- `email` must be unique.
- `role` is mutually exclusive.

---

## Entity: Document

### Fields

- `id`: UUID (PK)
- `title`: string (required, max 120)
- `status`: enum `Draft | Submitted | InReview | Rejected | Approved | Archived` (required)
- `owner_id`: UUID (FK → User.id, required)
- `current_version_id`: UUID (FK → DocumentVersion.id, required)
- `created_at`: datetime (required)
- `updated_at`: datetime (required)

### Relationships

- User (owner) 1:N Document
- Document 1:N DocumentVersion
- Document 1:N ReviewTask
- Document 1:N ApprovalRecord

### Invariants

- `current_version_id` must always reference a `DocumentVersion` belonging to this `Document`.
- Mutability:
  - Only when `status=Draft` may title/content be changed (by owner or Admin).
  - When `status!=Draft`, content and attachments are read-only.

### State Transitions (strict)

Allowed transitions only:

- `Draft → Submitted` (User: owner/Admin)
- `Submitted → InReview` (System)
- `InReview → Rejected` (Reviewer via task)
- `InReview → Approved` (System after all required approvals)
- `Rejected → Draft` (User: owner/Admin)
- `Approved → Archived` (Admin)

---

## Entity: DocumentVersion

### Fields

- `id`: UUID (PK)
- `document_id`: UUID (FK → Document.id, required)
- `version_no`: int (required, increasing)
- `content`: text (required)
- `created_at`: datetime (required)

### Constraints

- Unique: `(document_id, version_no)`
- Version number must strictly increase per document.

### Versioning rules

- When `Document.status=Draft`: `current_version_id` points to the current draft version (content mutable).
- On submit: create a new locked version with `version_no+1` and point `current_version_id` to it.
- When `Rejected`: `current_version_id` remains pointing to rejected locked version (read-only).
- When `Rejected → Draft`: create a new draft version with `version_no+1` seeded from rejected locked content and set `current_version_id` to it.

---

## Entity: Attachment

### Fields

- `id`: UUID (PK)
- `document_version_id`: UUID (FK → DocumentVersion.id, required)
- `filename`: string (required)
- `content_type`: string (required)
- `size_bytes`: int (required)
- `storage_key`: string (required)
- `created_at`: datetime (required)

### Constraints & Invariants

- Append-only: no updates or deletes.
- Only allowed to create when owning document is currently `Draft` AND `document_version_id == Document.current_version_id`.
- Immutability enforcement:
  - `storage_key` must uniquely identify immutable content.
  - Files must be written with a no-overwrite strategy (create-new).

---

## Entity: ApprovalFlowTemplate

### Fields

- `id`: UUID (PK)
- `name`: string (required)
- `is_active`: boolean (required)
- `created_at`: datetime
- `updated_at`: datetime

### Constraints

- Only Admin can create/edit/deactivate.

---

## Entity: ApprovalFlowStep

### Fields

- `id`: UUID (PK)
- `template_id`: UUID (FK → ApprovalFlowTemplate.id, required)
- `step_key`: string (required, unique within template)
- `order_index`: int (required; smaller first)
- `mode`: enum `Serial | Parallel` (required)

### Additional (design-required but not in base spec)

因 spec 表示「每 step 必須能對應一或多位 Reviewer」，資料層需要一個關聯以保存 assignees：

- Option A (recommended): `ApprovalFlowStepAssignee(step_id, assignee_id)` join table
- Option B: store assignees in JSON column (not ideal for SQLite querying)

本計畫採 Option A。

### Constraints

- Unique: `(template_id, step_key)`
- Template usable for submit only if:
  - `is_active=true`
  - has at least 1 step
  - every step has at least 1 assignee

---

## Entity: ReviewTask

### Fields

- `id`: UUID (PK)
- `document_id`: UUID (FK → Document.id, required)
- `document_version_id`: UUID (FK → DocumentVersion.id, required; locked submit version)
- `assignee_id`: UUID (FK → User.id, required)
- `step_key`: string (required)
- `mode`: enum `Serial | Parallel` (required)
- `status`: enum `Pending | Approved | Rejected | Cancelled` (required)
- `acted_at`: datetime (optional)
- `created_at`: datetime (required)

### Constraints & Invariants

- A `Pending` task can be acted exactly once.
- Only the assignee can act.
- When any task rejects → all other `Pending` tasks for the document become `Cancelled`.

### Serial vs Parallel semantics

- Serial:
  - At any time, only current step tasks exist as `Pending`.
  - Next step tasks are created/enabled only after the current step is fully approved.
- Parallel:
  - Multiple `Pending` tasks can exist for the same step.
  - The step completes only when all tasks in that step are `Approved`.

---

## Entity: ApprovalRecord (append-only)

### Fields

- `id`: UUID (PK)
- `document_id`: UUID (FK → Document.id, required)
- `document_version_id`: UUID (FK → DocumentVersion.id, required)
- `review_task_id`: UUID (FK → ReviewTask.id, required)
- `actor_id`: UUID (FK → User.id, required)
- `action`: enum `Approved | Rejected` (required)
- `reason`: text (required when `action=Rejected`)
- `created_at`: datetime (required)

### Constraints

- Unique: `review_task_id` (enforces 0..1 record per task)
- Append-only.

---

## Entity: AuditLog (append-only)

### Fields

- `id`: UUID (PK)
- `actor_id`: UUID (FK → User.id, required)
- `action`: string (required)
- `entity_type`: string (required)
- `entity_id`: UUID (required)
- `metadata_json`: text (required)
- `created_at`: datetime (required)

### Constraints

- Append-only.
- Must be written for all key actions; write failure must fail the main action (no “state changed without audit”).

---

## Query & Index Suggestions (SQLite)

- Document list: index on `(owner_id, updated_at)` for User list; index on `(updated_at)` for Admin list.
- Review tasks: index on `(assignee_id, status, created_at)` for `/reviews`.
- Review tasks by document: index on `(document_id, status)`.
- Versions: unique `(document_id, version_no)`.

---

## Authorization Model (object-level)

- User
  - Can read/write own documents subject to state rules.
- Reviewer
  - Can read a document only if exists at least one ReviewTask with `assignee_id=self` for that document.
  - If no association, return 404 to avoid existence leak.
- Admin
  - Full read; writes only where state machine permits (archive; flow admin; also can create/edit drafts).
