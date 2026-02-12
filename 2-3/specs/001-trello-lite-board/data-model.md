# Data Model: Trello Lite（多人協作看板）

**Spec**: [spec.md](spec.md)  
**Research**: [research.md](research.md)  
**Date**: 2026-02-04

本文件描述概念資料模型（不綁定特定 DB/ORM 語法），重點在欄位、關聯、驗證規則、不變量與狀態轉移。

---

## Entities

### 1) User

- **Fields**
  - id: UUID
  - email: string（unique, required）
  - password_hash: string（required；不得回傳）
  - display_name: string（required）
  - created_at: datetime

- **Validation**
  - email 格式需有效、大小寫規範化（建議儲存 normalized 版本以支援 unique）

---

### 2) Project

- **Fields**
  - id: UUID
  - name: string（required）
  - description: string（optional）
  - owner_id: User.id（required）
  - visibility: private | shared（required, default private）
  - status: active | archived（required, default active）
  - created_at, updated_at

- **Invariants**
  - 每個 Project 恆有且僅有 1 位 Owner（由 membership.role=owner 唯一性 + project.owner_id 一致性共同保證）
  - status=archived 時：Project 範圍內所有寫入操作皆被拒絕（唯讀）

---

### 3) ProjectMembership

- **Fields**
  - id: UUID
  - project_id: Project.id（required）
  - user_id: User.id（required）
  - role: owner | admin | member | viewer（required）
  - joined_at: datetime

- **Constraints / Indexes**
  - unique(project_id, user_id)
  - per-project: role=owner 必須且只能有一筆

- **Rules**
  - Owner/Admin 可調整成員角色（Owner 也可移除成員）
  - 被移除的成員：必須解除其在該專案所有 Task 的指派（見 TaskAssignee）並寫入 ActivityLog

---

### 4) ProjectInvitation

- **Fields**
  - id: UUID
  - project_id: Project.id（required）
  - email: string（required；與 User.email 比對）
  - invited_role: admin | member | viewer（required）
  - invited_by_user_id: User.id（required）
  - status: pending | accepted | rejected | revoked（required）
  - created_at
  - responded_at: datetime（optional）

- **Rules**
  - 允許「先邀請後註冊」：以 email 綁定；註冊後可在專案列表頁看到 pending 邀請並接受
  - accepted 後才建立 ProjectMembership

---

### 5) Board

- **Fields**
  - id: UUID
  - project_id: Project.id（required）
  - name: string（required）
  - order: number（required；用於 board 間排序）
  - status: active | archived（required, default active）
  - created_at, updated_at

- **Invariants**
  - Board.status=archived 時：其下 List/Task 皆唯讀

---

### 6) List

- **Fields**
  - id: UUID
  - board_id: Board.id（required）
  - title: string（required）
  - order: number（required；用於 list 間排序）
  - status: active | archived（required, default active）
  - is_wip_limited: boolean（required, default false）
  - wip_limit: int（optional；僅在 is_wip_limited=true 時必填且 > 0）
  - created_at, updated_at

- **Derived**
  - WIP count：該 List 中「未 archived 的 Task」數量

- **Invariants**
  - List.status=archived 時：該 list 內 Task 皆唯讀，且 Task 不可被拖入/拖出

---

### 7) Task

- **Fields**
  - id: UUID
  - project_id: Project.id（required；便於專案層授權與查詢）
  - board_id: Board.id（required；便於 board 範圍查詢）
  - list_id: List.id（required）
  - title: string（required）
  - description: string（optional）
  - due_date: date（optional）
  - priority: enum/int（optional）
  - position: string（required；可插入排序鍵，用於 list 內排序）
  - status: open | in_progress | blocked | done | archived（required, default open）
  - version: int（required；樂觀鎖/衝突偵測）
  - created_by_user_id: User.id（required）
  - created_at, updated_at

- **Indexes**
  - (list_id, position)
  - (project_id, updated_at)

- **State machine**
  - open → in_progress | blocked | done | archived
  - in_progress → blocked | done | archived
  - blocked → in_progress | done | archived
  - done → archived
  - archived：終態，不可再轉換

- **Rules / Invariants**
  - status=done：不可再回到 open/in_progress/blocked
  - status=archived：不可編輯/拖拉/指派
  - 拖拉/重排：position 必須由伺服端權威計算產生，並同步權威排序給所有成員
  - WIP：is_wip_limited=true 且 WIP 已達上限時，Member 禁止拖入/建立；Admin/Owner 可 override（需寫 ActivityLog）

---

### 8) TaskAssignee（M:N）

- **Fields**
  - task_id: Task.id
  - user_id: User.id
  - assigned_at: datetime

- **Constraints**
  - unique(task_id, user_id)

- **Rules**
  - assignee 必須是同 project 的 member
  - member 被移除時：必須移除其 assignee 關聯（或標記失效，但本版建議直接移除並寫 ActivityLog）

---

### 9) Comment

- **Fields**
  - id: UUID
  - task_id: Task.id（required）
  - author_id: User.id（required）
  - content: string（required）
  - created_at: datetime

- **Rules**
  - 只追加（不提供 edit/delete）
  - Viewer 不可新增
  - 需做 XSS 防護（輸出轉義或輸入清理）

---

### 10) ActivityLog（append-only）

- **Fields**
  - id: UUID（或時間序列 id）
  - project_id: Project.id
  - actor_id: User.id
  - entity_type: project | membership | invitation | board | list | task | comment
  - entity_id: string
  - action: string（create/update/move/archive/assign/unassign/override_wip/...）
  - timestamp: datetime
  - metadata: json（前後狀態摘要、排序變更摘要、override 理由等；避免敏感資料）

- **Indexes**
  - (project_id, timestamp desc)

- **Invariants**
  - append-only：不可修改/刪除既有事件

---

### 11) RefreshSession（支援登出撤銷；後端用）

> 這是為了滿足「登出使 refresh 失效」的需求所需的伺服端狀態（概念模型）。

- **Fields**
  - id: UUID
  - user_id: User.id
  - refresh_token_hash: string
  - status: active | revoked
  - created_at, expires_at, last_used_at
  - rotated_from_session_id: UUID（optional；用於 rotation/replay 偵測）

- **Rules**
  - refresh token rotation：每次 refresh 成功都產生新的 session/token，舊的標記 revoked
  - logout：將該使用者當前 refresh session 標記 revoked

