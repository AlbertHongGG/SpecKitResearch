# Data Model: 多角色論壇／社群平台（Multi-Role Forum & Community Platform）

**Branch**: 001-multi-role-forum  
**Date**: 2026-02-10  
**Source**: spec.md

本文件將 feature spec 的實體、欄位、關係、約束與狀態轉換整理成可實作的資料模型（以 Prisma + SQLite 單檔為目標）。

## 1. 實體總覽（Entities)

- User
- Session（用於 HttpOnly cookie session）
- Board
- ModeratorAssignment（board scope）
- Thread
- Post
- Like（thread/post）
- Favorite（thread）
- Report（thread/post）
- AuditLog
- Search Index（SQLite FTS5；非 Prisma model）

## 2. Enum / 型別

- `UserRole`: `user` | `admin`
- `ThreadStatus`: `draft` | `published` | `hidden` | `locked`
- `PostStatus`: `visible` | `hidden`
- `ReportStatus`: `pending` | `accepted` | `rejected`
- `TargetType`: `thread` | `post`

> Moderator 不是 `User.role`，而是由 `ModeratorAssignment` 綁定到 Board。

## 3. Tables（欄位與約束）

### 3.1 User

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string (cuid/uuid) | PK |
| email | string | UNIQUE；寫入前必須 `trim + lower` 正規化 |
| passwordHash | string | bcrypt hash |
| role | UserRole | 預設 `user`；`admin` 具後台權限 |
| isBanned | boolean | 停權不可登入/不可操作 |
| createdAt / updatedAt | datetime | |

索引建議：`email` unique index。

### 3.2 Session

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK（高熵 opaque token；放入 HttpOnly cookie） |
| userId | string | FK → User.id；index |
| createdAt | datetime | |
| expiresAt | datetime | 過期需重新登入 |
| revokedAt | datetime? | 登出/停權/rotation 時設值 |
| lastSeenAt | datetime? | 可選，用於滑動延長/風險控管 |
| userAgent | string? | 可選 |
| ipHash | string? | 可選 |
| csrfSecret | string? | 可選（用於簽章 CSRF token 綁定 session） |

約束：`revokedAt` 非 null 時視為無效。

### 3.3 Board

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| name | string | required |
| description | string | optional |
| isActive | boolean | 停用時互動不可用；仍可閱讀 |
| sortOrder | int | 首頁排序依此 |
| createdAt / updatedAt | datetime | |

索引建議：`(isActive, sortOrder)`（利於首頁排序）。

### 3.4 ModeratorAssignment

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| boardId | string | FK → Board.id；index |
| userId | string | FK → User.id；index |
| createdAt | datetime | |

約束：UNIQUE(`boardId`, `userId`)。

### 3.5 Thread

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| boardId | string | FK → Board.id；index |
| authorId | string | FK → User.id；index |
| title | string | required |
| content | string | optional |
| status | ThreadStatus | 預設 `draft` |
| isPinned | boolean | 僅影響該看板排序 |
| isFeatured | boolean | 標示用途 |
| createdAt / updatedAt | datetime | |
| publishedAt | datetime? | optional（便於排序/審計） |

索引建議：
- `boardId, isPinned, createdAt`（看板列表排序）
- `boardId, status, createdAt`（列表過濾）

### 3.6 Post

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| threadId | string | FK → Thread.id；index |
| authorId | string | FK → User.id；index |
| content | string | required |
| status | PostStatus | 預設 `visible` |
| createdAt / updatedAt | datetime | |

索引建議：`threadId, createdAt`（lazy load）。

### 3.7 Like

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| userId | string | FK → User.id；index |
| targetType | TargetType | |
| targetId | string | index |
| createdAt | datetime | |

約束：UNIQUE(`userId`, `targetType`, `targetId`)。

### 3.8 Favorite

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| userId | string | FK → User.id；index |
| threadId | string | FK → Thread.id；index |
| createdAt | datetime | |

約束：UNIQUE(`userId`, `threadId`)。

### 3.9 Report

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| reporterId | string | FK → User.id；index |
| targetType | TargetType | |
| targetId | string | index |
| reason | string | required |
| status | ReportStatus | 預設 `pending`；index |
| resolvedById | string? | FK → User.id |
| resolvedAt | datetime? | |
| note | string? | optional |
| createdAt / updatedAt | datetime | |

約束：UNIQUE(`reporterId`, `targetType`, `targetId`)。

**Board scope 查詢策略**（兩選一，擇一落地即可）：
- **方案 A（正規化）**：Report 不存 boardId；查詢時 join 到 Thread/Post → Thread → Board 以判斷 scope。
- **方案 B（去正規化；推薦）**：Report 額外存 `boardId`（建立 Report 時由目標推導），用 FK 或應用層 invariant 保證一致，讓 Moderator 面板能以 `boardId + status` 高效查詢。

本計畫建議採 **方案 B**（因 Moderator 面板是高頻治理查詢），並在 transaction 內同時驗證 target 存在且 boardId 正確。

### 3.10 AuditLog

| 欄位 | 型別 | 規則/索引 |
|---|---|---|
| id | string | PK |
| actorId | string? | FK → User.id；null 表系統 |
| action | string | 例如 `auth.login`, `thread.hide`, `report.accept` |
| targetType | string | `board`/`thread`/`post`/`report`/`user` |
| targetId | string | |
| metadata | JSON | 可選：原因、舊/新值摘要、boardId 等 |
| ip | string? | optional |
| userAgent | string? | optional |
| createdAt | datetime | index |

**原子性要求**：所有需要寫入 AuditLog 的敏感/治理操作必須與主操作同一個 DB transaction；AuditLog 寫入失敗 → 主操作 rollback。

## 4. 狀態機與合法轉換（State Transitions)

### 4.1 ThreadStatus

- `draft → published`：作者發布（且 board 必須啟用）
- `published → hidden`：Moderator(該 board)/Admin
- `hidden → published`：Moderator(該 board)/Admin
- `published → locked`：Moderator(該 board)/Admin
- `locked → published`：Moderator(該 board)/Admin

禁止：
- `hidden → locked`（未定義轉換必須拒絕）
- `published/locked → draft`

### 4.2 PostStatus

- `visible → hidden`：Moderator(該 board)/Admin
- `hidden → visible`：Moderator(該 board)/Admin

作者編輯：
- 只能編輯自己的 post
- 若 thread 為 locked，編輯必須被拒絕（避免繞過治理）

### 4.3 ReportStatus

- `pending → accepted`：Moderator(該 board)/Admin（副作用：對應內容必須 hidden）
- `pending → rejected`：Moderator(該 board)/Admin（副作用：內容狀態不變）

## 5. 可見性與查詢不變量（Visibility Invariants）

- Guest/User 的任何列表/搜尋/直連查詢都不得回傳 `hidden` thread 或 `hidden` post（除非其角色具權限）。
- `draft` thread 只有作者可見；Moderator/Admin 可因治理目的查看（但不出現在公開列表/公開搜尋）。
- Moderator 的可見性與治理權限必須受 `ModeratorAssignment` board scope 限制。

## 6. Search Index（SQLite FTS5；概念模型）

- 建立 `thread_fts`（或 `search_docs`）FTS5 virtual table，索引 thread.title + thread.content（必要時含 post.content）。
- 查詢時必須 join 回 Thread/Post 以套用可見性（排除 hidden/draft）。
- Prisma 對 virtual table/trigger 支援有限；建議在 migration 中使用 raw SQL 建立 FTS 與 triggers（或由 application layer 同步）。
