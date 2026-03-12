# Phase 1 Design: Data Model（SQLite + Prisma）

**Branch**: 001-collab-task-board  
**Date**: 2026-02-05  
**Spec**: [spec.md](spec.md)  
**Research**: [research.md](research.md)  

本文件描述概念資料模型與約束（非程式碼），用於確保：RBAC、一致性（排序/狀態）、OCC（version）、Activity Log append-only、封存唯讀等規則都能由資料層與服務層共同強制。

---

## Entities（概念實體）

> 主要實體與欄位以 spec 的 Data Model 為準；本文件補強約束、索引、狀態推導與關聯一致性。

### User
- `id: uuid`
- `email: string`（unique, normalized）
- `password_hash: string`
- `display_name: string`
- `created_at`

**Indexes/constraints**
- unique(email)

### Project
- `id: uuid`
- `name: string`（required）
- `description?: string`
- `owner_id: uuid`（FK User）
- `visibility: private|shared`
- `status: active|archived`
- `version: int`（建議，支援設定/封存 OCC）
- `created_at, updated_at`

**Invariants**
- 專案恆有且僅有 1 位 Owner（由 membership 角色或 owner_id 強制；建議兩者一致）
- `status=archived` 時：專案範圍寫入全拒絕

### ProjectMembership
- `id: uuid`
- `project_id: uuid`（FK Project）
- `user_id: uuid`（FK User）
- `role: owner|admin|member|viewer`
- `version: int`（建議，支援角色調整 OCC）
- `joined_at`

**Indexes/constraints**
- unique(project_id, user_id)
- 需要額外約束（在 service 層）確保每 project 只有一個 role=owner

### ProjectInvitation
- `id: uuid`
- `project_id: uuid`（FK Project）
- `email: string`
- `invited_role: admin|member|viewer`
- `invited_by_user_id: uuid`
- `status: pending|accepted|rejected|revoked`
- `created_at, responded_at?`

**Indexes/constraints**
- 建議 unique(project_id, email, status=pending)（避免重複 pending；SQLite 無 partial unique 時由 service 層強制）

### Board
- `id: uuid`
- `project_id: uuid` (FK Project)
- `name: string`
- `order: number`
- `status: active|archived`
- `version: int`（建議）
- `created_at, updated_at`

**Invariants**
- Board archived → 其下 list/task 寫入拒絕（service 層以 join 檢查）

### List
- `id: uuid`
- `board_id: uuid`（FK Board）
- `title: string`
- `order: number`
- `status: active|archived`
- `is_wip_limited: boolean`
- `wip_limit?: int`（正整數；僅 is_wip_limited=true 時存在）
- `version: int`
- `created_at, updated_at`

**Indexes/constraints**
- (board_id, order)

**WIP invariant**
- WIP 計數以同 list 內 `task.status != archived` 為準

### Task
- `id: uuid`
- `project_id: uuid`（FK Project）
- `board_id: uuid`（FK Board）
- `list_id: uuid`（FK List）
- `title: string`（required）
- `description?: string`
- `due_date?: date`
- `priority?: int|enum`
- `position: string`（排序鍵；見 research.md）
- `status: open|in_progress|blocked|done|archived`
- `version: int`（OCC；每次可編輯 mutation 成功則 +1）
- `created_by_user_id: uuid`
- `created_at, updated_at`

**Indexes/constraints**
- index(list_id, position)
- unique(list_id, position)（用於併發排序衝突偵測；失敗 bounded retry）

**State machine invariant**
- 合法轉換與終態（archived）需在 domain 層強制；done 不可回 in_progress/open/blocked

### TaskAssignee（M:N）
- `task_id: uuid`
- `user_id: uuid`
- `assigned_at`

**Indexes/constraints**
- unique(task_id, user_id)
- 指派前需驗證 user 屬於 task.project 的 membership

### Comment（append-only）
- `id: uuid`
- `task_id: uuid`
- `author_id: uuid`
- `content: string`
- `created_at`

**Invariants**
- 不提供 edit/delete
- Viewer 不可新增

### ActivityLog（append-only）
- `id: uuid`
- `project_id: uuid`
- `actor_id: uuid`
- `entity_type: project|membership|invitation|board|list|task|comment`
- `entity_id: string`
- `action: string`
- `timestamp`
- `metadata: json`

**Indexes/constraints**
- index(project_id, timestamp desc)

**Invariant**
- 只允許 insert；所有關鍵 mutation 與此 insert 必須同交易

---

## Auth / Session（支援 refresh rotation）

> 由 tech stack 指定「cookie-based + short access + refresh」，需要伺服端可撤銷 refresh。

### AuthSession（或 RefreshToken 表）
- `id: uuid`
- `user_id: uuid`
- `refresh_token_hash: string`
- `created_at, expires_at`
- `revoked_at?: datetime`
- `rotated_from_session_id?: uuid`（可選：追蹤 rotation chain）
- `user_agent?: string, ip?: string`（可選）

**Invariants**
- logout：標記 revoked
- refresh：在同交易內 revoke 舊 token 並發新 token（rotation）

---

## Derived / Read Models

### Board Snapshot
- 讀取 `Project + Boards + Lists + Tasks + Memberships` 的一致快照
- 排序：
  - Boards: `order`
  - Lists: `order`
  - Tasks: `ORDER BY position ASC, id ASC`

---

## Consistency Rules（服務層要強制的 join 檢查）

- Project archived → 全拒絕寫入
- Board archived → 拒絕其下 lists/tasks 的寫入
- List archived → 拒絕該 list 的 create/move in/out
- Task archived → 拒絕 edit/move/assign/status change
- WIP：move/create into list 先計數（排除 archived）
- RBAC：所有寫入必檢查 role；Viewer 全拒絕；override WIP 只允許 Owner/Admin 且需附理由並寫 Activity

---

## State Transitions（與 spec Mermaid 一致）

- Global/page/feature state machines：以 [spec.md](spec.md) 的 ①～㉛ Mermaid 圖為唯一驗收依據
- Task 狀態機：
  - open → in_progress|blocked|done|archived
  - in_progress → blocked|done|archived
  - blocked → in_progress|done|archived
  - done → archived
  - archived 終態
