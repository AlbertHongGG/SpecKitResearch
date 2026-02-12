# Phase 1 Design: Data Model（Prisma + SQLite）

本文件將 feature spec 的實體/欄位/關聯具體化為可落地的資料模型設計（含驗證規則、索引、狀態機與一致性約束）。

## 1) Enumerations

> DB 層建議用「enum（Prisma enum）+ 儲存為字串」；對外 API 仍以產品定義的顯示字串呈現（例如 `In Progress`）。

- `UserRole`: `CUSTOMER | AGENT | ADMIN`
- `TicketCategory`: `ACCOUNT | BILLING | TECHNICAL | OTHER`
- `TicketStatus`: `OPEN | IN_PROGRESS | WAITING_FOR_CUSTOMER | RESOLVED | CLOSED`
- `AuditEntityType`: `TICKET | TICKET_MESSAGE`
- `AuditAction`: `TICKET_CREATED | MESSAGE_CREATED | STATUS_CHANGED | ASSIGNEE_CHANGED | USER_DISABLED | USER_ROLE_CHANGED | SESSION_REVOKED`

## 2) Entities

### 2.1 User

用途：身份、授權（RBAC）、停用與全域 token 撤銷。

欄位（建議）
- `id`: UUID (PK)
- `email`: string (unique, normalized)
- `passwordHash`: string
- `role`: UserRole
- `isActive`: boolean
- `tokenVersion`: int (default 0) — 用於全域撤銷既有 token
- `createdAt`: datetime
- `updatedAt`: datetime

驗證/約束
- email 唯一
- `isActive=false` 的使用者不得通過 token 驗證

### 2.2 AuthSession（Refresh Token Session）

用途：支援 logout、逐裝置登出、refresh rotation 與稽核。

欄位（建議）
- `id`: UUID (PK)
- `userId`: UUID (FK → User)
- `refreshTokenHash`: string（不可存明文）
- `createdAt`: datetime
- `updatedAt`: datetime
- `expiresAt`: datetime
- `revokedAt`: datetime (nullable)
- `lastUsedAt`: datetime (nullable)
- `userAgent`: string (nullable)
- `ip`: string (nullable)

約束
- `revokedAt != null` 的 session 不可再 refresh

### 2.3 Ticket

欄位（需求 + 建議補強）
- `id`: UUID (PK)
- `title`: string (<= 100, 建立後不可改)
- `category`: TicketCategory (建立後不可改)
- `status`: TicketStatus
- `customerId`: UUID (FK → User)
- `assigneeId`: UUID (FK → User, nullable)
- `createdAt`: datetime
- `updatedAt`: datetime
- `closedAt`: datetime (nullable)
- `version`: int (default 0) — 泛用 optimistic concurrency（非必要但建議）

衍生/一致性規則
- `updatedAt` 需在以下事件同步更新：新增留言（含內部備註）、狀態變更、指派變更。
- `closedAt` 只允許在狀態轉為 `CLOSED` 時填入；其他狀態需為 null。

### 2.4 TicketMessage

欄位
- `id`: UUID (PK)
- `ticketId`: UUID (FK → Ticket)
- `authorId`: UUID (FK → User)
- `authorRole`: UserRole（寫入時快照，避免後續 role 變更影響歷史）
- `content`: text
- `isInternal`: boolean
- `createdAt`: datetime

不可變性
- 僅允許 append（不可 edit/delete）。

可見性
- `isInternal=true`：僅 Agent/Admin 可讀。

### 2.5 AuditLog

欄位
- `id`: UUID (PK)
- `entityType`: AuditEntityType
- `entityId`: UUID
- `action`: AuditAction
- `actorId`: UUID (FK → User)
- `metadataJson`: text（JSON 字串，記錄 from/to 狀態、from/to assignee、isInternal、messageId…）
- `createdAt`: datetime

不可變性
- 僅允許 append（不可 edit/delete）。

## 3) Relationships

- User(Customer) 1:N Ticket（customerId）
- User(Agent) 1:N Ticket（assigneeId, nullable）
- Ticket 1:N TicketMessage
- User 1:N TicketMessage
- User 1:N AuditLog
- User 1:N AuthSession

## 4) Indexes（SQLite）

必備（對應需求）
- User.email UNIQUE
- Ticket.customerId
- Ticket.assigneeId
- Ticket.status
- Ticket.updatedAt
- TicketMessage(ticketId, createdAt)
- AuditLog(entityType, entityId, createdAt)

建議（效能/工作台）
- Ticket(assigneeId, status, updatedAt)
- Ticket(customerId, status, updatedAt)

## 5) State Machine（儲存層約束與 API 前置條件）

狀態：OPEN → IN_PROGRESS ↔ WAITING_FOR_CUSTOMER → RESOLVED → CLOSED（終態）

允許轉換（伺服端強制驗證）
- OPEN → IN_PROGRESS（Agent/Admin；同時設置 assigneeId）
- IN_PROGRESS → WAITING_FOR_CUSTOMER（Agent）
- WAITING_FOR_CUSTOMER → IN_PROGRESS（Customer；通常伴隨新增公開留言）
- IN_PROGRESS → RESOLVED（Agent）
- RESOLVED → CLOSED（Customer/Admin）
- RESOLVED → IN_PROGRESS（Agent/Admin）

操作約束
- CLOSED：禁止新增任何留言、禁止狀態變更、禁止指派變更。
- Customer：只允許在 WAITING_FOR_CUSTOMER 新增留言；只允許在 RESOLVED 關閉。
- Message：永遠 append-only。

併發控制（落地）
- 寫入採 `WHERE id AND status AND expectedAssigneeId?` 的條件式更新；失敗回 409。
- 更新 Ticket 與寫 AuditLog 必須在同一 transaction。

## 6) Dashboard 指標（資料來源）

- FRT/RT 以「cycle」計算：cycle_start_at / first_response_at / resolved_at 來源為 `AuditLog` + 公開 `TicketMessage`（見 research.md 的 SLA 定義）。
- 狀態分佈：依可見範圍聚合 Ticket.status。
- 客服負載：每位 Agent 的 `IN_PROGRESS` 工單數。
