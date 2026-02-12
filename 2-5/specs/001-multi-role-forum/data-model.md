# Phase 1 Data Model: 多角色論壇／社群平台

**Date**: 2026-02-09  
**Feature**: [spec.md](./spec.md)

本文件將規格中的實體、欄位、關聯、索引與狀態規則具體化（以 Prisma + SQLite 為目標）。

---

## Entities

### User

- **Purpose**: 使用者帳號與全站角色（`user` / `admin`），Moderator 不是 user.role，而是看板指派。
- **Fields**:
  - `id` (PK)
  - `email`（唯一；儲存前 trim + lower-case）
  - `passwordHash`
  - `role` enum: `user | admin`
  - `isBanned` boolean
  - `createdAt`, `updatedAt`
- **Indexes/Constraints**:
  - unique(`email`)

### Board

- **Fields**:
  - `id` (PK)
  - `name`
  - `description`
  - `isActive` boolean
  - `sortOrder` int
  - `createdAt`, `updatedAt`
- **Indexes**:
  - index(`sortOrder`)

### ModeratorAssignment

- **Purpose**: 定義 Moderator 的 board scope。
- **Fields**:
  - `id` (PK)
  - `boardId` (FK → Board)
  - `userId` (FK → User)
  - `createdAt`
- **Constraints**:
  - unique(`boardId`, `userId`)

### Thread

- **Fields**:
  - `id` (PK)
  - `boardId` (FK → Board)
  - `authorId` (FK → User)
  - `title`
  - `content`
  - `status` enum: `draft | published | hidden | locked`
  - `isPinned` boolean
  - `isFeatured` boolean
  - `createdAt`, `updatedAt`
- **Indexes**:
  - index(`boardId`, `isPinned`, `createdAt`)（支援看板列表排序）
  - index(`authorId`, `createdAt`)（支援「我的主題」）

### Post

- **Fields**:
  - `id` (PK)
  - `threadId` (FK → Thread)
  - `authorId` (FK → User)
  - `content`
  - `status` enum: `visible | hidden`
  - `createdAt`, `updatedAt`
- **Indexes**:
  - index(`threadId`, `createdAt`)（支援回覆 lazy load）
  - index(`authorId`, `createdAt`)（支援「我的回覆」）

### Report

- **Fields**:
  - `id` (PK)
  - `reporterId` (FK → User)
  - `targetType` enum: `thread | post`
  - `targetId` (string/int；依實作統一型別)
  - `reason` (string)
  - `status` enum: `pending | accepted | rejected`
  - `resolvedById` (nullable FK → User)
  - `resolvedAt` (nullable datetime)
  - `note` (nullable string)
  - `createdAt`, `updatedAt`
- **Constraints**:
  - unique(`reporterId`, `targetType`, `targetId`)
- **Indexes**:
  - index(`status`, `createdAt`)（pending 優先）
  - index(`targetType`, `targetId`)

### Like

- **Fields**:
  - `id` (PK)
  - `userId` (FK → User)
  - `targetType` enum: `thread | post`
  - `targetId`
  - `createdAt`
- **Constraints**:
  - unique(`userId`, `targetType`, `targetId`)
- **Indexes**:
  - index(`targetType`, `targetId`)（計數/查詢）

### Favorite

- **Fields**:
  - `id` (PK)
  - `userId` (FK → User)
  - `threadId` (FK → Thread)
  - `createdAt`
- **Constraints**:
  - unique(`userId`, `threadId`)

### AuditLog

- **Fields**:
  - `id` (PK)
  - `actorId` (nullable FK → User)
  - `action` (string enum-like; e.g. `auth.login`, `thread.hide`)
  - `targetType` enum: `board | thread | post | report | user`
  - `targetId`
  - `metadata` (JSON string)
  - `ip` (nullable)
  - `userAgent` (nullable)
  - `createdAt`
- **Indexes**:
  - index(`actorId`, `createdAt`)
  - index(`targetType`, `targetId`)
  - index(`action`, `createdAt`)

### Session (新增，支援 cookie session)

- **Fields**:
  - `id` (PK；隨機不可猜)
  - `userId` (FK → User)
  - `expiresAt` datetime
  - `createdAt` datetime
  - `lastSeenAt` datetime
  - `ip` (nullable)
  - `userAgent` (nullable)
- **Indexes**:
  - index(`userId`)
  - index(`expiresAt`)

---

## Validation Rules (摘要)

- Email：trim + lower-case；格式驗證；唯一。
- Password：最少 8 碼（hash 後儲存）。
- Thread：
  - `title` 必填；`board.isActive` 必須為 true 才能建立/發布/互動。
  - `draft` 僅作者可見；`hidden` 僅 Moderator(board scope)/Admin 可見。
  - `locked` 禁止新增回覆；且一般使用者禁止編輯該 thread。
- Post：
  - 僅能建立於未鎖定 thread；`hidden` 對 Guest/User 不可見。
- Report：
  - 僅對「可見內容」可建立；同人同目標不可重複。

---

## State Machines

### Thread.status

- Allowed: `draft | published | hidden | locked`
- Legal transitions:
  - `draft → published`（作者、看板啟用）
  - `published → hidden`（Moderator(board scope)/Admin）
  - `hidden → published`（Moderator(board scope)/Admin）
  - `published → locked`（Moderator(board scope)/Admin）
  - `locked → published`（Moderator(board scope)/Admin）
- Forbidden:
  - `published/locked → draft`
  - `hidden → locked`（需先 restore 或以明確組合治理操作實現）

### Post.status

- Allowed: `visible | hidden`
- Legal transitions: `visible ↔ hidden`（Moderator(board scope)/Admin）

### Report.status

- Allowed: `pending | accepted | rejected`
- Legal transitions: `pending → accepted/rejected`（Moderator(board scope)/Admin）

