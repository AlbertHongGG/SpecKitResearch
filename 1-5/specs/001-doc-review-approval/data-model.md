# Phase 1 — Data Model（概念資料模型）

> 目標：以「可驗證的業務規則」描述資料實體、關聯、驗證與狀態轉換。此文件不等同於 ORM schema，但需足以導出 Prisma/SQLite schema。

## Entities

### User

- **Fields**
  - `id`: UUID
  - `email`: unique, required
  - `password_hash`: required
  - `role`: enum (`User` | `Reviewer` | `Admin`) — 互斥
  - `created_at`: required
- **Rules**
  - Email 唯一
  - 不回傳 `password_hash`

### Document

- **Fields**
  - `id`: UUID
  - `title`: string, required, max 120
  - `status`: enum (`Draft` | `Submitted` | `In Review` | `Rejected` | `Approved` | `Archived`)
  - `owner_id`: FK(User), required
  - `current_version_id`: FK(DocumentVersion), required
  - `flow_template_id`: FK(ApprovalFlowTemplate), nullable（Draft 可尚未選）
  - `created_at`, `updated_at`: required
- **Rules**
  - User 僅可存取 `owner_id = self`
  - Reviewer 僅可存取「存在 ReviewTask 關聯」之文件（否則 404）
  - Admin 可存取全部

### DocumentVersion

- **Fields**
  - `id`: UUID
  - `document_id`: FK(Document), required
  - `version_no`: int, required, strictly increasing per document
  - `content`: text, required
  - `kind`: enum (`Draft` | `SubmittedSnapshot`)（用於區分可改寫 Draft vs 鎖定版本）
  - `created_at`: required
- **Rules**
  - Unique: (`document_id`, `version_no`)
  - `kind=SubmittedSnapshot` 不可更新（immutability）
  - `current_version_id` 指向規則：
    - Draft → Draft 版本
    - In Review/Approved/Archived → SubmittedSnapshot
    - Rejected → 指向被退回的 SubmittedSnapshot（只讀）

### Attachment

- **Fields**
  - `id`: UUID
  - `document_version_id`: FK(DocumentVersion), required
  - `filename`: required
  - `content_type`: required
  - `size_bytes`: required
  - `storage_key`: required (immutable)
  - `created_at`: required
- **Rules**
  - 僅允許對「目前 Draft 版本」新增
  - 一旦建立不可被覆蓋替換（建議以 DB + 檔案 key 不可變實作）

### ApprovalFlowTemplate

- **Fields**
  - `id`: UUID
  - `name`: required
  - `is_active`: required
  - `created_at`, `updated_at`
- **Rules**
  - 僅 Admin 可建立/編輯/停用

### ApprovalFlowStep

- **Fields**
  - `id`: UUID
  - `template_id`: FK(ApprovalFlowTemplate)
  - `step_key`: string, required, unique per template
  - `order_index`: int, required
  - `mode`: enum (`Serial` | `Parallel`)
- **Rules**
  - 每步驟必須至少 1 位 assignee

### ApprovalFlowStepAssignee（新增：步驟指派）

- **Purpose**: 將「每個 step 對應一或多位 reviewer」正規化為關聯表
- **Fields**
  - `id`: UUID
  - `step_id`: FK(ApprovalFlowStep)
  - `reviewer_id`: FK(User)（role 必須為 Reviewer）
- **Rules**
  - Unique: (`step_id`, `reviewer_id`)

### ReviewTask

- **Fields**
  - `id`: UUID
  - `document_id`: FK(Document), required
  - `document_version_id`: FK(DocumentVersion), required（送審鎖定版本）
  - `assignee_id`: FK(User), required
  - `step_key`: required
  - `mode`: enum (`Serial` | `Parallel`)
  - `status`: enum (`Pending` | `Approved` | `Rejected` | `Cancelled`)
  - `acted_at`: datetime?
  - `created_at`: required
- **Rules**
  - Pending 只能成功處理一次（並發重送回 409）
  - 若任務退回導致文件 Rejected，其他 Pending 任務必須被 Cancelled

### ApprovalRecord（Append-only）

- **Fields**
  - `id`: UUID
  - `document_id`: FK(Document)
  - `document_version_id`: FK(DocumentVersion)
  - `review_task_id`: FK(ReviewTask) — unique（同一任務最多 1 筆）
  - `actor_id`: FK(User)
  - `action`: enum (`Approved` | `Rejected`)
  - `reason`: text?（Rejected 必填）
  - `created_at`: required
- **Rules**
  - Append-only：禁止 UPDATE/DELETE（DB triggers）

### AuditLog（Append-only）

- **Fields**
  - `id`: UUID
  - `actor_id`: FK(User)
  - `action`: string
  - `entity_type`: string
  - `entity_id`: UUID
  - `request_id`: string（冪等鍵/追蹤用）
  - `metadata_json`: text
  - `created_at`: required
- **Rules**
  - Append-only：禁止 UPDATE/DELETE（DB triggers）
  - 建議 Unique: (`entity_type`, `entity_id`, `request_id`) 防止重試重複寫入

## State Machine（文件狀態機）

### Legal transitions

- `Draft` → `Submitted`（User）
- `Submitted` → `In Review`（System）
- `In Review` → `Rejected`（Reviewer）
- `In Review` → `Approved`（System）
- `Rejected` → `Draft`（User）
- `Approved` → `Archived`（Admin）

### Transition invariants

- Draft 可編輯：僅 Draft 可更新 title/content、可新增附件
- 非 Draft 鎖定：`Submitted`/`In Review`/`Approved`/`Archived` 不可改寫內容或附件
- Rejected 只讀：維持指向被退回送審版本；重新開啟 Draft 需建立新 Draft version
- Reviewer anti-enumeration：Reviewer 無關聯 → 404

## Validation rules（摘要）

- `title`: required, max 120
- `content`: required on submit
- `flow_template_id`: required on submit, template 必須 active
- `steps`: submit 前必須至少 1 step，且每 step 至少 1 assignee
- `reject reason`: required
