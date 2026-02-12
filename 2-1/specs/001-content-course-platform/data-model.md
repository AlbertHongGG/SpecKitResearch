# Phase 1 — Data Model: 線上課程平台（非影音串流）

**Date**: 2026-02-03

本資料模型以需求 spec 為準，並補充必要的約束、索引與一致性規則（以利 Prisma + SQLite 實作）。

## Entities

### User

- **Fields**
  - `id: string`
  - `email: string` (unique)
  - `password_hash: string`
  - `role: "student" | "instructor" | "admin"`（主要角色互斥）
  - `is_active: boolean`
  - `created_at: datetime`
  - `updated_at: datetime`
- **Constraints**
  - Unique: `email`
  - Invariant: 主要角色必須互斥（以單一 `role` 欄位表達）

### CourseCategory

- **Fields**: `id`, `name` (unique), `is_active`, `created_at`, `updated_at`
- **Constraints**: Unique: `name`

### Tag

- **Fields**: `id`, `name` (unique), `is_active`, `created_at`, `updated_at`
- **Constraints**: Unique: `name`

### Course

- **Fields**
  - `id: string`
  - `instructor_id: string` (FK → User.id)
  - `category_id: string` (FK → CourseCategory.id)
  - `title: string`
  - `description: string`
  - `price: integer (>= 0)`
  - `cover_image_url: string | null`
  - `status: "draft" | "submitted" | "published" | "rejected" | "archived"`
  - `rejected_reason: string | null`
  - `created_at`, `updated_at`
  - `published_at: datetime | null`
  - `archived_at: datetime | null`
- **Constraints / Invariants**
  - `status` 僅允許合法轉換（由應用層以 state machine 實作）
  - `rejected_reason` 只在 `status=rejected` 時允許存在
  - `published_at` 只在 `status=published` 時允許存在
  - `archived_at` 只在 `status=archived` 時允許存在
- **Indexes (recommended)**
  - `(status)`（課程列表與統計）
  - `(instructor_id, status)`（教師課程管理）
  - `(category_id)`

### CourseTag (Join)

- **Fields**: `course_id` (FK), `tag_id` (FK)
- **Constraints**: Unique: `(course_id, tag_id)`

### Section

- **Fields**: `id`, `course_id` (FK), `title`, `order: integer`, `created_at`, `updated_at`
- **Constraints**
  - Unique: `(course_id, order)`（避免排序衝突；若不採 unique，則需在應用層阻擋衝突）

### Lesson

- **Fields**
  - `id`, `section_id` (FK)
  - `title`, `order: integer`
  - `content_type: "text" | "image" | "pdf"`
  - `content_text: string | null`
  - `content_image_url: string | null`
  - `content_file_url: string | null`
  - `content_file_name: string | null`
  - `created_at`, `updated_at`
- **Constraints / Invariants**
  - Unique: `(section_id, order)`（避免排序衝突）
  - content consistency:
    - `text` → `content_text` 必須存在，其餘為 null
    - `image` → `content_image_url` 必須存在（且不得指向公開 `/public`），其餘為 null
    - `pdf` → `content_file_url` 與 `content_file_name` 必須存在（且不得指向公開 `/public`），其餘為 null

### Purchase

- **Fields**: `id`, `user_id` (FK), `course_id` (FK), `created_at`
- **Constraints**
  - Unique: `(user_id, course_id)`（阻擋重複購買；同時提供冪等保護）
- **Indexes (recommended)**
  - `(user_id, created_at)`（我的課程）
  - `(course_id, created_at)`（統計）

### LessonProgress

- **Fields**: `id`, `user_id` (FK), `lesson_id` (FK), `is_completed: boolean`, `completed_at: datetime | null`, `created_at`, `updated_at`
- **Constraints**
  - Unique: `(user_id, lesson_id)`（每人每單元一筆）
  - `is_completed=true` 時 `completed_at` 必須存在；`false` 時應為 null

### CourseReview

- **Fields**: `id`, `course_id` (FK), `admin_id` (FK → User.id), `decision: "published" | "rejected"`, `reason: string | null`, `created_at`
- **Constraints / Invariants**
  - decision=`rejected` 時 `reason` 必填

## Relationships

- User (Instructor) 1:N Course
- Course 1:N Section
- Section 1:N Lesson
- User 1:N Purchase
- Course 1:N Purchase
- Course M:N Tag（透過 CourseTag）
- User 1:N LessonProgress
- Lesson 1:N LessonProgress
- Course 1:N CourseReview
- User (Admin) 1:N CourseReview

## Additional Tables (Implementation)

### Session (for cookie-based session, DB-backed)

- **Purpose**: 支援 session 撤銷、停用帳號立即生效、強制登出等能力。
- **Fields (recommended)**: `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at`, `created_at`, `last_seen_at`
- **Constraints**: Unique: `token_hash`
