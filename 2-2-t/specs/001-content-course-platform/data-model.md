# Phase 1 Design: Data Model（SQLite + Prisma）

本文件將 [spec.md](../001-content-course-platform/spec.md) 的核心實體具體化為資料模型（欄位、關係、驗證/唯一性/狀態不變量）。

> 原則：DB 層負責唯一性/外鍵/可用 CHECK/trigger 的不變量；App 層負責更複雜的狀態機前置條件與一致錯誤訊息。

---

## Entity: User

**Purpose**: 登入身份、RBAC 角色、帳號啟用狀態。

**Fields**
- `id` (string, UUID)
- `email` (string) — 顯示/回傳用途
- `emailLower` (string) — `trim().toLowerCase()` 後結果，**unique**
- `passwordHash` (string)
- `role` (enum: `student | instructor | admin`) — 主要角色（單一）
- `isActive` (boolean) — 停用後不得登入
- `createdAt`, `updatedAt` (datetime)

**Constraints**
- `emailLower` unique（對應 FR-001）
- `role` 必須是三者之一（對應 FR-008）

---

## Entity: Session

**Purpose**: server-side 可撤銷 session（對應 FR-004..FR-007）。

**Fields**
- `id` (string, UUID)
- `sessionTokenHash` (string) — SHA-256(cookie token)，**unique**
- `userId` (FK → User)
- `createdAt` (datetime)
- `lastSeenAt` (datetime, optional)
- `expiresAt` (datetime)
- `revokedAt` (datetime, nullable)
- `revokedReason` (string, nullable)
- `ip`, `userAgent` (string, nullable)

**Constraints/Indexes**
- `sessionTokenHash` unique
- Index: `(userId, expiresAt)`

---

## Entity: Course

**Purpose**: 課程主資料與狀態機（對應 FR-011..FR-018）。

**Fields（核心）**
- `id` (string, UUID)
- `instructorId` (FK → User)
- `title` (string)
- `description` (string)
- `price` (int, >= 0)
- `coverImageUrl` (string, nullable)
- `status` (enum: `draft | submitted | published | rejected | archived`)
- `publishedAt` (datetime, nullable)
- `archivedAt` (datetime, nullable)
- `rejectedReason` (string, nullable)
- `createdAt`, `updatedAt` (datetime)

**Relationships**
- hasMany `Section`
- hasMany `Purchase`
- hasMany `CourseReview`
- belongsTo `Category`（可選）
- many-to-many `Tag`

**Invariants（至少需在 App 層保證；可用 DB CHECK/trigger 強化）**
- 合法轉換：`draft→submitted→(published|rejected)`；`rejected→draft`；`published↔archived`
- `publishedAt`：首次進入 `published` 時寫入；republish 不覆寫（FR-016）
- `archivedAt`：進入 `archived` 時寫入（FR-017）
- `rejectedReason`：僅 `rejected` 有值；離開 `rejected` 必清空（FR-018）

---

## Entity: CourseReview

**Purpose**: 管理員審核決策與稽核（對應 FR-028..FR-029）。

**Fields**
- `id` (string, UUID)
- `courseId` (FK → Course)
- `reviewerAdminId` (FK → User)
- `decision` (enum: `published | rejected`)
- `reason` (string, nullable) — rejected 必填
- `note` (string, nullable) — published 可填
- `createdAt` (datetime)

**Constraints**
- `decision=='rejected'` 時 `reason` 必填（App 層；可用 DB CHECK 強化）

---

## Entity: Category

**Purpose**: 課程分類（對應 FR-030）。

**Fields**
- `id` (string)
- `name` (string) — unique
- `isActive` (boolean)
- `createdAt`, `updatedAt`

---

## Entity: Tag

**Purpose**: 課程標籤（對應 FR-030）。

**Fields**
- `id` (string)
- `name` (string) — unique
- `isActive` (boolean)
- `createdAt`, `updatedAt`

---

## Entity: CourseTag（Join）

**Fields**
- `courseId` (FK → Course)
- `tagId` (FK → Tag)

**Constraints**
- `@@unique([courseId, tagId])`

---

## Entity: Section

**Purpose**: 課綱章節（對應 FR-019..FR-021）。

**Fields**
- `id` (string)
- `courseId` (FK → Course)
- `title` (string)
- `position` (int) — 同 course 內唯一
- `createdAt`, `updatedAt`

**Constraints**
- `@@unique([courseId, position])`

---

## Entity: Lesson

**Purpose**: 課綱單元，承載 text/image/pdf（對應 FR-020）。

**Fields**
- `id` (string)
- `sectionId` (FK → Section)
- `title` (string)
- `position` (int) — 同 section 內唯一
- `contentType` (enum: `text | image | pdf`)
- `contentText` (string, nullable)
- `contentImageUrl` (string, nullable)
- `contentFileId` (FK → Attachment, nullable)
- `createdAt`, `updatedAt`

**Constraints/Validation**
- `@@unique([sectionId, position])`
- contentType 與欄位一致（App 層；可用 DB CHECK 強化）：
  - `text` → `contentText` 非空，其他為空
  - `image` → `contentImageUrl` 非空，其他為空
  - `pdf` → `contentFileId` 非空，其他為空

---

## Entity: Attachment

**Purpose**: 受保護下載檔案 metadata（對應 FR-035）。

**Fields**
- `id` (string)
- `lessonId` (FK → Lesson)
- `originalFilename` (string)
- `mimeType` (string)
- `sizeBytes` (int)
- `sha256` (string)
- `storageProvider` (enum: `LOCAL`) — 本期固定 LOCAL（後續可擴充）
- `storageKey` (string) — 不可猜、不可由使用者組合
- `deletedAt` (datetime, nullable)
- `createdAt`

**Notes**
- 對外只暴露 `attachmentId`，下載必經後端授權。

---

## Entity: Purchase

**Purpose**: 購買記錄（永久存取權）（對應 FR-022..FR-024）。

**Fields**
- `id` (string)
- `userId` (FK → User)
- `courseId` (FK → Course)
- `purchasedAt` (datetime)

**Constraints**
- `@@unique([userId, courseId])`（確保冪等與避免重複購買）

---

## Entity: LessonProgress

**Purpose**: 單元完成進度（對應 FR-025..FR-027）。

**Fields**
- `id` (string)
- `userId` (FK → User)
- `lessonId` (FK → Lesson)
- `isCompleted` (boolean)
- `completedAt` (datetime, nullable)
- `createdAt`, `updatedAt`

**Constraints**
- `@@unique([userId, lessonId])`（冪等）

---

## Derived Views（不一定要做成 DB view）

- My Courses 列表：`Purchase` join `Course` + progress summary
  - `completedLessons = count(LessonProgress where isCompleted=true and userId=? and lesson.courseId=?)`
  - `totalLessons = count(Lesson where lesson.courseId=?)`

---

## State Transitions（資料層影響摘要）

- `Course.status` 變更必須由 domain service 進行，並保證：
  - 審核決策同時寫入 `CourseReview`
  - `publishedAt/archivedAt/rejectedReason` 的一致性
- submitted lock：submitted 狀態下，所有會影響審核結果的 Course/Section/Lesson/Price 變更必須被拒絕。
