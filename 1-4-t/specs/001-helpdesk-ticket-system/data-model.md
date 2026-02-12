# Data Model: 客服工單系統（Helpdesk / Ticket System）

**Branch**: `001-helpdesk-ticket-system`  
**Date**: 2026-02-01  
**Source of truth**: `specs/001-helpdesk-ticket-system/spec.md`

---

## Enumerations

### Role
- `Guest`（僅用於前端導覽/路由語意；DB 中的 User 不儲存 Guest）
- `Customer` / `Agent` / `Admin`

### TicketCategory
- `Account` / `Billing` / `Technical` / `Other`

### TicketStatus
- `Open` / `In Progress` / `Waiting for Customer` / `Resolved` / `Closed`

### AuditAction
- `TICKET_CREATED`
- `MESSAGE_CREATED`
- `STATUS_CHANGED`
- `ASSIGNEE_CHANGED`

---

## Entities

### User
**Fields**
- `id: UUID (PK)`
- `email: string (unique)`
- `password_hash: string`
- `role: enum(Role)`（互斥）
- `is_active: boolean`
- `created_at: datetime`
- `updated_at: datetime`

**Validation rules**
- `email` 必須唯一
- `is_active=false` 時不得登入；既有 token 在下一次驗證時視為無效（401）

**Indexes**
- unique index: `email`

---

### Ticket
**Fields**
- `id: UUID (PK)`
- `title: string`（必填，≤ 100；建立後不可修改）
- `category: enum(TicketCategory)`（必填；建立後不可修改）
- `status: enum(TicketStatus)`（必填）
- `customer_id: UUID (FK -> User.id)`（必填）
- `assignee_id: UUID (FK -> User.id, nullable)`
- `created_at: datetime`
- `updated_at: datetime`
- `closed_at: datetime (nullable)`

**Derived / invariants**
- 建立時：`status=Open`、`assignee_id=null`、`closed_at=null`
- `Closed` 為終態：不得再新增留言/內部備註、不得再改狀態、不得再改指派
- `updated_at` 需在以下事件更新：
  - 新增任何留言（公開/內部）
  - 狀態變更
  - 指派變更

**Concurrency & atomicity**
- 重要更新採「條件式原子更新」：`WHERE id=? AND status=? ...`，避免競態造成非法轉換
- 接手（take）必須同時更新 `assignee_id` 與 `status`，並同交易寫入 AuditLog

**Indexes**
- index: `customer_id`
- index: `assignee_id`
- index: `status`
- index: `updated_at`

---

### TicketMessage
**Fields**
- `id: UUID (PK)`
- `ticket_id: UUID (FK -> Ticket.id)`
- `author_id: UUID (FK -> User.id)`
- `role: enum(Role without Guest)`（`Customer`/`Agent`/`Admin`）
- `content: text`
- `is_internal: boolean`
- `created_at: datetime`

**Immutability**
- append-only：不可編輯、不可刪除

**Visibility**
- `is_internal=true`：僅 Agent/Admin 可見，Customer 不可見

**Validation / business rules**
- `Closed` ticket：禁止新增任何 message
- Customer message：僅允許在 `Waiting for Customer`，且成功新增後 ticket.status 需回到 `In Progress`

**Indexes**
- composite index: `(ticket_id, created_at)`

---

### AuditLog
**Fields**
- `id: UUID (PK)`
- `entity_type: enum('Ticket'|'TicketMessage')`
- `entity_id: UUID`
- `action: enum(AuditAction)`
- `actor_id: UUID (FK -> User.id)`
- `metadata_json: text`（JSON string；before/after 結構）
- `created_at: datetime`

**Immutability**
- append-only：不可編輯、不可刪除

**Metadata schema（建議）**

```json
{
  "ticket_id": "...",
  "before": { "status": "Open", "assignee_id": null },
  "after":  { "status": "In Progress", "assignee_id": "..." },
  "message": { "id": "...", "is_internal": false }
}
```

**Indexes**
- composite index: `(entity_type, entity_id, created_at)`

---

## State transitions（Ticket）

允許集合（含本期決策：取消接手回 Open）：

- `Open` → `In Progress`（Agent/Admin）
- `In Progress` → `Waiting for Customer`（Agent）
- `Waiting for Customer` → `In Progress`（Customer message 成功）
- `In Progress` → `Resolved`（Agent）
- `Resolved` → `Closed`（Customer/Admin）
- `Resolved` → `In Progress`（Agent/Admin）
- `In Progress` → `Open`（cancel take：目前 assignee 的 Agent）

狀態轉換與指派/留言寫入必須：更新 Ticket + append AuditLog（同交易）。
